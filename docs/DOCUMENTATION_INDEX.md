# Documentation Index

## Start Here

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md): current backend source of truth
- [../README.md](../README.md): project setup and deployment summary
- [../DEPLOYMENT_RUNBOOK.md](../DEPLOYMENT_RUNBOOK.md): rollout checklist

## Backend Docs

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md): tables, RPCs, functions, env vars
- [SUPABASE_README.md](./SUPABASE_README.md): Supabase deployment guide
- [SUPABASE_FIXES_QUICK_REF.md](./SUPABASE_FIXES_QUICK_REF.md): short checklist

## Testing and Quality

- [../TESTING_GUIDE.md](../TESTING_GUIDE.md)
- [../PERFORMANCE_MONITORING.md](../PERFORMANCE_MONITORING.md)
- [../CRITICAL_GAPS_FIXED.md](../CRITICAL_GAPS_FIXED.md)

## Important Backend Files

- `supabase/migrations/011_backend_runtime_consolidation.sql`
- `supabase/functions/README.md`
- `supabase/config.toml`

## Notes

- Do not use older single-file migration instructions from historical docs.
- The active backend flow is the full migration chain through `011_backend_runtime_consolidation.sql`.
