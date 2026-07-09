import { Injectable } from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import type { UserSummary } from "./users.types.js";
import { UsersRepository } from "./users.repository.js";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  listFieldAgents(actor: AuthenticatedActor): Promise<UserSummary[]> {
    return this.usersRepository.findActiveFieldAgents(actor.organizationId);
  }
}
