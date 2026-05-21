# Testing Guide for HopIn

**Purpose**: Testing standards and coverage requirements
**Status**: Active
**Last Updated**: 2026-05-21

---

## Overview

Testing is critical for deployment readiness. This guide covers:
- Unit tests for state and utilities
- Integration tests for API flows
- Component tests for UI
- E2E tests for user journeys

---

## Test Infrastructure

### Installed Tools
- **Vitest**: Unit & integration testing
- **JSDOM**: DOM simulation
- **@vitest/ui**: Visual test runner
- **Mock data**: Pre-configured test fixtures

### Run Commands
```bash
npm run test              # Run all tests once
npm run test:ui           # Run with visual UI
npm run test:coverage     # Generate coverage report
npm run validate          # Lint + type-check + tests
```

---

## Coverage Requirements

### Minimum Thresholds
| Type | Minimum | Target |
|------|---------|--------|
| Statements | 60% | 75% |
| Branches | 50% | 70% |
| Functions | 65% | 80% |
| Lines | 60% | 75% |

### Critical Paths (100% Required)
1. **Authentication**
   - Sign up validation
   - Login error handling
   - Logout state clearing

2. **Booking Flow**
   - Ride selection
   - Seat validation
   - Booking confirmation

3. **Error Handling**
   - Network errors
   - API errors
   - User-facing messages

---

## Existing Tests

### ✅ Already Written

- `src/store/stores.test.ts` - Auth & Booking state (6 tests)
- `src/lib/api.test.ts` - API layer tests
- `src/lib/rideShare.test.ts` - Ride sharing logic
- `src/lib/api.integration.test.ts` - API integration (8 NEW tests)

---

## Running Tests

### Development Loop
```bash
npm run test -- --watch       # Auto-run on changes
npm run test:ui               # Visual debugging
npm run test:coverage         # With coverage report
```

### Pre-commit
```bash
npm run test:coverage
# Must pass before git push
```

---

## Pre-Deployment Checklist

Before going live:
- [ ] `npm run test` passes
- [ ] Coverage ≥ 65%
- [ ] Critical paths 100%
- [ ] No skipped tests
- [ ] No console errors

---

**Status**: ✅ Ready to Use
