# HopIn Start Here

## Current Status

The app is locally validated and buildable.

- `npm run validate` passes
- `npm run build` passes
- The backend now uses `Supabase Postgres + RLS + RPCs + Edge Functions`

The canonical backend migration is:

- `supabase/migrations/011_backend_runtime_consolidation.sql`

The server-side function layer is in:

- `supabase/functions`

## Do This First

Run these from the repo root:

```bash
npm run validate
npm run build
```

If those pass, deploy the backend before pushing production traffic.

## Backend Rollout

1. Apply the full Supabase migration chain.

```bash
supabase db push
```

2. Deploy the Edge Functions.

```bash
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy admin-review-driver-application
supabase functions deploy expire-rides
```

3. Configure function secrets.

- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_CRON_SECRET`

4. Set up a scheduler or secure webhook for `expire-rides`.

5. Deploy the frontend on Vercel.

## Read These Next

- [README.md](./README.md)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## Notes

- The `backend` and `backend-new` folders are not the production backend.
- The browser app should only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Service-role access is confined to Supabase Edge Functions.
