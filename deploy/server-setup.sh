#!/bin/sh
# Установка и обновление сайта на сервере (Debian/Ubuntu). Запускается от root,
# повторный запуск безопасен: скрипт каждый раз приводит сервер к нужному состоянию.
#
#   sudo sh server-setup.sh <папка с новой версией кода> [домен]
#
# Что делает:
#   - код кладёт в /opt/tetradka, базу держит отдельно в /var/lib/tetradka — обновления её не трогают;
#   - сайт работает под отдельным пользователем tetradka и слушает только 127.0.0.1;
#   - если передан домен и порты 80/443 свободны (или Caddy уже стоит), настраивает Caddy с HTTPS.
set -eu

SRC="${1:?укажите папку с кодом}"
DOMAIN="${2:-}"
APP=/opt/tetradka
DATA=/var/lib/tetradka
ENV_FILE=/etc/tetradka.env
PORT_DEFAULT=8717

# При сбое последней строкой печатаем, на каком этапе он случился и что за система, —
# по этой строке причину видно сразу, без чтения всего журнала.
STAGE="запуск"
stage() { STAGE="$1"; echo "== $1"; }
on_exit() {
  code=$?
  [ "$code" -eq 0 ] && return
  os="$(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-}")"
  echo "СБОЙ на этапе «$STAGE», код $code. Система: ${os:-неизвестна}, $(uname -m)."
}
trap on_exit EXIT

[ "$(id -u)" = "0" ] || { echo "Запустите скрипт от root (через sudo)."; exit 1; }
command -v apt-get >/dev/null 2>&1 || { echo "Скрипт рассчитан на Debian или Ubuntu (нужен apt-get)."; exit 1; }
case "$DOMAIN" in
  *[!A-Za-z0-9.-]*) echo "Домен должен состоять из латинских букв, цифр, точек и дефисов — без https:// и без пути."; exit 1 ;;
esac
[ -f "$SRC/server/app.py" ] || { echo "В папке $SRC нет кода сайта."; exit 1; }

# apt: ждём, если его прямо сейчас занял другой процесс (например, автообновление),
# и не падаем из-за постороннего сломанного репозитория — важна только установка нужных пакетов.
export DEBIAN_FRONTEND=noninteractive
APT_LOCK="-o DPkg::Lock::Timeout=300"
APT_FRESH=""
apt_refresh() {
  [ -z "$APT_FRESH" ] || return 0
  APT_FRESH=1
  # shellcheck disable=SC2086
  apt-get update -q $APT_LOCK || echo "Внимание: apt-get update завершился с ошибкой — продолжаю с тем списком пакетов, что есть."
}
apt_install() {
  apt_refresh
  # shellcheck disable=SC2086
  apt-get install -y -q $APT_LOCK "$@"
}
apt_has() { apt-cache policy "$1" 2>/dev/null | grep -q 'Candidate: [0-9]'; }

stage "Пакеты"
need=""
command -v python3 >/dev/null 2>&1 || need="$need python3"
python3 -c "import venv, ensurepip" >/dev/null 2>&1 || need="$need python3-venv"
command -v rsync >/dev/null 2>&1 || need="$need rsync"
command -v curl >/dev/null 2>&1 || need="$need curl"
command -v ss >/dev/null 2>&1 || need="$need iproute2"
if [ -n "$need" ]; then
  # shellcheck disable=SC2086
  apt_install $need
fi
python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" || { echo "Нужен Python 3.9 или новее."; exit 1; }

stage "Пользователь и папки"
id tetradka >/dev/null 2>&1 || useradd --system --home-dir "$DATA" --shell /usr/sbin/nologin tetradka
mkdir -p "$APP" "$DATA"
chown tetradka:tetradka "$DATA"
chmod 750 "$DATA"

stage "Настройки"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<ENV
# Настройки сайта «Тетрадка». После правки: systemctl restart tetradka
TETRADKA_PORT=$PORT_DEFAULT
TETRADKA_DB=$DATA/tetradka.sqlite3
TETRADKA_TRUST_PROXY=1
# 1 — cookie только по HTTPS. Включается автоматически, когда настроен домен.
TETRADKA_SECURE_COOKIE=0
ENV
fi
PORT="$(sed -n 's/^TETRADKA_PORT=//p' "$ENV_FILE" | head -1)"
PORT="${PORT:-$PORT_DEFAULT}"

stage "Код"
rsync -a --delete --exclude '.venv' --exclude 'data' --exclude '.git' --exclude '__pycache__' "$SRC"/ "$APP"/
chown -R root:root "$APP"
chmod -R u=rwX,go=rX "$APP"

stage "Зависимости"
[ -x "$APP/.venv/bin/python" ] || python3 -m venv "$APP/.venv"
"$APP/.venv/bin/python" -m pip install --quiet --upgrade pip || true  # старый pip тоже справится
"$APP/.venv/bin/python" -m pip install --quiet -r "$APP/requirements.txt"

stage "Службы"
install -m 644 "$APP/deploy/tetradka.service" /etc/systemd/system/tetradka.service
install -m 644 "$APP/deploy/tetradka-backup.service" /etc/systemd/system/tetradka-backup.service
install -m 644 "$APP/deploy/tetradka-backup.timer" /etc/systemd/system/tetradka-backup.timer
systemctl daemon-reload
systemctl enable --quiet tetradka.service tetradka-backup.timer
systemctl restart tetradka.service
systemctl start tetradka-backup.timer

stage "Проверка"
ok=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:$PORT/api/me" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ -z "$ok" ]; then
  echo "Сайт не отвечает на 127.0.0.1:$PORT. Последние строки журнала:"
  journalctl -u tetradka.service -n 30 --no-pager || true
  exit 1
fi
echo "Сайт отвечает на 127.0.0.1:$PORT"

if [ -z "$DOMAIN" ]; then
  echo "Домен не задан — веб-сервер не настраиваю. Сайт доступен только с самого сервера."
  exit 0
fi

stage "HTTPS для $DOMAIN"
if ! command -v caddy >/dev/null 2>&1; then
  # Caddy ставим, только если порты 80 и 443 свободны: на сервере может уже работать другой веб-сервер
  busy="$(ss -ltnpH 2>/dev/null | awk '$4 ~ /:(80|443)$/ {print $4, $NF}' || true)"
  if [ -n "$busy" ]; then
    echo "Сайт запущен, но наружу не опубликован: порты 80/443 уже заняты другой программой."
    echo "$busy"
    echo "Caddy не ставлю, чтобы ничего не сломать. Направьте домен на 127.0.0.1:$PORT в том веб-сервере, который уже работает."
    exit 0
  fi
  apt_refresh
  if ! apt_has caddy; then
    # в старых выпусках (например, Ubuntu 22.04) пакета caddy нет — подключаем официальный репозиторий Caddy
    echo "В репозиториях системы нет пакета caddy — подключаю официальный репозиторий Caddy."
    apt_install ca-certificates
    curl -fsSL --retry 3 https://dl.cloudsmith.io/public/caddy/stable/gpg.key -o /usr/share/keyrings/caddy-stable.asc
    chmod 644 /usr/share/keyrings/caddy-stable.asc
    echo "deb [signed-by=/usr/share/keyrings/caddy-stable.asc] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
      > /etc/apt/sources.list.d/caddy-stable.list
    APT_FRESH=""
  fi
  apt_install caddy
fi
mkdir -p /etc/caddy/sites
sed -e "s/__DOMAIN__/$DOMAIN/" -e "s/__PORT__/$PORT/" "$APP/deploy/Caddyfile.template" > /etc/caddy/sites/tetradka.caddy
grep -q 'import sites/\*' /etc/caddy/Caddyfile 2>/dev/null || printf '\nimport sites/*\n' >> /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile >/dev/null
systemctl enable --quiet caddy
systemctl reload caddy || systemctl restart caddy

sed -i 's/^TETRADKA_SECURE_COOKIE=.*/TETRADKA_SECURE_COOKIE=1/' "$ENV_FILE"
systemctl restart tetradka.service
echo "Готово: https://$DOMAIN"
