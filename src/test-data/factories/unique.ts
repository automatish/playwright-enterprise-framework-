import { randomUUID } from 'node:crypto';

/**
 * Collision-proof suffix for data created by parallel workers and CI shards.
 * Combines the worker index with a random UUID fragment so that no two tests
 * ever compete for the same username, description or account number.
 */
export const uniqueSuffix = (): string => {
  const worker = process.env.TEST_PARALLEL_INDEX ?? '0';
  return `w${worker}${randomUUID().replaceAll('-', '').slice(0, 10)}`;
};
