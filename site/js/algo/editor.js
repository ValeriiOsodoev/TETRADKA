// Лёгкий редактор кода Python: подсветка, номера строк, отступы по Tab и Enter.
// Без сторонних библиотек: прозрачное поле ввода лежит поверх подсвеченного текста.

import { h, esc } from '../dom.js';

const KEYWORDS = 'def return if elif else for while in not and or break continue pass import from as None True False lambda class is try except finally raise with global nonlocal del assert yield';
const BUILTINS = 'print len range int str float list dict set tuple min max sum abs sorted reversed enumerate zip input bool map filter any all round pow divmod isinstance type deque';

const TOKEN = new RegExp(
  [
    '(#.*$)', // 1 комментарий
    '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?)', // 2 строка
    '\\b(\\d+(?:\\.\\d+)?)\\b', // 3 число
    `\\b(${KEYWORDS.split(' ').join('|')})\\b`, // 4 ключевое слово
    `\\b(${BUILTINS.split(' ').join('|')})\\b(?=\\s*\\()`, // 5 встроенная функция
    '([A-Za-z_]\\w*)(?=\\s*\\()', // 6 вызов или объявление функции
  ].join('|'),
  'gm',
);
const CLASSES = ['', 'tok-com', 'tok-str', 'tok-num', 'tok-kw', 'tok-fn', 'tok-call'];

export function highlight(code) {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    out += esc(code.slice(last, m.index));
    const group = m.findIndex((v, i) => i > 0 && v !== undefined);
    out += `<span class="${CLASSES[group]}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}

/**
 * Разбирает учебный код с метками строк вида «#@имя».
 * Возвращает чистый текст и словарь «имя → номер строки».
 */
export function parseCode(source) {
  const lines = source.replace(/^\n+|\s+$/g, '').split('\n');
  const marks = {};
  const clean = lines.map((line, i) => {
    const m = line.match(/\s*#@(\w+)\s*$/);
    if (!m) return line;
    marks[m[1]] = i + 1;
    return line.slice(0, m.index);
  });
  return { text: clean.join('\n'), marks };
}

/** Код только для чтения с номерами строк; setLine(n) подсвечивает строку. */
export function codeView(code) {
  const lines = code.split('\n').map((line, i) =>
    h('div.cv-line', h('span.cv-no', String(i + 1)), h('code', { html: highlight(line) || '&nbsp;' })),
  );
  const el = h('div.code-view', { 'aria-label': 'Код алгоритма' }, lines);
  let active = null;
  return {
    el,
    setLine(n) {
      if (active) active.classList.remove('active');
      active = n ? lines[n - 1] : null;
      if (active) active.classList.add('active');
    },
  };
}

function insert(textarea, text) {
  // execCommand сохраняет историю отмены (Ctrl+Z); если его нет — вставляем напрямую
  textarea.focus();
  if (!document.execCommand || !document.execCommand('insertText', false, text)) {
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function editor({ value = '', onChange, label = 'Редактор кода' } = {}) {
  const gutter = h('div.ed-gutter', { 'aria-hidden': 'true' });
  const layer = h('pre.ed-layer', { 'aria-hidden': 'true' });
  const area = h('textarea.ed-area', {
    spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': label,
  });
  const el = h('div.code-editor', gutter, h('div.ed-wrap', layer, area));
  let errorLine = null;
  let escaped = false;

  function paint() {
    const code = area.value;
    layer.innerHTML = highlight(code) + '\n';
    const count = code.split('\n').length;
    gutter.innerHTML = Array.from({ length: count }, (_, i) => `<span${i + 1 === errorLine ? ' class="err"' : ''}>${i + 1}</span>`).join('');
  }

  area.value = value;
  paint();

  area.addEventListener('input', () => {
    errorLine = null;
    paint();
    if (onChange) onChange(area.value);
  });

  area.addEventListener('keydown', (ev) => {
    const { selectionStart: start, selectionEnd: end, value: code } = area;
    if (ev.key === 'Escape') {
      escaped = true; // следующее нажатие Tab уведёт фокус из редактора
      return;
    }
    if (ev.key === 'Tab' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (escaped) {
        escaped = false;
        return;
      }
      ev.preventDefault();
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      if (ev.shiftKey) {
        const lead = code.slice(lineStart).match(/^ {1,4}/);
        if (lead) {
          area.setSelectionRange(lineStart, lineStart + lead[0].length);
          insert(area, '');
          const shift = lead[0].length;
          area.setSelectionRange(Math.max(lineStart, start - shift), Math.max(lineStart, end - shift));
        }
      } else if (start !== end && code.slice(start, end).includes('\n')) {
        const block = code.slice(lineStart, end);
        area.setSelectionRange(lineStart, end);
        insert(area, block.replace(/^/gm, '    '));
      } else {
        const col = start - lineStart;
        insert(area, ' '.repeat(4 - (col % 4)));
      }
      return;
    }
    escaped = false;
    if (ev.key === 'Enter' && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const line = code.slice(lineStart, start);
      let indent = line.match(/^ */)[0];
      if (/:\s*(#.*)?$/.test(line)) indent += '    ';
      insert(area, '\n' + indent);
      return;
    }
    if (ev.key === 'Backspace' && start === end) {
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const before = code.slice(lineStart, start);
      if (before.length && /^ +$/.test(before)) {
        ev.preventDefault();
        const remove = before.length % 4 || 4;
        area.setSelectionRange(start - remove, start);
        insert(area, '');
      }
    }
  });

  return {
    el,
    get value() {
      return area.value;
    },
    set value(v) {
      area.value = v;
      errorLine = null;
      paint();
    },
    markError(line) {
      errorLine = line || null;
      paint();
    },
    focus() {
      area.focus();
    },
  };
}
