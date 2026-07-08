import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

import { WorkOrderStatus } from "../../generated/prisma/enums.js";
import { trimString } from "./work-order-dto.transforms.js";

export class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}
