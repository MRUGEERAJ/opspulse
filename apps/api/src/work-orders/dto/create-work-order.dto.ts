import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min
} from "class-validator";

import { WorkOrderPriority } from "../../generated/prisma/enums.js";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateWorkOrderDto {
  @Transform(trimString)
  @IsString()
  @Length(3, 150)
  title!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string | null;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  siteAddress?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsBoolean()
  requiresProofPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresQrScan?: boolean;
}
