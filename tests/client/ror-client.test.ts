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
});
