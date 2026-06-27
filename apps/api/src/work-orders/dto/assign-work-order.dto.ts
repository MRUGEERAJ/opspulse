import { IsUUID } from "class-validator";

export class AssignWorkOrderDto {
  @IsUUID("4")
  assigneeId!: string;
}
