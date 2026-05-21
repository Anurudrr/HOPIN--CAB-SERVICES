# Supabase Functions

This repo uses Supabase as the backend runtime. The functions in this folder are
the server-side entrypoints for privileged or scheduled work that should not run
directly from the browser.

## Functions

- `admin-review-driver-application`: authenticated admin-only review endpoint
- `submit-contact-message`: public contact form insert with server-side validation
- `subscribe-to-journal`: public newsletter subscription endpoint
- `expire-rides`: cron-safe expiry job for stale scheduled rides

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_CRON_SECRET` for `expire-rides`

## Suggested Deployment Flow

```bash
supabase functions deploy admin-review-driver-application
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy expire-rides
```

Run the new backend migration before deploying the functions:

```bash
supabase db push
```
