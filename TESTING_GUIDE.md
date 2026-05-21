# Testing Guide for HopIn

<<<<<<< HEAD
**Purpose**: Testing standards and coverage requirements
**Status**: Active
=======
**Purpose**: Establish testing standards and coverage requirements  
**Status**: Active  
>>>>>>> 5ad2492 (update)
**Last Updated**: 2026-05-21

---

## Overview

Testing is critical for deployment readiness. This guide covers:
<<<<<<< HEAD
- Unit tests for state and utilities
- Integration tests for API flows
- Component tests for UI
- E2E tests for user journeys
=======
- **Unit tests** for state and utilities
- **Integration tests** for API flows
- **Component tests** for UI
- **E2E tests** for user journeys
>>>>>>> 5ad2492 (update)

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

<<<<<<< HEAD
### Minimum Thresholds
=======
### Minimum Thresholds (Before Deployment)
>>>>>>> 5ad2492 (update)
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
<<<<<<< HEAD
=======
   - Session recovery
>>>>>>> 5ad2492 (update)

2. **Booking Flow**
   - Ride selection
   - Seat validation
<<<<<<< HEAD
   - Booking confirmation
=======
   - Fare calculation
   - Booking confirmation
   - Booking cancellation
>>>>>>> 5ad2492 (update)

3. **Error Handling**
   - Network errors
   - API errors
<<<<<<< HEAD
=======
   - Validation errors
>>>>>>> 5ad2492 (update)
   - User-facing messages

---

## Existing Tests

### ✅ Already Written

<<<<<<< HEAD
- `src/store/stores.test.ts` - Auth & Booking state (6 tests)
- `src/lib/api.test.ts` - API layer tests
- `src/lib/rideShare.test.ts` - Ride sharing logic
- `src/lib/api.integration.test.ts` - API integration (8 NEW tests)
=======
#### `src/store/stores.test.ts`
**Coverage**: useAuthStore, useBookingStore  
**Tests**: 6 unit tests
- [ ] useAuthStore initialization
- [ ] Sign up flow
- [ ] Profile loading
- [ ] Sign out flow
- [ ] Ride selection
- [ ] Seat clamping

#### `src/lib/api.test.ts`
**Coverage**: Basic API layer  
**Tests**: (Check actual file)

#### `src/lib/rideShare.test.ts`
**Coverage**: Ride sharing logic  
**Tests**: (Check actual file)

### ✅ Newly Added

#### `src/lib/api.integration.test.ts` (NEW)
**Coverage**: API integration with Supabase  
**Tests**: 8 new tests
- [ ] Fetch available rides
- [ ] Create booking with all fields
- [ ] Cancel booking
- [ ] Booking details retrieval
- [ ] Error handling
- [ ] Driver info in booking

---

## Test Writing Guide

### Pattern 1: Unit Testing Zustand Store

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { useBookingStore } from './useBookingStore';

describe('useBookingStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useBookingStore.setState({
      selectedRide: null,
      isSearching: false,
      bookingError: null,
    });
  });

  it('selects a ride', () => {
    const store = useBookingStore.getState();
    store.selectRide(mockRide);

    expect(useBookingStore.getState().selectedRide).toEqual(mockRide);
  });

  it('handles errors gracefully', async () => {
    const store = useBookingStore.getState();
    
    // Trigger error condition
    await store.startSearch(); // This should fail

    expect(useBookingStore.getState().bookingError).toBeTruthy();
  });
});
```

### Pattern 2: API Integration Testing

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { bookRide } from '../lib/api';
import { mockSupabaseClient } from '../mocks/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

describe('bookRide API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends all required parameters', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockBooking,
      error: null,
    });

    await bookRide(
      'ride-1',
      'rider-1',
      2,
      'Home',
      19.0,
      72.0,
      'Office',
      19.1,
      72.1
    );

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('book_ride', {
      p_ride_id: 'ride-1',
      p_rider_id: 'rider-1',
      p_seats: 2,
      p_pickup_address: 'Home',
      p_pickup_lat: 19.0,
      p_pickup_lng: 72.0,
      p_dest_address: 'Office',
      p_dest_lat: 19.1,
      p_dest_lng: 72.1,
    });
  });
});
```

### Pattern 3: Component Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from './BookingForm';

describe('BookingForm', () => {
  it('renders form fields', () => {
    render(<BookingForm />);

    expect(screen.getByLabelText(/seats/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book/i })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<BookingForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/seats/i), '2');
    await user.click(screen.getByRole('button', { name: /book/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ seats: 2 })
      );
    });
  });
});
```

---

## Tests to Add (Priority Order)

### CRITICAL (Do Before Deployment)

#### 1. Auth Store Error Handling
**File**: `src/store/useAuthStore.test.ts` (enhance existing)
**Focus**: Error cases
```typescript
it('handles login errors', async () => {
  // Test invalid credentials
  // Test network errors
  // Test RLS policy violations
});
```

#### 2. Booking State Machine
**File**: `src/store/useBookingStore.test.ts` (enhance existing)
**Focus**: State transitions
```typescript
it('validates state transitions', () => {
  // isSearching → activeRide → completed/cancelled
  // Invalid transitions should be rejected
});
```

#### 3. Error Boundary
**File**: `src/components/ErrorBoundary.test.tsx` (NEW)
**Focus**: Error catching
```typescript
it('catches and displays errors', () => {
  // Component that throws error
  // Verify error UI shows
  // Verify reload button works
});
```

#### 4. Booking End-to-End
**File**: `src/lib/booking.e2e.test.ts` (NEW)
**Focus**: Complete flow
```typescript
it('complete booking journey', async () => {
  // 1. Get available rides
  // 2. Select ride
  // 3. Book ride
  // 4. Verify booking created
  // 5. Cancel booking
});
```

### HIGH (Complete This Week)

#### 5. Profile Loading
```typescript
it('loads user profile with all fields', async () => {
  // Test profile data matches schema
  // Test missing optional fields handled
});
```

#### 6. Ride Filtering
```typescript
it('filters rides by city and availability', () => {
  // Test city filter works
  // Test availability filter works
  // Test date/time filter works
});
```

#### 7. Fare Calculation
```typescript
it('calculates fare correctly', () => {
  // Test: fare_total = fare_per_seat * seats
  // Test: fare_shared = fare_total / num_riders
  // Test edge cases (rounding, minimum fare)
});
```

### MEDIUM (Complete Before Launch)

#### 8. UI Component Tests
```typescript
it('RideCard renders all booking details', () => {
  // Test all 19 booking fields display
  // Test driver info shows
  // Test map preview works
});

it('BookingForm validates input', () => {
  // Test seat validation (1-capacity)
  // Test address validation
  // Test date/time validation
});
```

#### 9. Loading States
```typescript
it('shows skeletons while loading', () => {
  // Test Skeleton component renders
  // Test correct height/width
  // Test animation plays
});
```

#### 10. Error Messages
```typescript
it('maps API errors to user messages', () => {
  // Test error message humanization
  // Test retry logic triggers
  // Test error recovery
});
```
>>>>>>> 5ad2492 (update)

---

## Running Tests

### Development Loop
```bash
<<<<<<< HEAD
npm run test -- --watch       # Auto-run on changes
npm run test:ui               # Visual debugging
npm run test:coverage         # With coverage report
```

### Pre-commit
```bash
npm run test:coverage
# Must pass before git push
=======
# Watch mode: auto-run on file changes
npm run test -- --watch

# With UI for visual debugging
npm run test:ui

# Then open http://localhost:51204
```

### CI/CD (Before Commit)
```bash
# Run full suite with coverage
npm run test:coverage

# Check coverage thresholds
# Must pass before git push

# Integrate with husky:
# npx husky add .husky/pre-commit "npm run test"
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# Open in browser
open coverage/index.html
# or
start coverage/index.html  # Windows
```

---

## Mocking Strategy

### Supabase Mocking
Located in: `src/mocks/supabase.ts`

```typescript
import { mockSupabaseClient } from '../mocks/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Use in tests
mockSupabaseClient.from.mockReturnValueOnce(
  createQueryBuilder({
    data: mockRides,
    error: null,
  })
);
```

### Mock Data
Located in: `src/mocks/`

Pre-built fixtures:
- `mockAuthUser`: User session object
- `mockRide`: Complete ride with driver/vehicle
- `mockBooking`: Complete booking with all fields
- `mockProfile`: User profile

### Network Mocking
For API calls to external services:

```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: async () => ({ success: true }),
  })
);
```

---

## Performance Testing

### Check Test Execution Time
```bash
npm run test -- --reporter=verbose
```

**Target**: All tests complete in < 10 seconds

### Profile Coverage
```bash
npm run test:coverage
# Review coverage/index.html for uncovered lines
```

---

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:coverage
```

---

## Debugging Tests

### View Test Output
```bash
# Verbose output
npm run test -- --reporter=verbose

# Stop on first failure
npm run test -- --bail

# Run specific test
npm run test -- stores.test.ts
npm run test -- -t "selects a ride"
```

### Debug in Browser
```bash
npm run test:ui
# Click test to see detailed output
# Inspect component state
```

### Check Mock Calls
```typescript
expect(mockSupabaseClient.rpc).toHaveBeenCalled();
expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('book_ride', ...);
expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1);
>>>>>>> 5ad2492 (update)
```

---

## Pre-Deployment Checklist

<<<<<<< HEAD
Before going live:
- [ ] `npm run test` passes
- [ ] Coverage ≥ 65%
- [ ] Critical paths 100%
- [ ] No skipped tests
- [ ] No console errors

---

=======
Before going live, ensure:

- [ ] `npm run test` passes (all tests)
- [ ] `npm run test:coverage` shows ≥ 65% coverage
- [ ] All critical paths have 100% coverage
- [ ] No skipped tests (no `.skip` or `.todo`)
- [ ] All assertions pass
- [ ] No console errors/warnings in test output
- [ ] Mock data matches production schema
- [ ] Error cases tested
- [ ] Network failures handled
- [ ] Performance acceptable (tests < 10s)

---

## Questions?

Refer to:
- **Vitest Docs**: https://vitest.dev/
- **Testing Library**: https://testing-library.com/
- **Mock Examples**: `src/mocks/supabase.ts`
- **Existing Tests**: `src/store/stores.test.ts`

---

**Last Updated**: 2026-05-21 08:13 UTC+05:30  
>>>>>>> 5ad2492 (update)
**Status**: ✅ Ready to Use
