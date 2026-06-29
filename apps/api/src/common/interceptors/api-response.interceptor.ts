import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiSuccessResponse } from "@opspulse/shared";
import { map, type Observable } from "rxjs";

type HttpRequest = {
  url: string;
  method: string;
};

type HttpResponse = {
  statusCode: number;
};

type DataWithMeta = {
  data: unknown;
  meta: unknown;
};

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  private readonly apiPathPrefix: string;

  constructor(configService: ConfigService) {
    this.apiPathPrefix = `/${configService.getOrThrow<string>("API_PREFIX")}`;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<HttpRequest>();
    const response = httpContext.getResponse<HttpResponse>();

    return next.handle().pipe(
      map((value: unknown) => {
        if (!this.shouldWrap(request.url, value)) {
          return value;
        }

        const baseResponse = {
          success: true,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method
        } satisfies Omit<ApiSuccessResponse, "data">;

        if (hasDataAndMeta(value)) {
          return {
            ...baseResponse,
            data: value.data,
            meta: value.meta
          } satisfies ApiSuccessResponse;
        }

        return {
          ...baseResponse,
          data: value
        } satisfies ApiSuccessResponse;
      })
    );
  }

  private shouldWrap(path: string, value: unknown): boolean {
    return (
      path.startsWith(`${this.apiPathPrefix}/`) &&
      value instanceof StreamableFile === false &&
      Buffer.isBuffer(value) === false
    );
  }
}

function hasDataAndMeta(value: unknown): value is DataWithMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "meta" in value
  );
}
