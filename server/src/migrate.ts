import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "./db";

async function runMigration(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.resolve(__dirname, "../migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const alreadyApplied = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1) AS exists`,
      [file],
    );

    if (alreadyApplied.rows[0]?.exists) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1)`,
        [file],
      );
      await pool.query("COMMIT");
      // eslint-disable-next-line no-console
      console.log(`Migration ${file} applied`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}

runMigration()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Migrations completed");
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
