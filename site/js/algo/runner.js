// Запуск Python-кода из страницы: держит фоновый поток с Pyodide,
// следит за временем выполнения и перезапускает поток, если код завис.

import { PYODIDE_SOURCES, RUN_TIMEOUT } from '../config.js';

let worker = null;
let ready = null; // Promise, который выполнится, когда Python загрузится
let status = 'idle'; // idle | loading | ready | failed
let busy = false;
let seq = 0;
const watchers = new Set();

function setStatus(next) {
  status = next;
  for (const fn of watchers) fn(status);
}

export function pythonStatus() {
  return status;
}

/** Подписка на состояние загрузки Python. Возвращает функцию отписки. */
export function watchPython(fn) {
  watchers.add(fn);
  fn(status);
  return () => watchers.delete(fn);
}

function boot() {
  if (ready) return ready;
  setStatus('loading');
  worker = new Worker(new URL('./py-worker.js', import.meta.url));
  ready = new Promise((resolve, reject) => {
    const onMessage = (ev) => {
      if (ev.data.type === 'ready') {
        worker.removeEventListener('message', onMessage);
        setStatus('ready');
        resolve();
      } else if (ev.data.type === 'load-error') {
        fail(new Error(ev.data.message));
      }
    };
    const fail = (err) => {
      if (worker) worker.terminate();
      worker = null;
      ready = null;
      setStatus('failed');
      reject(err);
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (ev) => fail(new Error(ev.message || 'не удалось запустить фоновый поток')));
    worker.postMessage({ type: 'init', sources: PYODIDE_SOURCES });
  });
  return ready;
}

/** Начать загрузку Python заранее, пока человек читает задание. */
export function warmUp() {
  boot().catch(() => {});
}

/**
 * Выполняет код. payload: { code, mode: 'run' | 'test', fn, tests }.
 * Возвращает результат из harness.py; при зависании — { timeout: true },
 * если Python не загрузился — { loadFailed: true }.
 */
export async function runPython(payload) {
  if (busy) return { busy: true };
  busy = true;
  try {
    try {
      await boot();
    } catch (err) {
      return { loadFailed: true, message: err.message };
    }
    const id = ++seq;
    return await new Promise((resolve) => {
      const timer = setTimeout(() => {
        // код не уложился во время — убиваем поток; при следующем запуске он создастся заново
        worker.terminate();
        worker = null;
        ready = null;
        setStatus('idle');
        resolve({ timeout: true });
      }, RUN_TIMEOUT);
      const onMessage = (ev) => {
        if (ev.data.type !== 'result' || ev.data.id !== id) return;
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        if (ev.data.fatal) {
          // интерпретатор упал целиком — в следующий раз загрузим его заново
          worker.terminate();
          worker = null;
          ready = null;
          setStatus('idle');
        }
        resolve(ev.data.result);
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'run', id, ...payload });
    });
  } finally {
    busy = false;
  }
}

// Понятные объяснения для частых ошибок Python.
const HINTS = {
  SyntaxError: 'Python не смог прочитать код. Проверьте двоеточия после `def`, `if`, `for`, `while`, парные скобки и кавычки.',
  IndentationError: 'Проблема с отступами. В Python отступы — часть программы: всё, что внутри `def`, `if`, `for` или `while`, сдвигается на 4 пробела.',
  TabError: 'В отступах смешаны пробелы и табуляция. Используйте только пробелы.',
  NameError: 'Python встретил имя, которого не знает. Проверьте, нет ли опечатки и создана ли переменная до того, как используется.',
  IndexError: 'Обращение к элементу, которого нет: индекс вышел за границы списка. Индексы идут от 0 до `len(a) - 1`.',
  TypeError: 'Действие применено к неподходящему типу — например, число складывают со строкой или функции передали не то количество аргументов.',
  ZeroDivisionError: 'Деление на ноль. Проверьте, чему равен делитель в этот момент.',
  KeyError: 'В словаре нет такого ключа.',
  ValueError: 'Функция получила значение неподходящего вида.',
  AttributeError: 'У этого объекта нет такого свойства или метода. Проверьте название и то, что переменная — того типа, который вы ожидаете.',
  RecursionError: 'Функция вызывает сама себя и не останавливается. Проверьте условие выхода из рекурсии.',
  UnboundLocalError: 'Переменная используется внутри функции до того, как ей присвоили значение.',
  RuntimeError: '',
  Crash: 'Программа остановилась из-за внутреннего сбоя.',
};

/** Превращает ошибку из harness.py в текст для ученика. */
export function explainError(error) {
  if (!error) return null;
  if (error.type === 'NoFunction') {
    return { title: `Не найдена функция ${error.message}`, hint: `Проверка вызывает функцию с именем \`${error.message}\`. Убедитесь, что она объявлена через \`def\` и имя написано точно так же.`, line: null };
  }
  const where = error.line ? ` в строке ${error.line}` : '';
  return {
    title: `${error.type}${where}: ${error.message}`,
    hint: HINTS[error.type] ?? '',
    line: error.line,
  };
}
