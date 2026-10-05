"""Резервная копия базы: согласованный снимок SQLite, хранятся последние 14 штук.

Запускается таймером tetradka-backup.timer раз в сутки. Можно запустить и вручную:
    sudo -u tetradka /opt/tetradka/.venv/bin/python /opt/tetradka/deploy/backup.py
"""

import os
import sqlite3
import sys
import time
from pathlib import Path

KEEP = 14

db_path = Path(os.environ.get("TETRADKA_DB", "/var/lib/tetradka/tetradka.sqlite3"))
backup_dir = Path(os.environ.get("TETRADKA_BACKUPS", db_path.parent / "backups"))

if not db_path.exists():
    print(f"Базы пока нет: {db_path}")
    sys.exit(0)

backup_dir.mkdir(parents=True, exist_ok=True)
target = backup_dir / f"tetradka-{time.strftime('%Y%m%d-%H%M%S')}.sqlite3"

# backup() копирует базу целиком и корректно, даже если сайт в этот момент пишет в неё
source = sqlite3.connect(db_path)
copy = sqlite3.connect(target)
try:
    source.backup(copy)
finally:
    copy.close()
    source.close()

old = sorted(backup_dir.glob("tetradka-*.sqlite3"))[:-KEEP]
for path in old:
    path.unlink()

print(f"Копия сохранена: {target} (удалено старых: {len(old)})")
