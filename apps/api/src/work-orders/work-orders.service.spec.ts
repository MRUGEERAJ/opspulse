import assert from "node:assert/strict";
import test from "node:test";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import type { WorkOrder } from "../generated/prisma/client.js";
import {
  StatusChangeSource,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus
} from "../generated/prisma/enums.js";
import type { UpdateWorkOrderStatusWriteData } from "./work-orders.types.js";
import type { WorkOrdersRepository } from "./work-orders.repository.js";
import { WorkOrdersService } from "./work-orders.service.js";

const organizationId = "10000000-0000-4000-8000-000000000001";
const managerId = "20000000-0000-4000-8000-000000000002";
const agentId = "20000000-0000-4000-8000-000000000003";
const workOrderId = "30000000-0000-4000-8000-000000000001";

test("manager can assign a work order to an active FieldAgent", async () => {
  let assignedAssigneeId: string | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.CREATED),
    findAssigneeById: async () => ({
      id: agentId,
      organizationId,
      role: UserRole.FIELD_AGENT,
      isActive: true
    }),
    assign: async (_actor, _workOrder, assigneeId) => {
      assignedAssigneeId = assigneeId;
      return createWorkOrder(WorkOrderStatus.ASSIGNED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.assign(managerActor(), workOrderId, {
    assigneeId: agentId
  });

  assert.equal(assignedAssigneeId, agentId);
  assert.equal(result.status, WorkOrderStatus.ASSIGNED);
});

test("admin can assign a work order to an active FieldAgent", async () => {
  let assignedAssigneeId: string | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.CREATED),
    findAssigneeById: async () => ({
      id: agentId,
      organizationId,
      role: UserRole.FIELD_AGENT,
      isActive: true
    }),
    assign: async (_actor, _workOrder, assigneeId) => {
      assignedAssigneeId = assigneeId;
      return createWorkOrder(WorkOrderStatus.ASSIGNED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.assign(adminActor(), workOrderId, {
    assigneeId: agentId
  });

  assert.equal(assignedAssigneeId, agentId);
  assert.equal(result.status, WorkOrderStatus.ASSIGNED);
});

test("assigning the current FieldAgent again is rejected", async () => {
  let assignWasCalled = false;
  const repository = createRepository({
    findById: async () =>
      createWorkOrderWithCurrentAssignment(WorkOrderStatus.ASSIGNED, agentId),
    findAssigneeById: async () => ({
      id: agentId,
      organizationId,
      role: UserRole.FIELD_AGENT,
      isActive: true
    }),
    assign: async () => {
      assignWasCalled = true;
      return createWorkOrder(WorkOrderStatus.ASSIGNED);
    }
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.assign(adminActor(), workOrderId, {
      assigneeId: agentId
    }),
    (error: unknown) => error instanceof ConflictException
  );
  assert.equal(assignWasCalled, false);
});

test("manager cannot assign a work order to a non-FieldAgent user", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.CREATED),
    findAssigneeById: async () => ({
      id: managerId,
      organizationId,
      role: UserRole.MANAGER,
      isActive: true
    })
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.assign(managerActor(), workOrderId, {
      assigneeId: managerId
    }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("admin and manager list passes search query to repository", async () => {
  let requestedQuery: string | undefined;
  const repository = createRepository({
    list: async (input) => {
      requestedQuery = input.q;
      return {
        data: [createWorkOrder(WorkOrderStatus.CREATED)],
        total: 1
      };
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.list(managerActor(), {
    page: 1,
    limit: 20,
    q: "generator"
  });

  assert.equal(requestedQuery, "generator");
  assert.equal(result.data.length, 1);
});

test("FieldAgent can list only work orders assigned to themselves", async () => {
  let requestedAssigneeId: string | undefined;
  const repository = createRepository({
    listAssignedToAssignee: async (input) => {
      requestedAssigneeId = input.assigneeId;
      return {
        data: [createWorkOrder(WorkOrderStatus.ASSIGNED)],
        total: 1
      };
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.listAssignedToMe(fieldAgentActor(), {
    page: 1,
    limit: 20
  });

  assert.equal(requestedAssigneeId, agentId);
  assert.equal(result.data.length, 1);
});

test("FieldAgent receives not found for another agent's work order", async () => {
  const repository = createRepository({
    findAssignedToAssigneeById: async () => null
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.findAssignedToMe(fieldAgentActor(), workOrderId),
    (error: unknown) => error instanceof NotFoundException
  );
});

test("non-FieldAgent cannot use assigned-to-me service methods", async () => {
  const service = new WorkOrdersService(createRepository({}));

  await assert.rejects(
    service.listAssignedToMe(managerActor(), { page: 1, limit: 20 }),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test("assigned FieldAgent can start their assigned work order", async () => {
  let statusUpdate: UpdateWorkOrderStatusWriteData | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.ASSIGNED),
    findAssignedToAssigneeById: async () =>
      createWorkOrder(WorkOrderStatus.ASSIGNED),
    updateStatus: async (_workOrder, data) => {
      statusUpdate = data;
      return createWorkOrder(WorkOrderStatus.IN_PROGRESS);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.updateStatus(fieldAgentActor(), workOrderId, {
    status: WorkOrderStatus.IN_PROGRESS
  });

  assert.equal(result.status, WorkOrderStatus.IN_PROGRESS);
  assert.equal(statusUpdate?.toStatus, WorkOrderStatus.IN_PROGRESS);
  assert.equal(statusUpdate?.actorUserId, agentId);
  assert.equal(statusUpdate?.source, StatusChangeSource.API);
});

test("assigned FieldAgent can complete an in-progress work order", async () => {
  let previousStatus: WorkOrderStatus | undefined;
  let statusUpdate: UpdateWorkOrderStatusWriteData | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.IN_PROGRESS),
    findAssignedToAssigneeById: async () =>
      createWorkOrder(WorkOrderStatus.IN_PROGRESS),
    updateStatus: async (_workOrder, data) => {
      previousStatus = _workOrder.status;
      statusUpdate = data;
      return createWorkOrder(WorkOrderStatus.COMPLETED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.complete(fieldAgentActor(), workOrderId, {
    notes: "Completed generator inspection."
  });

  assert.equal(result.status, WorkOrderStatus.COMPLETED);
  assert.equal(previousStatus, WorkOrderStatus.IN_PROGRESS);
  assert.equal(statusUpdate?.toStatus, WorkOrderStatus.COMPLETED);
  assert.equal(statusUpdate?.actorUserId, agentId);
  assert.equal(statusUpdate?.source, StatusChangeSource.API);
  assert.equal(statusUpdate?.reason, "Completed generator inspection.");
  assert.equal(statusUpdate?.auditAction, "WORK_ORDER_COMPLETED");
});

test("assigned FieldAgent can complete an SLA-breached work order", async () => {
  let previousStatus: WorkOrderStatus | undefined;
  let statusUpdate: UpdateWorkOrderStatusWriteData | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.SLA_BREACHED),
    findAssignedToAssigneeById: async () =>
      createWorkOrder(WorkOrderStatus.SLA_BREACHED),
    updateStatus: async (_workOrder, data) => {
      previousStatus = _workOrder.status;
      statusUpdate = data;
      return createWorkOrder(WorkOrderStatus.COMPLETED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.complete(fieldAgentActor(), workOrderId, {
    notes: "Completed after SLA breach."
  });

  assert.equal(result.status, WorkOrderStatus.COMPLETED);
  assert.equal(previousStatus, WorkOrderStatus.SLA_BREACHED);
  assert.equal(statusUpdate?.toStatus, WorkOrderStatus.COMPLETED);
  assert.equal(statusUpdate?.reason, "Completed after SLA breach.");
  assert.equal(statusUpdate?.auditAction, "WORK_ORDER_COMPLETED");
});

test("offline completion stores client action metadata", async () => {
  let statusUpdate: UpdateWorkOrderStatusWriteData | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.IN_PROGRESS),
    findAssignedToAssigneeById: async () =>
      createWorkOrder(WorkOrderStatus.IN_PROGRESS),
    updateStatus: async (_workOrder, data) => {
      statusUpdate = data;
      return createWorkOrder(WorkOrderStatus.COMPLETED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.complete(fieldAgentActor(), workOrderId, {
    notes: "Completed generator inspection.",
    clientActionId: "complete-offline-001"
  });

  assert.equal(result.status, WorkOrderStatus.COMPLETED);
  assert.equal(statusUpdate?.toStatus, WorkOrderStatus.COMPLETED);
  assert.equal(statusUpdate?.source, StatusChangeSource.OFFLINE_SYNC);
  assert.equal(statusUpdate?.clientActionId, "complete-offline-001");
  assert.equal(statusUpdate?.auditAction, "WORK_ORDER_COMPLETED");
});

test("retrying a completed offline action returns the current work order", async () => {
  let updateWasCalled = false;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.COMPLETED),
    hasCompletedClientAction: async () => true,
    updateStatus: async () => {
      updateWasCalled = true;
      return createWorkOrder(WorkOrderStatus.COMPLETED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.complete(fieldAgentActor(), workOrderId, {
    notes: "Completed generator inspection.",
    clientActionId: "complete-offline-001"
  });

  assert.equal(result.status, WorkOrderStatus.COMPLETED);
  assert.equal(updateWasCalled, false);
});

test("FieldAgent must provide a reason when marking work order failed", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.IN_PROGRESS)
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.updateStatus(fieldAgentActor(), workOrderId, {
      status: WorkOrderStatus.FAILED
    }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("Admin must provide a reason when cancelling a work order", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.CREATED)
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.updateStatus(adminActor(), workOrderId, {
      status: WorkOrderStatus.CANCELLED
    }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("public status endpoint rejects setting SLA_BREACHED", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.IN_PROGRESS)
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.updateStatus(adminActor(), workOrderId, {
      status: WorkOrderStatus.SLA_BREACHED
    }),
    (error: unknown) => error instanceof BadRequestException
  );
});

test("system method can mark active work order as SLA_BREACHED", async () => {
  let statusUpdate: UpdateWorkOrderStatusWriteData | undefined;
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.ASSIGNED),
    updateStatus: async (_workOrder, data) => {
      statusUpdate = data;
      return createWorkOrder(WorkOrderStatus.SLA_BREACHED);
    }
  });
  const service = new WorkOrdersService(repository);

  const result = await service.markSlaBreached(
    organizationId,
    workOrderId,
    "Due time passed"
  );

  assert.equal(result.status, WorkOrderStatus.SLA_BREACHED);
  assert.equal(statusUpdate?.toStatus, WorkOrderStatus.SLA_BREACHED);
  assert.equal(statusUpdate?.actorUserId, null);
  assert.equal(statusUpdate?.source, StatusChangeSource.SYSTEM);
});

test("terminal statuses reject further lifecycle updates", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.COMPLETED)
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.updateStatus(fieldAgentActor(), workOrderId, {
      status: WorkOrderStatus.FAILED,
      reason: "Could not verify result"
    }),
    (error: unknown) => error instanceof ConflictException
  );
});

test("invalid lifecycle jump returns conflict", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.ASSIGNED)
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.complete(fieldAgentActor(), workOrderId, {
      notes: "Completed generator inspection."
    }),
    (error: unknown) => error instanceof ConflictException
  );
});

test("FieldAgent cannot update another agent's work order status", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.ASSIGNED),
    findAssignedToAssigneeById: async () => null
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.updateStatus(fieldAgentActor(), workOrderId, {
      status: WorkOrderStatus.IN_PROGRESS
    }),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test("FieldAgent cannot complete another agent's work order", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.IN_PROGRESS),
    findAssignedToAssigneeById: async () => null
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.complete(fieldAgentActor(), workOrderId, {
      notes: "Completed generator inspection."
    }),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test("completed work orders cannot be completed again", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.COMPLETED)
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.complete(fieldAgentActor(), workOrderId, {
      notes: "Completed generator inspection."
    }),
    (error: unknown) => error instanceof ConflictException
  );
});

test("status update returns conflict when optimistic lock update fails", async () => {
  const repository = createRepository({
    findById: async () => createWorkOrder(WorkOrderStatus.ASSIGNED),
    findAssignedToAssigneeById: async () =>
      createWorkOrder(WorkOrderStatus.ASSIGNED),
    updateStatus: async () => null
  });
  const service = new WorkOrdersService(repository);

  await assert.rejects(
    service.updateStatus(fieldAgentActor(), workOrderId, {
      status: WorkOrderStatus.IN_PROGRESS
    }),
    (error: unknown) => error instanceof ConflictException
  );
});

function createRepository(
  overrides: Partial<WorkOrdersRepository>
): WorkOrdersRepository {
  return {
    list: async () => ({ data: [], total: 0 }),
    findById: async () => null,
    findAssigneeById: async () => null,
    assign: async () => null,
    updateStatus: async () => null,
    hasCompletedClientAction: async () => false,
    listAssignedToAssignee: async () => ({ data: [], total: 0 }),
    findAssignedToAssigneeById: async () => null,
    ...overrides
  } as WorkOrdersRepository;
}

function adminActor(): AuthenticatedActor {
  return createActor("20000000-0000-4000-8000-000000000001", UserRole.ADMIN);
}

function managerActor(): AuthenticatedActor {
  return createActor(managerId, UserRole.MANAGER);
}

function fieldAgentActor(): AuthenticatedActor {
  return createActor(agentId, UserRole.FIELD_AGENT);
}

function createActor(userId: string, role: UserRole): AuthenticatedActor {
  return {
    userId,
    organizationId,
    email: `${role.toLowerCase()}@opspulse.local`,
    name: role,
    role
  };
}

function createWorkOrder(status: WorkOrderStatus): WorkOrder {
  return {
    id: workOrderId,
    organizationId,
    title: "Inspect backup generator",
    description: "Complete the monthly generator inspection checklist.",
    priority: WorkOrderPriority.HIGH,
    status,
    dueAt: null,
    siteAddress: "North Warehouse",
    latitude: null,
    longitude: null,
    requiresProofPhoto: true,
    requiresLocation: false,
    requiresQrScan: false,
    version: 1,
    createdById: "20000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-06-24T00:00:00.000Z"),
    updatedAt: new Date("2026-06-24T00:00:00.000Z")
  } as WorkOrder;
}

function createWorkOrderWithCurrentAssignment(
  status: WorkOrderStatus,
  assigneeId: string
): WorkOrder {
  return {
    ...createWorkOrder(status),
    assignments: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        assigneeId,
        assignedAt: new Date("2026-06-24T01:00:00.000Z"),
        assignee: {
          id: assigneeId,
          email: "field@opspulse.local",
          name: "Field Agent"
        }
      }
    ]
  } as WorkOrder;
}
