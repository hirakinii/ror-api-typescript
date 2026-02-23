# ROR API v2 TypeScript Client

A robust, type-safe TypeScript client library for interacting with the Research Organization Registry (ROR) REST API (v2).

## Overview

This library provides an easy-to-use interface for searching and retrieving research organization data registered in ROR. It includes type definitions that are fully compliant with the official JSON schema (v2.0/v2.1), supporting safe development in a TypeScript environment.

## Key Features

1. **Health Check**: Check the operational status of the ROR service (`/heartbeat`).
2. **Get All Records**: Retrieve a list of ROR records.
3. **ID Search**: Retrieve a single record by specifying a ROR ID (`https://ror.org/0...`).
4. **Filter Search**: Filter searches by specific conditions such as status, organization type, country code, and continent name.
5. **Keyword Search**: Search records using arbitrary keywords.
6. **Combined Search**: Combine keyword and filter searches.
7. **Client-Id Header Support**: Explicitly identify the caller via request headers (a ROR API best practice).
8. **Rate Limit Control**: Automatic throttling to comply with the API usage limit (400 requests/min).

## Installation

```bash
npm install ror-api-client
# or
yarn add ror-api-client

```

## Usage

### Initialization

When initializing the client, it is recommended to specify an identifier (such as your app name or contact info) to be set in the `Client-Id` header.

```typescript
import { RorClient } from 'ror-api-client';

const client = new RorClient({
  clientId: 'my-research-app/1.0 (mailto:admin@example.com)'
});

```

### Health Check

```typescript
// Check the operational status of the API (returns the HTTP status code)
const statusCode = await client.checkHealth();
if (statusCode === 200) {
  console.log('ROR API is up and running!');
}

```

### Get a Record by Specific ROR ID

```typescript
try {
  const org = await client.getOrganization('[https://ror.org/012xzy7a9](https://ror.org/012xzy7a9)');
  console.log(org.names[0].value);
} catch (error) {
  console.error('Record not found or API error', error);
}

```

### Combine Keyword and Filter Search

```typescript
const results = await client.search({
  query: 'university',
  filters: {
    status: 'active', // 'active', 'inactive', or 'withdrawn'
    types: 'education',
    'locations.geonames_details.country_code': 'JP'
  }
});

console.log(`Found ${results.length} records.`);
results.forEach(org => {
  console.log(`- ${org.id}: ${org.names[0].value}`);
});

```

## Type Definitions

This library exports the `RorOrganization` interface, which complies with the official ROR schema. Since this type is applied to return values such as search results, you can benefit from IDE code completion and compile-time type checking.

## Rate Limiting

The ROR API has a limit of **400 requests per minute**. This client is designed to internally monitor request frequency and automatically throttle (wait) when approaching the limit. This allows developers to proceed with implementation without worrying excessively about `429 Too Many Requests` errors.

## License

MIT. See [LICENSE](LICENSE) for details.
