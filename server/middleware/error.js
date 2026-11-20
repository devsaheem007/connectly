import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export const notFound = (req, res, next) =>
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Server error";
  let code = err.code && typeof err.code === "string" ? err.code : undefined;

  if (err.name === "ValidationError" && err.errors) {
    status = 422;
    message = Object.values(err.errors)[0]?.message || "Validation failed";
    code = "VALIDATION";
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `That ${field} is already taken`;
    code = "DUPLICATE";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid identifier";
  } else if (err.name === "MulterError") {
    status = 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    status = 401;
    message = "Session expired. Please log in again.";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) console.error("💥", err);
  res.status(status).json({
    message:
      status >= 500 && env.isProd
        ? "Something went wrong on our side"
        : message,
    ...(code ? { code } : {}),
    ...(status < 500 && err.details ? { details: err.details } : {}),
  });
}
