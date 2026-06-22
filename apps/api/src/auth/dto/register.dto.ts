import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy
} from "class-validator";

import { UserRole } from "../../generated/prisma/enums.js";

const STAFF_ROLES = [UserRole.MANAGER, UserRole.FIELD_AGENT] as const;

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(12)
  @ValidateBy({
    name: "isWithinBcryptByteLimit",
    validator: {
      validate: (value): boolean =>
        typeof value === "string" && Buffer.byteLength(value, "utf8") <= 72,
      defaultMessage: () => "password must not exceed 72 UTF-8 bytes"
    }
  })
  password!: string;

  @IsIn(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];
}
