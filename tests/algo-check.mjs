// Выгружает задания тренажёра в JSON и проверяет шаги анимаций.
import { algos } from '../site/js/algo/catalog.js';
import { pyBasics } from '../site/js/algo/pybasics.js';
import { inline } from '../site/js/dom.js';
import fs from 'node:fs';

let problems = 0;
const bad = (where, msg) => { problems++; console.log(`✗ ${where}: ${msg}`); };
const out = [];
for (const algo of algos) {
  const marks = algo.code.marks;
  const lineCount = algo.code.text.split('\n').length;
  // шаги на исходных данных и на 40 случайных наборах
  const inputs = [algo.viz.initial, ...Array.from({ length: 40 }, () => algo.viz.sample())];
  let maxSteps = 0;
  for (const input of inputs) {
    let steps;
    try { steps = algo.viz.steps(structuredClone(input), marks); } catch (e) { bad(algo.id, `шаги упали на ${JSON.stringify(input)}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
    maxSteps = Math.max(maxSteps, steps.length);
    if (steps.length < 2) bad(algo.id, 'слишком мало шагов');
    steps.forEach((step, i) => {
      if (!Number.isInteger(step.line) || step.line < 1 || step.line > lineCount) bad(algo.id, `шаг ${i}: нет строки кода (${step.line}) для ${JSON.stringify(input)}`);
      if (!step.note || /undefined|NaN/.test(step.note)) bad(algo.id, `шаг ${i}: плохая подпись «${step.note}»`);
      inline(step.note);
      if (step.arr && step.ids && new Set(step.ids).size !== step.arr.length) bad(algo.id, `шаг ${i}: повтор номеров столбиков`);
    });
  }
  for (const used of new Set((algo.viz.steps.toString().match(/L\.(\w+)/g) || []).map((m) => m.slice(2)))) {
    if (!(used in marks)) bad(algo.id, `в коде нет метки строки «${used}»`);
  }
  for (const text of [algo.blurb, algo.cost, ...algo.uses, ...algo.theory.flatMap((b) => (b.items ? b.items : [b.text]))]) {
    if ((text.match(/\$/g) || []).length % 2) bad(algo.id, `нечётное число $: ${text}`);
    inline(text);
  }
  algo.tasks.forEach((task, i) => {
    inline(task.text);
    task.hints.forEach((hnt) => inline(hnt));
    out.push({ id: `${algo.id}#${i + 1}`, fn: task.fn, starter: task.starter, solution: task.solution, tests: task.tests });
  });
  console.log(`${algo.id.padEnd(16)} строк кода ${String(lineCount).padStart(2)}, шагов до ${String(maxSteps).padStart(3)}, заданий ${algo.tasks.length}`);
}
fs.writeFileSync(new URL('./algo-tasks.json', import.meta.url), JSON.stringify({ tasks: out, reference: algos.map((a) => ({ id: a.id, code: a.code.text })), basics: pyBasics.map((b) => b.code) }, null, 1));
console.log(`алгоритмов: ${algos.length}, заданий: ${out.length}, проблем: ${problems}`);
process.exit(problems ? 1 : 0);
