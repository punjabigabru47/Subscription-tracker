import { config } from "dotenv";
import process from "node:process";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const { PORT, NODE_ENV } = process.env;
