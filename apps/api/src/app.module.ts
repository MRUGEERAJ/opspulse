import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module.js";
import { validateEnv } from "./config/env.validation.js";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { UsersModule } from "./users/users.module.js";
import { WorkOrdersModule } from "./work-orders/work-orders.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "apps/api/.env"],
      isGlobal: true,
      validate: validateEnv
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    WorkOrdersModule
  ]
})
export class AppModule {}
