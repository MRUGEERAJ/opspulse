import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { isUUID } from "class-validator";

import { AuthRepository } from "../auth.repository.js";
import type {
  AccessTokenPayload,
  RequestWithAuthenticatedActor
} from "../auth.types.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthenticatedActor>();
    const token = readBearerToken(request);
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>("JWT_SECRET"),
          issuer: this.configService.getOrThrow<string>("JWT_ISSUER"),
          audience: this.configService.getOrThrow<string>("JWT_AUDIENCE")
        }
      );
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    if (
      typeof payload.sub !== "string" ||
      !isUUID(payload.sub, "4") ||
      payload.type !== "access"
    ) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    const user = await this.authRepository.findById(payload.sub);

    if (!user || !user.isActive || !user.organization.isActive) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    request.actor = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role
    };

    return true;
  }
}

function readBearerToken(request: RequestWithAuthenticatedActor): string {
  const authorization = request.headers.authorization;

  if (typeof authorization !== "string") {
    throw new UnauthorizedException("Bearer access token is required");
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    throw new UnauthorizedException("Bearer access token is required");
  }

  return token;
}
