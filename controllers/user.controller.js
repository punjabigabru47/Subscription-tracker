import pool from "../models/user.model.js";

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// get all users
export const getUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, created_at, updated_at FROM users",
    );

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

// get a user by id
export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      throw createHttpError("Invalid user id", 400);
    }

    const { rows } = await pool.query(
      "SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1",
      [id],
    );

    if (rows.length === 0) {
      throw createHttpError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};
