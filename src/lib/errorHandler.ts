/**
 * Error handling utility for API calls
 * Provides consistent error messages and logging across the application
 */

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Parse error from various sources into a consistent format
 */
export const parseError = (error: unknown, defaultMessage: string = "An error occurred"): ErrorResponse => {
  if (error instanceof Error) {
    return {
      message: error.message || defaultMessage,
      code: error.name,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object" && "message" in error) {
    return {
      message: (error as Record<string, unknown>).message as string || defaultMessage,
      code: (error as Record<string, unknown>).code as string | undefined,
      details: error,
    };
  }

  return {
    message: defaultMessage,
    details: error,
  };
};

/**
 * Handle API errors with logging and user-friendly messages
 */
export const handleApiError = (
  error: unknown,
  context: string = "API Call",
  logger?: { error: (msg: string, err?: unknown) => void }
): ErrorResponse => {
  const parsed = parseError(error);

  const logMessage = `[${context}] ${parsed.message}`;
  if (logger) {
    logger.error(logMessage, parsed.details);
  } else {
    console.error(logMessage, parsed.details);
  }

  // Return user-friendly messages for common errors
  const userMessage = mapErrorMessage(parsed.message);
  return {
    ...parsed,
    message: userMessage,
  };
};

/**
 * Map technical errors to user-friendly messages
 */
const mapErrorMessage = (technicalMessage: string): string => {
  const message = technicalMessage.toLowerCase();

  if (message.includes("network") || message.includes("fetch")) {
    return "Connection error. Please check your internet and try again.";
  }

  if (message.includes("unauthorized") || message.includes("permission")) {
    return "You do not have permission to perform this action.";
  }

  if (message.includes("not found")) {
    return "The requested item was not found.";
  }

  if (message.includes("conflict") || message.includes("already exists")) {
    return "This item already exists or there's a conflict.";
  }

  if (message.includes("timeout")) {
    return "Request took too long. Please try again.";
  }

  if (message.includes("validation")) {
    return "Please check your input and try again.";
  }

  return technicalMessage;
};
