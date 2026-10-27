import { request as playwrightRequest, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { z } from 'zod';
import { env } from '@config/env.config';
import { childLogger, type Logger } from '@utils/logger';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Response type: the schema's output when a contract is supplied, otherwise nothing. */
export type Parsed<TSchema> = TSchema extends z.ZodType ? z.infer<TSchema> : undefined;

export interface RequestOptions<TSchema extends z.ZodType | undefined> {
  /** JSON request body. */
  data?: unknown;
  /** Query string parameters. */
  params?: Record<string, string | number | boolean>;
  /** Expected HTTP status. Anything else raises an {@link ApiError}. Defaults to 200. */
  expectStatus?: number;
  /** Zod contract the JSON response must satisfy. */
  schema?: TSchema;
}

export class ApiError extends Error {
  constructor(
    readonly method: HttpMethod,
    readonly url: string,
    readonly status: number,
    readonly body: string,
    expected: number,
  ) {
    super(`${method} ${url} -> HTTP ${status} (expected ${expected})\n${body.slice(0, 500)}`);
    this.name = 'ApiError';
  }
}

/**
 * Thin, typed wrapper around Playwright's APIRequestContext.
 *
 * - Every call asserts the expected status, so setup failures surface at the
 *   line that caused them rather than as a confusing UI assertion later on.
 * - Responses are validated against Zod contracts, turning silent API drift
 *   into an explicit, readable failure.
 * - Each instance owns its own cookie jar, i.e. its own authenticated session.
 */
export class ApiClient {
  private readonly log: Logger;

  private constructor(
    private readonly context: APIRequestContext,
    readonly label: string,
  ) {
    this.log = childLogger('api').child({ client: label });
  }

  static async create(label: string, baseURL: string = env.API_URL): Promise<ApiClient> {
    const context = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Accept: 'application/json' },
      // Inside the test runner, request.newContext() inherits the project's `use.storageState`.
      // Without an explicit empty jar every "isolated" client would silently reuse the primary
      // user's session cookie, and a login through it would re-bind that shared server session.
      storageState: { cookies: [], origins: [] },
    });
    return new ApiClient(context, label);
  }

  get<TSchema extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<TSchema>,
  ): Promise<Parsed<TSchema>> {
    return this.send('GET', path, options);
  }

  post<TSchema extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<TSchema>,
  ): Promise<Parsed<TSchema>> {
    return this.send('POST', path, options);
  }

  patch<TSchema extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<TSchema>,
  ): Promise<Parsed<TSchema>> {
    return this.send('PATCH', path, options);
  }

  delete<TSchema extends z.ZodType | undefined = undefined>(
    path: string,
    options?: RequestOptions<TSchema>,
  ): Promise<Parsed<TSchema>> {
    return this.send('DELETE', path, options);
  }

  /** Cookies held by this client, used to hand an API session over to a browser context. */
  async storageState(): ReturnType<APIRequestContext['storageState']> {
    return this.context.storageState();
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  private async send<TSchema extends z.ZodType | undefined>(
    method: HttpMethod,
    path: string,
    { data, params, expectStatus = 200, schema }: RequestOptions<TSchema> = {},
  ): Promise<Parsed<TSchema>> {
    const startedAt = performance.now();
    const response = await this.context.fetch(path, {
      method,
      ...(data === undefined ? {} : { data }),
      ...(params === undefined ? {} : { params }),
    });
    const durationMs = Math.round(performance.now() - startedAt);
    this.log.debug({ method, path, status: response.status(), durationMs }, 'http');

    if (response.status() !== expectStatus) {
      throw new ApiError(method, response.url(), response.status(), await response.text(), expectStatus);
    }
    if (!schema) return undefined as Parsed<TSchema>;
    return (await this.parse(response, schema)) as Parsed<TSchema>;
  }

  private async parse(response: APIResponse, schema: z.ZodType): Promise<unknown> {
    const json: unknown = await response.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      throw new Error(`Contract violation for ${response.url()}:\n${result.error.message}`);
    }
    return result.data;
  }
}
