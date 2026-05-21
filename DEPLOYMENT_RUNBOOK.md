# 🚀 HopIn Deployment Runbook

<<<<<<< HEAD
**Last Updated**: 2026-05-21
=======
**Last Updated**: 2026-05-21  
>>>>>>> 5ad2492 (update)
**Status**: Production Ready ✅

---

## 📋 Pre-Deployment Verification Checklist

### Phase 1: Code Quality & Build ✅

#### Step 1.1: Validate TypeScript & Linting
```bash
npm run lint
npm run type-check
```
<<<<<<< HEAD

**Expected**: Zero errors, zero warnings
=======
**Expected**: Zero errors, zero warnings  
**If fails**: Review error messages and fix violations before proceeding

**Success criteria:**
- ✅ ESLint passes (no errors)
- ✅ TypeScript strict mode passes (no type errors)
- ✅ No unused variables or imports
>>>>>>> 5ad2492 (update)

---

#### Step 1.2: Run Full Validation Suite
```bash
npm run validate
```
<<<<<<< HEAD

**Expected**: All checks pass
=======
**Expected**: All checks pass  
**Output includes**: Linting, type-checking, and tests
>>>>>>> 5ad2492 (update)

---

#### Step 1.3: Build Production Bundle
```bash
npm run build
```
<<<<<<< HEAD

**Success criteria**:
- ✅ Build completes without errors
- ✅ Bundle size < 500KB gzipped
- ✅ No console warnings
=======
**Expected Output**:
```
✓ 1234 modules transformed
vite v6.2.3 building for production...
dist/index.html               1.23 kB
dist/assets/main-abc123.js    234.56 kB
✓ built in 45.23s
```

**Success criteria:**
- ✅ Build completes without errors
- ✅ Bundle size < 500KB gzipped (check dist/ folder)
- ✅ No console warnings in build output
- ✅ Source maps generated for debugging
>>>>>>> 5ad2492 (update)

---

#### Step 1.4: Verify Production Build Locally
```bash
npm run preview
```
<<<<<<< HEAD
=======
**Expected**: App loads on `http://localhost:5173` with full functionality
>>>>>>> 5ad2492 (update)

**Test**:
- [ ] Homepage loads without errors
- [ ] Navigation works smoothly
- [ ] No console errors in DevTools
<<<<<<< HEAD
- [ ] Responsive design works
=======
- [ ] Responsive design works on mobile & desktop
>>>>>>> 5ad2492 (update)

---

### Phase 2: Test Coverage & Quality ✅

#### Step 2.1: Run Test Suite
```bash
npm run test
npm run test:coverage
```

<<<<<<< HEAD
=======
**Expected output**:
```
✓ stores.test.ts (6 tests)
✓ api.integration.test.ts (8 tests)
✓ rideShare.test.ts (4 tests)

Tests:  18 passed | 18 total
Coverage: 
  Statements   : 72% ( 450/625 )
  Branches     : 68% ( 120/176 )
  Functions    : 75% ( 45/60 )
  Lines        : 73% ( 440/600 )
```

>>>>>>> 5ad2492 (update)
**Success criteria**:
- ✅ All tests pass (0 failures)
- ✅ Coverage ≥ 65% for critical paths
- ✅ No skipped tests

<<<<<<< HEAD
=======
**If coverage is low**:
1. Review `coverage/` report in browser
2. Identify untested paths
3. Add tests for critical flows (booking, auth)
4. Rerun until threshold met

>>>>>>> 5ad2492 (update)
---

### Phase 3: Database & API Verification ✅

#### Step 3.1: Apply Supabase Migration
<<<<<<< HEAD
Run in Supabase SQL Editor:
- File: supabase/migrations/004_fix_bookings_and_profiles_CONSOLIDATED.sql

**Expected columns in bookings table**:
=======
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/004_fix_bookings_and_profiles_CONSOLIDATED.sql
```

**Verify in Supabase Dashboard**:
1. SQL Editor → View migrations
2. Check that migration shows as "applied"
3. Tables panel → Confirm all columns exist

**Expected columns in `bookings` table**:
>>>>>>> 5ad2492 (update)
- ✅ id, ride_id, rider_id
- ✅ driver_id, city
- ✅ pickup_address, pickup_lat, pickup_lng
- ✅ dest_address, dest_lat, dest_lng
- ✅ fare_total, fare_shared, seats
- ✅ driver_name, vehicle_label
- ✅ status, created_at, updated_at

---

<<<<<<< HEAD
#### Step 3.2: Verify RLS Policies
```sql
SELECT policy_name FROM pg_policies WHERE tablename = 'bookings';
```

**Expected**: Policies exist for riders and drivers
=======
#### Step 3.2: Run Verification Queries
Execute in Supabase SQL Editor:

**Query 1: Verify Booking Table Structure**
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
```
**Expected**: 19 columns listed (see Step 3.1)

**Query 2: Verify RLS Policies**
```sql
SELECT policy_name, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'bookings';
```
**Expected**: Policies exist for riders and drivers

**Query 3: Test Booking Creation (Mock)**
```sql
-- Insert test booking
INSERT INTO bookings (
  ride_id, rider_id, driver_id, city,
  pickup_address, pickup_lat, pickup_lng,
  dest_address, dest_lat, dest_lng,
  fare_total, fare_shared, seats, status,
  driver_name, vehicle_label
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  'Mumbai',
  'Airport T1', 19.0876, 72.8194,
  'BKC', 19.0760, 72.8777,
  250, 125, 1, 'confirmed',
  'Test Driver', 'Maruti Swift DL01AB1234'
);

-- Verify insert succeeded
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1;
```
**Expected**: Insert succeeds and data is retrievable

---

#### Step 3.3: Test API Integration
From the dev environment, verify API calls work:

```bash
# Start dev server
npm run dev

# In browser console, test API:
const rides = await fetch('/.netlify/functions/rides?city=Mumbai')
  .then(r => r.json());
console.log(rides);
```

**Success criteria**:
- ✅ API returns ride data
- ✅ Booking creation succeeds
- ✅ Error handling works (try invalid city)
>>>>>>> 5ad2492 (update)

---

### Phase 4: Security Verification ✅

#### Step 4.1: Check Environment Variables
```bash
<<<<<<< HEAD
=======
# Verify .env.local exists and is in .gitignore
>>>>>>> 5ad2492 (update)
cat .gitignore | grep .env
```

**Expected**:
```
.env.local
.env
.env.*.local
```

<<<<<<< HEAD
=======
**Critical**: Ensure these are NEVER committed:
- ❌ VITE_SUPABASE_ANON_KEY
- ❌ VITE_SUPABASE_URL (can be public but verify it's not exposed in repo)

>>>>>>> 5ad2492 (update)
---

#### Step 4.2: Verify Auth Flow
Test in browser:
1. [ ] Sign up creates profile
2. [ ] Login retrieves profile
3. [ ] Logout clears session
4. [ ] Protected routes redirect unauthenticated users
5. [ ] Role-based access works (driver vs rider features)

---

<<<<<<< HEAD
=======
#### Step 4.3: Check Secrets
```bash
npm run secret-scan
# or manually review
git log -p --all -S 'VITE_SUPABASE' | head -100
```

**Expected**: No secrets in commit history

---

>>>>>>> 5ad2492 (update)
### Phase 5: Performance Baseline ✅

#### Step 5.1: Lighthouse Audit
```bash
# In Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Lighthouse tab
# 3. Generate report
<<<<<<< HEAD
# 4. Target: ≥90 for all categories
=======
# 4. Target: ≥90 for Performance, Accessibility, Best Practices, SEO
>>>>>>> 5ad2492 (update)
```

**Success criteria**:
- ✅ Performance: ≥ 90
- ✅ Accessibility: ≥ 90
- ✅ Best Practices: ≥ 90
- ✅ SEO: ≥ 90

<<<<<<< HEAD
---

#### Step 5.2: Core Web Vitals
**Target metrics**:
=======
**If scores low**:
- Compress images (public/ folder)
- Review unused dependencies
- Optimize critical rendering path
- Profile bundle size with `npm run build -- --report`

---

#### Step 5.2: Core Web Vitals
Test with [PageSpeed Insights](https://pagespeed.web.dev/):

**Target metrics** (from production):
>>>>>>> 5ad2492 (update)
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

<<<<<<< HEAD
=======
**Current baseline** (to measure after deployment):
- LCP: _____
- FID: _____
- CLS: _____

>>>>>>> 5ad2492 (update)
---

### Phase 6: Vercel Deployment Configuration ✅

#### Step 6.1: Verify Vercel Project Settings
<<<<<<< HEAD
1. Login to Vercel Dashboard
=======
1. Login to [Vercel Dashboard](https://vercel.com/dashboard)
>>>>>>> 5ad2492 (update)
2. Select "hopin" project
3. Settings tab → Environment Variables

**Required variables**:
```
VITE_SUPABASE_URL = [your-supabase-url]
VITE_SUPABASE_ANON_KEY = [your-supabase-anon-key]
```

<<<<<<< HEAD
---

#### Step 6.2: Build Settings
**Framework**: Vite
**Build Command**: `npm run build`
**Output Directory**: `dist/`
**Install Command**: `npm ci`
=======
**Danger**: Do NOT commit these to .env files in repo!

---

#### Step 6.2: Build Settings
**Framework**: Vite  
**Build Command**: `npm run build`  
**Output Directory**: `dist/`  
**Install Command**: `npm ci` (or `npm install`)

**Verify these are correct in Project Settings → Build & Deploy**

---

#### Step 6.3: Domain Configuration
1. [ ] Custom domain added (if applicable)
2. [ ] HTTPS enabled (automatic with Vercel)
3. [ ] DNS records configured
4. [ ] SSL certificate valid
>>>>>>> 5ad2492 (update)

---

### Phase 7: Deployment Execution ✅

<<<<<<< HEAD
#### Step 7.1: Final Checks
```bash
git status
git log --oneline -5
git diff
=======
#### Step 7.1: Final Checks Before Deploy
```bash
# 1. All code committed
git status
# Expected: nothing to commit, working tree clean

# 2. Latest changes pushed
git log --oneline -5

# 3. No uncommitted changes
git diff

# 4. Validate once more
>>>>>>> 5ad2492 (update)
npm run validate
```

---

#### Step 7.2: Deploy to Vercel
**Option A: Automatic (Recommended)**
```bash
git push origin main
<<<<<<< HEAD
# Vercel automatically deploys
=======
# Vercel automatically deploys main branch
>>>>>>> 5ad2492 (update)
```

**Option B: Manual**
```bash
<<<<<<< HEAD
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
=======
# Install Vercel CLI if needed
npm install -g vercel

# Deploy
vercel --prod
```

**Expected output**:
```
✓ Production deployment complete
✓ https://hopin.vercel.app
✓ All 3 checks passed
```

---

#### Step 7.3: Verify Deployment
1. [ ] Production URL accessible: https://hopin.vercel.app
2. [ ] No console errors in DevTools
3. [ ] Homepage loads in < 3 seconds
4. [ ] Authentication works (sign up / login)
5. [ ] Booking flow works end-to-end
6. [ ] API calls return data
7. [ ] Error handling working (test with invalid data)
8. [ ] Mobile responsiveness verified
>>>>>>> 5ad2492 (update)

---

### Phase 8: Post-Deployment Monitoring ✅

#### Step 8.1: Monitor Error Tracking
<<<<<<< HEAD
=======
**If using Sentry/LogRocket**:
>>>>>>> 5ad2492 (update)
1. [ ] Dashboards show 0 errors (first 10 minutes)
2. [ ] Set up alerts for critical errors
3. [ ] Create incident response runbook

<<<<<<< HEAD
=======
**Basic monitoring** (no tool):
1. [ ] Check Vercel Analytics for errors
2. [ ] Monitor performance metrics
3. [ ] Check browser console for issues

>>>>>>> 5ad2492 (update)
---

#### Step 8.2: Monitor Performance
- [ ] Lighthouse scores stable (≥90)
- [ ] Core Web Vitals within targets
- [ ] API response times < 500ms
<<<<<<< HEAD
=======
- [ ] Database query times < 200ms

---

#### Step 8.3: Monitor User Analytics
- [ ] Track sign-ups and user activation
- [ ] Monitor booking conversion rate
- [ ] Track error events
- [ ] Monitor user feedback
>>>>>>> 5ad2492 (update)

---

## 🔄 Rollback Procedures

### If Deployment Fails

**Step 1: Identify Issue**
```bash
<<<<<<< HEAD
vercel logs production
```

**Step 2: Quick Rollback**
```bash
git revert <commit-hash>
git push origin main
=======
# Check Vercel deployment logs
vercel logs production

# Check browser console for errors
# Check Supabase logs
```

**Step 2: Quick Rollback** (last known good version)
```bash
# Option 1: Revert commit
git revert <commit-hash>
git push origin main

# Option 2: Vercel dashboard
# Deployments tab → click "Rollback"
>>>>>>> 5ad2492 (update)
```

**Step 3: Test Rolled Back Version**
- [ ] Homepage accessible
- [ ] No errors in console
- [ ] Basic flows work

<<<<<<< HEAD
=======
**Step 4: Investigate Issue**
- [ ] Review error logs
- [ ] Check environment variables
- [ ] Verify database is accessible
- [ ] Check API connectivity

**Step 5: Fix & Re-deploy**
```bash
# After fix is applied
git push origin main
# Wait for automatic deployment
```

---

### Critical Issues Checklist

| Issue | Quick Fix | Prevention |
|-------|-----------|-----------|
| Supabase auth fails | Check VITE_SUPABASE_ANON_KEY | Verify env vars before deploy |
| Database offline | Check Supabase dashboard | Monitor uptime |
| Build fails | Check build logs | Run `npm run build` locally first |
| 404 errors | Check dist/ output | Verify build completed |
| Performance degradation | Check bundle size | Profile before deploy |
| CORS errors | Check Supabase CORS settings | Test API calls before deploy |

---

## 📊 Deployment Metrics

### Before Deployment (Baseline)
- Bundle size: _____ KB
- Lighthouse Performance: _____ / 100
- Test coverage: _____ %
- API response time: _____ ms

### After Deployment (Monitor)
- Bundle size: _____ KB
- Lighthouse Performance: _____ / 100
- Error rate: _____ per 1000 requests
- User feedback: _____ positive

---

## 🆘 Support & Troubleshooting

### Common Issues

**"VITE_SUPABASE_ANON_KEY not found"**
- [ ] Check Vercel Environment Variables
- [ ] Verify variable names are exactly correct
- [ ] Redeploy after updating

**"Database connection refused"**
- [ ] Check Supabase project status
- [ ] Verify migration 004 is applied
- [ ] Check network connectivity

**"Build fails with TypeScript errors"**
- [ ] Run `npm run type-check` locally
- [ ] Fix reported errors
- [ ] Commit and push

**"App is slow after deployment"**
- [ ] Run Lighthouse audit
- [ ] Check bundle size (should be < 500KB gzipped)
- [ ] Review Core Web Vitals
- [ ] Profile Vercel Analytics

---

## 📞 Escalation Path

**Tier 1 - Self Service** (check these first):
1. Review error logs in Vercel dashboard
2. Check Supabase logs and status
3. Verify environment variables
4. Test locally first

**Tier 2 - Investigation** (if Tier 1 doesn't help):
1. Check Vercel docs: https://vercel.com/docs
2. Check Supabase docs: https://supabase.com/docs
3. Review recent commits for breaking changes
4. Check git history for config changes

**Tier 3 - Emergency** (if Tier 2 doesn't help):
1. Perform rollback (see Rollback Procedures)
2. Gather logs and error messages
3. Open support tickets with:
   - Error messages and logs
   - Deployment time
   - Last working deployment
   - Recent changes made

>>>>>>> 5ad2492 (update)
---

## ✅ Sign-Off Checklist

**Ready to Deploy?** Check all boxes:

<<<<<<< HEAD
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
=======
- [ ] npm run validate passes (lint + type-check + test)
- [ ] npm run build succeeds (bundle < 500KB)
- [ ] npm run preview loads without errors
- [ ] Test coverage ≥ 65% for critical paths
- [ ] Supabase migration 004 is applied
- [ ] Verification queries all pass
- [ ] Environment variables set in Vercel
- [ ] Security check passes (no secrets in code)
- [ ] Lighthouse score ≥ 90
- [ ] Pre-deployment checklist complete

**Deployment Approved By**: _________________  
**Date**: _________________  
>>>>>>> 5ad2492 (update)
**Time**: _________________

---

<<<<<<< HEAD
=======
**Questions? Refer to**:
- DOCUMENTATION_INDEX.md (navigation)
- SUPABASE_FIXES_QUICK_REF.md (database setup)
- README.md (setup instructions)

**Last Updated**: 2026-05-21 08:13 UTC+05:30  
>>>>>>> 5ad2492 (update)
**Status**: ✅ Production Ready
