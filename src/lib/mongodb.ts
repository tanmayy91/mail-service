/**
 * mongodb.ts — kept as a compatibility shim.
 * The database has been migrated to a local JSON file (src/lib/db.ts).
 * All callers can continue to call connectDB(); it is now a no-op.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function connectDB(): Promise<void> {}
