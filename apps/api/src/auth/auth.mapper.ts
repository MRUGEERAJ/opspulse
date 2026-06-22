import type { AuthenticatedActor, SafeUser } from "./auth.types.js";

type UserForResponse = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: SafeUser["role"];
  isActive: boolean;
};

export function toSafeUser(user: UserForResponse): SafeUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  };
}

export function actorToSafeUser(actor: AuthenticatedActor): SafeUser {
  return {
    id: actor.userId,
    organizationId: actor.organizationId,
    email: actor.email,
    name: actor.name,
    role: actor.role,
    isActive: true
  };
}
