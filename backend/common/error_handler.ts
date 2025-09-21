import { APIError, Request } from "encore.dev/api";

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  
  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
  
  // Business Logic
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  
  // Database
  NOT_FOUND = "NOT_FOUND",
  DATABASE_ERROR = "DATABASE_ERROR",
  FOREIGN_KEY_CONSTRAINT = "FOREIGN_KEY_CONSTRAINT",
  
  // External Services
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  PAYMENT_GATEWAY_ERROR = "PAYMENT_GATEWAY_ERROR",
  EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
  
  // System
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: any;
  cause?: string;
  timestamp: Date;
  requestId?: string;
  userId?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    field?: string,
    value?: any,
    cause?: string
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    
    this.details = {
      code,
      message,
      field,
      value,
      cause,
      timestamp: new Date()
    };

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, field?: string, value?: any): AppError {
    return new AppError(ErrorCode.INVALID_INPUT, message, 400, field, value);
  }

  static unauthorized(message: string = "Unauthorized access"): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = "Access forbidden"): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(resource: string, identifier?: string | number): AppError {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }

  static conflict(message: string, cause?: string): AppError {
    return new AppError(ErrorCode.RESOURCE_CONFLICT, message, 409, undefined, undefined, cause);
  }

  static validationError(message: string, field?: string, value?: any): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 422, field, value);
  }

  static insufficientBalance(currentBalance: number, requiredAmount: number): AppError {
    return new AppError(
      ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance. Current: ${currentBalance}, Required: ${requiredAmount}`,
      422,
      "balance",
      { current: currentBalance, required: requiredAmount }
    );
  }

  static quotaExceeded(resource: string, limit: number, current: number): AppError {
    return new AppError(
      ErrorCode.QUOTA_EXCEEDED,
      `${resource} quota exceeded. Limit: ${limit}, Current: ${current}`,
      429,
      resource,
      { limit, current }
    );
  }

  static internalError(message: string = "Internal server error", cause?: string): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500, undefined, undefined, cause);
  }

  static serviceUnavailable(service: string): AppError {
    return new AppError(
      ErrorCode.SERVICE_UNAVAILABLE,
      `${service} service is currently unavailable`,
      503
    );
  }

  static externalServiceError(service: string, message: string): AppError {
    return new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `${service}: ${message}`,
      502,
      undefined,
      undefined,
      service
    );
  }
}

export class ErrorHandler {
  static handleDatabaseError(error: any): AppError {
    console.error('Database error:', error);

    // PostgreSQL specific error codes
    if (error.code) {
      switch (error.code) {
        case '23505': // unique_violation
          return AppError.conflict("Resource already exists", error.detail);
        case '23503': // foreign_key_violation
          return new AppError(
            ErrorCode.FOREIGN_KEY_CONSTRAINT,
            "Referenced resource does not exist",
            400,
            undefined,
            undefined,
            error.detail
          );
        case '23502': // not_null_violation
          return AppError.badRequest(`Required field '${error.column}' is missing`, error.column);
        case '22001': // string_data_right_truncation
          return AppError.badRequest("Data too long for field", error.column);
        case '42P01': // undefined_table
          return AppError.internalError("Database schema error", "Table not found");
        case '42703': // undefined_column
          return AppError.internalError("Database schema error", "Column not found");
      }
    }

    return AppError.internalError("Database operation failed", error.message);
  }

  static handleValidationErrors(errors: any[]): AppError {
    const messages = errors.map(err => err.message).join(', ');
    const firstError = errors[0];
    
    return AppError.validationError(
      `Validation failed: ${messages}`,
      firstError?.field,
      firstError?.value
    );
  }

  static toAPIError(error: AppError): APIError {
    const details = {
      ...error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    switch (error.statusCode) {
      case 400:
        return APIError.invalidArgument(error.message, details);
      case 401:
        return APIError.unauthenticated(error.message, details);
      case 403:
        return APIError.permissionDenied(error.message, details);
      case 404:
        return APIError.notFound(error.message, details);
      case 409:
        return APIError.alreadyExists(error.message, details);
      case 422:
        return APIError.invalidArgument(error.message, details);
      case 429:
        return APIError.resourceExhausted(error.message, details);
      case 500:
        return APIError.internal(error.message, details);
      case 502:
        return APIError.unavailable(error.message, details);
      case 503:
        return APIError.unavailable(error.message, details);
      default:
        return APIError.internal(error.message, details);
    }
  }

  static async logError(error: AppError, request?: any, userId?: number): Promise<void> {
    const logData = {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        details: error.details
      },
      request: request ? {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body
      } : undefined,
      userId,
      timestamp: new Date().toISOString()
    };

    // Log to console (in production, you might want to use a proper logging service)
    console.error('Application Error:', JSON.stringify(logData, null, 2));

    // In production, you could send this to external logging services like:
    // - DataDog
    // - New Relic
    // - Sentry
    // - CloudWatch
  }
}

// Utility function to safely handle async operations
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle database errors
    if (error.code && typeof error.code === 'string') {
      throw ErrorHandler.handleDatabaseError(error);
    }
    
    // Handle unknown errors
    console.error(`Error in ${errorContext || 'operation'}:`, error);
    throw AppError.internalError(
      errorContext ? `Failed to ${errorContext}` : "Operation failed",
      error.message
    );
  }
}

// Middleware for consistent error handling
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AppError) {
        await ErrorHandler.logError(error);
        throw ErrorHandler.toAPIError(error);
      }
      
      // Handle unexpected errors
      const appError = AppError.internalError("Unexpected error occurred", error.message);
      await ErrorHandler.logError(appError);
      throw ErrorHandler.toAPIError(appError);
    }
  };
}