// Centralized environment variable access & validation

// NOTE: For values needed in the browser, Next.js/Turbopack only statically replaces
// direct property access (process.env.MY_VAR). Computed/bracket access like
// process.env[name] is NOT inlined in client bundles and will be undefined at runtime.
// That's why we spell them out explicitly here.

const REQUIRED = [
  'NEXT_PUBLIC_KC_BASE_URL',
  'NEXT_PUBLIC_KC_REALM',
  'NEXT_PUBLIC_KC_CLIENT_ID',
  'NEXT_PUBLIC_UMS_API',
] as const;

const raw: Record<(typeof REQUIRED)[number], string | undefined> = {
  NEXT_PUBLIC_KC_BASE_URL: process.env.NEXT_PUBLIC_KC_BASE_URL,
  NEXT_PUBLIC_KC_REALM: process.env.NEXT_PUBLIC_KC_REALM,
  NEXT_PUBLIC_KC_CLIENT_ID: process.env.NEXT_PUBLIC_KC_CLIENT_ID,
  NEXT_PUBLIC_UMS_API: process.env.NEXT_PUBLIC_UMS_API,
};

// Validate required environment variables only once at build time
const missing = REQUIRED.filter(k => !raw[k]);
if (missing.length && process.env.NODE_ENV === 'development') {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    'Make sure .env.local exists with the required NEXT_PUBLIC_* variables.'
  );
}

export interface AppEnv {
  KC_BASE_URL: string;
  KC_REALM: string;
  KC_CLIENT_ID: string;
  UMS_API: string;
}

export const Env = {
  KC_BASE_URL: process.env.NEXT_PUBLIC_KC_BASE_URL!,
  KC_REALM: process.env.NEXT_PUBLIC_KC_REALM!,
  KC_CLIENT_ID: process.env.NEXT_PUBLIC_KC_CLIENT_ID!,
  UMS_API: process.env.NEXT_PUBLIC_UMS_API!,
};
