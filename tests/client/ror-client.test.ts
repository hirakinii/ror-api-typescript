import { afterEach, describe, expect, it, vi } from 'vitest';
import { RorClient } from '../../src/client/ror-client.js';
import { BASE_URL, HEALTH_CHECK_URL } from '../../src/constants/urls.js';
import type { RorOrganization } from '../../src/types/ror-organization.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockOrg: RorOrganization = {
  admin: {
    created: { date: '2024-01-01', schema_version: '2.1' },
    last_modified: { date: '2024-01-01', schema_version: '2.1' },
  },
  id: 'https://ror.org/01q15rk86',
  locations: [{ geonames_id: 1850147, geonames_details: { name: 'Tokyo' } }],
  names: [{ value: 'Test Org', types: ['label'] }],
  status: 'active',
  types: ['education'],
};

const mockListResponse = { items: [mockOrg], meta: { total: 1, page: 1 }, time_taken: 0 };

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RorClient', () => {
  // Step 4-1: checkHealth
  describe('checkHealth()', () => {
    it('returns the HTTP status code on a successful heartbeat', async () => {
      vi.stubGlobal('fetch', makeFetchMock(200, 'OK'));
      const client = new RorClient();

      expect(await client.checkHealth()).toBe(200);
      expect(fetch).toHaveBeenCalledWith(HEALTH_CHECK_URL, expect.any(Object));
    });

    it('throws when a network error occurs', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
      const client = new RorClient();

      await expect(client.checkHealth()).rejects.toThrow('Network failure');
    });
  });

  // Step 4-2: listOrganizations
  describe('listOrganizations()', () => {
    it('calls GET BASE_URL and returns the items array', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      const result = await client.listOrganizations();

      expect(fetchMock).toHaveBeenCalledWith(BASE_URL, expect.objectContaining({ method: 'GET' }));
      expect(result).toEqual([mockOrg]);
    });

    it('includes the Client-Id header when the option is provided', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ clientId: 'my-app' });

      await client.listOrganizations();

      expect(fetchMock).toHaveBeenCalledWith(
        BASE_URL,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Client-Id': 'my-app' }),
        }),
      );
    });

    it('omits the Client-Id header when no clientId is given', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      await client.listOrganizations();

      const callHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      expect(callHeaders['Client-Id']).toBeUndefined();
    });

    it('throws when the response is not ok', async () => {
      vi.stubGlobal('fetch', makeFetchMock(500, { errors: ['Server error'] }));
      const client = new RorClient();

      await expect(client.listOrganizations()).rejects.toThrow();
    });
  });

  // Step 4-3: getOrganizationById
  describe('getOrganizationById()', () => {
    it('calls GET BASE_URL/{rorId} and returns the organization', async () => {
      const fetchMock = makeFetchMock(200, mockOrg);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      const result = await client.getOrganizationById('01q15rk86');

      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/01q15rk86`, expect.any(Object));
      expect(result).toEqual(mockOrg);
    });

    it('throws when the response status is 404', async () => {
      vi.stubGlobal('fetch', makeFetchMock(404, { errors: ['Not found'] }));
      const client = new RorClient();

      await expect(client.getOrganizationById('nonexistent')).rejects.toThrow();
    });
  });

  // Step 4-4: filterOrganizations
  describe('filterOrganizations()', () => {
    it('builds ?filter=key:value and returns items', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      const result = await client.filterOrganizations({ status: 'active' });
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      expect(calledUrl).toContain('filter=');
      expect(calledUrl).toContain('status:active');
      expect(result).toEqual([mockOrg]);
    });

    it('joins multiple filters with a comma', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      await client.filterOrganizations({ status: 'active', types: 'education' });
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      expect(calledUrl).toContain('status:active');
      expect(calledUrl).toContain('types:education');
      // Both filters must appear in a single filter= parameter (comma-separated)
      expect(calledUrl).toMatch(/filter=.*,/);
    });
  });

  // Step 4-5: searchOrganizations & searchAndFilter
  describe('searchOrganizations()', () => {
    it('builds ?query=keyword and returns items', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      const result = await client.searchOrganizations('university');
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      expect(calledUrl).toContain('query=university');
      expect(result).toEqual([mockOrg]);
    });

    it('URL-encodes the query string so it contains no raw spaces', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      await client.searchOrganizations('tokyo university');
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      expect(calledUrl).not.toContain(' ');
    });
  });

  describe('searchAndFilter()', () => {
    it('combines query and filter in the URL', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      const result = await client.searchAndFilter('university', { status: 'active' });
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      expect(calledUrl).toContain('query=university');
      expect(calledUrl).toContain('filter=');
      expect(calledUrl).toContain('status:active');
      expect(result).toEqual([mockOrg]);
    });
  });

  // Phase 6: Security tests
  describe('URL injection prevention', () => {
    it('encodes special characters in rorId to prevent path injection', async () => {
      const fetchMock = makeFetchMock(200, mockOrg);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      await client.getOrganizationById('../../../etc/passwd');
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      expect(calledUrl).not.toContain('../');
      expect(calledUrl).toContain('%2F');
    });

    it('encodes special characters in query to prevent injection', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      await client.searchOrganizations('test&injected=true');
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      // Raw & must not appear in the query value (would split the query string)
      expect(calledUrl).not.toContain('query=test&');
      expect(calledUrl).toContain('%26');
    });

    it('encodes special characters in filter values to prevent injection', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient();

      await client.filterOrganizations({ status: 'active&injected=true' });
      const calledUrl = fetchMock.mock.calls[0][0] as string;

      // Raw & must not appear after the filter key:value pair
      expect(calledUrl).not.toContain('status:active&');
      expect(calledUrl).toContain('%26');
    });
  });

  // apiRoot option: route requests through a proxy or alternative API root
  describe('apiRoot option', () => {
    const PROXY_ROOT = '/ror-api';

    function calledUrlOf(fetchMock: ReturnType<typeof makeFetchMock>): string {
      return fetchMock.mock.calls[0][0] as string;
    }

    it('sends checkHealth() to {apiRoot}/heartbeat', async () => {
      const fetchMock = makeFetchMock(200, 'OK');
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await client.checkHealth();

      expect(calledUrlOf(fetchMock)).toBe('/ror-api/heartbeat');
    });

    it('sends listOrganizations() to {apiRoot}/v2/organizations', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await client.listOrganizations();

      expect(calledUrlOf(fetchMock)).toBe('/ror-api/v2/organizations');
    });

    it('sends getOrganizationById() to {apiRoot}/v2/organizations/{encoded id}', async () => {
      const fetchMock = makeFetchMock(200, mockOrg);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await client.getOrganizationById('01q15rk86');
      await client.getOrganizationById('a/b');

      expect(fetchMock.mock.calls[0][0]).toBe('/ror-api/v2/organizations/01q15rk86');
      expect(fetchMock.mock.calls[1][0]).toBe('/ror-api/v2/organizations/a%2Fb');
    });

    it('sends filterOrganizations() to {apiRoot}/v2/organizations?filter=...', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await client.filterOrganizations({ status: 'active' });

      expect(calledUrlOf(fetchMock)).toBe('/ror-api/v2/organizations?filter=status:active');
    });

    it('sends searchOrganizations() to {apiRoot}/v2/organizations?query=...', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await client.searchOrganizations('university');

      expect(calledUrlOf(fetchMock)).toBe('/ror-api/v2/organizations?query=university');
    });

    it('sends searchAndFilter() to {apiRoot}/v2/organizations?query=...&filter=...', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await client.searchAndFilter('university', { status: 'active' });

      expect(calledUrlOf(fetchMock)).toBe('/ror-api/v2/organizations?query=university&filter=status:active');
    });

    it('keeps the path prefix of an absolute apiRoot', async () => {
      const fetchMock = makeFetchMock(200, 'OK');
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: 'https://proxy.example.com/ror' });

      await client.checkHealth();
      await client.listOrganizations();

      expect(fetchMock.mock.calls[0][0]).toBe('https://proxy.example.com/ror/heartbeat');
      expect(fetchMock.mock.calls[1][0]).toBe('https://proxy.example.com/ror/v2/organizations');
    });

    it.each(['/ror-api/', '/ror-api//'])(
      'does not produce a double slash when apiRoot has trailing slashes (%j)',
      async (apiRoot) => {
        const fetchMock = makeFetchMock(200, mockListResponse);
        vi.stubGlobal('fetch', fetchMock);
        const client = new RorClient({ apiRoot });

        await client.listOrganizations();

        expect(calledUrlOf(fetchMock)).toBe('/ror-api/v2/organizations');
      },
    );

    it('resolves apiRoot "/" to same-origin root paths', async () => {
      const fetchMock = makeFetchMock(200, 'OK');
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ apiRoot: '/' });

      await client.checkHealth();
      await client.listOrganizations();

      expect(fetchMock.mock.calls[0][0]).toBe('/heartbeat');
      expect(fetchMock.mock.calls[1][0]).toBe('/v2/organizations');
    });

    it('uses BASE_URL and HEALTH_CHECK_URL when apiRoot is omitted', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ clientId: 'my-app' });

      await client.checkHealth();
      await client.listOrganizations();

      expect(fetchMock.mock.calls[0][0]).toBe(HEALTH_CHECK_URL);
      expect(fetchMock.mock.calls[1][0]).toBe(BASE_URL);
    });

    it('still sends the Client-Id header when apiRoot is set', async () => {
      const fetchMock = makeFetchMock(200, mockListResponse);
      vi.stubGlobal('fetch', fetchMock);
      const client = new RorClient({ clientId: 'dmp-editor', apiRoot: PROXY_ROOT });

      await client.listOrganizations();

      expect(fetchMock).toHaveBeenCalledWith(
        '/ror-api/v2/organizations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'Client-Id': 'dmp-editor' }),
        }),
      );
    });

    it('includes the resolved URL in the error message on a non-2xx response', async () => {
      vi.stubGlobal('fetch', makeFetchMock(404, { errors: ['Not found'] }));
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await expect(client.getOrganizationById('xxx')).rejects.toThrow(
        'HTTP 404: request failed for /ror-api/v2/organizations/xxx',
      );
    });

    it('propagates network errors when apiRoot is set', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
      const client = new RorClient({ apiRoot: PROXY_ROOT });

      await expect(client.checkHealth()).rejects.toThrow('Failed to fetch');
    });

    it.each(['', '   ', 'https://api.ror.org?a=b', '/ror-api#frag'])(
      'throws from the constructor for an invalid apiRoot (%j)',
      (apiRoot) => {
        expect(() => new RorClient({ apiRoot })).toThrow(/apiRoot/);
      },
    );
  });
});
