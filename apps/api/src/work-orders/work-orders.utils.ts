import {
  BadRequestException,
  ForbiddenException
} from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import { UserRole } from "../generated/prisma/enums.js";
import type { CreateWorkOrderDto } from "./dto/create-work-order.dto.js";
import type { UpdateWorkOrderDto } from "./dto/update-work-order.dto.js";
import type {
  CreateWorkOrderWriteData,
  WorkOrderWithLocationInput,
  WorkOrderWriteData
} from "./work-orders.types.js";

export function assertAdmin(actor: AuthenticatedActor): void {
  if (actor.role !== UserRole.ADMIN) {
    throw new ForbiddenException("Admin role is required");
  }
}

export function assertReader(actor: AuthenticatedActor): void {
  if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MANAGER) {
    throw new ForbiddenException("Admin or Manager role is required");
  }
}

export function validateCoordinatePair(
  dto: WorkOrderWithLocationInput
): void {
  const hasLatitude = dto.latitude !== undefined && dto.latitude !== null;
  const hasLongitude = dto.longitude !== undefined && dto.longitude !== null;

  if (hasLatitude !== hasLongitude) {
    throw new BadRequestException(
      "latitude and longitude must be supplied together"
    );
  }
}

export function toWriteData(dto: CreateWorkOrderDto): CreateWorkOrderWriteData;
export function toWriteData(dto: UpdateWorkOrderDto): WorkOrderWriteData;
export function toWriteData(
  dto: CreateWorkOrderDto | UpdateWorkOrderDto
): WorkOrderWriteData {
  const { dueAt, ...data } = dto;

  return {
    ...data,
    ...(dueAt !== undefined
      ? { dueAt: dueAt === null ? null : new Date(dueAt) }
      : {})
  };
}
