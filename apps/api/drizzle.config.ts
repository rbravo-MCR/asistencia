import { defineConfig } from 'drizzle-kit';
import { parseConfig } from './src/bootstrap/config.js';

const config = parseConfig(process.env);
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: config.databaseUrl },
  strict: true,
});
