/**
 * Response formatting utilities
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    request_id?: string;
    cache_hit?: boolean;
  };
}

export function successResponse<T>(
  data: T,
  metadata?: Partial<APIResponse["metadata"]>
): APIResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: any
): APIResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
}

export function validationError(errors: Record<string, string[]>): APIResponse {
  return errorResponse(
    "VALIDATION_ERROR",
    "Request validation failed",
    { errors }
  );
}

export function notFoundError(resource: string, id: string): APIResponse {
  return errorResponse(
    "NOT_FOUND",
    `${resource} not found`,
    { resource, id }
  );
}

export function internalError(error: Error): APIResponse {
  return errorResponse(
    "INTERNAL_ERROR",
    error.message,
    process.env.NODE_ENV === "development" ? { stack: error.stack } : undefined
  );
}
