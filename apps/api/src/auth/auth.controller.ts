import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards
} from "@nestjs/common";

import { UserRole } from "../generated/prisma/enums.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedActor } from "./auth.types.js";
import { CurrentActor } from "./decorators/current-actor.decorator.js";
import { Roles } from "./decorators/roles.decorator.js";
import { LoginDto } from "./dto/login.dto.js";
import { RefreshTokenDto } from "./dto/refresh-token.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RolesGuard } from "./guards/roles.guard.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto);
  }

  @Post("register")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  register(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: RegisterDto
  ) {
    return this.authService.register(actor, dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentActor() actor: AuthenticatedActor) {
    return this.authService.me(actor);
  }
}
