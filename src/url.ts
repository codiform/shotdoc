/** True for a URL with a scheme, such as `https://host/page`. */
export const isAbsoluteUrl = (u: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(u);

/**
 * Resolves a `goto` value. An absolute URL is used as written. Anything else is a context path:
 * it is resolved against the base URL treated as a directory, so `/` is the base URL itself and
 * `/login`, `login` and `./login` all go under the base URL's path, with or without a trailing slash.
 */
export function resolveGoto(value: string, base: string | undefined): string {
  if (isAbsoluteUrl(value) || !base) return value;
  const root = new URL(base);
  if (!root.pathname.endsWith('/')) root.pathname += '/';
  return new URL(value.startsWith('/') ? value.slice(1) : value, root).toString();
}
