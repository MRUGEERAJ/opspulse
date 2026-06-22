import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type {
  AuthenticatedActor,
  RequestWithAuthenticatedActor
} from "../auth.types.js";

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor => {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthenticatedActor>();

    if (!request.actor) {
      throw new Error("Authenticated actor was not attached to the request");
    }

    return request.actor;
  }
);
