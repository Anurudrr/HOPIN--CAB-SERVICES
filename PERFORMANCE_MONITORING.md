# Performance Monitoring

**Status**: Active  
**Last Updated**: 2026-05-21

## Targets

- LCP: `< 2.5s`
- FID / INP: `< 200ms`
- CLS: `< 0.1`
- API response time: `< 500ms`
- Production bundle: keep gzipped assets comfortably under `500KB`

## Local Checks

```bash
npm run build
npm run preview
```

Validate:

- no console errors
- smooth navigation
- route-level loading behavior feels acceptable
- build output remains within expected size

## Post-Deploy Checks

1. Run Lighthouse against production
2. Check Supabase query performance for rides and bookings
3. Verify `expire-rides` runs on schedule
4. Watch booking and review flows for function errors

## Source of Truth

- [README.md](./README.md)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
