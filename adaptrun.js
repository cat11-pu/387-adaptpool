// adaptrun.js：按处理预算处理并留账
import { wantGrow, wantShrink, fill } from "./adapt.js";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    badEvent: spec.event_error_code || "E_BAD_EVENT",
    badName: spec.bad_name_code || "E_BAD_NAME",
    dup: spec.dup_code || "E_DUP_NAME",
    noRun: spec.norun_code || "E_NO_RUNNING"
  };
}

function cloneState(state) {
  return {
    cap: state.cap,
    running: state.running.slice(),
    queue: state.queue.slice(),
    done: state.done.slice(),
    scales: state.scales.map(function (row) { return row.slice(); }),
    top: state.top,
    blocked: state.blocked,
    cooldown: state.cooldown,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    applied: state.applied.slice()
  };
}

function validateEvent(event, spec) {
  const code = codes(spec);
  if (!event || typeof event !== "object" || typeof event.kind !== "string") {
    fail(code.badEvent);
  }
  if (event.kind === "tick") {
    return;
  }
  if (event.kind === "add" || event.kind === "finish") {
    if (!("name" in event)) {
      fail(code.badEvent);
    }
    if (typeof event.name !== "string" || event.name.length === 0) {
      fail(code.badName);
    }
    return;
  }
  fail(code.badEvent);
}

function applyFill(state) {
  const next = fill(state.running, state.queue, state.cap);
  state.running = next.running;
  state.queue = next.queue;
}

function applyAdd(state, name, spec) {
  const code = codes(spec);
  if (state.running.indexOf(name) !== -1 || state.queue.indexOf(name) !== -1
      || state.done.indexOf(name) !== -1) {
    fail(code.dup);
  }
  if (state.running.length < state.cap) {
    state.running.push(name);
  } else {
    state.queue.push(name);
  }
}

function applyFinish(state, name, spec) {
  const code = codes(spec);
  const spot = state.running.indexOf(name);
  if (spot === -1) {
    fail(code.noRun);
  }
  state.running.splice(spot, 1);
  state.done.push(name);
  applyFill(state);
}

function applyTick(state, spec) {
  state.cooldown = Math.max(0, state.cooldown - 1);
  const growWish = state.queue.length > 0 && state.running.length >= state.cap;
  const shrinkWish = state.queue.length === 0 && state.running.length < state.cap;
  if ((growWish || shrinkWish) && state.cooldown > 0) {
    state.blocked += 1;
  } else if (growWish) {
    if (wantGrow(state.cap, state.running.length, state.queue.length, spec.maxCap, state.cooldown)) {
      state.cap += 1;
      state.scales.push(["扩", state.cap]);
      state.cooldown = 2;
    } else {
      state.top += 1;
    }
  } else if (shrinkWish) {
    if (wantShrink(state.cap, state.running.length, state.queue.length, spec.minCap, state.cooldown)) {
      state.cap -= 1;
      state.scales.push(["缩", state.cap]);
      state.cooldown = 2;
    } else {
      state.top += 1;
    }
  }
  applyFill(state);
}

function applyEntry(state, entry, spec) {
  const kind = entry[0];
  if (kind === "add") {
    applyAdd(state, entry[1], spec);
  } else if (kind === "finish") {
    applyFinish(state, entry[1], spec);
  } else {
    applyTick(state, spec);
  }
}

function entryOf(event) {
  return event.kind === "tick" ? ["tick"] : [event.kind, event.name];
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = spec.events || [];
  let remaining = spec.budget || 0;
  let served = 0;
  let judged = 0;
  const judged_bound = events.length + state.ledger.length;
  const backlog = state.ledger;
  state.ledger = [];
  for (const entry of backlog) {
    judged += 1;
    if (remaining <= 0) {
      state.ledger.push(entry);
      continue;
    }
    applyEntry(state, entry, spec);
    remaining -= 1;
    served += 1;
  }
  for (const event of events) {
    judged += 1;
    if (event && typeof event === "object" && event.id !== undefined
        && state.applied.indexOf(event.id) !== -1) {
      continue;
    }
    validateEvent(event, spec);
    if (remaining <= 0) {
      state.ledger.push(entryOf(event));
      if (event.id !== undefined) {
        state.applied.push(event.id);
      }
      continue;
    }
    applyEntry(state, entryOf(event), spec);
    if (event.id !== undefined) {
      state.applied.push(event.id);
    }
    remaining -= 1;
    served += 1;
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    judged: judged,
    judged_bound: judged_bound
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  const backlog = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const entry of backlog) {
    applyEntry(state, entry, spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
