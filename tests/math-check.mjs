// Прогоняет все генераторы задач и всю разметку уроков.
import { sections, lessons } from '../site/js/math/course.js';
import { check, answerText, fmt } from '../site/js/math/tasks.js';
import { inline, tex } from '../site/js/dom.js';

let problems = 0;
const bad = (where, msg) => { problems++; if (problems < 60) console.log(`✗ ${where}: ${msg}`); };
const strip = (html) => html.replace(/<[^>]+>/g, '');

function checkMarkup(where, text) {
  if (typeof text !== 'string') return bad(where, `не строка: ${text}`);
  if ((text.match(/\$/g) || []).length % 2) bad(where, `нечётное число $: ${text}`);
  if (/undefined|NaN|Infinity|\[object/.test(text)) bad(where, `мусор в тексте: ${text}`);
  // вне формул не должно быть точек в числах и «сырых» минусов перед цифрой
  const outside = text.replace(/\$[^$]+\$/g, ' ').replace(/`[^`]+`/g, ' ');
  if (/\d\.\d/.test(outside)) bad(where, `десятичная точка вне формулы: ${text}`);
  if (/(^|[\s(])-\d/.test(outside)) bad(where, `минус-дефис вне формулы: ${text}`);
  for (const m of text.matchAll(/\$([^$]+)\$/g)) {
    const out = strip(tex(m[1]));
    if (/[{}^_]/.test(out)) bad(where, `не разобрана формула «${m[1]}» → ${out}`);
  }
  inline(text);
}

const canonical = (task) => {
  if (task.type === 'choice') return task.a;
  if (task.type === 'num') return fmt(task.a);
  if (task.type === 'frac') return `${task.a[0]}/${task.a[1]}`;
  if (task.type === 'set') return task.a.join(' ');
};

let count = 0;
const ids = new Set();
for (const lesson of lessons) {
  if (ids.has(lesson.id)) bad(lesson.id, 'повтор id');
  ids.add(lesson.id);
  if (!/^[a-z0-9-]+$/.test(lesson.id)) bad(lesson.id, 'плохой id');
  checkMarkup(lesson.id + ' blurb', lesson.blurb);
  let widgets = 0, examples = 0;
  for (const b of lesson.body) {
    if (b.t === 'w') widgets++;
    if (b.t === 'ex') { examples++; checkMarkup(lesson.id + ' ex', b.q); b.steps.forEach((s) => checkMarkup(lesson.id + ' ex', s)); checkMarkup(lesson.id + ' ex', b.a); }
    else if (b.t === 'list') b.items.forEach((s) => checkMarkup(lesson.id + ' list', s));
    else if (b.t === 'w') { if (b.caption) checkMarkup(lesson.id + ' caption', b.caption); }
    else checkMarkup(lesson.id + ' ' + b.t, b.text);
  }
  if (!widgets) console.log(`· ${lesson.id}: без интерактивной картинки`);
  if (examples < 1) console.log(`· ${lesson.id}: без примеров`);
  if (lesson.tasks.length < 6) bad(lesson.id, `мало задач: ${lesson.tasks.length}`);
  lesson.tasks.forEach((gen, gi) => {
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
      const where = `${lesson.id} #${gi + 1}`;
      let task;
      try { task = gen(); } catch (e) { bad(where, 'исключение ' + e.message); break; }
      count++;
      checkMarkup(where + ' q', task.q);
      checkMarkup(where + ' why', task.why);
      seen.add(task.q);
      if (task.type === 'num') {
        if (!Number.isFinite(task.a)) bad(where, `ответ не число: ${task.a} | ${task.q}`);
        else if (Math.abs(task.a - Number(task.a.toFixed(4))) > 1e-9) bad(where, `длинная дробь в ответе: ${task.a} | ${task.q}`);
      } else if (task.type === 'frac') {
        const [n, d] = task.a;
        if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0) bad(where, `плохая дробь ${n}/${d} | ${task.q}`);
      } else if (task.type === 'choice') {
        if (task.options.length < 2) bad(where, 'меньше двух вариантов');
        if (new Set(task.options).size !== task.options.length) bad(where, `повтор вариантов: ${task.options.join(' | ')}`);
        if (task.a < 0 || task.a >= task.options.length) bad(where, 'нет верного варианта');
        task.options.forEach((o) => checkMarkup(where + ' opt', String(o)));
      } else if (task.type === 'set') {
        if (!task.a.every(Number.isFinite)) bad(where, 'плохой набор');
        if (new Set(task.a).size !== task.a.length) bad(where, `повтор в наборе ${task.a} | ${task.q}`);
      } else bad(where, 'неизвестный тип');
      const res = check(task, canonical(task));
      if (!res.ok) bad(where, `эталонный ответ не принят: ${canonical(task)} | ${task.q} | ${JSON.stringify(res)}`);
      checkMarkup(where + ' answer', answerText(task));
    }
    if (seen.size < 4) console.log(`· ${lesson.id} #${gi + 1}: мало вариантов (${seen.size})`);
  });
}
console.log(`${sections.length} разделов, ${lessons.length} уроков, проверено задач: ${count}, проблем: ${problems}`);
process.exit(problems ? 1 : 0);
