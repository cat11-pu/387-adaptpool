// adapt.js：伸缩判定与补齐（基线：一律说不该动、不补位）
export function wantGrow(cap, running, queued, maxCap, cooldown) {
  return false;
}

export function wantShrink(cap, running, queued, minCap, cooldown) {
  return false;
}

export function fill(running, queue, cap) {
  return { running: running.slice(), queue: queue.slice() };
}
