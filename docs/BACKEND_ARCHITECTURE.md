# Backend Architecture

## Runtime

HopIn uses Supabase as the backend runtime:

- `Postgres` for relational data
- `RLS policies` for browser-safe access control
- `RPC functions` for transactional lifecycle actions
- `Edge Functions` for public form handling, admin-only mutations, and cron jobs

There is no separate Express or Node API that should be treated as production
source of truth in this repo.

## Backend Surface

### Database tables

- `profiles`
- `vehicles`
- `driver_applications`
- `rides`
- `bookings`
- `contact_messages`
- `newsletter_subscriptions`
- `admin_action_logs`
- `backend_job_runs`

### Canonical RPCs

- `book_ride`
- `cancel_booking`
- `start_ride`
- `complete_ride`
- `cancel_ride_by_driver`
- `review_driver_application`
- `get_rides_with_bookings`
- `auto_expire_rides`

### Edge Functions

- `submit-contact-message`
- `subscribe-to-journal`
- `admin-review-driver-application`
- `expire-rides`

## Migration Order

Apply the full `supabase/migrations` directory. The important milestones are:

- `001_initial_schema.sql`: base schema and initial RLS
- `005_sync_driver_roles_and_live_ride_policies.sql`: role synchronization
- `007_ride_lifecycle_and_policy_guards.sql`: lifecycle rules
- `008_admin_driver_application_reviews.sql`: admin review flow
- `009_admin_operations_read_access.sql`: admin read access
- `010_backend_business_logic.sql`: legacy hardening
- `011_backend_runtime_consolidation.sql`: authoritative runtime consolidation

`011_backend_runtime_consolidation.sql` is the current canonical hardening
layer. It adds audit/job tables, updated-at triggers, and the final lifecycle
RPC implementations.

## Environment Variables

### Frontend / Vercel

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_CRON_SECRET`

## Deployment

1. Apply migrations.
2. Deploy Edge Functions.
3. Configure `BACKEND_CRON_SECRET`.
4. Point a scheduler or secure webhook at `expire-rides`.

Suggested commands:

```bash
supabase db push
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy admin-review-driver-application
supabase functions deploy expire-rides
```

## Notes

- `src/lib/env.ts` intentionally exposes only browser-safe Supabase variables.
- Admin-side auditing is stored in `admin_action_logs`.
- Scheduled backend job runs are stored in `backend_job_runs`.
- Empty `backend` / `backend-new` folders are not the production backend.
