import assert from "node:assert/strict";
import test from "node:test";

import { createValidationException } from "./validation-exception.factory.js";

test("createValidationException returns field-level validation errors", () => {
  const exception = createValidationException([
    {
      property: "email",
      constraints: {
        isEmail: "email must be an email"
      }
    },
    {
      property: "profile",
      children: [
        {
          property: "name",
          constraints: {
            minLength: "name must be longer than or equal to 2 characters"
          }
        }
      ]
    }
  ]);

  assert.deepEqual(exception.getResponse(), {
    message: "Validation failed",
    error: "Bad Request",
    errors: [
      {
        field: "email",
        messages: ["email must be an email"]
      },
      {
        field: "profile.name",
        messages: ["name must be longer than or equal to 2 characters"]
      }
    ]
  });
});
