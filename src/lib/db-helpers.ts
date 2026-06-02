/**
 * Run a Prisma query and return `null` instead of throwing when the database
 * is unreachable, so pages can degrade gracefully to a "DB unavailable" notice.
 */
export async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error("Database query failed", err);
    return null;
  }
}
