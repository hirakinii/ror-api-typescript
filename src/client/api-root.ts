/**
 * Normalizes the `apiRoot` client option.
 *
 * Surrounding whitespace and trailing slashes are removed so that endpoint
 * paths (which start with `/`) can be appended directly. Relative roots such
 * as `/ror-api` are accepted, so the value is intentionally not parsed with
 * `new URL()`.
 *
 * @throws {Error} If the value is empty or contains a query string or fragment.
 */
export function normalizeApiRoot(apiRoot: string): string {
  const trimmed = apiRoot.trim();
  if (trimmed === '') {
    throw new Error('apiRoot must not be empty');
  }
  if (/[?#]/.test(trimmed)) {
    throw new Error('apiRoot must not contain a query string or fragment');
  }
  return trimmed.replace(/\/+$/, '');
}
