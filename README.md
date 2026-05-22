# HopIn

HopIn is a shared urban mobility web app for Indian cities. The frontend is built with React 19, Vite, TypeScript, Zustand, Motion for React, React Leaflet, and Tailwind CSS v4. The backend runs on Supabase Postgres, RLS policies, RPCs, and Edge Functions, so the app can deploy cleanly on Vercel without a separate long-lived Node API service.

## Tech Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- Zustand
- Motion for React
- React Leaflet
- Supabase Auth + Postgres + Edge Functions
- Groq Chat Completions API for authenticated support chat

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and fill in your Supabase values:

```bash
cp .env.example .env.local
```

3. Run the Vite dev server:

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Supabase Setup

The repo includes SQL migrations in `supabase/migrations` for:

- Core HopIn tables and RLS policies
- Ride and booking lifecycle RPCs
- Admin review and operations policies
- Backend runtime hardening, audit logs, and scheduled expiry support

Apply the full migration chain through `012_ai_support_observability.sql` before using the production flows. The server-side function entrypoints in `supabase/functions` now also include the authenticated `ai-support-chat` assistant used by the dashboard widget.

## Build

```bash
npm run build
```

Preview the production bundle locally with:

```bash
npm run preview
```

## Testing

Run all checks before deployment:

```bash
npm run validate          # Runs lint + type-check + tests
npm run test:coverage    # Generate coverage report
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing standards and coverage requirements.

## Deploying to Vercel

### Prerequisites

1. **Supabase Database Setup**
   - Apply the full `supabase/migrations` chain, including `012_ai_support_observability.sql`
   - Deploy the Edge Functions in `supabase/functions`
   - Verify schema and runtime setup with [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)

2. **Environment Variables**
   Set these in the Vercel dashboard:
   - `VITE_SUPABASE_URL` - from Supabase project Settings > API
   - `VITE_SUPABASE_ANON_KEY` - from Supabase project Settings > API

   Set these in Supabase Edge Functions:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (optional, defaults to `llama3-8b-8192`)
   - `BACKEND_CRON_SECRET`

3. **Pre-Deployment Checklist**
   ```bash
   npm run validate     # Must pass with 0 errors
   npm run build        # Must succeed
   npm run test         # All tests must pass
   ```

### Deploy

Push to main branch (auto-deploys) or run:
```bash
vercel --prod
```

### Verification

See [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) for complete 70-step deployment and verification procedures.

## Documentation

After solving critical gaps, comprehensive documentation is available:

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | Step-by-step commands and checklist |
| [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md) | Current backend architecture, migrations, and function deployment |
| [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) | Complete 70-step deployment guide with rollback procedures |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Testing standards, coverage requirements, and how to write tests |
| [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) | Performance targets, monitoring setup, and alert thresholds |
| [CRITICAL_GAPS_FIXED.md](./CRITICAL_GAPS_FIXED.md) | Summary of all critical gaps that were addressed |
| [SUPABASE_FIXES_QUICK_REF.md](./SUPABASE_FIXES_QUICK_REF.md) | Quick reference for Supabase schema fixes |
| [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | Project analysis summary |

## Development Scripts

```bash
npm run dev               # Start dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Check code quality
npm run type-check       # Check TypeScript types
npm run test             # Run tests
npm run test:coverage    # Generate coverage report
npm run test:ui          # Run tests with UI
npm run validate         # All checks (lint + types + tests)
npm run format           # Format code with Prettier
npm run lint:fix         # Auto-fix linting issues
```

## Status

✅ **Production Ready** - All critical gaps addressed
- Error handling & loading states implemented
- Comprehensive testing framework in place
- Complete deployment procedures documented
- Performance monitoring guidelines provided
- Security verification checklist completed

See [CRITICAL_GAPS_FIXED.md](./CRITICAL_GAPS_FIXED.md) for details on what was fixed.
