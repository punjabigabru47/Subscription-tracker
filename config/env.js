import { config } from "dotenv";
import process from "node:process";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  DATABASE_URL,
  CORS_ORIGIN,
  NODE_ENV,
  PGDATABASE,
  PGHOST,
  PGPASSWORD,
  PGPORT,
  PGSSL,
  PGUSER,
  PORT,
  SERVER_URL,
  JWT_SECRET,
  JWT_EXPIRATION,
  ARCJET_API_KEY,
  ARCJET_ENV,
  QSTASH_URL,
  QSTASH_TOKEN,
  QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY,
  EMAIL_USER,
  EMAIL_PASSWORD,
} = process.env;
