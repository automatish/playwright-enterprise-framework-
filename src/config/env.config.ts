import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const browserName = z.enum(['chromium', 'firefox', 'webkit']);

const EnvSchema = z.object({
  BASE_URL: z.url().default('http://localhost:3000'),
  API_URL: z.url().default('http://localhost:3001'),
  RESET_DB_ON_START: booleanFromString.default(true),
  TEST_USER_PASSWORD: z.string().min(8).default('Pl@ywright-E2E-2026'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'silent']).default('info'),
  BROWSERS: z
    .string()
    .default('chromium')
    .transform((value) => value.split(',').map((name) => name.trim()))
    .pipe(z.array(browserName).nonempty()),
  CI: booleanFromString.default(false),
});

export type Env = z.infer<typeof EnvSchema>;
export type BrowserName = z.infer<typeof browserName>;

const parseEnv = (): Env => {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    // Fail fast with an actionable message instead of a cryptic runtime error deep inside a test.
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
};

export const env: Readonly<Env> = Object.freeze(parseEnv());
