// app.js：渲染结果
import { wantGrow, wantShrink, fill } from "./adapt.js";
import { step, close } from "./adaptrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      cap: state.cap, running: state.running, queue: state.queue, done: state.done,
      scales: state.scales, blocked: state.blocked, top: state.top, cooldown: state.cooldown,
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { cap: closed.state.cap,
           running: closed.state.running.slice(),
           queue: closed.state.queue.slice(),
           done: closed.state.done.slice(),
           scales: closed.state.scales.map(function (row) { return [row[0], row[1]]; }),
           blocked: closed.state.blocked, top: closed.state.top, cooldown: closed.state.cooldown,
           served_first: first.served, served_wide: wide.served,
           pair_differs: first.served !== wide.served,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.served, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count_events: events.length,
           tail: (wantGrow(2, 2, 1, 4, 0) ? 1 : 0) + (wantShrink(2, 1, 0, 1, 0) ? 1 : 0)
             + fill([], ["X"], 2).running.length };
}
