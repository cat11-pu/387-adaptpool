// adaptrun.js：按处理预算处理并留账
import { wantGrow, wantShrink, fill } from "./adapt.js";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const source = state || {};
  return {
    cap: source.cap || 0,
    running: (source.running || []).slice(),
    queue: (source.queue || []).slice(),
    done: (source.done || []).slice(),
    scales: (source.scales || []).map(function (row) { return row.slice(); }),
    top: source.top || 0,
    blocked: source.blocked || 0,
    cooldown: source.cooldown || 0,
    ledger: (source.ledger || []).map(function (row) { return row.slice(); }),
    applied: (source.applied || []).slice()
  };
}

function normalize(event, spec) {
  if (!event || typeof event !== "object"
      || (event.kind !== "add" && event.kind !== "finish" && event.kind !== "tick")) {
    fail(spec.event_error_code || "E_BAD_EVENT");
  }
  if (event.kind === "tick") {
    return { kind: "tick" };
  }
  if (typeof event.name !== "string" || event.name.length === 0) {
    fail(spec.bad_name_code || "E_BAD_NAME");
  }
  return { kind: event.kind, name: event.name };
}

function applyEvent(state, event, spec) {
  if (event.kind === "add") {
    if (state.running.indexOf(event.name) !== -1
        || state.queue.indexOf(event.name) !== -1
        || state.done.indexOf(event.name) !== -1) {
      fail(spec.dup_code || "E_DUP_NAME");
    }
    if (state.running.length < state.cap) {
      state.running.push(event.name);
    } else {
      state.queue.push(event.name);
    }
    return;
  }
  if (event.kind === "finish") {
    const at = state.running.indexOf(event.name);
    if (at === -1) {
      fail(spec.norun_code || "E_NO_RUNNING");
    }
    state.running.splice(at, 1);
    state.done.push(event.name);
    if (state.queue.length > 0 && state.running.length < state.cap) {
      state.running.push(state.queue.shift());
    }
    return;
  }
  state.cooldown = Math.max(0, state.cooldown - 1);
  const growWish = state.queue.length > 0 && state.running.length === state.cap;
  const shrinkWish = state.queue.length === 0 && state.running.length < state.cap;
  if (wantGrow(state.cap, state.running.length, state.queue.length, spec.maxCap, state.cooldown)) {
    state.cap += 1;
    state.scales.push(["扩", state.cap]);
    state.cooldown = 2;
  } else if (wantShrink(state.cap, state.running.length, state.queue.length, spec.minCap, state.cooldown)) {
    state.cap -= 1;
    state.scales.push(["缩", state.cap]);
    state.cooldown = 2;
  } else if (growWish || shrinkWish) {
    if (state.cooldown > 0) {
      state.blocked += 1;
    } else {
      state.top += 1;
    }
  }
  const filled = fill(state.running, state.queue, state.cap);
  state.running = filled.running;
  state.queue = filled.queue;
}

function applyLedgerItem(state, item, spec) {
  applyEvent(state, normalize({ kind: item[0], name: item[1] }, spec), spec);
}

export function step(spec) {
  const state = cloneState(spec.state);
  const budget = Math.max(0, spec.budget || 0);
  let served = 0;
  while (state.ledger.length > 0 && served < budget) {
    applyLedgerItem(state, state.ledger.shift(), spec);
    served += 1;
  }
  (spec.events || []).forEach(function (event) {
    const id = event && event.id;
    if (id !== undefined && id !== null && state.applied.indexOf(id) !== -1) {
      return;
    }
    if (served < budget) {
      applyEvent(state, normalize(event, spec), spec);
      served += 1;
    } else if (event && event.kind === "tick") {
      state.ledger.push(["tick"]);
    } else {
      state.ledger.push([event && event.kind, event && event.name]);
    }
    if (id !== undefined && id !== null) {
      state.applied.push(id);
    }
  });
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    judged: served,
    judged_bound: budget
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    applyLedgerItem(state, state.ledger.shift(), spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
