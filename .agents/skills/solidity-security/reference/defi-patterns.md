# DeFi Patterns Reference

## 1. Oracle Integration

Use Chainlink `AggregatorV3Interface` for reliable off-chain price data. Never rely on a single DEX spot price — it can be manipulated via flash loans within a single transaction.

**Mandatory checks:**
- `price > 0` — invalid/zero price rejection
- `block.timestamp - updatedAt <= maxStaleness` — stale data rejection
- Handle decimals correctly (`feed.decimals()` returns 8 for most USD feeds)

```solidity
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

function getPrice(
    AggregatorV3Interface feed,
    uint256 maxStale
) internal view returns (uint256) {
    (, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
    require(price > 0, "Invalid price");
    require(block.timestamp - updatedAt <= maxStale, "Stale price");
    return uint256(price);
}
```

**For DEX price feeds:** use TWAP (time-weighted average price) over multiple blocks. Uniswap V3 provides built-in oracle with `observe()` for cumulative tick data.

```solidity
// Uniswap V3 TWAP (simplified)
function getTwapPrice(IUniswapV3Pool pool, uint32 twapInterval) internal view returns (int24) {
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = twapInterval;
    secondsAgos[1] = 0;

    (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);
    return int24((tickCumulatives[1] - tickCumulatives[0]) / int56(int32(twapInterval)));
}
```

**Never do:**
- Use `getReserves()` or `balanceOf()` for pricing (flash-loan manipulable)
- Trust a single oracle source without fallback
- Forget to handle oracle downtime (L2 sequencer uptime feeds)

---

## 2. Staking / Reward Distribution (MasterChef Pattern)

O(1) reward calculation using a global accumulator. Avoids iterating over all users on every reward distribution.

**Core variables:**
- `accRewardPerShare` — cumulative rewards per staked token (scaled by precision)
- `user.amount` — user's staked balance
- `user.rewardDebt` — rewards already accounted for

**Formula:**
```
pendingReward = (user.amount * pool.accRewardPerShare / PRECISION) - user.rewardDebt
```

```solidity
uint256 private constant PRECISION = 1e18;

struct UserInfo {
    uint256 amount;
    uint256 rewardDebt;
}

struct PoolInfo {
    uint256 totalStaked;
    uint256 accRewardPerShare;
    uint256 lastRewardTime;
}

function updatePool(PoolInfo storage pool, uint256 rewardRate) internal {
    if (pool.totalStaked == 0) {
        pool.lastRewardTime = block.timestamp;
        return;
    }
    uint256 elapsed = block.timestamp - pool.lastRewardTime;
    uint256 reward = elapsed * rewardRate;
    pool.accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
    pool.lastRewardTime = block.timestamp;
}

function deposit(PoolInfo storage pool, UserInfo storage user, uint256 amount) internal {
    updatePool(pool, rewardRate);

    if (user.amount > 0) {
        uint256 pending = (user.amount * pool.accRewardPerShare / PRECISION) - user.rewardDebt;
        if (pending > 0) safeRewardTransfer(msg.sender, pending);
    }

    user.amount += amount;
    user.rewardDebt = user.amount * pool.accRewardPerShare / PRECISION;
    pool.totalStaked += amount;
}

function withdraw(PoolInfo storage pool, UserInfo storage user, uint256 amount) internal {
    updatePool(pool, rewardRate);

    uint256 pending = (user.amount * pool.accRewardPerShare / PRECISION) - user.rewardDebt;
    if (pending > 0) safeRewardTransfer(msg.sender, pending);

    user.amount -= amount;
    user.rewardDebt = user.amount * pool.accRewardPerShare / PRECISION;
    pool.totalStaked -= amount;
}
```

**Critical:** always set `rewardDebt` after modifying `amount` to prevent double-claiming.

---

## 3. Bonding Curves

Price is a deterministic function of token supply. Tokens are minted on buy and burned on sell against a reserve.

**Common curves:**
- Linear: `P(S) = k * S`
- Exponential: `P(S) = k * S^n`
- Logarithmic: `P(S) = k * ln(S + 1)`

**Cost to buy from supply `S₀` to `S₁`:**
```
Cost = ∫(S₀ to S₁) P(S) dS
```

For linear curve: `Cost = k * (S₁² - S₀²) / 2`

```solidity
function getBuyPrice(uint256 currentSupply, uint256 amount, uint256 k) public pure returns (uint256) {
    uint256 newSupply = currentSupply + amount;
    // Linear: integral of k*S from currentSupply to newSupply
    // = k * (newSupply^2 - currentSupply^2) / 2
    return k * (newSupply * newSupply - currentSupply * currentSupply) / 2;
}

function getSellPrice(uint256 currentSupply, uint256 amount, uint256 k) public pure returns (uint256) {
    uint256 newSupply = currentSupply - amount;
    return k * (currentSupply * currentSupply - newSupply * newSupply) / 2;
}
```

**Virtual reserves:** add a virtual offset to supply so the initial price is non-zero:

```solidity
uint256 public constant VIRTUAL_SUPPLY = 1000e18;

function getEffectiveSupply() public view returns (uint256) {
    return totalSupply() + VIRTUAL_SUPPLY;
}
```

**Graduation pattern (pump.fun style):**
1. Bonding curve phase: tokens bought/sold against the curve
2. When market cap hits threshold (e.g., $69k), graduate to DEX
3. Migrate collected reserves + remaining tokens to Uniswap/DEX as LP
4. Burn LP tokens to lock liquidity permanently

**Rounding:** always round against the user (round up cost on buy, round down proceeds on sell) to prevent extraction via rounding exploits.

---

## 4. Vaults (ERC-4626)

Standardized tokenized vault. Users deposit assets and receive shares proportional to their ownership of the vault's total assets.

**Core math:**
```
shares = deposit * totalSupply / totalAssets     (mint)
assets = shares * totalAssets / totalSupply       (redeem)
```

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract SimpleVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Vault Share", "vSHARE") {}

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
}
```

### Inflation Attack

The first depositor can manipulate share price to steal from subsequent depositors:

1. Attacker deposits 1 wei → gets 1 share
2. Attacker donates 1000 USDC directly to vault (not via deposit)
3. Victim deposits 999 USDC → `shares = 999 * 1 / 1001 = 0` shares minted
4. Attacker redeems 1 share → gets 1999 USDC

**Mitigations:**

1. **Virtual shares/assets offset (OpenZeppelin default):**
```solidity
function _decimalsOffset() internal pure override returns (uint8) {
    return 3; // adds virtual 1000 shares and 1000 assets
}
```

2. **Minimum first deposit:**
```solidity
function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
    if (totalSupply() == 0) {
        require(assets >= MIN_FIRST_DEPOSIT, "Below minimum");
    }
    super._deposit(caller, receiver, assets, shares);
}
```

**Rounding rule:** always round in favor of the vault.
- `deposit`/`mint`: round shares **down** (fewer shares for depositor)
- `withdraw`/`redeem`: round assets **down** (fewer assets returned)

---

## 5. Flash Loan Safety

Flash loans allow borrowing and repaying within a single transaction. Any state that can be temporarily manipulated within one transaction is vulnerable.

**Never use for critical decisions:**
- `balanceOf(address(this))` — can be inflated by flash-loaned deposits
- `totalSupply()` of LP tokens — manipulable via flash mint
- Spot DEX prices — manipulable via large flash-loaned swaps

```solidity
// VULNERABLE: uses balance for pricing
function getSharePrice() public view returns (uint256) {
    return IERC20(asset).balanceOf(address(this)) / totalShares; // manipulable
}

// SAFE: uses internal accounting
uint256 private _totalDeposited;

function getSharePrice() public view returns (uint256) {
    return _totalDeposited / totalShares; // tracks actual deposits only
}
```

**Governance safety:** use snapshot-based voting (ERC20Votes) instead of current balance:

```solidity
// VULNERABLE: attacker flash-borrows tokens to vote
function getVotes(address account) public view returns (uint256) {
    return balanceOf(account); // current balance — manipulable
}

// SAFE: uses historical checkpoint
function getVotes(address account) public view override returns (uint256) {
    return getPastVotes(account, clock() - 1); // snapshot — not manipulable
}
```

**Rules:**
- Track deposits/withdrawals via internal accounting variables
- Use time-delayed oracle prices (TWAP) instead of spot
- Governance must use `getPastVotes()` with snapshot at proposal creation
- Consider adding `nonReentrant` + same-block deposit/withdraw prevention

---

## 6. Cross-Chain Security

Cross-chain messaging introduces trust assumptions about bridge relayers and destination chain execution.

**Validation requirements:**
- Verify `sourceChainId` — reject messages from unexpected chains
- Verify `sourceSender` — reject messages from unauthorized contracts
- Use nonces or message hashes to prevent replay attacks
- Rate limit withdrawals per time window

```solidity
struct CrossChainMessage {
    uint256 sourceChainId;
    address sourceSender;
    uint256 nonce;
    bytes payload;
}

mapping(bytes32 => bool) public processedMessages;
mapping(uint256 => address) public trustedRemotes; // chainId => trusted sender

uint256 public withdrawnThisPeriod;
uint256 public periodStart;
uint256 public constant MAX_WITHDRAWAL_PER_PERIOD = 1_000_000e18;
uint256 public constant PERIOD_DURATION = 1 hours;

function receiveMessage(CrossChainMessage calldata msg_) external onlyBridge {
    // Validate source
    require(trustedRemotes[msg_.sourceChainId] == msg_.sourceSender, "Untrusted source");

    // Prevent replay
    bytes32 msgHash = keccak256(abi.encode(msg_));
    require(!processedMessages[msgHash], "Already processed");
    processedMessages[msgHash] = true;

    // Rate limiting
    if (block.timestamp >= periodStart + PERIOD_DURATION) {
        periodStart = block.timestamp;
        withdrawnThisPeriod = 0;
    }
    uint256 amount = abi.decode(msg_.payload, (uint256));
    withdrawnThisPeriod += amount;
    require(withdrawnThisPeriod <= MAX_WITHDRAWAL_PER_PERIOD, "Rate limit exceeded");

    _processWithdrawal(amount);
}
```

**Established protocols:**
- **Chainlink CCIP** — decentralized oracle-backed cross-chain with rate limiting built-in
- **LayerZero OFT v2** — omnichain fungible tokens with configurable security
- **Wormhole** — guardian-based with NTT (Native Token Transfer) for custom tokens

**Security practices:**
- Segregate liquidity across chains (don't pool all funds in one bridge contract)
- Implement emergency pause on each chain independently
- Monitor for unusual volume spikes via off-chain watchers
- Use timelocks for large withdrawals exceeding threshold
