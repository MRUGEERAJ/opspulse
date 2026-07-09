import { Injectable } from "@nestjs/common";

import { UserRole } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { UserSummary } from "./users.types.js";

const USER_SUMMARY_SELECT = {
  id: true,
  organizationId: true,
  email: true,
  name: true,
  role: true,
  isActive: true
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findActiveFieldAgents(organizationId: string): Promise<UserSummary[]> {
    return this.prismaService.user.findMany({
      where: {
        organizationId,
        role: UserRole.FIELD_AGENT,
        isActive: true
      },
      select: USER_SUMMARY_SELECT,
      orderBy: [{ name: "asc" }, { id: "asc" }]
    });
  }
}
