# Testing Guide

**Status**: Active  
**Last Updated**: 2026-05-21

## Commands

```bash
npm run test
npm run test:coverage
npm run validate
```

## Current Expectation

- tests should pass in one-shot mode
- lint and strict typecheck should pass
- API tests should cover current Supabase RPC and Edge Function contracts

## Critical Coverage Areas

- auth state handling
- ride search
- booking and cancellation
- driver ride lifecycle actions
- contact/newsletter/admin review function invocations

## Reference Files

- [src/lib/api.test.ts](/C:/Users/rajaw/Downloads/hopin%20(9)/src/lib/api.test.ts:1)
- [src/lib/api.integration.test.ts](/C:/Users/rajaw/Downloads/hopin%20(9)/src/lib/api.integration.test.ts:1)
- [src/store/stores.test.ts](/C:/Users/rajaw/Downloads/hopin%20(9)/src/store/stores.test.ts:1)
