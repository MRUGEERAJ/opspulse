import { Controller, Get, UseGuards } from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import { CurrentActor } from "../auth/decorators/current-actor.decorator.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { UserRole } from "../generated/prisma/enums.js";
import { UsersService } from "./users.service.js";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("field-agents")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  listFieldAgents(@CurrentActor() actor: AuthenticatedActor) {
    return this.usersService.listFieldAgents(actor);
  }
}
