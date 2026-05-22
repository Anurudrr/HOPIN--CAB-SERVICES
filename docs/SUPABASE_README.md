# Supabase Backend Guide

## Runtime Model

HopIn uses Supabase as the backend:

- Postgres for data
- RLS for access control
- RPCs for ride and booking lifecycle actions
- Edge Functions for public form handling, admin review, and scheduled jobs

## Apply the Backend

Run the full migration chain:

```bash
supabase db push
```

The important endpoint of the chain is:

- `supabase/migrations/012_ai_support_observability.sql`

## Deploy Functions

```bash
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy ai-support-chat
supabase functions deploy admin-review-driver-application
supabase functions deploy expire-rides
```

## Required Secrets

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL` optional, defaults to `llama3-8b-8192`
- `BACKEND_CRON_SECRET`

## Scheduler Requirement

`expire-rides` must be called on a schedule with:

- header: `x-cron-secret`
- value: your `BACKEND_CRON_SECRET`

## Current Source of Truth

For the latest backend shape, use:

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- [../supabase/functions/README.md](../supabase/functions/README.md)
