# API Integration Status

The frontend API layer is aligned with the current backend.

## Current Integration Model

- direct Supabase reads for browser-safe data
- Supabase RPCs for ride and booking lifecycle
- Supabase Edge Functions for public support/newsletter and admin review actions

## Main References

- [src/lib/api.ts](/C:/Users/rajaw/Downloads/hopin%20(9)/src/lib/api.ts:1)
- [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md)

## Important Note

Older single-file migration guidance is obsolete. The current backend rollout
uses the full migration chain through `011_backend_runtime_consolidation.sql`.
