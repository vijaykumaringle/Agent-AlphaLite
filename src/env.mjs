import { loadEnv } from 'vite';

/**
 * Load environment variables from .env files
 */
export const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd());
