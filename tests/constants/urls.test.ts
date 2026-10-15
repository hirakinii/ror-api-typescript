import { describe, expect, it } from 'vitest';
import {
  BASE_URL,
  DEFAULT_API_ROOT,
  HEALTH_CHECK_URL,
  HEARTBEAT_PATH,
  ORGANIZATIONS_PATH,
} from '../../src/constants/urls.js';
import * as publicApi from '../../src/index.js';

describe('URL constants', () => {
  it('keeps BASE_URL unchanged for backward compatibility', () => {
    expect(BASE_URL).toBe('https://api.ror.org/v2/organizations');
  });

  it('keeps HEALTH_CHECK_URL unchanged for backward compatibility', () => {
    expect(HEALTH_CHECK_URL).toBe('https://api.ror.org/heartbeat');
  });

  it('defines DEFAULT_API_ROOT without a trailing slash', () => {
    expect(DEFAULT_API_ROOT).toBe('https://api.ror.org');
  });

  it('derives the legacy constants from DEFAULT_API_ROOT and the endpoint paths', () => {
    expect(BASE_URL).toBe(`${DEFAULT_API_ROOT}${ORGANIZATIONS_PATH}`);
    expect(HEALTH_CHECK_URL).toBe(`${DEFAULT_API_ROOT}${HEARTBEAT_PATH}`);
  });
});

describe('public exports', () => {
  it('exports DEFAULT_API_ROOT alongside the legacy constants', () => {
    expect(publicApi.DEFAULT_API_ROOT).toBe('https://api.ror.org');
    expect(publicApi.BASE_URL).toBe(BASE_URL);
    expect(publicApi.HEALTH_CHECK_URL).toBe(HEALTH_CHECK_URL);
  });

  it('does not export the internal endpoint path constants', () => {
    expect(publicApi).not.toHaveProperty('ORGANIZATIONS_PATH');
    expect(publicApi).not.toHaveProperty('HEARTBEAT_PATH');
  });
});
