import pg from "pg";
import {
  DATABASE_URL,
  NODE_ENV,
  PGDATABASE,
  PGHOST,
  PGPASSWORD,
  PGPORT,
  PGUSER,
} from "../config/env.js";

const { Pool } = pg;

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
      }
    : {
        host: PGHOST,
        port: PGPORT ? Number(PGPORT) : 5432,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
      },
);

export const connectToDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query("SELECT NOW()");
    console.log(`PostgreSQL database connected in ${NODE_ENV} mode`);
  } finally {
    client.release();
  }
};

export default pool;
