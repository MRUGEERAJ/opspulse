import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CancelWorkOrderDto {
  @Transform(trimString)
  @IsString()
  @Length(3, 500)
  reason!: string;
}
