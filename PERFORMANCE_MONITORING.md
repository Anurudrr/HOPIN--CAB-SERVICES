# Performance & Monitoring Guide

<<<<<<< HEAD
**Status**: Deployment Ready
**Version**: 1.0
=======
**Status**: Deployment Ready  
**Version**: 1.0  
>>>>>>> 5ad2492 (update)
**Date**: 2026-05-21

---

## Performance Targets

### Core Web Vitals (Google Metrics)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s |
| **FID** (First Input Delay) | < 100ms | 100-300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |

### Custom Metrics

| Metric | Target |
|--------|--------|
| Initial page load | < 3s |
| API response time | < 500ms |
| Bundle size (gzipped) | < 500KB |
| Lighthouse score | ≥ 90 |
| Time to Interactive (TTI) | < 5s |

---

<<<<<<< HEAD
## Monitoring Setup

### Option 1: Manual Monitoring (Free)
1. Open DevTools daily
2. Check Console for errors
3. Run Lighthouse weekly
4. Screenshot and document

### Option 2: Sentry Integration
=======
## Baseline Measurement

### Before Deployment

#### 1. Run Lighthouse Audit
```bash
# Manual in Chrome DevTools
# Open DevTools → Lighthouse → Generate Report

# Save results:
Lighthouse Score: Performance ___/100
LCP: ___ s
FID: ___ ms
CLS: ___
TTI: ___ s
```

#### 2. Check Bundle Size
```bash
npm run build

# Output shows:
# dist/index.html                    1.23 kB
# dist/assets/main-abc.js           234.56 kB
# dist/assets/vendor-def.js         125.34 kB
# dist/assets/styles-ghi.css         45.67 kB

# Total gzipped: _____ KB
```

#### 3. Test API Response Times
```javascript
// In browser console
console.time('fetch-rides');
const rides = await fetch('/.netlify/functions/rides?city=Mumbai')
  .then(r => r.json());
console.timeEnd('fetch-rides');
// Output: fetch-rides: 234ms
```

#### 4. Monitor from PageSpeed Insights
Go to: https://pagespeed.web.dev/

Test URL: https://hopin.vercel.app (after deployment)

Record baseline scores

---

## Bundle Analysis

### Analyze Dependencies
```bash
npm run build -- --report
# Generates visual report of bundle composition
```

### Expected Breakdown
```
dist/
├── index.html (1.2 KB)
├── assets/
│   ├── main-[hash].js (200-250 KB)        # React + app code
│   ├── vendor-[hash].js (100-150 KB)      # node_modules
│   ├── styles-[hash].css (40-60 KB)       # Tailwind
│   └── leaflet-[hash].js (120-160 KB)     # Maps library
├── sitemap.xml
└── manifest.json

Total: 450-650 KB uncompressed
Gzipped: 150-250 KB
```

### Optimization Opportunities

**If bundle is > 500KB gzipped:**

1. **Check for large dependencies**
   ```bash
   npm ls [package-name]
   ```

2. **Enable code splitting**
   ```typescript
   // Already configured in vite.config.ts
   // Verify routes are lazy-loaded:
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

3. **Remove unused packages**
   ```bash
   npm prune
   npm dedupe
   ```

4. **Use lighter alternatives**
   | Heavy | Light |
   |-------|-------|
   | Moment.js | date-fns |
   | Lodash | lodash-es (tree-shakeable) |
   | Bootstrap | Tailwind (already using ✅) |

---

## API Performance

### Response Time Targets

```
Expected latencies:
- Fetch rides: < 200ms
- Create booking: < 500ms
- Cancel booking: < 300ms
- User profile: < 100ms
```

### Monitor Database Performance

**In Supabase dashboard**:
1. Query Performance tab
2. Check query execution times
3. Identify slow queries (> 1000ms)
4. Add indexes if needed

**Slow queries to watch**:
```sql
-- Booking with joins (typically 200-300ms)
SELECT * FROM bookings 
JOIN rides ON bookings.ride_id = rides.id 
JOIN profiles ON bookings.driver_id = profiles.id;

-- Ride availability (typically 150-200ms)
SELECT * FROM rides 
WHERE city = 'Mumbai' AND seats_available > 0;

-- Recent bookings (typically < 100ms)
SELECT * FROM bookings 
WHERE rider_id = $1 
ORDER BY created_at DESC LIMIT 10;
```

---

## Monitoring Setup

### Option 1: Manual Monitoring (No Tool Required)

#### Daily Health Check
```javascript
// Open browser console daily
const health = {
  timestamp: new Date(),
  online: navigator.onLine,
  performance: performance.getEntriesByType('navigation')[0],
};
console.log(health);
```

#### Monitor Errors
1. Open DevTools → Console
2. Check for any red errors
3. Screenshot and document

---

### Option 2: Sentry Integration (Recommended)

#### Setup Sentry
>>>>>>> 5ad2492 (update)
```bash
npm install @sentry/react @sentry/tracing
```

<<<<<<< HEAD
Set environment variable:
=======
#### Initialize in main.tsx
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### Set Environment Variable
In Vercel dashboard, add:
>>>>>>> 5ad2492 (update)
```
VITE_SENTRY_DSN = [your-sentry-dsn]
```

<<<<<<< HEAD
### Option 3: Vercel Analytics (Built-in)
1. Vercel Dashboard → Analytics
2. View Core Web Vitals
3. Monitor performance breakdown

---

## Performance Optimization

### Images
- [ ] All images < 100KB
- [ ] Using WebP format
- [ ] Lazy loading enabled
- [ ] Responsive images

### Code
- [ ] Route-based code splitting
- [ ] Tree-shaking enabled
- [ ] No console.log in production
- [ ] Minified output
=======
#### Dashboard Alerts
1. Log in to sentry.io
2. Create alert for:
   - Error rate > 5% per 5 min
   - New error types
   - Regression in performance

---

### Option 3: Vercel Analytics (Built-in)

#### Enable Web Vitals Tracking
1. Vercel Dashboard → hopin project
2. Analytics tab → Enable Web Analytics
3. View Core Web Vitals in real-time

#### Performance Insights
- Real User Monitoring (RUM)
- Geo performance breakdown
- Device performance breakdown
- Browser compatibility

---

## Performance Optimization Checklist

### Images
- [ ] All images in `public/` optimized (< 100KB each)
- [ ] Using WebP format where possible
- [ ] Lazy loading on routes (route-based code splitting ✅)
- [ ] Responsive images with srcset

### Code
- [ ] Route-based code splitting ✅
- [ ] Lazy import of heavy dependencies
- [ ] Tree-shaking enabled (Vite default ✅)
- [ ] No console.log in production
- [ ] Minified output ✅

### Fonts
- [ ] Using system fonts or limited Google Fonts
- [ ] Font-display: swap to prevent FOIT
- [ ] Preload critical fonts
>>>>>>> 5ad2492 (update)

### Database
- [ ] Indexes on frequently queried columns
- [ ] Pagination for large result sets
- [ ] Connection pooling enabled

### Caching
<<<<<<< HEAD
- [ ] Static assets cached
- [ ] API responses cached
- [ ] Service Worker for offline support
=======
- [ ] Static assets cached (Vercel default ✅)
- [ ] API responses cached where appropriate
- [ ] Service Worker for offline support (optional)

### Monitoring
- [ ] Error tracking enabled (Sentry or similar)
- [ ] Performance monitoring active
- [ ] Alerts configured for anomalies

---

## Real-time Monitoring

### Vercel Deployments Tab
```
Every deployment shows:
✓ Duration: 45.2s
✓ Build: 35s
✓ Functions: 10.2s
✓ Build size: 234.5 MB
```

**Monitor for**:
- Build time increasing (sign of new deps)
- Build size growing (sign of bloat)
- Function cold start times

### Lighthouse in CI/CD (Optional)

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: treosh/lighthouse-ci-action@v9
        with:
          uploadArtifacts: true
```

---

## Performance Incidents

### If Performance Degrades

**Step 1: Identify Issue**
```bash
# Check recent deployments
vercel deployments

# Check bundle size increased
npm run build

# Check database is responsive
```

**Step 2: Quick Diagnosis**
```javascript
// In browser console
const perf = performance.getEntries();
perf.forEach(entry => {
  if (entry.duration > 1000) {
    console.warn(`Slow: ${entry.name} (${entry.duration}ms)`);
  }
});
```

**Step 3: Common Fixes**
| Problem | Fix |
|---------|-----|
| Slow API | Check database load, add indexes |
| Large bundle | Remove unused deps, enable tree-shaking |
| Slow page load | Enable route-based code splitting |
| Memory leak | Profile in DevTools, check for uncleaned listeners |

**Step 4: Investigate**
```javascript
// Check Core Web Vitals in real-time
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);  // Log CLS
getFID(console.log);  // Log FID
getLCP(console.log);  // Log LCP
```

---

## Monitoring Dashboard

### Create Simple Status Page (Optional)

**File: `public/status.json`**
```json
{
  "status": "operational",
  "lastUpdated": "2026-05-21T08:13:00Z",
  "uptime": 99.95,
  "services": {
    "api": "operational",
    "database": "operational",
    "cdn": "operational"
  },
  "incidents": []
}
```

**Check status**:
```bash
curl https://hopin.vercel.app/status.json
```
>>>>>>> 5ad2492 (update)

---

## Alert Thresholds

Set up alerts for:
<<<<<<< HEAD
- Error rate > 5% per 5 min
- API response > 1s (p95)
- Bundle size > 600KB
- Lighthouse < 85
- LCP > 4s
- CLS > 0.15
=======

| Alert | Threshold | Action |
|-------|-----------|--------|
| Error rate > 5% | Per 5 min | Page on-call |
| API response > 1s | Percentile p95 | Investigate DB |
| Bundle size > 600KB | Per deployment | Review changes |
| Lighthouse < 85 | Per deploy | Fail deploy |
| LCP > 4s | Per 1000 requests | Optimize images |
| CLS > 0.15 | Per session | Fix layout shifts |
>>>>>>> 5ad2492 (update)

---

## Weekly Performance Review

<<<<<<< HEAD
### Daily Standup
- [ ] Check Vercel Analytics
- [ ] Review error tracking
- [ ] Run Lighthouse audit
- [ ] Check database slow queries

### Monthly Deep Dive
- [ ] Full performance audit
- [ ] Plan optimizations
- [ ] Measure improvements

---

=======
### Monday Standup Checklist
- [ ] Check Vercel Analytics
- [ ] Review Sentry for errors
- [ ] Run Lighthouse audit
- [ ] Check database slow queries
- [ ] Review bundle size trends

### Monthly Deep Dive
- [ ] Full performance audit
- [ ] Competitive analysis (similar apps)
- [ ] Plan optimizations
- [ ] Measure impact of changes

---

## Production Monitoring Checklist

Before Going Live:

- [ ] Sentry/error tracking configured
- [ ] Vercel Analytics enabled
- [ ] Baseline performance metrics recorded
- [ ] Alerts set up for critical thresholds
- [ ] Database monitoring active
- [ ] CDN caching verified
- [ ] API rate limiting configured
- [ ] Error pages configured (404, 500, etc)
- [ ] Uptime monitoring (optional: StatusPage.io)

---

## Resources

### Tools
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Sentry](https://sentry.io/)
- [Vercel Analytics](https://vercel.com/analytics)

### Guides
- [Web Vitals](https://web.dev/vitals/)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Performance Best Practices](https://web.dev/performance/)

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

**Last Updated**: 2026-05-21 08:13 UTC+05:30  
>>>>>>> 5ad2492 (update)
**Status**: ✅ Ready to Monitor
