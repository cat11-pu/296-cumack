// ui.js：操作面板与视图（原生 DOM，无弹窗）
import { render } from "./app.js";

export function mount(spec, parts) {
  parts.log.textContent = "事件 " + (spec.events || []).length + " 条，窗口 " + (spec.window || 0) + "，本轮重传预算 " + (spec.budget || 0) + " 个序号。";

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
    (view.acked || []).forEach(function (number) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "序号 " + number + " 已确认";
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip ok";
      chip.textContent = "收到回执";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    (view.inflight || []).forEach(function (number) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "序号 " + number + " 在途";
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "未确认";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    const line = document.createElement("div");
    line.className = "row";
    const head = document.createElement("span");
    head.textContent = "下一个待发送序号 " + view.next;
    line.appendChild(head);
    const chip = document.createElement("span");
    chip.className = "chip ok";
    chip.textContent = "还没发过";
    line.appendChild(chip);
    parts.stage.appendChild(line);
    (view.pending || []).forEach(function (number) {
      const item = document.createElement("div");
      item.className = "row";
      const head = document.createElement("span");
      head.textContent = "序号 " + number + " 待重传";
      item.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "压在账上";
      item.appendChild(chip);
      parts.stage.appendChild(item);
    });
    parts.legend.textContent = "重传序列 " + JSON.stringify(view.retransmitted) + "，首轮重传 "
      + view.rt_first + " 个，二档 " + view.rt_wide + " 个，收尾前账 "
      + view.pending_before + " 个，收尾补齐 " + view.catchup + " 个，收尾后账 " + view.pending_after + " 个";
    parts.log.textContent = "工作计数 " + view.judged + " / 上界 " + view.judged_bound
      + "，重放新重传 " + view.replay_new + "，与全量对照差异 " + view.full_diff;
  }

  const budgetInput = document.createElement("input");
  budgetInput.type = "number";
  budgetInput.value = "1";
  parts.controls.appendChild(budgetInput);

  const runButton = document.createElement("button");
  runButton.className = "primary";
  runButton.textContent = "跑一遍";
  runButton.addEventListener("click", draw);
  parts.controls.appendChild(runButton);

  const budgetButton = document.createElement("button");
  budgetButton.textContent = "把重传预算换成输入框的值";
  budgetButton.addEventListener("click", function () {
    const next = Number(budgetInput.value);
    spec.budget = Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1;
    draw();
  });
  parts.controls.appendChild(budgetButton);

  const dropButton = document.createElement("button");
  dropButton.textContent = "删最后一条事件";
  dropButton.addEventListener("click", function () {
    spec.events = (spec.events || []).slice(0, Math.max(0, (spec.events || []).length - 1));
    draw();
  });
  parts.controls.appendChild(dropButton);

  draw();
}
