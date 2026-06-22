import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { WorkOrdersController } from "./work-orders.controller.js";
import { WorkOrdersRepository } from "./work-orders.repository.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Module({
  imports: [AuthModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersRepository, WorkOrdersService]
})
export class WorkOrdersModule {}
