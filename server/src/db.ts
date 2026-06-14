import { Pool } from "pg";

/** Подключение к PostgreSQL. URL переопределяется через DATABASE_URL (Docker / prod). */
const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/legal_chat";

export const pool = new Pool({
  connectionString,
});
