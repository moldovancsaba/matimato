export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryable = false,
    public publicMessage = message
  ) {
    super(message);
  }
}

const INTERNAL_PUBLIC_MESSAGE = "Unexpected server error. Try again later.";

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && "code" in error && "status" in error) {
    const maybe = error as Error & { code: string; status: number };
    return new AppError(maybe.code, maybe.message, maybe.status, false, safePublicMessage(maybe.status, maybe.message));
  }
  if (error instanceof SyntaxError) {
    return new AppError("INVALID_JSON", "Request body is not valid JSON.", 400, false, "Request body is not valid JSON.");
  }
  if (isZodError(error)) {
    return new AppError("VALIDATION_FAILED", "Request validation failed.", 400, false, "Check the form and try again.");
  }
  if (error instanceof Error && /auth|authentication|credentials|Mongo|server selection|ECONN|ENOTFOUND/i.test(error.message)) {
    return new AppError(
      "DATABASE_UNAVAILABLE",
      error.message,
      503,
      true,
      "The game database is unavailable. Try again later."
    );
  }
  if (error instanceof Error) {
    return new AppError("INTERNAL_ERROR", error.message, 500, true, INTERNAL_PUBLIC_MESSAGE);
  }
  return new AppError("INTERNAL_ERROR", "Unexpected failure.", 500, true, INTERNAL_PUBLIC_MESSAGE);
}

export function sanitizeServerMessage(message: string) {
  return message
    .replace(/mongodb(?:\\+srv)?:\/\/[^@\s]+@/gi, "mongodb://***@")
    .replace(/([?&](?:password|token|secret|key|uri)=)[^&\s]+/gi, "$1***")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1***")
    .slice(0, 240);
}

function isZodError(error: unknown) {
  return Boolean(error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues?: unknown }).issues));
}

function safePublicMessage(status: number, message: string) {
  return status >= 500 ? INTERNAL_PUBLIC_MESSAGE : message;
}
