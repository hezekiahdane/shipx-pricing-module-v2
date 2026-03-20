import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

function createDrizzleClient() {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. The database module requires a PostgreSQL connection string.',
    );
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

let dbInstance: ReturnType<typeof createDrizzleClient> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDrizzleClient();
  }
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
