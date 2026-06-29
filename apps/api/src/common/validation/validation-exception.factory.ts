import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import type { ApiValidationError } from "@opspulse/shared";

export function createValidationException(
  validationErrors: ValidationError[]
): BadRequestException {
  return new BadRequestException({
    message: "Validation failed",
    error: "Bad Request",
    errors: flattenValidationErrors(validationErrors)
  });
}

function flattenValidationErrors(
  validationErrors: ValidationError[],
  parentPath = ""
): ApiValidationError[] {
  return validationErrors.flatMap((validationError) => {
    const field = parentPath
      ? `${parentPath}.${validationError.property}`
      : validationError.property;
    const currentError =
      validationError.constraints &&
      Object.keys(validationError.constraints).length > 0
        ? [
            {
              field,
              messages: Object.values(validationError.constraints)
            }
          ]
        : [];
    const childErrors =
      validationError.children && validationError.children.length > 0
        ? flattenValidationErrors(validationError.children, field)
        : [];

    return [...currentError, ...childErrors];
  });
}
