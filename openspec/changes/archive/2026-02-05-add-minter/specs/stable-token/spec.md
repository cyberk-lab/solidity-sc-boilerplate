# stable-token Specification Delta

## ADDED Requirements

### Requirement: Burning with MINTER_ROLE

The system SHALL restrict burning to accounts with `MINTER_ROLE`. The `burn(address from, uint256 amount)` function SHALL burn tokens from the specified account without requiring approval.

#### Scenario: Minter burns tokens

- **WHEN** an account with MINTER_ROLE calls `burn(from, amount)`
- **THEN** `from` balance decreases by `amount`, totalSupply decreases by `amount`, and a `Transfer` event is emitted to address(0)

#### Scenario: Non-minter burn rejected

- **WHEN** an account without MINTER_ROLE calls `burn`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`
