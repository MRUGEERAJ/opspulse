import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OPSPULSE_APP,
  type HealthResponse
} from "@opspulse/shared";

import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {}

  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: this.configService.getOrThrow<string>("SERVICE_NAME"),
      sharedPackage: OPSPULSE_APP.sharedPackage,
      environment: this.configService.getOrThrow<string>("NODE_ENV"),
      timestamp: new Date().toISOString()
    };
  }

  async getReadiness() {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: "ready",
        database: "up",
        timestamp: new Date().toISOString()
      };
    } catch {
      throw new ServiceUnavailableException("Database is unavailable");
    }
  }
}
