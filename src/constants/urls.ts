/** Default ROR API root (scheme + host, no trailing slash). */
export const DEFAULT_API_ROOT = 'https://api.ror.org' as const;
/** Path of the organizations endpoint, relative to the API root. */
export const ORGANIZATIONS_PATH = '/v2/organizations' as const;
/** Path of the heartbeat endpoint, relative to the API root. */
export const HEARTBEAT_PATH = '/heartbeat' as const;

// Kept for backward compatibility; values must not change.
export const BASE_URL = 'https://api.ror.org/v2/organizations' as const;
export const HEALTH_CHECK_URL = 'https://api.ror.org/heartbeat' as const;
