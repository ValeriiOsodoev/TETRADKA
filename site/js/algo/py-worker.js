// Фоновый поток: загружает Pyodide (Python, собранный для браузера) и выполняет код.
// Отдельный поток нужен, чтобы страница не зависала, а бесконечный цикл можно было прервать.

let pyodide = null;
let runner = null;

async function load(sources) {
  let lastError = null;
  for (const base of sources) {
    try {
      importScripts(base + 'pyodide.js');
      // eslint-disable-next-line no-undef
      pyodide = await loadPyodide({ indexURL: base });
      const harness = await (await fetch(new URL('harness.py', self.location.href))).text();
      pyodide.runPython(harness);
      runner = pyodide.globals.get('run');
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('нет источников');
}

self.onmessage = async (ev) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    try {
      await load(msg.sources);
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'load-error', message: String((err && err.message) || err) });
    }
    return;
  }
  if (msg.type === 'run') {
    try {
      const json = runner(msg.code, msg.mode, msg.fn || '', JSON.stringify(msg.tests || []));
      self.postMessage({ type: 'result', id: msg.id, result: JSON.parse(json) });
    } catch (err) {
      // сюда попадают сбои самого интерпретатора, например переполнение стека
      const text = String((err && err.message) || err);
      const type = /recursion|call stack/i.test(text) ? 'RecursionError' : 'Crash';
      // fatal: после такого сбоя интерпретатор может быть сломан — страница создаст поток заново
      self.postMessage({ type: 'result', id: msg.id, fatal: true, result: { ok: false, stdout: '', tests: [], error: { type, message: text.split('\n').pop(), line: null } } });
    }
  }
};
