/**
 * Parse a mysql:// connection URL into discrete connection options.
 * Supports format: mysql://user:password@host:port/database
 */
export function parseDatabaseUrl(url: string): { host: string; port: number; user: string; password: string; database: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'mysql:') return null;
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port || '3306', 10),
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: (parsed.pathname || '/').replace(/^\//, '') || 'ticket_system',
    };
  } catch {
    return null;
  }
}

/**
 * Get database connection config from environment variables.
 * Priority:
 * 1. DATABASE_URL (only for prefix 'DB', not for TEST_DB to avoid accidental prod use)
 *    or PREFIX_DATABASE_URL / PREFIX_URL for other prefixes
 * 2. Discrete env vars (PREFIX_HOST, PREFIX_PORT, etc.)
 * 3. Fallback prefix's discrete env vars
 * 4. Defaults
 *
 * Returns `name` instead of `database` to match the Config interface convention.
 * Tooling scripts (migrations/seed) use `parseDatabaseUrl().database` directly.
 */
export function getDbConfig(
  prefix: string,
  fallbackPrefix?: string
): { host: string; port: number; user: string; password: string; name: string } {
  // Only check bare DATABASE_URL for the 'DB' prefix — for TEST_DB or other prefixes,
  // requiring an explicit TEST_DATABASE_URL or TEST_DB_URL prevents accidentally
  // pointing test/dev config at a production database.
  const urlVar = prefix === 'DB'
    ? 'DATABASE_URL'
    : `${prefix}_DATABASE_URL`;
  const prefixedUrlVar = `${prefix}_URL`;
  
  const dbUrl = process.env[urlVar] || process.env[prefixedUrlVar];
  
  if (dbUrl) {
    const parsed = parseDatabaseUrl(dbUrl);
    if (parsed) {
      const { database, ...rest } = parsed;
      return { ...rest, name: database };
    }
  }

  return {
    host: process.env[`${prefix}_HOST`] || (fallbackPrefix ? (process.env[`${fallbackPrefix}_HOST`] || '127.0.0.1') : '127.0.0.1'),
    port: parseInt(process.env[`${prefix}_PORT`] || (fallbackPrefix ? (process.env[`${fallbackPrefix}_PORT`] || '3306') : '3306'), 10),
    user: process.env[`${prefix}_USER`] || (fallbackPrefix ? (process.env[`${fallbackPrefix}_USER`] || 'root') : 'root'),
    password: process.env[`${prefix}_PASSWORD`] || (fallbackPrefix ? (process.env[`${fallbackPrefix}_PASSWORD`] || '') : ''),
    name: process.env[`${prefix}_NAME`] || process.env[`${prefix}_DATABASE`] || (fallbackPrefix ? (process.env[`${fallbackPrefix}_NAME`] || 'ticket_system') : 'ticket_system'),
  };
}
