import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { ApiErrorResponse } from "@opspulse/shared";

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
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: getErrorMessage(exception)
    } satisfies ApiErrorResponse);
  }
}

function getErrorMessage(exception: unknown): string | string[] {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === "string") {
      return response;
    }

    if (isHttpExceptionResponse(response)) {
      return response.message;
    }
  }

  return "Internal server error";
}

function isHttpExceptionResponse(value: unknown): value is { message: string | string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    (typeof value.message === "string" ||
      (Array.isArray(value.message) &&
        value.message.every((message) => typeof message === "string")))
  );
}
