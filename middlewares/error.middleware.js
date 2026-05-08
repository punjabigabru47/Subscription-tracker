export const errorMiddleware = (err, req, res, next) => {
  try {
    void req;
    void next;

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || "Internal Server Error";

    if (err.code === "22P02") {
      statusCode = 400;
      message = "Invalid input syntax";
    }

    if (err.code === "23502") {
      statusCode = 400;
      message = `${err.column} is required`;
    }

    if (err.code === "23503") {
      statusCode = 400;
      message = "Referenced record does not exist";
    }

    if (err.code === "23505") {
      statusCode = 409;
      message = "Duplicate value already exists";
    }

    if (err.code === "23514") {
      statusCode = 400;
      message = "Invalid value for constrained field";
    }

    res.status(statusCode).json({
      success: false,
      message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
