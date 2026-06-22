import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compare, hash } from "bcryptjs";

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService) {}

  hash(password: string): Promise<string> {
    const rounds = this.configService.getOrThrow<number>(
      "PASSWORD_HASH_ROUNDS"
    );

    return hash(password, rounds);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
