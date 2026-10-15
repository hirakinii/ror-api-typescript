# ROR API v2 TypeScript Client

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![npm version](https://badge.fury.io/js/@hirakinii-packages%2Fror-api-typescript.svg)](https://badge.fury.io/js/@hirakinii-packages%2Fror-api-typescript)
[![CI](https://github.com/hirakinii/ror-api-typescript/actions/workflows/ci.yml/badge.svg?event=pull_request)](https://github.com/hirakinii/ror-api-typescript/actions/workflows/ci.yml?query=event%3Apull_request)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A robust, type-safe TypeScript client library for interacting with the Research Organization Registry (ROR) REST API (v2).

## Overview

This library provides an easy-to-use interface for searching and retrieving research organization data registered in ROR. It includes type definitions that are fully compliant with the official JSON schema (v2.0/v2.1), supporting safe development in a TypeScript environment.

## Key Features

1. **Health Check**: Check the operational status of the ROR service (`/heartbeat`).
2. **List Records**: Retrieve a list of ROR records.
3. **ID Lookup**: Retrieve a single record by specifying a ROR ID (`https://ror.org/...`).
4. **Filter Search**: Filter by status, organization type, country code, continent name, and more.
5. **Keyword Search**: Search records using arbitrary keywords.
6. **Combined Search**: Combine keyword and filter searches.
7. **Client-Id Header Support**: Explicitly identify the caller via request headers (a ROR API best practice).
8. **Rate Limit Control**: Automatic throttling to comply with the API usage limit (400 requests/min).
9. **Custom API Root**: Route requests through a reverse proxy or an alternative API root (`apiRoot`).

## Requirements

- Node.js 24 or later

## Installation

```bash
npm install ror-api-typescript
# or
yarn add ror-api-typescript
# or
pnpm add ror-api-typescript
```

## Usage

### Initialization

When initializing the client, it is recommended to specify an identifier (such as your app name or contact info) in the `clientId` option. This value is sent as the `Client-Id` request header.

```typescript
import { RorClient } from 'ror-api-typescript';

const client = new RorClient({
  clientId: 'my-research-app/1.0 (mailto:admin@example.com)'
});
```

### Using a Reverse Proxy (`apiRoot`)

By default, requests are sent to `https://api.ror.org`. To route them through your own reverse proxy (for example, so that browsers never contact the ROR API directly), pass the proxy's API root as `apiRoot`:

```typescript
const client = new RorClient({
  clientId: 'my-research-app/1.0',
  apiRoot: '/ror-api', // requests go to /ror-api/v2/organizations, /ror-api/heartbeat
});
```

A matching nginx configuration might look like this:

```nginx
location /ror-api/ {
    proxy_pass https://api.ror.org/;
    proxy_set_header Host api.ror.org;
    proxy_ssl_server_name on;
}
```

Notes:

- `apiRoot` is the API **root**, not an endpoint URL. Endpoint paths such as `/v2/organizations` and `/heartbeat` are appended to it.
- Surrounding whitespace and trailing slashes are removed (`'/ror-api/'` behaves like `'/ror-api'`).
- An empty value, or a value containing `?` or `#`, throws an `Error` from the constructor.
- A relative root such as `/ror-api` only works where `fetch` can resolve relative URLs (browsers). In Node.js, use an absolute URL.
- `apiRoot` is a developer-controlled setting. Never build it from end-user input: the `Client-Id` header and all requests are sent to whatever host it points to.

### Health Check

```typescript
const statusCode = await client.checkHealth();
if (statusCode === 200) {
  console.log('ROR API is up and running!');
}
```

### List Organizations

```typescript
const orgs = await client.listOrganizations();
console.log(`Fetched ${orgs.length} organizations`);
```

### Get a Record by ROR ID

```typescript
try {
  const org = await client.getOrganizationById('https://ror.org/01ggx4157');
  console.log(org.names[0]?.value); // "CERN"
} catch (error) {
  console.error('Record not found or API error', error);
}
```

### Keyword Search

```typescript
const results = await client.searchOrganizations('Harvard');
results.forEach(org => {
  console.log(`${org.id}: ${org.names[0]?.value}`);
});
```

### Filter Search

```typescript
const results = await client.filterOrganizations({
  'locations.geonames_details.country_code': 'JP',
  status: 'active',
});
console.log(`Active organizations in Japan: ${results.length}`);
```

### Combined Keyword and Filter Search

```typescript
const results = await client.searchAndFilter('university', {
  'locations.geonames_details.country_code': 'DE',
  status: 'active',
});
console.log(`Found ${results.length} records.`);
results.forEach(org => {
  console.log(`- ${org.id}: ${org.names[0]?.value}`);
});
```

## API Reference

### `RorClient`

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkHealth` | `() => Promise<number>` | Returns the HTTP status code of the `/heartbeat` endpoint |
| `listOrganizations` | `() => Promise<RorOrganization[]>` | Returns all organizations (first page) |
| `getOrganizationById` | `(rorId: string) => Promise<RorOrganization>` | Returns the organization with the given ROR ID; throws if not found |
| `searchOrganizations` | `(query: string) => Promise<RorOrganization[]>` | Returns organizations matching the keyword query |
| `filterOrganizations` | `(filters: FilterParams) => Promise<RorOrganization[]>` | Returns organizations matching the filter parameters |
| `searchAndFilter` | `(query: string, filters: FilterParams) => Promise<RorOrganization[]>` | Combines keyword search and filter |

### `RorClientOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientId` | `string` | (none) | Sent as the `Client-Id` request header |
| `apiRoot` | `string` | `'https://api.ror.org'` (`DEFAULT_API_ROOT`) | Root URL of the ROR API; endpoint paths are appended to it |

### `FilterParams`

Key–value pairs for the `filter` query parameter. Available keys:

| Key | Example value |
|-----|--------------|
| `status` | `"active"`, `"inactive"`, `"withdrawn"` |
| `types` | `"Education"`, `"Facility"`, `"Nonprofit"` |
| `locations.geonames_details.country_code` | `"JP"`, `"US"`, `"DE"` |
| `locations.geonames_details.country_name` | `"Japan"`, `"United States"` |
| `locations.geonames_details.continent_code` | `"AS"`, `"EU"`, `"NA"` |
| `locations.geonames_details.continent_name` | `"Asia"`, `"Europe"` |

### Exported Types

```typescript
import type {
  RorOrganization,  // Full organization record
  RorClientOptions, // Constructor options
  FilterParams,     // Filter key–value map
  FilterKey,        // Union of valid filter key strings
} from 'ror-api-typescript';
```

## Type Definitions

This library exports the `RorOrganization` interface, which complies with the official ROR schema (v2.0/v2.1). Since this type is applied to all return values, you benefit from IDE code completion and compile-time type checking.

A [Zod](https://zod.dev/) schema (`rorOrganizationSchema`) and a type guard (`isRorOrganization`) are also exported for runtime validation.

```typescript
import { isRorOrganization, rorOrganizationSchema } from 'ror-api-typescript';

// Type guard
if (isRorOrganization(data)) {
  console.log(data.id);
}

// Zod parse
const org = rorOrganizationSchema.parse(data);
```

## Rate Limiting

The ROR API has a limit of **400 requests per minute**. This client automatically throttles requests when approaching the limit, so you do not need to worry about receiving `429 Too Many Requests` errors.

## Examples

Runnable examples are available in the [`examples/`](examples/) directory.

```bash
npx tsx examples/basic-usage.ts
```

## License

MIT. See [LICENSE](LICENSE) for details.
