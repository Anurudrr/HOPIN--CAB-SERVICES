# HopIn Deployment Runbook

**Last Updated**: 2026-05-21  
**Status**: Backend and frontend validated locally

## 1. Local Verification

Run these before any deployment:

```bash
npm run validate
npm run build
```

Expected result:

- TypeScript passes
- ESLint passes
- Tests pass
- Vite production build succeeds

## 2. Backend Deployment

HopIn uses Supabase as the backend runtime. There is no separate Express API to deploy.

### 2.1 Apply Database Migrations

Apply the full migration chain, including:

- `001_initial_schema.sql`
- `005_sync_driver_roles_and_live_ride_policies.sql`
- `007_ride_lifecycle_and_policy_guards.sql`
- `008_admin_driver_application_reviews.sql`
- `009_admin_operations_read_access.sql`
- `010_backend_business_logic.sql`
- `011_backend_runtime_consolidation.sql`
- `012_ai_support_observability.sql`

Recommended command:

```bash
supabase db push
```

### 2.2 Deploy Edge Functions

Deploy these functions:

```bash
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy ai-support-chat
supabase functions deploy admin-review-driver-application
supabase functions deploy expire-rides
```

### 2.3 Configure Edge Function Secrets

Required:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `BACKEND_CRON_SECRET`

Optional:

- `GROQ_MODEL` override for `ai-support-chat` if you do not want the default
- provider-specific secrets for email, SMS, or monitoring if you add them later

## 3. Scheduler Setup

`expire-rides` exists but must be triggered remotely.

Minimum requirement:

- call the function on a fixed schedule
- send `x-cron-secret: <BACKEND_CRON_SECRET>`

Suggested cadence:

- every 10 to 15 minutes

## 4. Frontend Deployment

Deploy the Vercel app only after the backend rollout above is complete.

Required frontend env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5. Post-Deploy Verification

Verify these flows against the live project:

1. Sign up and sign in
2. Load rides for a city
3. Book and cancel a ride
4. Submit a driver application
5. Review a driver application through the admin function
6. Submit a contact message
7. Subscribe to the newsletter
8. Open the dashboard while signed in and verify `ai-support-chat` returns a response
9. Confirm expired scheduled rides are cancelled by the cron function

## 6. Rollback

If the release fails:

1. Stop frontend rollout
2. Revert the app commit
3. Disable scheduler calls to `expire-rides` if needed
4. Restore the previous Supabase state using your normal database backup flow

## 7. Source of Truth

Use these docs as the current backend references:

- [README.md](./README.md)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
- [supabase/functions/README.md](./supabase/functions/README.md)
