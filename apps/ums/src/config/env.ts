import { z } from 'zod';

/**
 * Zod schema for required environment variables. Adjust defaults as needed.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a number')
    .transform((v) => parseInt(v, 10))
    .refine((v) => v > 0 && v < 65536, 'PORT must be a valid TCP port')
    .default('8080' as any), // initial string default, transformed above
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS must list at least one origin (comma separated)'),
  KC_BASE_URL: z.string().url('KC_BASE_URL must be a valid URL'),
  KC_REALM: z.string().min(1, 'KC_REALM is required'),
  KC_ADMIN_CLIENT_ID: z.string().min(1, 'KC_ADMIN_CLIENT_ID is required'),
  KC_ADMIN_CLIENT_SECRET: z.string().min(1, 'KC_ADMIN_CLIENT_SECRET is required'),
  KC_ISSUER_URL: z.string().url('KC_ISSUER_URL must be a valid URL'),
  KC_JWKS_URI: z.string().url('KC_JWKS_URI must be a valid URL'),
  OIDC_AUDIENCE: z.string().min(1, 'OIDC_AUDIENCE is required'),
});

export type Env = z.infer<typeof EnvSchema> & { PORT: number };

let cachedEnv: Env | null = null;

/**
 * Load and validate process.env against the schema, caching the result.
 * In development, throws a detailed error listing missing/invalid keys.
 */
export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    const message = `Environment validation failed:\n${issues}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }
    throw new Error(message);
  }

  cachedEnv = parsed.data as Env;
  return cachedEnv;
}

/** Convenience accessor */
export const env: Env = loadEnv();

/** Return ALLOWED_ORIGINS parsed into a string[] */
export function allowedOrigins(): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
}
