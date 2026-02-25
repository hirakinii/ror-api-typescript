/**
 * Basic usage examples for RorClient.
 *
 * Run with:
 *   npx tsx examples/basic-usage.ts
 */

import { RorClient } from '../src/index.js';

const ROR_CLIENT_ID = process.env.ROR_CLIENT_ID;

if (!ROR_CLIENT_ID) {
  console.error('Error: ROR_CLIENT_ID environment variable is not set.');
  console.log('Please set it using: export ROR_CLIENT_ID="your-token"');
  process.exit(1);
}

const client = new RorClient({ clientId: ROR_CLIENT_ID });

// ---------------------------------------------------------------------------
// 1. Health check
// ---------------------------------------------------------------------------
async function healthCheck(): Promise<void> {
  const status = await client.checkHealth();
  console.log(`Health check status: ${status}`); // 200
}

// ---------------------------------------------------------------------------
// 2. List organizations (first page)
// ---------------------------------------------------------------------------
async function listOrganizations(): Promise<void> {
  const orgs = await client.listOrganizations();
  console.log(`Fetched ${orgs.length} organizations`);
  const first = orgs[0];
  if (first) {
    console.log('First organization:', first.id, first.names[0]?.value);
  }
}

// ---------------------------------------------------------------------------
// 3. Get a single organization by ROR ID
// ---------------------------------------------------------------------------
async function getById(): Promise<void> {
  // ROR ID for CERN
  const org = await client.getOrganizationById('https://ror.org/04ksd4g47');
  console.log('Organization name:', org.names[0]?.value);
  console.log('Status:', org.status);
  console.log('Types:', org.types.join(', '));
}

// ---------------------------------------------------------------------------
// 4. Search organizations by keyword
// ---------------------------------------------------------------------------
async function searchByKeyword(): Promise<void> {
  const results = await client.searchOrganizations('国立情報学研究所');
  console.log(`Search results for "Harvard": ${results.length} organizations`);
  for (const org of results.slice(0, 3)) {
    console.log(' -', org.id, org.names[0]?.value);
  }
}

// ---------------------------------------------------------------------------
// 5. Filter organizations by country
// ---------------------------------------------------------------------------
async function filterByCountry(): Promise<void> {
  const results = await client.filterOrganizations({
    'locations.geonames_details.country_code': 'JP',
  });
  console.log(`Organizations in Japan: ${results.length}`);
}

// ---------------------------------------------------------------------------
// 6. Filter by status (active only)
// ---------------------------------------------------------------------------
async function filterByStatus(): Promise<void> {
  const results = await client.filterOrganizations({ status: 'active' });
  console.log(`Active organizations: ${results.length}`);
}

// ---------------------------------------------------------------------------
// 7. Search + filter combined
// ---------------------------------------------------------------------------
async function searchAndFilter(): Promise<void> {
  const results = await client.searchAndFilter('university', {
    'locations.geonames_details.country_code': 'DE',
    status: 'active',
  });
  console.log(`German active universities matching "university": ${results.length}`);
  for (const org of results.slice(0, 3)) {
    console.log(' -', org.names[0]?.value);
  }
}

// ---------------------------------------------------------------------------
// Run all examples sequentially
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('=== RorClient Basic Usage Examples ===\n');

  console.log('--- 1. Health Check ---');
  await healthCheck();

  console.log('\n--- 2. List Organizations ---');
  await listOrganizations();

  console.log('\n--- 3. Get Organization by ID ---');
  await getById();

  console.log('\n--- 4. Search by Keyword ---');
  await searchByKeyword();

  console.log('\n--- 5. Filter by Country ---');
  await filterByCountry();

  console.log('\n--- 6. Filter by Status ---');
  await filterByStatus();

  console.log('\n--- 7. Search and Filter ---');
  await searchAndFilter();

  console.log('\nDone.');
}

main().catch((err: unknown) => {
  console.error('Error:', err);
  process.exit(1);
});
