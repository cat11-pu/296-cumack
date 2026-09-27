export function canSend(inflight, window) {
  return inflight.length < window;
}

export function splitAck(inflight, upto) {
  const ackedPart = [];
  const stillInflight = [];
  for (const seq of inflight) {
    (seq <= upto ? ackedPart : stillInflight).push(seq);
  }
  return [ackedPart, stillInflight];
}
