import { Injectable } from "@nestjs/common";

import type { DevelopmentActor } from "../common/auth-context/development-actor.js";
import type { WorkOrder } from "../generated/prisma/client.js";
import type {
  WorkOrderPriority,
  WorkOrderStatus
} from "../generated/prisma/enums.js";
import { StatusChangeSource } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";

export type WorkOrderWriteData = {
  title?: string;
  description?: string | null;
  priority?: WorkOrderPriority;
  dueAt?: Date | null;
  siteAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  requiresProofPhoto?: boolean;
  requiresLocation?: boolean;
  requiresQrScan?: boolean;
};

export type CreateWorkOrderWriteData = WorkOrderWriteData & {
  title: string;
};

type ListWorkOrdersInput = {
  organizationId: string;
  page: number;
  limit: number;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
};

@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    actor: DevelopmentActor,
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

  findById(organizationId: string, id: string): Promise<WorkOrder | null> {
    return this.prismaService.workOrder.findFirst({
      where: {
        id,
        organizationId
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

  async cancel(
    actor: DevelopmentActor,
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
