import pino from 'pino';
import { env } from '@config/env.config';

/**
 * Structured JSON logger. Pretty-printed locally, raw JSON lines on CI so log
 * aggregators can index fields such as `persona`, `method` and `status`.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { worker: process.env.TEST_WORKER_INDEX ?? 'main' },
  ...(env.CI
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }),
});

export type Logger = typeof logger;

export const childLogger = (scope: string): Logger => logger.child({ scope });
