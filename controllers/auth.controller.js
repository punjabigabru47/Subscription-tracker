/* eslint-disable no-unused-vars */
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_EXPIRATION, JWT_SECRET } from "../config/env.js";
import pool from "../models/user.model.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createToken = (user) => {
  if (!JWT_SECRET) {
    throw createHttpError("JWT secret is not configured", 500);
  }

  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION || "1h",
  });
};

const validateSignUpInput = ({ name, email, password } = {}) => {
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw createHttpError("Name, email, and password are required", 400);
  }

  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    throw createHttpError("Name is required", 400);
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw createHttpError(
      `Name must be ${MAX_NAME_LENGTH} characters or less`,
      400,
    );
  }

  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    throw createHttpError(
      `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
      400,
    );
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw createHttpError("A valid email is required", 400);
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw createHttpError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      400,
    );
  }

  return { name: trimmedName, email: normalizedEmail, password };
};

export const signUp = async (req, res, next) => {
  try {
    const { name, email, password } = validateSignUpInput(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, updated_at`,
      [name, email, hashedPassword],
    );

    const user = rows[0];
    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      next(createHttpError("User already exists", 409));
      return;
    }

    next(error);
  }
};

export const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || typeof password !== "string") {
      throw createHttpError("Email and password are required", 400);
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, password, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    );

    if (rows.length === 0) {
      throw createHttpError("User does not exist", 404);
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw createHttpError("Invalid password", 401);
    }

    delete user.password;

    const token = createToken(user);

    res.status(200).json({
      success: true,
      message: "User signed in successfully",
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const signOut = async (req, res, next) => {
  // implement sign out logic
};
