# Critical Gaps Fixed

**Date**: 2026-05-21  
**Status**: Local backend consolidation complete

## What Was Fixed

### 1. Validation Flow

- `npm test` now runs in non-watch mode
- `npm run validate` completes cleanly
- Local build succeeds

### 2. API/Test Drift

- Stale integration tests were aligned with the current API contract
- Mocked frontend API coverage now includes the function layer

### 3. Browser/Backend Boundary

- Client-side code no longer carries a fake `SERVICE_ROLE_KEY`
- Public/admin support flows now use Supabase Edge Functions instead of direct browser writes where appropriate

### 4. Backend Runtime Consolidation

- Added `011_backend_runtime_consolidation.sql`
- Added `updated_at` support for lifecycle tables
- Added canonical ride and booking lifecycle RPCs
- Added `admin_action_logs`
- Added `backend_job_runs`
- Added a cron-safe `auto_expire_rides()` flow

### 5. Edge Function Layer

Added these functions:

- `submit-contact-message`
- `subscribe-to-journal`
- `admin-review-driver-application`
- `expire-rides`

## What This Means

The production backend for this repo is now clearly:

- Supabase Postgres
- RLS policies
- RPC functions
- Supabase Edge Functions

It is not:

- `backend/`
- `backend-new/`
- a separate long-lived Node API

## What Is Still Not Done Remotely

These steps must still be run against your real Supabase project:

1. `supabase db push`
2. deploy the four Edge Functions
3. set `SUPABASE_SERVICE_ROLE_KEY`
4. set `BACKEND_CRON_SECRET`
5. configure a scheduler for `expire-rides`

## Primary References

- [README.md](./README.md)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
