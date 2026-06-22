import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { Prisma } from "../generated/prisma/client.js";
import { actorToSafeUser, toSafeUser } from "./auth.mapper.js";
import { AuthRepository } from "./auth.repository.js";
import type { AuthenticatedActor } from "./auth.types.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { RegisterDto } from "./dto/register.dto.js";
import { PasswordService } from "./password.service.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.email);

    if (
      !user ||
      !user.isActive ||
      !user.organization.isActive ||
      !(await this.passwordService.verify(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const expiresIn = this.configService.getOrThrow<number>(
      "JWT_ACCESS_TOKEN_TTL_SECONDS"
    );
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        issuer: this.configService.getOrThrow<string>("JWT_ISSUER"),
        audience: this.configService.getOrThrow<string>("JWT_AUDIENCE"),
        expiresIn
      }
    );

    return {
      accessToken,
      tokenType: "Bearer" as const,
      expiresIn,
      user: toSafeUser(user)
    };
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
}
