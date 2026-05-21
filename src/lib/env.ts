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

export const env = {
  SUPABASE_URL: validateEnv(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL
  ),
  SUPABASE_KEY: validateEnv(
    'VITE_SUPABASE_ANON_KEY',
    import.meta.env.VITE_SUPABASE_ANON_KEY
  ),
} as const;

export default env;
