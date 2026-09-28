// adapt.js：伸缩判定与补齐
export function wantGrow(cap, running, queued, maxCap, cooldown) {
  return cooldown === 0 && queued > 0 && running === cap && cap < maxCap;
}

export function wantShrink(cap, running, queued, minCap, cooldown) {
  return cooldown === 0 && queued === 0 && running < cap && cap > minCap;
}

export function fill(running, queue, cap) {
  const nextRunning = running.slice();
  const nextQueue = queue.slice();
  while (nextRunning.length < cap && nextQueue.length > 0) {
    nextRunning.push(nextQueue.shift());
  }
  return { running: nextRunning, queue: nextQueue };
}
