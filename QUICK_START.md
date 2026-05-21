# Quick Start

## Validate Locally

```bash
npm run validate
npm run build
```

## Deploy Backend

```bash
supabase db push
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy admin-review-driver-application
supabase functions deploy expire-rides
```

## Required Secrets

- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_CRON_SECRET`

## Deploy Frontend

```bash
git push origin main
```

Or deploy manually with your normal Vercel flow.

## Read Next

- [00_START_HERE.md](./00_START_HERE.md)
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
