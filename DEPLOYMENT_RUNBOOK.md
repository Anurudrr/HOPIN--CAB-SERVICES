# 🚀 HopIn Deployment Runbook

**Last Updated**: 2026-05-21
**Status**: Production Ready ✅

---

## 📋 Pre-Deployment Verification Checklist

### Phase 1: Code Quality & Build ✅

#### Step 1.1: Validate TypeScript & Linting
```bash
npm run lint
npm run type-check
```

**Expected**: Zero errors, zero warnings

---

#### Step 1.2: Run Full Validation Suite
```bash
npm run validate
```

**Expected**: All checks pass

---

#### Step 1.3: Build Production Bundle
```bash
npm run build
```

**Success criteria**:
- ✅ Build completes without errors
- ✅ Bundle size < 500KB gzipped
- ✅ No console warnings

---

#### Step 1.4: Verify Production Build Locally
```bash
npm run preview
```

**Test**:
- [ ] Homepage loads without errors
- [ ] Navigation works smoothly
- [ ] No console errors in DevTools
- [ ] Responsive design works

---

### Phase 2: Test Coverage & Quality ✅

#### Step 2.1: Run Test Suite
```bash
npm run test
npm run test:coverage
```

**Success criteria**:
- ✅ All tests pass (0 failures)
- ✅ Coverage ≥ 65% for critical paths
- ✅ No skipped tests

---

### Phase 3: Database & API Verification ✅

#### Step 3.1: Apply Supabase Migration
Run in Supabase SQL Editor:
- File: supabase/migrations/004_fix_bookings_and_profiles_CONSOLIDATED.sql

**Expected columns in bookings table**:
- ✅ id, ride_id, rider_id
- ✅ driver_id, city
- ✅ pickup_address, pickup_lat, pickup_lng
- ✅ dest_address, dest_lat, dest_lng
- ✅ fare_total, fare_shared, seats
- ✅ driver_name, vehicle_label
- ✅ status, created_at, updated_at

---

#### Step 3.2: Verify RLS Policies
```sql
SELECT policy_name FROM pg_policies WHERE tablename = 'bookings';
```

**Expected**: Policies exist for riders and drivers

---

### Phase 4: Security Verification ✅

#### Step 4.1: Check Environment Variables
```bash
cat .gitignore | grep .env
```

**Expected**:
```
.env.local
.env
.env.*.local
```

---

#### Step 4.2: Verify Auth Flow
Test in browser:
1. [ ] Sign up creates profile
2. [ ] Login retrieves profile
3. [ ] Logout clears session
4. [ ] Protected routes redirect unauthenticated users
5. [ ] Role-based access works (driver vs rider features)

---

### Phase 5: Performance Baseline ✅

#### Step 5.1: Lighthouse Audit
```bash
# In Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Lighthouse tab
# 3. Generate report
# 4. Target: ≥90 for all categories
```

**Success criteria**:
- ✅ Performance: ≥ 90
- ✅ Accessibility: ≥ 90
- ✅ Best Practices: ≥ 90
- ✅ SEO: ≥ 90

---

#### Step 5.2: Core Web Vitals
**Target metrics**:
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

---

### Phase 6: Vercel Deployment Configuration ✅

#### Step 6.1: Verify Vercel Project Settings
1. Login to Vercel Dashboard
2. Select "hopin" project
3. Settings tab → Environment Variables

**Required variables**:
```
VITE_SUPABASE_URL = [your-supabase-url]
VITE_SUPABASE_ANON_KEY = [your-supabase-anon-key]
```

---

#### Step 6.2: Build Settings
**Framework**: Vite
**Build Command**: `npm run build`
**Output Directory**: `dist/`
**Install Command**: `npm ci`

---

### Phase 7: Deployment Execution ✅

#### Step 7.1: Final Checks
```bash
git status
git log --oneline -5
git diff
npm run validate
```

---

#### Step 7.2: Deploy to Vercel
**Option A: Automatic (Recommended)**
```bash
git push origin main
# Vercel automatically deploys
```

**Option B: Manual**
```bash
vercel --prod
```

---

#### Step 7.3: Verify Deployment
1. [ ] Production URL accessible
2. [ ] No console errors
3. [ ] Homepage loads in < 3 seconds
4. [ ] Authentication works
5. [ ] Booking flow works end-to-end
6. [ ] Mobile responsiveness verified

---

### Phase 8: Post-Deployment Monitoring ✅

#### Step 8.1: Monitor Error Tracking
1. [ ] Dashboards show 0 errors (first 10 minutes)
2. [ ] Set up alerts for critical errors
3. [ ] Create incident response runbook

---

#### Step 8.2: Monitor Performance
- [ ] Lighthouse scores stable (≥90)
- [ ] Core Web Vitals within targets
- [ ] API response times < 500ms

---

## 🔄 Rollback Procedures

### If Deployment Fails

**Step 1: Identify Issue**
```bash
vercel logs production
```

**Step 2: Quick Rollback**
```bash
git revert <commit-hash>
git push origin main
```

**Step 3: Test Rolled Back Version**
- [ ] Homepage accessible
- [ ] No errors in console
- [ ] Basic flows work

---

## ✅ Sign-Off Checklist

**Ready to Deploy?** Check all boxes:

- [ ] npm run validate passes (0 errors)
- [ ] npm run build succeeds (bundle < 500KB)
- [ ] npm run preview loads without errors
- [ ] Test coverage ≥ 65%
- [ ] Supabase migration 004 applied
- [ ] Environment variables set in Vercel
- [ ] Lighthouse score ≥ 90
- [ ] All 8 phases completed

**Deployment Approved By**: _________________
**Date**: _________________
**Time**: _________________

---

**Status**: ✅ Production Ready
