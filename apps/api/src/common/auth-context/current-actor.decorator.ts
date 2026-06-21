import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type {
  DevelopmentActor,
  RequestWithDevelopmentActor
} from "./development-actor.js";

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DevelopmentActor => {
    const request = context.switchToHttp().getRequest<RequestWithDevelopmentActor>();

    if (!request.actor) {
      throw new Error("Development actor was not attached to the request");
    }

    return request.actor;
  }
);
