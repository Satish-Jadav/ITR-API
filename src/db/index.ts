import { drizzle } from 'drizzle-orm/node-postgres';
import { dbPool } from '../config/supabase.js';
import * as schema from './schema.js';

// Drizzle ORM Instance configured with direct PostgreSQL connection pool
export const db = drizzle(dbPool, { schema });

// Export schema directly for easy consumption
export * from './schema.js';

