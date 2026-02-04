#!/usr/bin/env bash
set -euo pipefail

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BOLD="\033[1m"
RESET="\033[0m"

STEPS=("Build" "Solhint" "Slither" "Hardhat Tests" "Foundry Tests" "Coverage")
RESULTS=()

print_header() {
  echo ""
  echo -e "${YELLOW}${BOLD}════════════════════════════════════════════════════════════${RESET}"
  echo -e "${YELLOW}${BOLD}  Solidity Security Audit Sweep${RESET}"
  echo -e "${YELLOW}${BOLD}  $(date '+%Y-%m-%d %H:%M:%S')${RESET}"
  echo -e "${YELLOW}${BOLD}════════════════════════════════════════════════════════════${RESET}"
  echo ""
}

run_step() {
  local name="$1"
  shift
  echo -e "${YELLOW}${BOLD}── ${name} ──${RESET}"
  if "$@"; then
    echo -e "${GREEN}${BOLD}✔ ${name}: PASS${RESET}"
    RESULTS+=("PASS")
  else
    echo -e "${RED}${BOLD}✘ ${name}: FAIL${RESET}"
    RESULTS+=("FAIL")
  fi
  echo ""
}

print_header

run_step "Build"          pnpm build
run_step "Solhint"        pnpm lint:sol
run_step "Slither"        pnpm security:slither
run_step "Hardhat Tests"  pnpm test
run_step "Foundry Tests"  forge test -vvv
run_step "Coverage"       forge coverage

echo -e "${YELLOW}${BOLD}════════════════════════════════════════════════════════════${RESET}"
echo -e "${YELLOW}${BOLD}  Summary${RESET}"
echo -e "${YELLOW}${BOLD}════════════════════════════════════════════════════════════${RESET}"

exit_code=0
for i in "${!STEPS[@]}"; do
  if [[ "${RESULTS[$i]}" == "PASS" ]]; then
    echo -e "  ${GREEN}✔ ${STEPS[$i]}${RESET}"
  else
    echo -e "  ${RED}✘ ${STEPS[$i]}${RESET}"
    exit_code=1
  fi
done

echo ""
if [[ $exit_code -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All steps passed.${RESET}"
else
  echo -e "${RED}${BOLD}Some steps failed.${RESET}"
fi

exit $exit_code
