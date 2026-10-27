import type { BrowserContext, CDPSession, Page, Request, Route } from '@playwright/test';
import { env } from '@config/env.config';
import { childLogger } from './logger';

const log = childLogger('network');

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Subset of Chromium net error codes accepted by `route.abort()`. */
export type NetworkErrorCode =
  'connectionrefused' | 'connectionreset' | 'internetdisconnected' | 'timedout' | 'failed';

export interface ApiRouteMatcher {
  method: HttpMethod;
  /** Path on the RWA API origin, e.g. `/transactions/public`. Query strings are ignored. */
  path: string;
}

/** Declarative description of a fault, convenient for data-driven fault matrices. */
export type Fault = { status: number; body?: unknown } | { abort: NetworkErrorCode } | { delayMs: number };

export interface NetworkProfile {
  downloadKbps: number;
  uploadKbps: number;
  latencyMs: number;
}

/** Chrome DevTools presets. */
export const NetworkProfiles = {
  slow3G: { downloadKbps: 400, uploadKbps: 400, latencyMs: 2000 },
  fast3G: { downloadKbps: 1600, uploadKbps: 750, latencyMs: 560 },
} as const satisfies Record<string, NetworkProfile>;

/**
 * Deterministic fault injection for the RWA backend.
 *
 * Every rule is scoped to an exact API origin + path + method, so a fault on
 * `GET /transactions/public` never leaks into `/checkAuth`, `/notifications`
 * or static assets. `restore()` removes all rules, modelling "network is back".
 */
export class NetworkInterceptor {
  private readonly handlers: Array<(route: Route) => Promise<void>> = [];
  private cdp: CDPSession | undefined;

  constructor(private readonly target: Page | BrowserContext) {}

  async inject(matcher: ApiRouteMatcher, fault: Fault): Promise<void> {
    if ('status' in fault) return this.failWithStatus(matcher, fault.status, fault.body);
    if ('abort' in fault) return this.abort(matcher, fault.abort);
    return this.delay(matcher, fault.delayMs);
  }

  /** Replies with an HTTP error, e.g. 500 / 503 with a JSON body. */
  async failWithStatus(
    matcher: ApiRouteMatcher,
    status: number,
    body: unknown = { error: 'Injected fault' },
  ): Promise<void> {
    await this.intercept(matcher, `HTTP ${status}`, (route) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
    );
  }

  /** Simulates a transport-level failure (offline, DNS, reset, timeout). */
  async abort(matcher: ApiRouteMatcher, errorCode: NetworkErrorCode = 'internetdisconnected'): Promise<void> {
    await this.intercept(matcher, `abort:${errorCode}`, (route) => route.abort(errorCode));
  }

  /** Holds the request for `delayMs` before letting it reach the real backend (latency spike). */
  async delay(matcher: ApiRouteMatcher, delayMs: number): Promise<void> {
    await this.intercept(matcher, `delay:${delayMs}ms`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fallback();
    });
  }

  /**
   * Whole-page bandwidth/latency throttling via the Chrome DevTools Protocol.
   * Chromium only: callers should `test.skip` other engines.
   */
  async throttle(profile: NetworkProfile): Promise<void> {
    if (!('mainFrame' in this.target)) throw new Error('throttle() requires a Page');
    this.cdp ??= await this.target.context().newCDPSession(this.target);
    await this.cdp.send('Network.enable');
    await this.cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latencyMs,
      downloadThroughput: (profile.downloadKbps * 1024) / 8,
      uploadThroughput: (profile.uploadKbps * 1024) / 8,
    });
    log.info({ profile }, 'network throttled');
  }

  /** Removes every injected fault and throttle: the network is healthy again. */
  async restore(): Promise<void> {
    for (const handler of this.handlers.splice(0)) {
      await this.target.unroute(isApiRequest, handler);
    }
    if (this.cdp) {
      await this.cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    }
    log.info('network restored');
  }

  private async intercept(
    matcher: ApiRouteMatcher,
    fault: string,
    respond: (route: Route) => Promise<void>,
  ): Promise<void> {
    const handler = async (route: Route): Promise<void> => {
      if (!matches(route.request(), matcher)) {
        await route.fallback();
        return;
      }
      log.info({ ...matcher, fault }, 'fault injected');
      await respond(route);
    };
    this.handlers.push(handler);
    await this.target.route(isApiRequest, handler);
  }
}

const apiOrigin = new URL(env.API_URL).origin;

const isApiRequest = (url: URL): boolean => url.origin === apiOrigin;

const matches = (request: Request, { method, path }: ApiRouteMatcher): boolean =>
  request.method() === method && new URL(request.url()).pathname === path;
