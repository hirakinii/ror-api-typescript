# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-25

### Changed

- Added `"inlineSources": true,` to `tsconfig.json` so that the contents of source codes are embedded into their corresponding `.map` files.

## [0.1.0] - 2026-02-23

### Added

- `RorClient` class with the following methods:
  - `checkHealth()` — calls the `/heartbeat` endpoint and returns the HTTP status code
  - `listOrganizations()` — returns the first page of all organizations
  - `getOrganizationById(rorId)` — returns a single organization by ROR ID; throws on 4xx/5xx
  - `searchOrganizations(query)` — returns organizations matching a keyword query
  - `filterOrganizations(filters)` — returns organizations matching filter parameters
  - `searchAndFilter(query, filters)` — combines keyword search and filter
- `RorOrganization` interface compliant with the official ROR JSON schema v2.0/v2.1
- Zod v4 schema (`rorOrganizationSchema`) for runtime validation of API responses
- `isRorOrganization()` type guard
- `FilterParams` / `FilterKey` types for type-safe filter parameters
- `RorClientOptions` interface (`clientId` for the `Client-Id` request header)
- Built-in rate limiter: automatically throttles requests to stay within the 400 req/min limit
- ESM-only package targeting Node.js ≥ 18 with full TypeScript declaration files
- CI workflow (GitHub Actions) — lint, type-check, test, and build on Node.js 20/22/24
- CD workflow (GitHub Actions) — automatic publish to npm on `v*` tags

[Unreleased]: https://github.com/hirakinii/ror-api-typescript/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/hirakinii/ror-api-typescript/releases/tag/v0.1.0
