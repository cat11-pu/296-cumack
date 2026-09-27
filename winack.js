// winack.js：窗口判定与累计确认拆分
export function canSend(inflight, window) {
  return inflight.length < window;
}

export function splitAck(inflight, upto) {
  const acked = [];
  const rest = [];
  for (const seq of inflight) {
    if (seq <= upto) acked.push(seq);
    else rest.push(seq);
  }
  return [acked, rest];
}
