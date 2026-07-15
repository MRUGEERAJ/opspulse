import { Transform } from "class-transformer";
import { IsOptional, IsString, Length } from "class-validator";

import { trimString } from "./work-order-dto.transforms.js";

export class CompleteWorkOrderDto {
  @Transform(trimString)
  @IsString()
  @Length(3, 500)
  notes!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(8, 120)
  clientActionId?: string;
}
