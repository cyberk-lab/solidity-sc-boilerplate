# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x.x   | Yes       |

Only the latest release on the `main` branch is actively supported with security updates.

## Vulnerability Disclosure Process

If you discover a security vulnerability, please follow responsible disclosure:

1. **Do not** open a public GitHub issue.
2. Send a detailed report to the security contact listed below.
3. Include steps to reproduce, affected contracts, and potential impact.
4. Allow up to 72 hours for an initial response and 30 days for a fix before public disclosure.

We will acknowledge receipt, assess severity, develop a patch, and coordinate disclosure with the reporter.

## Security Tools

This project uses the following tools as part of its security review process:

- **[Slither](https://github.com/crytic/slither)** — Static analysis for Solidity. Configuration in `slither.config.json`.
- **[Solhint](https://github.com/protofire/solhint)** — Solidity linter enforcing style and security rules. Configuration in `.solhint.json`.
- **Foundry Fuzz Testing** — Property-based fuzz testing via Hardhat/Foundry integration.
- **SMTChecker** — Formal verification of contract invariants using the built-in Solidity SMT solver.

## Bug Bounty

A formal bug bounty program is not yet active. Details will be published here once available.

## Contact

For security-related inquiries, please reach out to:

- **Email:** `security@example.com` *(replace with actual contact)*
- **PGP Key:** *(add public key fingerprint if applicable)*
