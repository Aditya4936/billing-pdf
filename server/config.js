import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to the .env file (see .env.example).`);
  }
  return value;
}

/** Everything the server reads from the environment, validated once at start-up. */
export function loadConfig() {
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is too short. Use at least 32 random characters (see .env.example).');
  }

  return {
    isProd,
    port: Number(process.env.PORT) || 4000,
    mongoUrl: required('MONGOURL'),
    // The URL in .env has no database name, so without this the data would land in "test".
    mongoDb: process.env.MONGO_DB?.trim() || 'billing-pdf',
    jwtSecret,
    sessionDays: 7,
    // Set ALLOW_SIGNUP=false once your own account exists, so strangers cannot register.
    allowSignup: process.env.ALLOW_SIGNUP?.trim().toLowerCase() !== 'false',
    cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
    trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
    distDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'),
  };
}
