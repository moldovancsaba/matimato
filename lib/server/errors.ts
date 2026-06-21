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

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && "code" in error && "status" in error) {
    const maybe = error as Error & { code: string; status: number };
    return new AppError(maybe.code, maybe.message, maybe.status, false, maybe.message);
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
    return new AppError("INTERNAL_ERROR", error.message, 500, true, "Unexpected server error. Try again later.");
  }
  return new AppError("INTERNAL_ERROR", "Unexpected failure.", 500, true, "Unexpected server error. Try again later.");
}
