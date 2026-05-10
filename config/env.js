import { config } from "dotenv";
import process from "node:process";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  DATABASE_URL,
  NODE_ENV,
  PGDATABASE,
  PGHOST,
  PGPASSWORD,
  PGPORT,
  PGUSER,
  PORT,
  JWT_SECRET,
  JWT_EXPIRATION,
  ARCJET_API_KEY,
  ARCJET_ENV,
} = process.env;
