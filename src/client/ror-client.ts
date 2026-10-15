import { RateLimiter } from './rate-limiter.js';
import { normalizeApiRoot } from './api-root.js';
import { DEFAULT_API_ROOT, HEARTBEAT_PATH, ORGANIZATIONS_PATH } from '../constants/urls.js';
import type { RorOrganization } from '../types/ror-organization.js';

export interface RorClientOptions {
  /** Value sent as the `Client-Id` request header (identifies your application). */
  clientId?: string;
  /**
   * Root URL of the ROR API (default: `https://api.ror.org`).
   * Endpoint paths such as `/v2/organizations` are appended to it, so pass the
   * API root rather than a full endpoint URL. Trailing slashes are removed.
   * A relative root (e.g. `/ror-api` behind a reverse proxy) only works where
   * `fetch` can resolve relative URLs, such as browsers.
   * Must not be empty or contain a query string or fragment.
   */
  apiRoot?: string;
}

export type FilterKey =
  | 'status'
  | 'types'
  | 'locations.geonames_details.country_code'
  | 'locations.geonames_details.country_name'
  | 'locations.geonames_details.continent_code'
  | 'locations.geonames_details.continent_name';

export type FilterParams = Partial<Record<FilterKey, string>>;

interface ListResponse {
  items: RorOrganization[];
  meta: { total: number; page: number };
  time_taken: number;
}

export class RorClient {
  private readonly clientId?: string;
  private readonly rateLimiter: RateLimiter;
  private readonly baseUrl: string;
  private readonly healthCheckUrl: string;

  constructor(options?: RorClientOptions) {
    if (options?.clientId !== undefined) {
      this.clientId = options.clientId;
    }
    const apiRoot = normalizeApiRoot(options?.apiRoot ?? DEFAULT_API_ROOT);
    this.baseUrl = `${apiRoot}${ORGANIZATIONS_PATH}`;
    this.healthCheckUrl = `${apiRoot}${HEARTBEAT_PATH}`;
    this.rateLimiter = new RateLimiter();
  }

  /** Calls the heartbeat endpoint and returns the HTTP status code. */
  async checkHealth(): Promise<number> {
    const response = await this.fetchWithRateLimit(this.healthCheckUrl);
    return response.status;
  }

  /** Returns all organizations from the registry. */
  async listOrganizations(): Promise<RorOrganization[]> {
    const data = await this.fetchJson<ListResponse>(this.baseUrl);
    return data.items;
  }

  /** Returns the organization with the given ROR ID. Throws if not found. */
  async getOrganizationById(rorId: string): Promise<RorOrganization> {
    const url = `${this.baseUrl}/${encodeURIComponent(rorId)}`;
    return this.fetchJson<RorOrganization>(url);
  }

  /** Returns organizations matching the given filter parameters. */
  async filterOrganizations(filters: FilterParams): Promise<RorOrganization[]> {
    const url = this.buildUrl(this.baseUrl, undefined, filters);
    const data = await this.fetchJson<ListResponse>(url);
    return data.items;
  }

  /** Returns organizations matching the given keyword query. */
  async searchOrganizations(query: string): Promise<RorOrganization[]> {
    const url = this.buildUrl(this.baseUrl, query);
    const data = await this.fetchJson<ListResponse>(url);
    return data.items;
  }

  /** Returns organizations matching both a keyword query and filter parameters. */
  async searchAndFilter(query: string, filters: FilterParams): Promise<RorOrganization[]> {
    const url = this.buildUrl(this.baseUrl, query, filters);
    const data = await this.fetchJson<ListResponse>(url);
    return data.items;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.clientId) {
      headers['Client-Id'] = this.clientId;
    }
    return headers;
  }

  /**
   * Builds a query string for the ROR filter parameter.
   * Colons are intentionally left unencoded because the API expects `key:value` syntax.
   */
  private buildFilterString(filters: FilterParams): string {
    return Object.entries(filters)
      .map(([key, value]) => `${key}:${encodeURIComponent(value)}`)
      .join(',');
  }

  /** Constructs the final request URL with optional query and filter parameters. */
  private buildUrl(base: string, query?: string, filters?: FilterParams): string {
    const parts: string[] = [];
    if (query) {
      parts.push(`query=${encodeURIComponent(query)}`);
    }
    if (filters && Object.keys(filters).length > 0) {
      parts.push(`filter=${this.buildFilterString(filters)}`);
    }
    return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
  }

  /** Throttles the request through the rate limiter and then issues the fetch. */
  private async fetchWithRateLimit(url: string): Promise<Response> {
    await this.rateLimiter.throttle();
    return fetch(url, { method: 'GET', headers: this.buildHeaders() });
  }

  /** Fetches a URL and parses the JSON body; throws on non-2xx responses. */
  private async fetchJson<T>(url: string): Promise<T> {
    const response = await this.fetchWithRateLimit(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: request failed for ${url}`);
    }
    return response.json() as Promise<T>;
  }
}
