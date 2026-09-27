// app.js：渲染结果
import { canSend, splitAck } from "./winack.js";
import { step, close } from "./ackrun.js";

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
      next: state.next, inflight: state.inflight, acked: state.acked.slice().sort(),
      pending: state.pending, applied: state.applied.length
    });
  };
  return { acked: closed.state.acked.slice().sort(), inflight: closed.state.inflight.slice(),
           next: closed.state.next, retransmitted: closed.state.retransmitted.slice(),
           rt_first: first.retransmitted, rt_wide: wide.retransmitted,
           pair_differs: first.retransmitted !== wide.retransmitted,
           pending_before: first.pending_before, pending: first.pending,
           catchup: closed.catchup, pending_after: closed.state.pending.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.retransmitted, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: (canSend([], 1) ? 1 : 0) + splitAck([], 0)[0].length };
}
