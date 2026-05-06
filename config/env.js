import { config } from "dotenv";
import process from "node:process";

config({ path: `.env.${process.env.NODE_ENV || "development"}` });

export const { PORT } = process.env;
