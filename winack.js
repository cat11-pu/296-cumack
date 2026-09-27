// winack.js：窗口判定与累计确认（基线：一律说能发、一律原样返回）
export function canSend(inflight, window) {
  return true;
}

export function splitAck(inflight, upto) {
  return [[], inflight];
}
