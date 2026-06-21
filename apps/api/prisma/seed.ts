import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  StatusChangeSource,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus
} from "../src/generated/prisma/enums.js";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

const organization = await prisma.organization.upsert({
  where: {
    slug: "opspulse-demo"
  },
  update: {
    name: "OpsPulse Demo Organization",
    isActive: true
  },
  create: {
    id: "10000000-0000-4000-8000-000000000001",
    name: "OpsPulse Demo Organization",
    slug: "opspulse-demo"
  }
});

const admin = await seedUser({
  id: "20000000-0000-4000-8000-000000000001",
  email: "admin@opspulse.local",
  name: "Demo Admin",
  role: UserRole.ADMIN
});

await seedUser({
  id: "20000000-0000-4000-8000-000000000002",
  email: "manager@opspulse.local",
  name: "Demo Manager",
  role: UserRole.MANAGER
});

await seedUser({
  id: "20000000-0000-4000-8000-000000000003",
  email: "agent@opspulse.local",
  name: "Demo Field Agent",
  role: UserRole.FIELD_AGENT
});

type SeedWorkOrder = {
  id: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  dueAt: Date | null;
  siteAddress: string;
  requiresProofPhoto?: boolean;
  requiresLocation?: boolean;
  requiresQrScan?: boolean;
};

const workOrders: SeedWorkOrder[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    title: "Inspect backup generator",
    description: "Complete the monthly generator inspection checklist.",
    priority: WorkOrderPriority.HIGH,
    status: WorkOrderStatus.CREATED,
    dueAt: new Date("2026-07-01T09:00:00.000Z"),
    siteAddress: "North Warehouse",
    requiresProofPhoto: true
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    title: "Replace loading bay sensor",
    description: "Replace the faulty proximity sensor at loading bay two.",
    priority: WorkOrderPriority.URGENT,
    status: WorkOrderStatus.CREATED,
    dueAt: new Date("2026-06-25T12:00:00.000Z"),
    siteAddress: "Loading Bay 2",
    requiresProofPhoto: true,
    requiresLocation: true
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    title: "Verify fire extinguisher tags",
    description: "Scan and verify extinguisher inspection tags.",
    priority: WorkOrderPriority.MEDIUM,
    status: WorkOrderStatus.CREATED,
    dueAt: new Date("2026-07-05T15:30:00.000Z"),
    siteAddress: "Main Office",
    requiresQrScan: true
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    title: "Cancelled demo inspection",
    description: "Seeded terminal record for status filtering.",
    priority: WorkOrderPriority.LOW,
    status: WorkOrderStatus.CANCELLED,
    dueAt: null,
    siteAddress: "Demo Site"
  }
];

for (const workOrderData of workOrders) {
  const workOrder = await prisma.workOrder.upsert({
    where: {
      id: workOrderData.id
    },
    update: {
      title: workOrderData.title,
      description: workOrderData.description,
      priority: workOrderData.priority,
      status: workOrderData.status,
      dueAt: workOrderData.dueAt,
      siteAddress: workOrderData.siteAddress,
      requiresProofPhoto: workOrderData.requiresProofPhoto ?? false,
      requiresLocation: workOrderData.requiresLocation ?? false,
      requiresQrScan: workOrderData.requiresQrScan ?? false,
      organizationId: organization.id,
      createdById: admin.id
    },
    create: {
      ...workOrderData,
      requiresProofPhoto: workOrderData.requiresProofPhoto ?? false,
      requiresLocation: workOrderData.requiresLocation ?? false,
      requiresQrScan: workOrderData.requiresQrScan ?? false,
      organizationId: organization.id,
      createdById: admin.id
    }
  });

  await prisma.workOrderStatusHistory.upsert({
    where: {
      id: historyIdFor(workOrder.id)
    },
    update: {
      organizationId: organization.id,
      workOrderId: workOrder.id,
      actorUserId: admin.id,
      toStatus: workOrder.status,
      source: StatusChangeSource.SYSTEM,
      reason: "Created by deterministic development seed"
    },
    create: {
      id: historyIdFor(workOrder.id),
      organizationId: organization.id,
      workOrderId: workOrder.id,
      actorUserId: admin.id,
      fromStatus: null,
      toStatus: workOrder.status,
      source: StatusChangeSource.SYSTEM,
      reason: "Created by deterministic development seed"
    }
  });
}

console.log("Seed complete.");
console.log(`x-organization-id: ${organization.id}`);
console.log(`Admin x-user-id: ${admin.id}`);
console.log("Manager x-user-id: 20000000-0000-4000-8000-000000000002");
console.log("FieldAgent x-user-id: 20000000-0000-4000-8000-000000000003");

await prisma.$disconnect();

async function seedUser(input: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}) {
  return prisma.user.upsert({
    where: {
      email: input.email
    },
    update: {
      organizationId: organization.id,
      name: input.name,
      role: input.role,
      isActive: true
    },
    create: {
      ...input,
      organizationId: organization.id,
      passwordHash: "development-seed-no-login"
    }
  });
}

function historyIdFor(workOrderId: string): string {
  return workOrderId.replace(/^3/, "4");
}
