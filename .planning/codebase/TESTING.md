# Testing

## Framework
- **Vitest**: Core test runner.

## Strategy
- **Unit Tests**: Coverage for individual services (DALC, RMoA, Verifier).
- **Integration Tests**: Pipeline slices <10s.
- **E2E Regression**: Mandatory 100% pass on Golden Fixture Set (20 prompts).

## Gates
- **Pre-commit**: `git-secrets`, `truffleHog`, `lint-staged`.
- **CI**: Security scans, DB migration tests, full fixture regression.
