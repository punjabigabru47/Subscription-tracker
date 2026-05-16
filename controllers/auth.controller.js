import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_EXPIRATION, JWT_SECRET } from "../config/env.js";
import pool from "../models/user.model.js";
import {
  createHttpError,
  parseRequest,
  signInSchema,
  signUpSchema,
} from "../utils/validation.js";

const createToken = (user) => {
  if (!JWT_SECRET) {
    throw createHttpError("JWT secret is not configured", 500);
  }

  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION || "1h",
  });
};

export const signUp = async (req, res, next) => {
  try {
    const { name, email, password } = parseRequest(signUpSchema, req.body);
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
    const { email, password } = parseRequest(signInSchema, req.body);

    const { rows } = await pool.query(
      `SELECT id, name, email, password, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    if (rows.length === 0) {
      throw createHttpError("Invalid email or password", 401);
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw createHttpError("Invalid email or password", 401);
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
  try {
    res.status(200).json({
      success: true,
      message: "User signed out successfully. Please remove the token from the client.",
    });
  } catch (error) {
    next(error);
  }
};
