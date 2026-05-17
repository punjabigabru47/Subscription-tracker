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
    const tokenId = decoded.jti;

    if (!userId || !tokenId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const blacklistedToken = await pool.query(
      `SELECT token_id
       FROM token_blacklist
       WHERE token_id = $1
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenId],
    );

    if (blacklistedToken.rows.length > 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, password_changed_at, password_version,
              created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const tokenPasswordVersion = decoded.passwordVersion ?? 0;

    if (tokenPasswordVersion !== rows[0].password_version) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    void error;

    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
