import { canSend, splitAck } from "./winack.js";

function makeError(code, message) {
  return Object.assign(new Error(message), { code });
}

function errorCodes(spec) {
  return {
    windowFull: spec.full_error_code || "E_WINDOW_FULL",
    unknownAck: spec.ack_error_code || "E_UNKNOWN_ACK",
    badEvent: spec.event_error_code || "E_BAD_EVENT"
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
    applied: state.applied.slice()
  };
}

export function step(spec) {
  const codes = errorCodes(spec);
  const events = spec.events || [];
  const state = cloneState(spec.state);
  let budgetLeft = spec.budget;
  let retransmitCount = 0;
  let judged = 0;

  const markAcked = function (upto) {
    const pair = splitAck(state.inflight, upto);
    pair[0].forEach(function (seq) {
      if (!state.acked.includes(seq)) state.acked.push(seq);
    });
    state.inflight = pair[1];
    for (let i = state.pending.length - 1; i >= 0; i -= 1) {
      if (state.pending[i] <= upto) {
        const seq = state.pending.splice(i, 1)[0];
        if (!state.acked.includes(seq)) state.acked.push(seq);
      }
    }
    state.retransmitted.forEach(function (seq) {
      if (seq <= upto && !state.acked.includes(seq)) state.acked.push(seq);
    });
  };

  const retransmitWithinBudget = function () {
    while (budgetLeft > 0 && state.pending.length > 0) {
      const seq = state.pending.shift();
      state.retransmitted.push(seq);
      state.inflight.push(seq);
      budgetLeft -= 1;
      retransmitCount += 1;
    }
  };

  for (const event of events) {
    judged += 1;
    if (!event || typeof event !== "object" || typeof event.kind !== "string") {
      throw makeError(codes.badEvent, "非法事件");
    }
    if (event.id !== undefined && state.applied.includes(event.id)) {
      continue;
    }
    if (event.kind === "send") {
      if (!canSend(state.inflight, spec.window)) {
        throw makeError(codes.windowFull, "发送窗口已满");
      }
      state.inflight.push(state.next);
      state.next += 1;
    } else if (event.kind === "ack") {
      if (typeof event.upto !== "number") {
        throw makeError(codes.badEvent, "ack 缺少 upto");
      }
      if (event.upto > state.next - 1) {
        throw makeError(codes.unknownAck, "确认了尚未发出的序号");
      }
      markAcked(event.upto);
    } else if (event.kind === "timeout") {
      state.pending.push(...state.inflight);
      state.inflight = [];
      retransmitWithinBudget();
    } else {
      throw makeError(codes.badEvent, "未知事件类型 " + event.kind);
    }
    if (event.id !== undefined) state.applied.push(event.id);
  }

  return {
    state: state,
    retransmitted: retransmitCount,
    pending_before: state.pending.length,
    pending: state.pending.slice(),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.pending.length > 0) {
    const seq = state.pending.shift();
    state.retransmitted.push(seq);
    state.inflight.push(seq);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
