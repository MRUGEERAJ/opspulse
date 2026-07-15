import { Injectable } from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import type { Prisma, WorkOrder } from "../generated/prisma/client.js";
import {
  StatusChangeSource,
  WorkOrderStatus
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreateWorkOrderWriteData,
  ListAssignedWorkOrdersInput,
  ListWorkOrdersInput,
  UpdateWorkOrderStatusWriteData,
  WorkOrderAssignee,
  WorkOrderWriteData
} from "./work-orders.types.js";

const workOrderCurrentAssignmentInclude = {
  assignments: {
    where: {
      unassignedAt: null
    },
    orderBy: {
      assignedAt: "desc"
    },
    take: 1,
    include: {
      assignee: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  }
} satisfies Prisma.WorkOrderInclude;

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

  async list(
    input: ListWorkOrdersInput
  ): Promise<{ data: WorkOrder[]; total: number }> {
    const where: Prisma.WorkOrderWhereInput = {
      organizationId: input.organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...buildSearchFilter(input.q)
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.workOrder.count({ where }),
      this.prismaService.workOrder.findMany({
        where,
        include: workOrderCurrentAssignmentInclude,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      })
    ]);

    return { data, total };
  }

  async listAssignedToAssignee(
    input: ListAssignedWorkOrdersInput
  ): Promise<{ data: WorkOrder[]; total: number }> {
    const where: Prisma.WorkOrderWhereInput = {
      organizationId: input.organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...buildSearchFilter(input.q),
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
        include: workOrderCurrentAssignmentInclude,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      })
    ]);

    return { data, total };
  }

  findById(organizationId: string, id: string): Promise<WorkOrder | null> {
    return this.prismaService.workOrder.findFirst({
      where: {
        id,
        organizationId
      },
      include: workOrderCurrentAssignmentInclude
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
      },
      include: workOrderCurrentAssignmentInclude
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

  async hasCompletedClientAction(input: {
    organizationId: string;
    actorUserId: string;
    workOrderId: string;
    clientActionId: string;
  }): Promise<boolean> {
    const existingAuditLog = await this.prismaService.auditLog.findFirst({
      where: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        workOrderId: input.workOrderId,
        action: "WORK_ORDER_COMPLETED",
        metadata: {
          path: ["clientActionId"],
          equals: input.clientActionId
        }
      },
      select: {
        id: true
      }
    });

    return existingAuditLog !== null;
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
        },
        include: workOrderCurrentAssignmentInclude
      });
    });
  }

  async updateStatus(
    workOrder: WorkOrder,
    data: UpdateWorkOrderStatusWriteData
  ): Promise<WorkOrder | null> {
    return this.prismaService.$transaction(async (transaction) => {
      const result = await transaction.workOrder.updateMany({
        where: {
          id: workOrder.id,
          organizationId: workOrder.organizationId,
          version: workOrder.version,
          status: workOrder.status
        },
        data: {
          status: data.toStatus,
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
          organizationId: workOrder.organizationId,
          workOrderId: workOrder.id,
          actorUserId: data.actorUserId,
          fromStatus: workOrder.status,
          toStatus: data.toStatus,
          source: data.source,
          reason: data.reason
        }
      });

      await transaction.auditLog.create({
        data: {
          organizationId: workOrder.organizationId,
          actorUserId: data.actorUserId,
          workOrderId: workOrder.id,
          action: data.auditAction,
          targetType: "WORK_ORDER",
          targetId: workOrder.id,
          metadata: {
            fromStatus: workOrder.status,
            toStatus: data.toStatus,
            source: data.source,
            ...(data.clientActionId
              ? { clientActionId: data.clientActionId }
              : {}),
            ...(data.reason ? { reason: data.reason } : {})
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

function buildSearchFilter(
  query: string | undefined
): Pick<Prisma.WorkOrderWhereInput, "OR"> {
  if (!query) {
    return {};
  }

  if (isUuid(query)) {
    return {
      OR: [
        { id: query },
        { title: { contains: query, mode: "insensitive" } }
      ]
    };
  }

  return {
    OR: [{ title: { contains: query, mode: "insensitive" } }]
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
