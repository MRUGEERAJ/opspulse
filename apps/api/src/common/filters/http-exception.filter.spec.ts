import assert from "node:assert/strict";
import test from "node:test";

import type { ArgumentsHost } from "@nestjs/common";

import { HttpExceptionFilter } from "./http-exception.filter.js";

test("HttpExceptionFilter formats oversized body-parser errors as 413 JSON", () => {
  const { host, responseBody, statusCode } = createHost();
  const filter = new HttpExceptionFilter();

  filter.catch(
    {
      name: "PayloadTooLargeError",
      type: "entity.too.large"
    },
    host
  );

  assert.equal(statusCode.value, 413);
  assert.deepEqual(responseBody.value, {
    success: false,
    statusCode: 413,
    timestamp: responseBody.value?.timestamp,
    path: "/api/v1/auth/login",
    method: "POST",
    message: "Request body too large",
    error: "Payload Too Large"
  });
  const timestamp = responseBody.value?.timestamp;

  if (typeof timestamp !== "string") {
    assert.fail("Expected timestamp to be a string");
  }

  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

function createHost(): {
  host: ArgumentsHost;
  responseBody: { value?: Record<string, unknown> };
  statusCode: { value?: number };
} {
  const responseBody: { value?: Record<string, unknown> } = {};
  const statusCode: { value?: number } = {};
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (value: number) => {
          statusCode.value = value;

          return {
            json: (body: Record<string, unknown>) => {
              responseBody.value = body;
            }
          };
        }
      }),
      getRequest: () => ({
        url: "/api/v1/auth/login",
        method: "POST"
      })
    })
  } as unknown as ArgumentsHost;

  return { host, responseBody, statusCode };
}
