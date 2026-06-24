import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

import { trimString } from "./work-order-dto.transforms.js";

export class CancelWorkOrderDto {
  @Transform(trimString)
  @IsString()
  @Length(3, 500)
  reason!: string;
}
