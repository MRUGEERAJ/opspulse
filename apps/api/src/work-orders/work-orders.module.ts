import { Module } from "@nestjs/common";

import { DevelopmentActorGuard } from "../common/auth-context/development-actor.guard.js";
import { WorkOrdersController } from "./work-orders.controller.js";
import { WorkOrdersRepository } from "./work-orders.repository.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Module({
  controllers: [WorkOrdersController],
  providers: [
    DevelopmentActorGuard,
    WorkOrdersRepository,
    WorkOrdersService
  ]
})
export class WorkOrdersModule {}
