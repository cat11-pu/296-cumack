import assert from "node:assert";
import { canSend, splitAck } from "../winack.js";
import { step, close } from "../ackrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, window: 3,
  state: { next: 1, inflight: [], acked: [], retransmitted: [], pending: [], ledger: [], applied: [] },
  events: [],
  full_error_code: "E_WINDOW_FULL", ack_error_code: "E_UNKNOWN_ACK",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("canSend returns a flag", () => {
  assert.strictEqual(typeof canSend([], 3), "boolean");
});

check("splitAck returns a pair", () => {
  assert.ok(Array.isArray(splitAck([], 0)));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
