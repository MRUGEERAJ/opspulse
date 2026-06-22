import assert from "node:assert/strict";
import test from "node:test";

import type { ConfigService } from "@nestjs/config";

import { PasswordService } from "./password.service.js";

test("PasswordService hashes and verifies passwords without storing plaintext", async () => {
  const configService = {
    getOrThrow: () => 4
  } as unknown as ConfigService;
  const service = new PasswordService(configService);
  const password = "OpsPulseTest123!";

  const passwordHash = await service.hash(password);

  assert.notEqual(passwordHash, password);
  assert.equal(await service.verify(password, passwordHash), true);
  assert.equal(await service.verify("WrongPassword123!", passwordHash), false);
});
