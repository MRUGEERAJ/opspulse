import assert from "node:assert/strict";
import test from "node:test";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CompleteWorkOrderDto } from "./dto/complete-work-order.dto.js";

test("CompleteWorkOrderDto trims valid notes", async () => {
  const dto = plainToInstance(CompleteWorkOrderDto, {
    notes: "  Completed generator inspection.  ",
    clientActionId: "  complete-offline-001  "
  });

  const errors = await validate(dto);

  assert.equal(errors.length, 0);
  assert.equal(dto.notes, "Completed generator inspection.");
  assert.equal(dto.clientActionId, "complete-offline-001");
});

test("CompleteWorkOrderDto rejects invalid completion notes at runtime", async () => {
  const invalidNotes = ["", "a", "   ", "x".repeat(501)];

  for (const notes of invalidNotes) {
    const dto = plainToInstance(CompleteWorkOrderDto, { notes });
    const errors = await validate(dto);

    assert.ok(
      errors.some((error) => error.property === "notes"),
      `Expected notes validation error for ${JSON.stringify(notes)}`
    );
  }
});

test("CompleteWorkOrderDto accepts missing clientActionId", async () => {
  const dto = plainToInstance(CompleteWorkOrderDto, {
    notes: "Completed generator inspection."
  });

  const errors = await validate(dto);

  assert.equal(errors.length, 0);
});

test("CompleteWorkOrderDto rejects invalid clientActionId", async () => {
  const invalidClientActionIds = ["short", "x".repeat(121)];

  for (const clientActionId of invalidClientActionIds) {
    const dto = plainToInstance(CompleteWorkOrderDto, {
      notes: "Completed generator inspection.",
      clientActionId
    });
    const errors = await validate(dto);

    assert.ok(
      errors.some((error) => error.property === "clientActionId"),
      `Expected clientActionId validation error for ${JSON.stringify(
        clientActionId
      )}`
    );
  }
});
