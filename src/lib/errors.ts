/**
 * Custom error types for API endpoints
 * Each error corresponds to specific HTTP status codes
 */

/**
 * ValidationError (400 Bad Request)
 * Thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * BadRequestError (400 Bad Request)
 * Thrown for general bad requests that are not validation errors
 */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/**
 * AuthenticationError (401 Unauthorized)
 * Thrown when user is not authenticated or session is invalid
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * ForbiddenError (403 Forbidden)
 * Thrown when user is authenticated but doesn't have permission to access resource
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Access forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * ConflictError (409 Conflict)
 * Thrown when operation violates business rules or constraints
 * Example: User already has an active plan
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

/**
 * NotFoundError (404 Not Found)
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * ServerError (500 Internal Server Error)
 * Thrown when unexpected server-side error occurs
 */
export class ServerError extends Error {
  constructor(message: string = 'Internal server error', public readonly originalError?: Error) {
    super(message)
    this.name = 'ServerError'
  }
}

/**
 * Check if error is a custom application error
 */
export function isAppError(error: unknown): error is ValidationError | BadRequestError | AuthenticationError | ForbiddenError | ConflictError | NotFoundError | ServerError {
  return (
    error instanceof ValidationError ||
    error instanceof BadRequestError ||
    error instanceof AuthenticationError ||
    error instanceof ForbiddenError ||
    error instanceof ConflictError ||
    error instanceof NotFoundError ||
    error instanceof ServerError
  )
}

/**
 * Get HTTP status code for error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof ValidationError) return 400
  if (error instanceof BadRequestError) return 400
  if (error instanceof AuthenticationError) return 401
  if (error instanceof ForbiddenError) return 403
  if (error instanceof ConflictError) return 409
  if (error instanceof NotFoundError) return 404
  if (error instanceof ServerError) return 500
  return 500 // default to internal server error
}

