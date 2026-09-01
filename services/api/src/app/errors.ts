/** Typed application errors → HTTP status. Scanner-facing errors stay generic. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}
export class ValidationError extends AppError {
  constructor(message = "invalid input") {
    super("invalid_input", message, 400);
  }
}
export class ConflictError extends AppError {
  constructor(message = "conflict") {
    super("conflict", message, 409);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "not found") {
    super("not_found", message, 404);
  }
}
export class AuthError extends AppError {
  constructor(message = "unauthorized") {
    super("unauthorized", message, 401);
  }
}
export class RateLimitError extends AppError {
  constructor(message = "too many requests") {
    super("rate_limited", message, 429);
  }
}
