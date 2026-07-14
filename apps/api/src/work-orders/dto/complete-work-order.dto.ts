import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

import { trimString } from "./work-order-dto.transforms.js";

export class CompleteWorkOrderDto {
  @Transform(trimString)
  @IsString()
  @Length(3, 500)
  notes!: string;
}
