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

import type { AuthenticatedActor } from "../auth/auth.types.js";
import { CurrentActor } from "../auth/decorators/current-actor.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CancelWorkOrderDto } from "./dto/cancel-work-order.dto.js";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto.js";
import { ListWorkOrdersQueryDto } from "./dto/list-work-orders-query.dto.js";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Controller("work-orders")
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateWorkOrderDto
  ) {
    return this.workOrdersService.create(actor, dto);
  }

  @Get()
  list(
    @CurrentActor() actor: AuthenticatedActor,
    @Query() query: ListWorkOrdersQueryDto
  ) {
    return this.workOrdersService.list(actor, query);
  }

  @Get(":id")
  findOne(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string
  ) {
    return this.workOrdersService.findOne(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateWorkOrderDto
  ) {
    return this.workOrdersService.update(actor, id, dto);
  }

  @Patch(":id/cancel")
  cancel(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: CancelWorkOrderDto
  ) {
    return this.workOrdersService.cancel(actor, id, dto);
  }
}
