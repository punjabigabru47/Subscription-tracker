import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  EMAIL_USER,
  JWT_EXPIRATION,
  JWT_SECRET,
  SERVER_URL,
} from "../config/env.js";
import transporter, { accountEmail } from "../config/nodemailer.js";
import pool from "../models/user.model.js";
import {
  createHttpError,
  parseRequest,
  refreshTokenSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "../utils/validation.js";

const ACCESS_TOKEN_EXPIRES_IN = JWT_EXPIRATION || "15m";
const REFRESH_TOKEN_DAYS = 30;
const RESET_TOKEN_MINUTES = 15;

const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  return scheme === "Bearer" && token ? token : null;
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createAccessToken = (user) => {
  if (!JWT_SECRET) {
    throw createHttpError("JWT secret is not configured", 500);
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      passwordVersion: user.password_version ?? 0,
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
};

const createRefreshToken = async (userId) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, refreshTokenHash, expiresAt],
  );

  return refreshToken;
};

const createSession = async (user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken };
};

const revokeRefreshToken = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1`,
    [hashToken(refreshToken)],
  );
};

const blacklistAccessToken = async (accessToken) => {
  if (!accessToken || !JWT_SECRET) {
    return;
  }

  let decoded;

  try {
    decoded = jwt.verify(accessToken, JWT_SECRET);
  } catch {
    return;
  }

  if (!decoded.jti || !decoded.exp) {
    return;
  }

  await pool.query(
    `INSERT INTO token_blacklist (token_id, expires_at)
     VALUES ($1, to_timestamp($2))
     ON CONFLICT (token_id) DO NOTHING`,
    [decoded.jti, decoded.exp],
  );
};

const getRefreshTokenUser = async (refreshToken) => {
  const { rows } = await pool.query(
    `SELECT users.id, users.name, users.email, users.password_version,
            users.created_at, users.updated_at
     FROM refresh_tokens
     JOIN users ON users.id = refresh_tokens.user_id
     WHERE refresh_tokens.token_hash = $1
       AND refresh_tokens.revoked_at IS NULL
       AND refresh_tokens.expires_at > CURRENT_TIMESTAMP`,
    [hashToken(refreshToken)],
  );

  if (rows.length === 0) {
    throw createHttpError("Invalid refresh token", 401);
  }

  return rows[0];
};

const sendPasswordResetEmail = async ({ email, resetToken }) => {
  if (!EMAIL_USER || !accountEmail) {
    console.log(`Password reset token for ${email}: ${resetToken}`);
    return;
  }

  const resetUrl = new URL("/reset-password", SERVER_URL || "http://localhost:5500");
  resetUrl.searchParams.set("token", resetToken);

  await transporter.sendMail({
    from: accountEmail,
    to: email,
    subject: "Reset your Subscription Tracker password",
    text: `Use this link to reset your password: ${resetUrl.toString()}`,
  });
};

export const signUp = async (req, res, next) => {
  try {
    const { name, email, password } = parseRequest(signUpSchema, req.body);
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, password_version, created_at, updated_at`,
      [name, email, hashedPassword],
    );

    const user = rows[0];
    const { accessToken, refreshToken } = await createSession(user);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
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
      `SELECT id, name, email, password, password_version, created_at, updated_at
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

    const { accessToken, refreshToken } = await createSession(user);

    res.status(200).json({
      success: true,
      message: "User signed in successfully",
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: currentRefreshToken } = parseRequest(
      refreshTokenSchema,
      req.body,
    );
    const user = await getRefreshTokenUser(currentRefreshToken);

    await revokeRefreshToken(currentRefreshToken);
    const session = await createSession(user);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: session.accessToken,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const signOut = async (req, res, next) => {
  try {
    const accessToken = getBearerToken(req.headers.authorization);
    const { refreshToken } = req.body ?? {};

    await blacklistAccessToken(accessToken);
    await revokeRefreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: "User signed out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = parseRequest(requestPasswordResetSchema, req.body);
    const { rows } = await pool.query("SELECT id, email FROM users WHERE email = $1", [
      email,
    ]);

    if (rows.length > 0) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = hashToken(resetToken);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_MINUTES);

      await pool.query(
        `UPDATE users
         SET password_reset_token_hash = $1,
             password_reset_expires_at = $2
         WHERE id = $3`,
        [resetTokenHash, expiresAt, rows[0].id],
      );

      await sendPasswordResetEmail({ email, resetToken });
    }

    res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = parseRequest(resetPasswordSchema, req.body);
    const passwordHash = await bcrypt.hash(password, 10);
    const tokenHash = hashToken(token);

    const { rows } = await pool.query(
      `UPDATE users
       SET password = $1,
           password_changed_at = CURRENT_TIMESTAMP,
           password_version = password_version + 1,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE password_reset_token_hash = $2
         AND password_reset_expires_at > CURRENT_TIMESTAMP
       RETURNING id`,
      [passwordHash, tokenHash],
    );

    if (rows.length === 0) {
      throw createHttpError("Invalid or expired reset token", 400);
    }

    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [rows[0].id],
    );

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
