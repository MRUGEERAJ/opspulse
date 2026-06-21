import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isUUID } from "class-validator";

import { PrismaService } from "../../prisma/prisma.service.js";
import type { RequestWithDevelopmentActor } from "./development-actor.js";

@Injectable()
export class DevelopmentActorGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.configService.getOrThrow<string>("NODE_ENV") === "production") {
      throw new UnauthorizedException(
        "Temporary actor headers are disabled in production"
      );
    }

    const request = context.switchToHttp().getRequest<RequestWithDevelopmentActor>();
    const organizationId = readSingleHeader(request, "x-organization-id");
    const userId = readSingleHeader(request, "x-user-id");

    if (!isUUID(organizationId, "4") || !isUUID(userId, "4")) {
      throw new BadRequestException(
        "x-organization-id and x-user-id must be UUID v4 values"
      );
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        organizationId,
        isActive: true,
        organization: {
          isActive: true
        }
      },
      select: {
        id: true,
        organizationId: true,
        role: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("Development actor is invalid or inactive");
    }

    request.actor = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    };

    return true;
  }
}

function readSingleHeader(
  request: RequestWithDevelopmentActor,
  headerName: string
): string {
  const value = request.headers[headerName];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new UnauthorizedException(`${headerName} header is required`);
  }

  return value.trim();
}
