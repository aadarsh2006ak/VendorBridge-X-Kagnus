export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ValidationErrorDetail[];

  constructor(statusCode: number, code: ErrorCode, message: string, details?: ValidationErrorDetail[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Invalid input', details?: ValidationErrorDetail[]) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string = 'Authentication required', code: ErrorCode = 'UNAUTHENTICATED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message: string = 'Too many requests, please try again later') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected internal error occurred') {
    super(500, 'INTERNAL_ERROR', message);
  }
}
