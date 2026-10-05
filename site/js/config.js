// Настройки сайта в одном месте.

export const SITE_NAME = 'Тетрадка';

// Откуда загружать Pyodide — Python, который работает прямо в браузере.
// Адреса пробуются по порядку. Чтобы сайт не зависел от чужого сервера,
// скачайте сборку Pyodide (https://github.com/pyodide/pyodide/releases),
// положите её файлы в site/vendor/pyodide/ и поставьте первой строкой '/vendor/pyodide/'.
export const PYODIDE_SOURCES = [
  'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
];

// Сколько миллисекунд даём программе на выполнение, прежде чем остановить её.
export const RUN_TIMEOUT = 8000;
