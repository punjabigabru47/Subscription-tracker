import { z } from "zod";

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;

export const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const parseRequest = (schema, data) => {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const message = result.error.issues[0]?.message || "Invalid request data";
  throw createHttpError(message, 400);
};

export const signUpSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or less`),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .max(
      MAX_EMAIL_LENGTH,
      `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    )
    .email("A valid email is required"),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters long"),
});

export const signInSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("A valid email is required"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const createSubscriptionSchema = z.object({
  name: z.string({ error: "name is required" }).trim().min(1, "name is required"),
  price: z.coerce
    .number({ error: "price is required" })
    .positive("price must be greater than 0"),
  currency: z.string().trim().min(1).default("USD"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "annual", "annually"], {
    error: "Frequency must be daily, weekly, monthly, or yearly",
  }),
  category: z.string().trim().nullable().optional().default(null),
  paymentMethod: z.string().trim().nullable().optional(),
  status: z.string().trim().optional(),
  startDate: z.string({ error: "startDate is required" }).trim().min(1, "startDate is required"),
  renewalDate: z.string().trim().optional(),
});
