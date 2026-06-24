import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, randomUUID } from "node:crypto";

import { Prisma } from "../generated/prisma/client.js";
import { actorToSafeUser, toSafeUser } from "./auth.mapper.js";
import {
  AuthRepository,
  type AuthUserRecord
} from "./auth.repository.js";
import type {
  AuthenticatedActor,
  AuthSessionResponse
} from "./auth.types.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { RefreshTokenDto } from "./dto/refresh-token.dto.js";
import type { RegisterDto } from "./dto/register.dto.js";
import { PasswordService } from "./password.service.js";

const REFRESH_TOKEN_BYTES = 48;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(dto: LoginDto): Promise<AuthSessionResponse> {
    const user = await this.authRepository.findByEmail(dto.email);

    if (
      !user ||
      !user.isActive ||
      !user.organization.isActive ||
      !(await this.passwordService.verify(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresIn = this.configService.getOrThrow<number>(
      "JWT_REFRESH_TOKEN_TTL_SECONDS"
    );
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1_000);

    await this.authRepository.createRefreshToken({
      organizationId: user.organizationId,
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      tokenFamilyId: randomUUID(),
      expiresAt
    });

    return this.createSessionResponse(
      user,
      refreshToken,
      refreshTokenExpiresIn
    );
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthSessionResponse> {
    const replacementToken = generateRefreshToken();
    const now = new Date();
    const result = await this.authRepository.rotateRefreshToken({
      currentTokenHash: hashRefreshToken(dto.refreshToken),
      replacementTokenHash: hashRefreshToken(replacementToken),
      now
    });

    if (result.status !== "rotated") {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const refreshTokenExpiresIn = Math.max(
      0,
      Math.ceil((result.expiresAt.getTime() - now.getTime()) / 1_000)
    );

    return this.createSessionResponse(
      result.user,
      replacementToken,
      refreshTokenExpiresIn
    );
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.authRepository.revokeRefreshTokenFamily(
      hashRefreshToken(dto.refreshToken),
      new Date()
    );
  }

  async register(actor: AuthenticatedActor, dto: RegisterDto) {
    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const user = await this.authRepository.createStaffUser(actor, {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role
      });

      return toSafeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A user with this email already exists");
      }

      throw error;
    }
  }

  me(actor: AuthenticatedActor) {
    return actorToSafeUser(actor);
  }

  private async createSessionResponse(
    user: AuthUserRecord,
    refreshToken: string,
    refreshTokenExpiresIn: number
  ): Promise<AuthSessionResponse> {
    const accessTokenExpiresIn = this.configService.getOrThrow<number>(
      "JWT_ACCESS_TOKEN_TTL_SECONDS"
    );
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: "access"
      },
      {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        issuer: this.configService.getOrThrow<string>("JWT_ISSUER"),
        audience: this.configService.getOrThrow<string>("JWT_AUDIENCE"),
        expiresIn: accessTokenExpiresIn
      }
    );

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
      user: toSafeUser(user)
    };
  }
}

function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
