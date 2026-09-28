import assert from "node:assert";
import { wantGrow, wantShrink, fill } from "../adapt.js";
import { step, close } from "../adaptrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, minCap: 1, maxCap: 4,
  state: { cap: 2, running: [], queue: [], done: [], scales: [], top: 0, blocked: 0,
           cooldown: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "add", name: "A" }],
  bad_name_code: "E_BAD_NAME", dup_code: "E_DUP_NAME",
  norun_code: "E_NO_RUNNING", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("wantGrow returns a boolean", () => {
  assert.strictEqual(typeof wantGrow(2, 2, 1, 4, 0), "boolean");
});

check("wantShrink returns a boolean", () => {
  assert.strictEqual(typeof wantShrink(2, 1, 0, 1, 0), "boolean");
});

check("fill returns a pair", () => {
  assert.ok(Array.isArray(fill([], ["X"], 2).running));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
