import { Injectable } from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import type { WorkOrder } from "../generated/prisma/client.js";
import {
  StatusChangeSource,
  WorkOrderStatus
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreateWorkOrderWriteData,
  ListAssignedWorkOrdersInput,
  ListWorkOrdersInput,
  WorkOrderAssignee,
  WorkOrderWriteData
} from "./work-orders.types.js";

@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    actor: AuthenticatedActor,
    data: CreateWorkOrderWriteData
  ): Promise<WorkOrder> {
    return this.prismaService.$transaction(async (transaction) => {
      const workOrder = await transaction.workOrder.create({
        data: {
          ...data,
          organizationId: actor.organizationId,
          createdById: actor.userId
        }
      });

      await transaction.workOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          workOrderId: workOrder.id,
          actorUserId: actor.userId,
          fromStatus: null,
          toStatus: workOrder.status,
          source: StatusChangeSource.API
        }
      });

      await transaction.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          workOrderId: workOrder.id,
          action: "WORK_ORDER_CREATED",
          targetType: "WORK_ORDER",
          targetId: workOrder.id,
          metadata: {
            toStatus: workOrder.status,
            source: StatusChangeSource.API
          }
        }
      });

      return workOrder;
    });
  }

  async list(input: ListWorkOrdersInput) {
    const where = {
      organizationId: input.organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {})
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.workOrder.count({ where }),
      this.prismaService.workOrder.findMany({
        where,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }]
      })
    ]);

    return { data, total };
  }

  async listAssignedToAssignee(input: ListAssignedWorkOrdersInput) {
    const where = {
      organizationId: input.organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      assignments: {
        some: {
          assigneeId: input.assigneeId,
          unassignedAt: null
        }
      }
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.workOrder.count({ where }),
      this.prismaService.workOrder.findMany({
        where,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }]
      })
    ]);

    return { data, total };
  }

  findById(organizationId: string, id: string): Promise<WorkOrder | null> {
    return this.prismaService.workOrder.findFirst({
      where: {
        id,
        organizationId
      }
    });
  }

  findAssignedToAssigneeById(input: {
    organizationId: string;
    assigneeId: string;
    workOrderId: string;
  }): Promise<WorkOrder | null> {
    return this.prismaService.workOrder.findFirst({
      where: {
        id: input.workOrderId,
        organizationId: input.organizationId,
        assignments: {
          some: {
            assigneeId: input.assigneeId,
            unassignedAt: null
          }
        }
      }
    });
  }

  findAssigneeById(
    organizationId: string,
    assigneeId: string
  ): Promise<WorkOrderAssignee | null> {
    return this.prismaService.user.findFirst({
      where: {
        id: assigneeId,
        organizationId
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
        isActive: true
      }
    });
  }

  async update(
    workOrder: WorkOrder,
    data: WorkOrderWriteData
  ): Promise<WorkOrder | null> {
    const result = await this.prismaService.workOrder.updateMany({
      where: {
        id: workOrder.id,
        organizationId: workOrder.organizationId,
        version: workOrder.version,
        status: workOrder.status
      },
      data: {
        ...data,
        version: {
          increment: 1
        }
      }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(workOrder.organizationId, workOrder.id);
  }

  async assign(
    actor: AuthenticatedActor,
    workOrder: WorkOrder,
    assigneeId: string
  ): Promise<WorkOrder | null> {
    return this.prismaService.$transaction(async (transaction) => {
      const result = await transaction.workOrder.updateMany({
        where: {
          id: workOrder.id,
          organizationId: actor.organizationId,
          version: workOrder.version,
          status: workOrder.status
        },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          version: {
            increment: 1
          }
        }
      });

      if (result.count === 0) {
        return null;
      }

      const now = new Date();

      await transaction.assignment.updateMany({
        where: {
          organizationId: actor.organizationId,
          workOrderId: workOrder.id,
          unassignedAt: null
        },
        data: {
          unassignedAt: now
        }
      });

      await transaction.assignment.create({
        data: {
          organizationId: actor.organizationId,
          workOrderId: workOrder.id,
          assigneeId,
          assignedById: actor.userId,
          assignedAt: now
        }
      });

      if (workOrder.status !== WorkOrderStatus.ASSIGNED) {
        await transaction.workOrderStatusHistory.create({
          data: {
            organizationId: actor.organizationId,
            workOrderId: workOrder.id,
            actorUserId: actor.userId,
            fromStatus: workOrder.status,
            toStatus: WorkOrderStatus.ASSIGNED,
            source: StatusChangeSource.API,
            reason: "Assigned to FieldAgent"
          }
        });
      }

      await transaction.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          workOrderId: workOrder.id,
          action: "WORK_ORDER_ASSIGNED",
          targetType: "WORK_ORDER",
          targetId: workOrder.id,
          metadata: {
            assigneeId,
            fromStatus: workOrder.status,
            toStatus: WorkOrderStatus.ASSIGNED,
            source: StatusChangeSource.API
          }
        }
      });

      return transaction.workOrder.findUnique({
        where: {
          id: workOrder.id
        }
      });
    });
  }

  async cancel(
    actor: AuthenticatedActor,
    workOrder: WorkOrder,
    reason: string
  ): Promise<WorkOrder | null> {
    return this.prismaService.$transaction(async (transaction) => {
      const result = await transaction.workOrder.updateMany({
        where: {
          id: workOrder.id,
          organizationId: actor.organizationId,
          version: workOrder.version,
          status: workOrder.status
        },
        data: {
          status: "CANCELLED",
          version: {
            increment: 1
          }
        }
      });

      if (result.count === 0) {
        return null;
      }

      await transaction.workOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          workOrderId: workOrder.id,
          actorUserId: actor.userId,
          fromStatus: workOrder.status,
          toStatus: "CANCELLED",
          source: StatusChangeSource.API,
          reason
        }
      });

      await transaction.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          workOrderId: workOrder.id,
          action: "WORK_ORDER_CANCELLED",
          targetType: "WORK_ORDER",
          targetId: workOrder.id,
          metadata: {
            fromStatus: workOrder.status,
            toStatus: "CANCELLED",
            source: StatusChangeSource.API,
            reason
          }
        }
      });

      return transaction.workOrder.findUnique({
        where: {
          id: workOrder.id
        }
      });
    });
  }
}
