import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OPSPULSE_APP } from "@opspulse/shared";

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      status: "ok",
      service: this.configService.getOrThrow<string>("SERVICE_NAME"),
      sharedPackage: OPSPULSE_APP.sharedPackage,
      environment: this.configService.getOrThrow<string>("NODE_ENV"),
      timestamp: new Date().toISOString()
    };
  }
}
