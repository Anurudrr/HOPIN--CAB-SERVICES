/**
 * Environment variable validation and access
 * Validates all required env vars at startup
 */

function validateEnv(key: string, value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing or invalid environment variable: ${key}`);
  }
  return value;
}

function readOptionalEnv(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export const env = {
  SUPABASE_URL: validateEnv(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL
  ),
  SUPABASE_KEY: validateEnv(
    'VITE_SUPABASE_ANON_KEY',
    import.meta.env.VITE_SUPABASE_ANON_KEY
  ),
  MAPBOX_ACCESS_TOKEN: typeof import.meta.env.VITE_MAPBOX_ACCESS_TOKEN === 'string'
    ? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
    : '',
  SENTRY_DSN: readOptionalEnv(import.meta.env.VITE_SENTRY_DSN),
} as const;

export default env;
