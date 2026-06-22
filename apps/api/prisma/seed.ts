import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  StatusChangeSource,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus
} from "../src/generated/prisma/enums.js";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
const demoUserPassword = process.env.DEMO_USER_PASSWORD;
const passwordHashRounds = Number(process.env.PASSWORD_HASH_ROUNDS ?? "12");

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database");
}

if (
  !demoUserPassword ||
  demoUserPassword.length < 12 ||
  Buffer.byteLength(demoUserPassword, "utf8") > 72
) {
  throw new Error(
    "DEMO_USER_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes"
  );
}

if (
  !Number.isInteger(passwordHashRounds) ||
  passwordHashRounds < 4 ||
  passwordHashRounds > 15
) {
  throw new Error("PASSWORD_HASH_ROUNDS must be an integer between 4 and 15");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});
const demoPasswordHash = await hash(demoUserPassword, passwordHashRounds);

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
console.log(`Demo organization: ${organization.id}`);
console.log("Login emails:");
console.log("  admin@opspulse.local");
console.log("  manager@opspulse.local");
console.log("  agent@opspulse.local");

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
      isActive: true,
      passwordHash: demoPasswordHash
    },
    create: {
      ...input,
      organizationId: organization.id,
      passwordHash: demoPasswordHash
    }
  });
}

function historyIdFor(workOrderId: string): string {
  return workOrderId.replace(/^3/, "4");
}
