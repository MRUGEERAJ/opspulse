/*
  This migration is additive to the initial User and WorkOrder schema.
  Existing rows, if any, are placed in a legacy organization before tenant
  ownership columns are made required.
*/
-- CreateEnum
CREATE TYPE "StatusChangeSource" AS ENUM ('API', 'OFFLINE_SYNC', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PROOF_PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AttachmentUploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- DropIndex
DROP INDEX "users_role_is_active_idx";

-- DropIndex
DROP INDEX "work_orders_due_at_idx";

-- DropIndex
DROP INDEX "work_orders_status_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "organization_id" UUID;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(10,6),
ADD COLUMN     "organization_id" UUID,
ADD COLUMN     "requires_location" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_proof_photo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_qr_scan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "site_address" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Backfill tenant ownership without adding a permanent default organization.
-- The fixed UUID is used only when pre-migration users already exist.
INSERT INTO "organizations" (
    "id",
    "name",
    "slug",
    "is_active",
    "created_at",
    "updated_at"
)
SELECT
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Legacy Organization',
    'legacy-organization',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "users");

UPDATE "users"
SET
    "email" = lower(btrim("email")),
    "organization_id" = '00000000-0000-0000-0000-000000000001'::UUID
WHERE "organization_id" IS NULL;

UPDATE "work_orders" AS "work_order"
SET "organization_id" = "creator"."organization_id"
FROM "users" AS "creator"
WHERE
    "work_order"."created_by_id" = "creator"."id"
    AND "work_order"."organization_id" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "work_orders"
ALTER COLUMN "organization_id" SET NOT NULL;

-- MANUAL CONSTRAINT — preserve if this migration is regenerated:
-- Prisma does not express lowercase/trim normalization as a database invariant.
-- Services normalize values, while this constraint provides defense in depth.
ALTER TABLE "users"
ADD CONSTRAINT "users_email_normalized_check"
CHECK ("email" = lower(btrim("email")));

-- MANUAL CONSTRAINT — preserve if this migration is regenerated:
-- Prisma does not express lowercase/trim normalization as a database invariant.
-- Services normalize values, while this constraint provides defense in depth.
ALTER TABLE "organizations"
ADD CONSTRAINT "organizations_slug_normalized_check"
CHECK ("slug" = lower(btrim("slug")));

-- MANUAL CONSTRAINT — preserve if this migration is regenerated:
-- Prisma schema cannot currently represent these PostgreSQL CHECK constraints.
-- Each NULL branch preserves optional coordinates while validating supplied values.
ALTER TABLE "work_orders"
ADD CONSTRAINT "work_orders_latitude_range_check"
CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
ADD CONSTRAINT "work_orders_longitude_range_check"
CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "assignee_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMPTZ(3),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_status_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "from_status" "WorkOrderStatus",
    "to_status" "WorkOrderStatus" NOT NULL,
    "source" "StatusChangeSource" NOT NULL DEFAULT 'API',
    "reason" TEXT,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "upload_status" "AttachmentUploadStatus" NOT NULL DEFAULT 'PENDING',
    "object_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "work_order_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB,
    "request_id" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" TEXT,
    "replaced_by_token_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "assignments_organization_id_assignee_id_unassigned_at_idx" ON "assignments"("organization_id", "assignee_id", "unassigned_at");

-- CreateIndex
CREATE INDEX "assignments_work_order_id_assigned_at_idx" ON "assignments"("work_order_id", "assigned_at");

-- MANUAL CONSTRAINT — preserve if this migration is regenerated:
-- Prisma schema cannot represent PostgreSQL partial unique indexes.
-- This guarantees that a work order has at most one current assignment.
CREATE UNIQUE INDEX "assignments_one_current_per_work_order"
ON "assignments" ("work_order_id")
WHERE "unassigned_at" IS NULL;

-- CreateIndex
CREATE INDEX "work_order_status_history_work_order_id_changed_at_idx" ON "work_order_status_history"("work_order_id", "changed_at");

-- CreateIndex
CREATE INDEX "work_order_status_history_organization_id_changed_at_idx" ON "work_order_status_history"("organization_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_object_key_key" ON "attachments"("object_key");

-- CreateIndex
CREATE INDEX "attachments_work_order_id_created_at_idx" ON "attachments"("work_order_id", "created_at");

-- CreateIndex
CREATE INDEX "attachments_organization_id_upload_status_idx" ON "attachments"("organization_id", "upload_status");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_occurred_at_idx" ON "audit_logs"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_occurred_at_idx" ON "audit_logs"("target_type", "target_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_work_order_id_occurred_at_idx" ON "audit_logs"("work_order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_occurred_at_idx" ON "audit_logs"("actor_user_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_token_id_key" ON "refresh_tokens"("replaced_by_token_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_expires_at_idx" ON "refresh_tokens"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_organization_id_token_family_id_idx" ON "refresh_tokens"("organization_id", "token_family_id");

-- CreateIndex
CREATE INDEX "users_organization_id_role_is_active_idx" ON "users"("organization_id", "role", "is_active");

-- CreateIndex
CREATE INDEX "work_orders_organization_id_status_updated_at_idx" ON "work_orders"("organization_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "work_orders_organization_id_due_at_idx" ON "work_orders"("organization_id", "due_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_status_history" ADD CONSTRAINT "work_order_status_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_status_history" ADD CONSTRAINT "work_order_status_history_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_status_history" ADD CONSTRAINT "work_order_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
