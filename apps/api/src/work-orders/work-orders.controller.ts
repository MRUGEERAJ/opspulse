import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";

import { CurrentActor } from "../common/auth-context/current-actor.decorator.js";
import type { DevelopmentActor } from "../common/auth-context/development-actor.js";
import { DevelopmentActorGuard } from "../common/auth-context/development-actor.guard.js";
import { CancelWorkOrderDto } from "./dto/cancel-work-order.dto.js";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto.js";
import { ListWorkOrdersQueryDto } from "./dto/list-work-orders-query.dto.js";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Controller("work-orders")
@UseGuards(DevelopmentActorGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  create(
    @CurrentActor() actor: DevelopmentActor,
    @Body() dto: CreateWorkOrderDto
  ) {
    return this.workOrdersService.create(actor, dto);
  }

  @Get()
  list(
    @CurrentActor() actor: DevelopmentActor,
    @Query() query: ListWorkOrdersQueryDto
  ) {
    return this.workOrdersService.list(actor, query);
  }

  @Get(":id")
  findOne(
    @CurrentActor() actor: DevelopmentActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string
  ) {
    return this.workOrdersService.findOne(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: DevelopmentActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateWorkOrderDto
  ) {
    return this.workOrdersService.update(actor, id, dto);
  }

  @Patch(":id/cancel")
  cancel(
    @CurrentActor() actor: DevelopmentActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: CancelWorkOrderDto
  ) {
    return this.workOrdersService.cancel(actor, id, dto);
  }
}
