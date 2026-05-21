# Quick Start: Validation & Deployment

**Commands to run for verification and deployment**

---

## Phase 1: Verify Code Quality

```bash
npm run lint                # Check linting
npm run type-check          # Check TypeScript
npm run validate            # All checks together
```

---

## Phase 2: Build & Test

```bash
npm run build               # Production build
npm run preview             # Test production build
npm run test                # Run all tests
npm run test:coverage       # Generate coverage report
```

---

## Phase 3: Deploy

```bash
# Automatic (recommended)
git push origin main

# Or manual
vercel --prod
```

---

## Phase 4: Verify Production

1. Open: https://hopin.vercel.app
2. Test: Sign up, login, book ride
3. Check: DevTools Console (no errors)
4. Measure: Lighthouse audit

---

## Command Reference

```bash
npm run dev                    # Dev server (port 3000)
npm run build                  # Production build
npm run preview                # Preview production
npm run lint                   # Linting
npm run type-check             # Type checking
npm run test                   # Tests
npm run test:coverage          # Coverage report
npm run test:ui                # Visual test UI
npm run validate               # All checks
npm run format                 # Format code
npm run lint:fix               # Fix linting
```

---

**Status**: ✅ Ready to Deploy
