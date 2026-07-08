-- Add SLA breach as a non-terminal work-order lifecycle status for v1.
ALTER TYPE "WorkOrderStatus" ADD VALUE 'SLA_BREACHED';
