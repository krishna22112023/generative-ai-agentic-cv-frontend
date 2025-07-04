import { Pool } from "pg";
import type { QueryResultRow } from "pg";

// Singleton pattern to ensure a single pool across hot reloads in Next.js dev
// eslint-disable-next-line
let _pool: Pool | undefined = globalThis.__dbPool as unknown as Pool | undefined;

if (!_pool) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // @ts-ignore
  globalThis.__dbPool = _pool;
}

export const pool = _pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const res = await pool.query<T>(text, params);
  return res;
}

// Ensure the file is treated as a module and the global declaration is scoped correctly
export {}

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
} 