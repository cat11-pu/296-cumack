// ackrun.js：按重传预算重传并留账
import { canSend, splitAck } from "./winack.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    full: spec.full_error_code || "E_WINDOW_FULL",
    ack: spec.ack_error_code || "E_UNKNOWN_ACK",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function cloneState(state) {
  return {
    next: state.next,
    inflight: state.inflight.slice(),
    acked: state.acked.slice(),
    retransmitted: state.retransmitted.slice(),
    pending: state.pending.slice(),
    ledger: (state.ledger || []).slice(),
    applied: (state.applied || []).slice()
  };
}

function checkEvent(event, code) {
  if (!event || typeof event !== "object") fail(code, "bad event");
  if (typeof event.id !== "number") fail(code, "bad event id");
  if (event.kind === "send" || event.kind === "timeout") return;
  if (event.kind === "ack" && typeof event.upto === "number" && Number.isFinite(event.upto)) return;
  fail(code, "bad event kind");
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = spec.events || [];
  const err = codes(spec);
  const applied = new Set(state.applied);
  let budgetLeft = spec.budget || 0;
  let retransmitted = 0;
  let judged = 0;
  for (const event of events) {
    checkEvent(event, err.event);
    if (applied.has(event.id)) continue;
    judged += 1;
    if (event.kind === "send") {
      if (!canSend(state.inflight, spec.window)) fail(err.full, "window full");
      state.inflight.push(state.next);
      state.next += 1;
    } else if (event.kind === "ack") {
      if (event.upto > state.next - 1) fail(err.ack, "unknown ack");
      const pair = splitAck(state.inflight, event.upto);
      state.acked.push.apply(state.acked, pair[0]);
      state.inflight = pair[1];
      state.pending = state.pending.filter(function (seq) { return seq > event.upto; });
    } else {
      for (const seq of state.inflight) {
        if (state.pending.indexOf(seq) === -1) state.pending.push(seq);
      }
      while (budgetLeft > 0 && state.pending.length > 0) {
        const seq = state.pending.shift();
        state.retransmitted.push(seq);
        state.ledger.push(seq);
        budgetLeft -= 1;
        retransmitted += 1;
      }
    }
    applied.add(event.id);
    state.applied.push(event.id);
  }
  return {
    state: state,
    retransmitted: retransmitted,
    pending_before: state.pending.length,
    pending: state.pending.slice(),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  const catchup = state.pending.length;
  for (const seq of state.pending) {
    state.retransmitted.push(seq);
    state.ledger.push(seq);
  }
  state.pending = [];
  return { state: state, catchup: catchup };
}
