# Backend Before / After

## Before

- multiple overlapping Supabase migrations
- stale docs pointing at a nonexistent `004` consolidation file
- public/admin support flows written directly from the browser
- no clear server-side function layer

## After

- canonical runtime migration:
  `supabase/migrations/011_backend_runtime_consolidation.sql`
- Edge Functions:
  `submit-contact-message`, `subscribe-to-journal`,
  `admin-review-driver-application`, `expire-rides`
- cleaned frontend/backend boundary in `src/lib/api.ts`
- consistent backend docs centered on `docs/BACKEND_ARCHITECTURE.md`
