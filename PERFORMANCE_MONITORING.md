# Performance & Monitoring Guide

**Status**: Deployment Ready
**Version**: 1.0
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

## Monitoring Setup

### Option 1: Manual Monitoring (Free)
1. Open DevTools daily
2. Check Console for errors
3. Run Lighthouse weekly
4. Screenshot and document

### Option 2: Sentry Integration
```bash
npm install @sentry/react @sentry/tracing
```

Set environment variable:
```
VITE_SENTRY_DSN = [your-sentry-dsn]
```

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

### Database
- [ ] Indexes on frequently queried columns
- [ ] Pagination for large result sets
- [ ] Connection pooling enabled

### Caching
- [ ] Static assets cached
- [ ] API responses cached
- [ ] Service Worker for offline support

---

## Alert Thresholds

Set up alerts for:
- Error rate > 5% per 5 min
- API response > 1s (p95)
- Bundle size > 600KB
- Lighthouse < 85
- LCP > 4s
- CLS > 0.15

---

## Weekly Performance Review

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

**Status**: ✅ Ready to Monitor
