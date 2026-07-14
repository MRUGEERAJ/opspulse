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
import { Roles } from "../auth/decorators/roles.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { UserRole } from "../generated/prisma/enums.js";
import { AssignWorkOrderDto } from "./dto/assign-work-order.dto.js";
import { CancelWorkOrderDto } from "./dto/cancel-work-order.dto.js";
import { CompleteWorkOrderDto } from "./dto/complete-work-order.dto.js";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto.js";
import { ListWorkOrdersQueryDto } from "./dto/list-work-orders-query.dto.js";
import { UpdateWorkOrderStatusDto } from "./dto/update-work-order-status.dto.js";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Controller("work-orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateWorkOrderDto
  ) {
    return this.workOrdersService.create(actor, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  list(
    @CurrentActor() actor: AuthenticatedActor,
    @Query() query: ListWorkOrdersQueryDto
  ) {
    return this.workOrdersService.list(actor, query);
  }

  @Get("assigned/me")
  @Roles(UserRole.FIELD_AGENT)
  listAssignedToMe(
    @CurrentActor() actor: AuthenticatedActor,
    @Query() query: ListWorkOrdersQueryDto
  ) {
    return this.workOrdersService.listAssignedToMe(actor, query);
  }

  @Get("assigned/me/:id")
  @Roles(UserRole.FIELD_AGENT)
  findAssignedToMe(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string
  ) {
    return this.workOrdersService.findAssignedToMe(actor, id);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string
  ) {
    return this.workOrdersService.findOne(actor, id);
  }

  @Patch(":id/assign")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assign(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: AssignWorkOrderDto
  ) {
    return this.workOrdersService.assign(actor, id, dto);
  }

  @Patch(":id/complete")
  @Roles(UserRole.FIELD_AGENT)
  complete(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: CompleteWorkOrderDto
  ) {
    return this.workOrdersService.complete(actor, id, dto);
  }

  @Patch(":id/status")
  @Roles(UserRole.ADMIN, UserRole.FIELD_AGENT)
  updateStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateWorkOrderStatusDto
  ) {
    return this.workOrdersService.updateStatus(actor, id, dto);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateWorkOrderDto
  ) {
    return this.workOrdersService.update(actor, id, dto);
  }

  @Patch(":id/cancel")
  @Roles(UserRole.ADMIN)
  cancel(
    @CurrentActor() actor: AuthenticatedActor,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: CancelWorkOrderDto
  ) {
    return this.workOrdersService.cancel(actor, id, dto);
  }
}
