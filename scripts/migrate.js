import pool from "../database/database.js";
import { runMigrations } from "../database/migrations.js";

try {
  await runMigrations();
  console.log("Database migrations completed");
} finally {
  await pool.end();
}
