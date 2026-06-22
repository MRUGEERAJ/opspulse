import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import { UserRole, WorkOrderStatus } from "../generated/prisma/enums.js";
import { CancelWorkOrderDto } from "./dto/cancel-work-order.dto.js";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto.js";
import { ListWorkOrdersQueryDto } from "./dto/list-work-orders-query.dto.js";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto.js";
import { toWorkOrderResponse } from "./work-order.mapper.js";
import {
  type CreateWorkOrderWriteData,
  WorkOrdersRepository,
  type WorkOrderWriteData
} from "./work-orders.repository.js";

const EDITABLE_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.CREATED,
  WorkOrderStatus.ASSIGNED
]);

const CANCELLABLE_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.CREATED,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.IN_PROGRESS
]);

@Injectable()
export class WorkOrdersService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {}

  async create(actor: AuthenticatedActor, dto: CreateWorkOrderDto) {
    assertAdmin(actor);
    validateCoordinatePair(dto);

    const workOrder = await this.workOrdersRepository.create(
      actor,
      toWriteData(dto)
    );

    return toWorkOrderResponse(workOrder);
  }

  async list(actor: AuthenticatedActor, query: ListWorkOrdersQueryDto) {
    assertReader(actor);

    // TODO(assignments): restrict Manager reads to their team when team ownership exists.
    const { data, total } = await this.workOrdersRepository.list({
      organizationId: actor.organizationId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      priority: query.priority
    });
    const totalPages = Math.ceil(total / query.limit);

    return {
      data: data.map(toWorkOrderResponse),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1
      }
    };
  }

  async findOne(actor: AuthenticatedActor, id: string) {
    assertReader(actor);
    const workOrder = await this.findOrThrow(actor.organizationId, id);

    return toWorkOrderResponse(workOrder);
  }

  async update(
    actor: AuthenticatedActor,
    id: string,
    dto: UpdateWorkOrderDto
  ) {
    assertAdmin(actor);

    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException("At least one editable field is required");
    }

    validateCoordinatePair(dto);
    const workOrder = await this.findOrThrow(actor.organizationId, id);

    if (!EDITABLE_STATUSES.has(workOrder.status)) {
      throw new ConflictException(
        `Work order cannot be edited while status is ${workOrder.status}`
      );
    }

    const updated = await this.workOrdersRepository.update(
      workOrder,
      toWriteData(dto)
    );

    if (!updated) {
      throw new ConflictException(
        "Work order changed during the update; reload and try again"
      );
    }

    return toWorkOrderResponse(updated);
  }

  async cancel(
    actor: AuthenticatedActor,
    id: string,
    dto: CancelWorkOrderDto
  ) {
    assertAdmin(actor);
    const workOrder = await this.findOrThrow(actor.organizationId, id);

    if (!CANCELLABLE_STATUSES.has(workOrder.status)) {
      throw new ConflictException(
        `Work order cannot be cancelled while status is ${workOrder.status}`
      );
    }

    const cancelled = await this.workOrdersRepository.cancel(
      actor,
      workOrder,
      dto.reason
    );

    if (!cancelled) {
      throw new ConflictException(
        "Work order changed during cancellation; reload and try again"
      );
    }

    return toWorkOrderResponse(cancelled);
  }

  private async findOrThrow(organizationId: string, id: string) {
    const workOrder = await this.workOrdersRepository.findById(
      organizationId,
      id
    );

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    return workOrder;
  }
}

function assertAdmin(actor: AuthenticatedActor): void {
  if (actor.role !== UserRole.ADMIN) {
    throw new ForbiddenException("Admin role is required");
  }
}

function assertReader(actor: AuthenticatedActor): void {
  if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MANAGER) {
    throw new ForbiddenException("Admin or Manager role is required");
  }
}

function validateCoordinatePair(
  dto: Pick<CreateWorkOrderDto, "latitude" | "longitude">
): void {
  const hasLatitude = dto.latitude !== undefined && dto.latitude !== null;
  const hasLongitude = dto.longitude !== undefined && dto.longitude !== null;

  if (hasLatitude !== hasLongitude) {
    throw new BadRequestException(
      "latitude and longitude must be supplied together"
    );
  }
}

function toWriteData(dto: CreateWorkOrderDto): CreateWorkOrderWriteData;
function toWriteData(dto: UpdateWorkOrderDto): WorkOrderWriteData;
function toWriteData(
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
