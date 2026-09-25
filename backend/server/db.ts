import pg from "pg";

const { Pool } = pg;
let pool: pg.Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL) && process.env.NODE_ENV !== "test" && !process.env.VITEST;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  return (await getPool().query<T>(text, values)).rows;
}

export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection() {
  await getPool().query("SELECT 1");
  return true;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = null;
}
