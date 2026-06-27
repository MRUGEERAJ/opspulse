import assert from "node:assert/strict";
import test from "node:test";

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedActor } from "../auth/auth.types.js";
import type { WorkOrder } from "../generated/prisma/client.js";
import {
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus
} from "../generated/prisma/enums.js";
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

function createRepository(
  overrides: Partial<WorkOrdersRepository>
): WorkOrdersRepository {
  return {
    findById: async () => null,
    findAssigneeById: async () => null,
    assign: async () => null,
    listAssignedToAssignee: async () => ({ data: [], total: 0 }),
    findAssignedToAssigneeById: async () => null,
    ...overrides
  } as WorkOrdersRepository;
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
