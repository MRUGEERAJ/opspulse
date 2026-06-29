import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { ApiErrorResponse, ApiValidationError } from "@opspulse/shared";

type HttpRequest = {
  url: string;
  method: string;
};

type HttpResponse = {
  status: (statusCode: number) => {
    json: (body: ApiErrorResponse) => void;
  };
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const errorDetails = getErrorDetails(exception);

    response.status(errorDetails.statusCode).json({
      success: false,
      statusCode: errorDetails.statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorDetails.message,
      error: errorDetails.error,
      ...(errorDetails.errors ? { errors: errorDetails.errors } : {})
    } satisfies ApiErrorResponse);
  }
}

type ErrorDetails = {
  statusCode: number;
  message: string;
  error: string;
  errors?: ApiValidationError[];
};

function getErrorDetails(exception: unknown): ErrorDetails {
  if (isPayloadTooLargeError(exception)) {
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: "Request body too large",
      error: "Payload Too Large"
    };
  }

  if (exception instanceof HttpException) {
    return getHttpExceptionDetails(exception);
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: "Internal server error",
    error: "Internal Server Error"
  };
}

function getHttpExceptionDetails(exception: HttpException): ErrorDetails {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === "string") {
    return {
      statusCode,
      message: response,
      error: exception.name
    };
  }

  if (isHttpExceptionResponse(response)) {
    return {
      statusCode,
      message: normalizeMessage(response.message),
      error: response.error ?? exception.name,
      ...(response.errors ? { errors: response.errors } : {})
    };
  }

  return {
    statusCode,
    message: exception.message,
    error: exception.name
  };
}

function normalizeMessage(message: string | string[]): string {
  return Array.isArray(message) ? message.join(", ") : message;
}

function isHttpExceptionResponse(
  value: unknown
): value is {
  message: string | string[];
  error?: string;
  errors?: ApiValidationError[];
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    (typeof value.message === "string" ||
      (Array.isArray(value.message) &&
        value.message.every((message) => typeof message === "string"))) &&
    (!("error" in value) || typeof value.error === "string") &&
    (!("errors" in value) ||
      (Array.isArray(value.errors) &&
        value.errors.every(isApiValidationError)))
  );
}

function isApiValidationError(value: unknown): value is ApiValidationError {
  return (
    typeof value === "object" &&
    value !== null &&
    "field" in value &&
    typeof value.field === "string" &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    value.messages.every((message) => typeof message === "string")
  );
}

function isPayloadTooLargeError(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (("type" in value && value.type === "entity.too.large") ||
      ("name" in value && value.name === "PayloadTooLargeError"))
  );
}
