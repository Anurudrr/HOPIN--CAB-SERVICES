# Supabase Quick Reference

## Apply Backend Changes

```bash
supabase db push
```

## Deploy Functions

```bash
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy admin-review-driver-application
supabase functions deploy expire-rides
```

## Set Secrets

- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_CRON_SECRET`

## Verify

1. Sign in works
2. Ride search works
3. Booking and cancellation work
4. Driver application review works
5. Contact form works
6. Newsletter signup works
7. Scheduled ride expiry works

## Canonical Files

- `supabase/migrations/011_backend_runtime_consolidation.sql`
- `supabase/functions/README.md`
- `docs/BACKEND_ARCHITECTURE.md`
