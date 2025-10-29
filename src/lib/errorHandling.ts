// Global error handling utility
// Add this to src/lib/errorHandling.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  // Authentication
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID: "AUTH_INVALID",
  AUTH_EXPIRED: "AUTH_EXPIRED",

  // Book Creation
  BOOK_UPLOAD_FAILED: "BOOK_UPLOAD_FAILED",
  BOOK_NOT_FOUND: "BOOK_NOT_FOUND",
  BOOK_PROCESSING_FAILED: "BOOK_PROCESSING_FAILED",

  // Audio
  AUDIO_NOT_FOUND: "AUDIO_NOT_FOUND",
  AUDIO_LOAD_FAILED: "AUDIO_LOAD_FAILED",
  AUDIO_PLAYBACK_ERROR: "AUDIO_PLAYBACK_ERROR",

  // TTS
  TTS_SERVER_DOWN: "TTS_SERVER_DOWN",
  TTS_QUEUE_FULL: "TTS_QUEUE_FULL",
  TTS_GENERATION_FAILED: "TTS_GENERATION_FAILED",

  // Network
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",

  // Validation
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Database
  DB_CONNECTION_ERROR: "DB_CONNECTION_ERROR",
  DB_QUERY_ERROR: "DB_QUERY_ERROR",
} as const;

export function getUserFriendlyMessage(error: any): string {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }

  // Map technical errors to user-friendly messages
  const errorMap: Record<string, string> = {
    [ErrorCodes.AUTH_REQUIRED]: "Please sign in to continue.",
    [ErrorCodes.AUTH_INVALID]:
      "Your session has expired. Please sign in again.",
    [ErrorCodes.AUTH_EXPIRED]:
      "Your session has expired. Please sign in again.",

    [ErrorCodes.BOOK_UPLOAD_FAILED]:
      "Failed to upload your book. Please try again.",
    [ErrorCodes.BOOK_NOT_FOUND]: "This book could not be found.",
    [ErrorCodes.BOOK_PROCESSING_FAILED]:
      "Book processing failed. Please try again or contact support.",

    [ErrorCodes.AUDIO_NOT_FOUND]:
      "Audio file is not available. The book may still be processing.",
    [ErrorCodes.AUDIO_LOAD_FAILED]:
      "Failed to load audio. Please refresh the page.",
    [ErrorCodes.AUDIO_PLAYBACK_ERROR]:
      "Playback error occurred. Please try again.",

    [ErrorCodes.TTS_SERVER_DOWN]:
      "Text-to-speech service is temporarily unavailable. Please try again later.",
    [ErrorCodes.TTS_QUEUE_FULL]:
      "Our processing queue is full. Please try again in a few minutes.",
    [ErrorCodes.TTS_GENERATION_FAILED]:
      "Audio generation failed. Please try again.",

    [ErrorCodes.NETWORK_ERROR]:
      "Network connection error. Please check your internet and try again.",
    [ErrorCodes.TIMEOUT]: "Request timed out. Please try again.",
    [ErrorCodes.SERVER_ERROR]: "Server error occurred. Please try again later.",

    [ErrorCodes.INVALID_INPUT]: "Please check your input and try again.",
    [ErrorCodes.MISSING_REQUIRED_FIELD]: "Please fill in all required fields.",

    [ErrorCodes.DB_CONNECTION_ERROR]:
      "Database connection error. Please try again.",
    [ErrorCodes.DB_QUERY_ERROR]: "Database error occurred. Please try again.",
  };

  if (error.code && errorMap[error.code]) {
    return errorMap[error.code];
  }

  // Check for common error patterns
  if (error.message?.includes("fetch") || error.message?.includes("network")) {
    return errorMap[ErrorCodes.NETWORK_ERROR];
  }

  if (error.message?.includes("timeout")) {
    return errorMap[ErrorCodes.TIMEOUT];
  }

  if (
    error.message?.includes("401") ||
    error.message?.includes("Unauthorized")
  ) {
    return errorMap[ErrorCodes.AUTH_REQUIRED];
  }

  // Generic fallback
  return "Something went wrong. Please try again.";
}

export function logError(error: any, context?: string) {
  console.error(`[Error${context ? ` - ${context}` : ""}]:`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // sendToErrorTracking(error, context);
}

export async function handleApiError(response: Response): Promise<never> {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  const error = new AppError(
    errorData.message || "API request failed",
    errorData.code || "API_ERROR",
    response.status,
    errorData.userMessage
  );

  logError(error, `API ${response.status}`);
  throw error;
}

// Retry logic for failed requests
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry auth errors
      if (
        error instanceof AppError &&
        [ErrorCodes.AUTH_REQUIRED, ErrorCodes.AUTH_INVALID].includes(
          error.code as any
        )
      ) {
        throw error;
      }

      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, i))
        );
      }
    }
  }

  throw lastError;
}
