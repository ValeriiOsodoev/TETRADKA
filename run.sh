#!/bin/sh
# Запуск сайта на своём компьютере: ./run.sh
# При первом запуске создаёт окружение .venv и ставит две зависимости.
set -e
cd "$(dirname "$0")"

# берём самый новый Python из тех, что есть (подойдёт 3.9 и новее)
PY=""
for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "Не найден Python 3. Установите его с https://www.python.org/downloads/ и запустите скрипт снова."
  exit 1
fi

# зависимости ставим, пока в окружении не появится uvicorn, —
# так прерванная или неудачная установка повторится при следующем запуске
if [ ! -x .venv/bin/uvicorn ]; then
  [ -d .venv ] || "$PY" -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
fi

echo "Сайт: http://127.0.0.1:8000  (остановить — Ctrl+C)"
exec .venv/bin/python -m uvicorn server.app:app --host 127.0.0.1 --port 8000 --reload
