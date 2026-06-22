import "reflect-metadata";

import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";

const app = await NestFactory.create(AppModule);
const configService = app.get(ConfigService);
const port = configService.getOrThrow<number>("PORT");
const host = configService.getOrThrow<string>("HOST");
const apiPrefix = configService.getOrThrow<string>("API_PREFIX");
const corsOrigins = configService.getOrThrow<string[]>("CORS_ORIGINS");

app.enableCors({
  origin: corsOrigins
});

app.setGlobalPrefix(apiPrefix, {
  exclude: [
    { path: "health", method: RequestMethod.GET },
    { path: "health/ready", method: RequestMethod.GET }
  ]
});

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true
  })
);

app.useGlobalFilters(new HttpExceptionFilter());
app.enableShutdownHooks();

await app.listen(port, host);

console.log(`OpsPulse API listening on http://${host}:${port}`);
console.log(`Health check available at http://${host}:${port}/health`);
console.log(`Readiness check available at http://${host}:${port}/health/ready`);
