import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import {
  StatusChangeSource,
  UserRole,
  WorkOrderStatus
} from "../generated/prisma/enums.js";
import { AssignWorkOrderDto } from "./dto/assign-work-order.dto.js";
import { CancelWorkOrderDto } from "./dto/cancel-work-order.dto.js";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto.js";
import { ListWorkOrdersQueryDto } from "./dto/list-work-orders-query.dto.js";
import { UpdateWorkOrderStatusDto } from "./dto/update-work-order-status.dto.js";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto.js";
import { toWorkOrderResponse } from "./work-order.mapper.js";
import {
  canTransition,
  isPubliclySettableStatus,
  isTerminalStatus,
  requiresStatusReason
} from "./work-orders.lifecycle.js";
import { WorkOrdersRepository } from "./work-orders.repository.js";
import {
  assertAdmin,
  assertReader,
  toWriteData,
  validateCoordinatePair
} from "./work-orders.utils.js";

const EDITABLE_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.CREATED,
  WorkOrderStatus.ASSIGNED
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

  async listAssignedToMe(
    actor: AuthenticatedActor,
    query: ListWorkOrdersQueryDto
  ) {
    assertFieldAgent(actor);

    const { data, total } =
      await this.workOrdersRepository.listAssignedToAssignee({
        organizationId: actor.organizationId,
        assigneeId: actor.userId,
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

  async findAssignedToMe(actor: AuthenticatedActor, id: string) {
    assertFieldAgent(actor);
    const workOrder =
      await this.workOrdersRepository.findAssignedToAssigneeById({
        organizationId: actor.organizationId,
        assigneeId: actor.userId,
        workOrderId: id
      });

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    return toWorkOrderResponse(workOrder);
  }

  async assign(
    actor: AuthenticatedActor,
    id: string,
    dto: AssignWorkOrderDto
  ) {
    assertManager(actor);
    const workOrder = await this.findOrThrow(actor.organizationId, id);

    if (
      workOrder.status !== WorkOrderStatus.ASSIGNED &&
      !canTransition(workOrder.status, WorkOrderStatus.ASSIGNED)
    ) {
      throw new ConflictException(
        `Work order cannot be assigned while status is ${workOrder.status}`
      );
    }

    const assignee = await this.workOrdersRepository.findAssigneeById(
      actor.organizationId,
      dto.assigneeId
    );

    if (
      !assignee ||
      !assignee.isActive ||
      assignee.role !== UserRole.FIELD_AGENT
    ) {
      throw new BadRequestException(
        "Assignee must be an active FieldAgent in this organization"
      );
    }

    const assigned = await this.workOrdersRepository.assign(
      actor,
      workOrder,
      assignee.id
    );

    if (!assigned) {
      throw new ConflictException(
        "Work order changed during assignment; reload and try again"
      );
    }

    return toWorkOrderResponse(assigned);
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

    return this.updateStatus(actor, id, {
      status: WorkOrderStatus.CANCELLED,
      reason: dto.reason
    });
  }

  async updateStatus(
    actor: AuthenticatedActor,
    id: string,
    dto: UpdateWorkOrderStatusDto
  ) {
    const workOrder = await this.findOrThrow(actor.organizationId, id);

    if (!isPubliclySettableStatus(dto.status)) {
      throw new BadRequestException(
        `${dto.status} cannot be set through the public status endpoint`
      );
    }

    this.validateStatusTransition(workOrder.status, dto.status);
    this.validateStatusReason(dto.status, dto.reason);
    await this.assertActorCanSetStatus(actor, workOrder.id, dto.status);

    const updated = await this.workOrdersRepository.updateStatus(workOrder, {
      toStatus: dto.status,
      actorUserId: actor.userId,
      source: StatusChangeSource.API,
      reason: dto.reason,
      auditAction: auditActionForStatus(dto.status)
    });

    if (!updated) {
      throw new ConflictException(
        "Work order changed during status update; reload and try again"
      );
    }

    return toWorkOrderResponse(updated);
  }

  async markSlaBreached(
    organizationId: string,
    workOrderId: string,
    reason: string
  ) {
    const workOrder = await this.findOrThrow(organizationId, workOrderId);
    const toStatus = WorkOrderStatus.SLA_BREACHED;

    this.validateStatusTransition(workOrder.status, toStatus);

    const updated = await this.workOrdersRepository.updateStatus(workOrder, {
      toStatus,
      actorUserId: null,
      source: StatusChangeSource.SYSTEM,
      reason,
      auditAction: "WORK_ORDER_SLA_BREACHED"
    });

    if (!updated) {
      throw new ConflictException(
        "Work order changed during SLA breach update; reload and try again"
      );
    }

    return toWorkOrderResponse(updated);
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

  private validateStatusTransition(
    fromStatus: WorkOrderStatus,
    toStatus: WorkOrderStatus
  ): void {
    if (isTerminalStatus(fromStatus)) {
      throw new ConflictException(
        `Work order cannot transition from terminal status ${fromStatus}`
      );
    }

    if (!canTransition(fromStatus, toStatus)) {
      throw new ConflictException(
        `Work order cannot transition from ${fromStatus} to ${toStatus}`
      );
    }
  }

  private validateStatusReason(
    status: WorkOrderStatus,
    reason: string | undefined
  ): void {
    if (requiresStatusReason(status) && !reason) {
      throw new BadRequestException(`Reason is required when status is ${status}`);
    }
  }

  private async assertActorCanSetStatus(
    actor: AuthenticatedActor,
    workOrderId: string,
    status: WorkOrderStatus
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      if (status !== WorkOrderStatus.CANCELLED) {
        throw new ForbiddenException("Admin can only cancel work orders");
      }

      return;
    }

    if (actor.role === UserRole.FIELD_AGENT) {
      if (
        status !== WorkOrderStatus.IN_PROGRESS &&
        status !== WorkOrderStatus.COMPLETED &&
        status !== WorkOrderStatus.FAILED
      ) {
        throw new ForbiddenException(
          "FieldAgent can only start, complete, or fail work orders"
        );
      }

      await this.assertAssignedFieldAgent(actor, workOrderId);
      return;
    }

    throw new ForbiddenException("Actor cannot update work order status");
  }

  private async assertAssignedFieldAgent(
    actor: AuthenticatedActor,
    workOrderId: string
  ): Promise<void> {
    const assigned =
      await this.workOrdersRepository.findAssignedToAssigneeById({
        organizationId: actor.organizationId,
        assigneeId: actor.userId,
        workOrderId
      });

    if (!assigned) {
      throw new ForbiddenException(
        "Only the assigned FieldAgent can update work order status"
      );
    }
  }
}

function assertManager(actor: AuthenticatedActor): void {
  if (actor.role !== UserRole.MANAGER) {
    throw new ForbiddenException("Manager role is required");
  }
}

function assertFieldAgent(actor: AuthenticatedActor): void {
  if (actor.role !== UserRole.FIELD_AGENT) {
    throw new ForbiddenException("FieldAgent role is required");
  }
}

function auditActionForStatus(status: WorkOrderStatus): string {
  switch (status) {
    case WorkOrderStatus.IN_PROGRESS:
      return "WORK_ORDER_STARTED";
    case WorkOrderStatus.COMPLETED:
      return "WORK_ORDER_COMPLETED";
    case WorkOrderStatus.FAILED:
      return "WORK_ORDER_FAILED";
    case WorkOrderStatus.CANCELLED:
      return "WORK_ORDER_CANCELLED";
    default:
      return "WORK_ORDER_STATUS_UPDATED";
  }
}
