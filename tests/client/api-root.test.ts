import { describe, expect, it } from 'vitest';
import { normalizeApiRoot } from '../../src/client/api-root.js';

describe('normalizeApiRoot()', () => {
  it('returns an absolute root without a trailing slash unchanged', () => {
    expect(normalizeApiRoot('https://api.ror.org')).toBe('https://api.ror.org');
  });

  it('returns a relative root unchanged', () => {
    expect(normalizeApiRoot('/ror-api')).toBe('/ror-api');
  });

  it('removes a single trailing slash', () => {
    expect(normalizeApiRoot('/ror-api/')).toBe('/ror-api');
  });

  it('removes multiple trailing slashes', () => {
    expect(normalizeApiRoot('https://proxy.example.com/ror///')).toBe('https://proxy.example.com/ror');
  });

  it('normalizes "/" to an empty string (same-origin root)', () => {
    expect(normalizeApiRoot('/')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeApiRoot('  /ror-api/  ')).toBe('/ror-api');
  });

  it('runs in linear time on many consecutive slashes (no ReDoS)', () => {
    // A trailing-slash regex such as /\/+$/ backtracks quadratically on this input.
    const pathological = `/${'/'.repeat(50_000)}x`;

    const startedAt = performance.now();
    const result = normalizeApiRoot(pathological);
    const elapsedMs = performance.now() - startedAt;

    expect(result).toBe(pathological);
    expect(elapsedMs).toBeLessThan(200);
  });

  it('removes a very long run of trailing slashes', () => {
    expect(normalizeApiRoot(`/ror-api${'/'.repeat(50_000)}`)).toBe('/ror-api');
  });

  it.each(['', '   ', '\t\n'])('throws for an empty or whitespace-only value (%j)', (value) => {
    expect(() => normalizeApiRoot(value)).toThrow(/apiRoot/);
  });

  it.each(['https://api.ror.org?a=b', '/ror-api?x', 'https://api.ror.org#frag', '/ror-api/#'])(
    'throws when the value contains a query string or fragment (%j)',
    (value) => {
      expect(() => normalizeApiRoot(value)).toThrow(/apiRoot/);
    },
  );
});
