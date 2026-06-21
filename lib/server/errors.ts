export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public retryable = false) {
    super(message);
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && "code" in error && "status" in error) {
    const maybe = error as Error & { code: string; status: number };
    return new AppError(maybe.code, maybe.message, maybe.status);
  }
  if (error instanceof Error) return new AppError("INTERNAL_ERROR", error.message, 500, true);
  return new AppError("INTERNAL_ERROR", "Unexpected failure.", 500, true);
}
