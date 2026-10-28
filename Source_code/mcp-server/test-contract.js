import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MEDSCHED_API_PATHS } from "./api-contract.js";

test("MCP routes match Spring controllers", () => {
  assert.equal(MEDSCHED_API_PATHS.doctors, "/doctors");
  assert.equal(MEDSCHED_API_PATHS.appointmentByCode("MED 123"), "/appointments/booking-code/MED%20123");
  assert.equal(MEDSCHED_API_PATHS.receptionCheckinQr, "/reception/checkin/qr");
  assert.equal(MEDSCHED_API_PATHS.statisticsOverview, "/statistics/overview");
  assert.equal(MEDSCHED_API_PATHS.simulatePaymentWebhook, "/payments/webhook/simulate");
});

test("MCP server never reports mocked operational success", async () => {
  const source = await readFile(new URL("./server.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fallbackDoctors|Mô phỏng MCP Agent|MEDSCHED_DIRECTORY|A-APP-1668/);
  assert.match(source, /throw new Error\(`MedSched API/);
});
