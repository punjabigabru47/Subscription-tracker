import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import pool from "../models/user.model.js";

const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authorize = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "No token provided",
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "Invalid token payload",
      });
    }

    const { rows } = await pool.query(
      "SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not found",
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      error: error.message,
    });
  }
};
