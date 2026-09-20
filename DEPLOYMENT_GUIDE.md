# HopIn Production Deployment Guide

## Overview
This guide covers deploying the complete HopIn ride-sharing platform with all features:
- Real-time driver tracking
- Ride pooling/matching
- Stripe payments
- Push notifications
- In-app chat
- Admin dashboard

## Prerequisites

### Required Accounts
1. **Supabase** - Database, Auth, Realtime, Edge Functions
2. **Vercel** - Frontend hosting
3. **Stripe** - Payment processing
4. **Mapbox** (optional) - Better map tiles
5. **Sentry** (optional) - Error tracking

### Required CLI Tools
```bash
# Supabase CLI
npm install -g supabase

# Vercel CLI
npm install -g vercel

# Web Push VAPID keys
npx web-push generate-vapid-keys
```

## Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_MAPBOX_TOKEN=pk.your-mapbox-token
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_APP_URL=https://yourdomain.com
VITE_ENABLE_POOLING=true
VITE_ENABLE_CHAT=true
VITE_ENABLE_PUSH=true
VITE_ENABLE_TRACKING=true
```

### Edge Functions (Supabase Secrets)
```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  VAPID_PUBLIC_KEY=... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:admin@yourdomain.com \
  MAPBOX_TOKEN=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  --project-ref your-project-ref
```

## Deployment Steps

### 1. Database Migrations
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run all migrations in order
supabase db push --file supabase/migrations/001_initial_schema.sql
supabase db push --file supabase/migrations/002_booking_function.sql
# ... repeat for all 22 migrations
# OR use the deploy script:
.\deploy.ps1 -ProjectRef your-project-ref -Environment production
```

### 2. Edge Functions
```bash
# Deploy all 8 functions
supabase functions deploy driver-location --project-ref your-project-ref
supabase functions deploy nearby-drivers --project-ref your-project-ref
supabase functions deploy ride-pooling --project-ref your-project-ref
supabase functions deploy stripe-checkout --project-ref your-project-ref
supabase functions deploy stripe-webhook --project-ref your-project-ref
supabase functions deploy push-notifications --project-ref your-project-ref
supabase functions deploy send-push --project-ref your-project-ref
supabase functions deploy ai-support-chat --project-ref your-project-ref
```

### 3. Stripe Configuration
1. Create products/prices in Stripe Dashboard for each service type
2. Set up webhook endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

### 4. VAPID Keys for Push
```bash
npx web-push generate-vapid-keys
# Output:
# Public Key: BPub... (add to VITE_VAPID_PUBLIC_KEY and VAPID_PUBLIC_KEY secret)
# Private Key: BPriv... (add to VAPID_PRIVATE_KEY secret)
```

### 5. Frontend Deploy
```bash
npm run build
vercel --prod
```

## Post-Deployment Verification

### Test Checklist
- [ ] User registration/login works
- [ ] Driver application flow works
- [ ] Admin can approve driver applications
- [ ] Drivers can publish rides
- [ ] Riders can search and book rides
- [ ] Pool search finds matches
- [ ] Stripe checkout completes
- [ ] Webhooks update booking status
- [ ] Real-time driver tracking works
- [ ] Push notifications deliver
- [ ] In-app chat works between rider/driver
- [ ] Admin dashboard shows metrics

### Monitoring
```bash
# View edge function logs
supabase functions logs driver-location --project-ref your-project-ref
supabase functions logs stripe-webhook --project-ref your-project-ref

# View database logs
supabase logs --project-ref your-project-ref
```

## Architecture Summary

### Database Tables (22 migrations)
- `profiles` - Users (riders, drivers, admins)
- `vehicles` - Driver vehicles
- `driver_applications` - Driver onboarding
- `rides` - Driver-published routes
- `bookings` - Rider bookings
- `ride_requests` - Pool search requests
- `driver_locations` - Real-time GPS
- `push_subscriptions` - Web Push endpoints
- `chat_messages` - In-app messaging
- `payment_intents` - Stripe payment records
- `transactions` - Financial records
- `notifications` - In-app notifications
- `services` - Service catalog
- `providers` - Driver profiles
- `reviews` - Ratings/reviews
- `saved_locations` - User favorites
- `contact_messages` - Support contacts
- `newsletter_subscriptions` - Email list
- `support_chat_events` - AI chat audit
- `backend_job_runs` - Cron job audit

### Edge Functions (8)
1. `driver-location` - Receive driver GPS updates
2. `nearby-drivers` - Find drivers near location
3. `ride-pooling` - Create/search pool matches
4. `stripe-checkout` - Create Stripe checkout sessions
5. `stripe-webhook` - Handle Stripe events
6. `push-notifications` - Manage push subscriptions
7. `send-push` - Send Web Push notifications
8. `ai-support-chat` - AI customer support

### Real-time Channels
- `driver-location-{driverId}` - Live tracking
- `ride-request-{requestId}` - Pool match updates
- `chat-{bookingId}` - In-app messages
- `dashboard-notifications-{userId}` - User notifications
- `provider-dashboard-{driverId}` - Driver dashboard updates

## Troubleshooting

### Common Issues

**Migration fails**
```bash
# Check if already applied
supabase db diff --project-ref your-project-ref
# Apply specific migration
supabase db push --file supabase/migrations/XXX_migration.sql
```

**Edge function timeout**
- Check function logs: `supabase functions logs function-name`
- Increase timeout in function code if needed
- Verify secrets are set correctly

**Push notifications not working**
- Verify VAPID keys match between frontend and secrets
- Check service worker is registered (DevTools > Application > Service Workers)
- Test with: `supabase functions invoke send-push --data '{"user_id":"...", "template_key":"test"}'`

**Stripe webhook not firing**
- Verify webhook URL in Stripe Dashboard
- Check webhook secret matches
- Test with Stripe CLI: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

**Real-time not updating**
- Check RLS policies allow the user to subscribe
- Verify Supabase Realtime is enabled for tables
- Check browser console for connection errors

## Rollback Plan
```bash
# Revert specific migration
supabase db reset --project-ref your-project-ref

# Re-deploy previous function version
supabase functions deploy function-name --project-ref your-project-ref --legacy-bundle

# Vercel rollback
vercel rollback deployment-url
```

## Support
- Check logs first: `supabase functions logs`
- Database issues: `supabase db diff`
- Frontend issues: Vercel deployment logs
- Stripe issues: Stripe Dashboard > Webhooks > Recent deliveries