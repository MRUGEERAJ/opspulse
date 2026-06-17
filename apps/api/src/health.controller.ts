import { Controller, Get } from "@nestjs/common";
import { OPSPULSE_APP } from "@opspulse/shared";

@Controller()
export class HealthController {
  @Get("health")
  getHealth() {
    return {
      status: "ok",
      service: `${OPSPULSE_APP.name} API`,
      sharedPackage: OPSPULSE_APP.sharedPackage,
      timestamp: new Date().toISOString()
    };
  }
}
