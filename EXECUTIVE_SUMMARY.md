# Executive Summary

HopIn is now organized around a single backend architecture:

- Supabase Postgres
- RLS policies
- RPC functions
- Supabase Edge Functions

The main implementation work is complete locally. The remaining work is remote:

1. authenticate the Supabase CLI
2. apply migrations
3. deploy functions
4. configure function secrets
5. attach a scheduler to `expire-rides`

Backend source of truth:

- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)
