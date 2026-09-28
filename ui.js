// ui.js：操作面板与视图（原生 DOM，无弹窗）
import { render } from "./app.js";

export function mount(spec, parts) {
  parts.log.textContent = "事件 " + (spec.events || []).length + " 条，本轮处理预算 "
    + (spec.budget || 0) + " 条，容量下限 " + (spec.minCap || 0) + "、上限 "
    + (spec.maxCap || 0) + "。";

  function draw() {
    let view = null;
    try {
      view = render(spec);
    } catch (error) {
      parts.out.textContent = String(error && error.code ? error.code : error);
      parts.log.textContent = "跑不动：" + String(error && error.message ? error.message : error);
      return;
    }
    parts.out.textContent = JSON.stringify(view, null, 1);
    parts.stage.textContent = "";
    const head = document.createElement("div");
    head.className = "row";
    const headText = document.createElement("span");
    headText.textContent = "容量 " + view.cap + " 格，冷却还剩 " + view.cooldown
      + " 轮，拦下过 " + view.blocked + " 次";
    head.appendChild(headText);
    parts.stage.appendChild(head);
    for (let spot = 0; spot < view.cap; spot += 1) {
      const line = document.createElement("div");
      line.className = "row";
      const text = document.createElement("span");
      text.textContent = "槽 " + (spot + 1) + "：" + (view.running[spot] || "空着");
      line.appendChild(text);
      const chip = document.createElement("span");
      chip.className = view.running[spot] ? "chip ok" : "chip";
      chip.textContent = view.running[spot] ? "在跑" : "闲置";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    }
    (view.queue || []).forEach(function (name) {
      const line = document.createElement("div");
      line.className = "row ghost";
      const text = document.createElement("span");
      text.textContent = "等待队列 " + name;
      line.appendChild(text);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "排着";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    (view.scales || []).forEach(function (row) {
      const line = document.createElement("div");
      line.className = "row";
      const text = document.createElement("span");
      text.textContent = "调整 " + row[0] + " 到 " + row[1] + " 格";
      line.appendChild(text);
      parts.stage.appendChild(line);
    });
    (view.ledger || []).forEach(function (row) {
      const line = document.createElement("div");
      line.className = "row";
      const text = document.createElement("span");
      text.textContent = "事件 " + row[1] + " 压在账上";
      line.appendChild(text);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "等收尾";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    parts.legend.textContent = "首轮处理 " + view.served_first + " 条，二档 "
      + view.served_wide + " 条，收尾前账 " + view.ledger_before + " 条，收尾补齐 "
      + view.catchup + " 条，收尾后账 " + view.ledger_after + " 条";
    parts.log.textContent = "工作计数 " + view.judged + " / 上界 " + view.judged_bound
      + "，重放新处理 " + view.replay_new + "，与全量对照差异 " + view.full_diff
      + "，完成 " + (view.done || []).length + " 个任务";
  }

  const capInput = document.createElement("input");
  capInput.type = "number";
  capInput.value = String((spec.state || {}).cap || 1);
  parts.controls.appendChild(capInput);

  const runButton = document.createElement("button");
  runButton.className = "primary";
  runButton.textContent = "跑一遍";
  runButton.addEventListener("click", draw);
  parts.controls.appendChild(runButton);

  const capButton = document.createElement("button");
  capButton.textContent = "把初始容量换成输入框的值";
  capButton.addEventListener("click", function () {
    const next = Number(capInput.value);
    if (Number.isFinite(next) && next >= 1) {
      spec.state = Object.assign({}, spec.state, { cap: Math.round(next) });
      draw();
    }
  });
  parts.controls.appendChild(capButton);

  const dropButton = document.createElement("button");
  dropButton.textContent = "删最后一条事件";
  dropButton.addEventListener("click", function () {
    spec.events = (spec.events || []).slice(0, Math.max(0, (spec.events || []).length - 1));
    draw();
  });
  parts.controls.appendChild(dropButton);

  draw();
}
