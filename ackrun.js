// ackrun.js：按重传预算重传并留账（基线：一律给空表）
import { canSend, splitAck } from "./winack.js";

export function step(spec) {
  return { state: spec.state, retransmitted: 0, pending_before: 0, pending: [], judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
