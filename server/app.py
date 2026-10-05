"""Тетрадка — сервер.

Отдаёт сайт (папка site/) и небольшой API: аккаунты и прогресс по темам.
Хранилище — один файл SQLite. Запуск: см. README.md.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from pathlib import Path

from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "site"
DB_PATH = Path(os.environ.get("TETRADKA_DB", ROOT / "data" / "tetradka.sqlite3"))

COOKIE_NAME = "tetradka_session"
COOKIE_SECURE = os.environ.get("TETRADKA_SECURE_COOKIE", "0") == "1"  # включить на HTTPS
TRUST_PROXY = os.environ.get("TETRADKA_TRUST_PROXY", "0") == "1"  # если сервер стоит за nginx/caddy
SESSION_DAYS = 60
MAX_BODY = 256 * 1024

# ---------------------------------------------------------------- база данных

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    login    TEXT NOT NULL UNIQUE,
    name     TEXT NOT NULL,
    pass     TEXT NOT NULL,
    created  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind     TEXT NOT NULL,
    topic    TEXT NOT NULL,
    best     INTEGER NOT NULL DEFAULT 0,
    last     INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    done     INTEGER NOT NULL DEFAULT 0,
    review   INTEGER NOT NULL DEFAULT 0,
    stage    INTEGER NOT NULL DEFAULT 0,
    due      INTEGER,
    updated  INTEGER NOT NULL,
    data     TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (user_id, kind, topic)
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
"""


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
        conn.execute("DELETE FROM sessions WHERE expires < ?", (int(time.time()),))


# ------------------------------------------------------------------- пароли


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    if hasattr(hashlib, "scrypt"):
        digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
        return f"scrypt${salt.hex()}${digest.hex()}"
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return f"pbkdf2${salt.hex()}${digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    try:
        algo, salt_hex, digest_hex = stored.split("$")
        salt = bytes.fromhex(salt_hex)
        if algo == "scrypt":
            digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
        elif algo == "pbkdf2":
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
        else:
            return False
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


# ------------------------------------------------------------------ проверки


class ApiError(Exception):
    def __init__(self, status: int, message: str, field: str | None = None):
        self.status, self.message, self.field = status, message, field


LOGIN_RE = re.compile(r"^[\w.\-]{3,24}$", re.UNICODE)
TOPIC_RE = re.compile(r"^[a-z0-9\-]{1,64}$")
KINDS = {"math", "algo"}


def clean_login(value) -> str:
    if not isinstance(value, str) or not LOGIN_RE.match(value.strip()):
        raise ApiError(400, "Логин: от 3 до 24 символов — буквы, цифры, точка, дефис или подчёркивание.", "login")
    return value.strip().lower()


def clean_name(value) -> str:
    if not isinstance(value, str) or not (1 <= len(value.strip()) <= 40):
        raise ApiError(400, "Имя: от 1 до 40 символов.", "name")
    return value.strip()


def clean_password(value, field: str = "password") -> str:
    if not isinstance(value, str) or not (6 <= len(value) <= 200):
        raise ApiError(400, "Пароль: не короче 6 символов.", field)
    return value


def _int(value, lo: int, hi: int, default: int = 0) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return default
    return max(lo, min(hi, int(value)))


def clean_record(obj) -> dict:
    """Приводит запись о прогрессе к ожидаемому виду; лишнее отбрасывает."""
    if not isinstance(obj, dict):
        raise ApiError(400, "Некорректная запись прогресса.")
    kind, topic = obj.get("kind"), obj.get("id")
    if kind not in KINDS or not isinstance(topic, str) or not TOPIC_RE.match(topic):
        raise ApiError(400, "Некорректная тема.")
    data = obj.get("data") if isinstance(obj.get("data"), dict) else {}
    data_json = json.dumps(data, ensure_ascii=False)
    if len(data_json) > 60_000:
        raise ApiError(413, "Слишком большой объём данных для одной темы.")
    due = obj.get("due")
    now_ms = int(time.time() * 1000)
    return {
        "kind": kind,
        "id": topic,
        "best": _int(obj.get("best"), 0, 100),
        "last": _int(obj.get("last"), 0, 100),
        "attempts": _int(obj.get("attempts"), 0, 100_000),
        "done": bool(obj.get("done")),
        "review": bool(obj.get("review")),
        "stage": _int(obj.get("stage"), 0, 6),
        "due": None if due is None else _int(due, 0, 10**14),
        # время правки не может быть из будущего — иначе запись нельзя будет обновить
        "updated": min(_int(obj.get("updated"), 0, 10**14, now_ms), now_ms + 60_000),
        "data": data,
    }


def merge_records(old: dict | None, new: dict) -> dict:
    """Свежая запись побеждает, но лучший результат и факт прохождения не теряются."""
    if old is None:
        return new
    latest = new if new["updated"] >= old["updated"] else old
    out = dict(latest)
    out["best"] = max(old["best"], new["best"])
    out["attempts"] = max(old["attempts"], new["attempts"])
    out["done"] = old["done"] or new["done"]
    return out


def row_to_record(row: sqlite3.Row) -> dict:
    return {
        "kind": row["kind"],
        "id": row["topic"],
        "best": row["best"],
        "last": row["last"],
        "attempts": row["attempts"],
        "done": bool(row["done"]),
        "review": bool(row["review"]),
        "stage": row["stage"],
        "due": row["due"],
        "updated": row["updated"],
        "data": json.loads(row["data"] or "{}"),
    }


# ------------------------------------------------------- операции с данными


def create_user(login: str, name: str, password: str) -> dict:
    with db() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (login, name, pass, created) VALUES (?, ?, ?, ?)",
                (login, name, hash_password(password), int(time.time())),
            )
        except sqlite3.IntegrityError:
            raise ApiError(409, "Такой логин уже занят — попробуйте другой.", "login") from None
        return {"id": cur.lastrowid, "login": login, "name": name}


def find_user_by_login(login: str) -> sqlite3.Row | None:
    with db() as conn:
        return conn.execute("SELECT * FROM users WHERE login = ?", (login,)).fetchone()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with db() as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)",
            (_token_hash(token), user_id, int(time.time()) + SESSION_DAYS * 86400),
        )
    return token


def user_by_token(token: str | None) -> dict | None:
    if not token:
        return None
    with db() as conn:
        row = conn.execute(
            "SELECT u.id, u.login, u.name, u.created FROM sessions s JOIN users u ON u.id = s.user_id "
            "WHERE s.token_hash = ? AND s.expires > ?",
            (_token_hash(token), int(time.time())),
        ).fetchone()
    return dict(row) if row else None


def drop_session(token: str | None) -> None:
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))


def load_progress(user_id: int) -> list[dict]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM progress WHERE user_id = ?", (user_id,)).fetchall()
    return [row_to_record(r) for r in rows]


def save_records(user_id: int, records: list[dict]) -> list[dict]:
    saved = []
    with db() as conn:
        for rec in records:
            row = conn.execute(
                "SELECT * FROM progress WHERE user_id = ? AND kind = ? AND topic = ?",
                (user_id, rec["kind"], rec["id"]),
            ).fetchone()
            out = merge_records(row_to_record(row) if row else None, rec)
            conn.execute(
                "INSERT OR REPLACE INTO progress "
                "(user_id, kind, topic, best, last, attempts, done, review, stage, due, updated, data) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    user_id, out["kind"], out["id"], out["best"], out["last"], out["attempts"],
                    int(out["done"]), int(out["review"]), out["stage"], out["due"], out["updated"],
                    json.dumps(out["data"], ensure_ascii=False),
                ),
            )
            saved.append(out)
    return saved


# ------------------------------------------------- ограничение числа попыток


class RateLimiter:
    """Простое ограничение в памяти процесса: не больше limit событий за window секунд."""

    def __init__(self, limit: int, window: int):
        self.limit, self.window = limit, window
        self.events: dict[str, deque] = defaultdict(deque)

    def _trim(self, key: str) -> deque:
        q, now = self.events[key], time.time()
        while q and q[0] < now - self.window:
            q.popleft()
        return q

    def blocked(self, key: str) -> bool:
        return len(self._trim(key)) >= self.limit

    def hit(self, key: str) -> None:
        self._trim(key).append(time.time())
        if len(self.events) > 50_000:  # не даём словарю расти бесконечно
            self.events.clear()


login_failures = RateLimiter(limit=10, window=600)
registrations = RateLimiter(limit=20, window=3600)


def client_ip(request: Request) -> str:
    if TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------- API


async def read_json(request: Request) -> dict:
    if "application/json" not in request.headers.get("content-type", ""):
        raise ApiError(415, "Ожидается JSON.")
    body = await request.body()
    if len(body) > MAX_BODY:
        raise ApiError(413, "Слишком большой запрос.")
    try:
        data = json.loads(body or b"{}")
    except ValueError:
        raise ApiError(400, "Некорректный JSON.") from None
    if not isinstance(data, dict):
        raise ApiError(400, "Некорректный JSON.")
    return data


async def current_user(request: Request) -> dict:
    user = await run_in_threadpool(user_by_token, request.cookies.get(COOKIE_NAME))
    if not user:
        raise ApiError(401, "Нужно войти в аккаунт.")
    return user


def public_user(user: dict) -> dict:
    return {"login": user["login"], "name": user["name"]}


def with_session(payload: dict, token: str, status: int = 200) -> JSONResponse:
    response = JSONResponse(payload, status_code=status)
    response.set_cookie(
        COOKIE_NAME, token, max_age=SESSION_DAYS * 86400, httponly=True,
        samesite="lax", secure=COOKIE_SECURE, path="/",
    )
    return response


async def register(request: Request) -> Response:
    ip = client_ip(request)
    if registrations.blocked(ip):
        raise ApiError(429, "Слишком много регистраций с этого адреса. Попробуйте позже.")
    data = await read_json(request)
    login = clean_login(data.get("login"))
    name = clean_name(data.get("name") or data.get("login"))
    password = clean_password(data.get("password"))
    user = await run_in_threadpool(create_user, login, name, password)
    registrations.hit(ip)
    token = await run_in_threadpool(create_session, user["id"])
    return with_session({"user": public_user(user)}, token, status=201)


async def login(request: Request) -> Response:
    ip = client_ip(request)
    if login_failures.blocked(ip):
        raise ApiError(429, "Слишком много неудачных попыток. Подождите 10 минут и попробуйте снова.")
    data = await read_json(request)
    login_value = data.get("login").strip().lower() if isinstance(data.get("login"), str) else ""
    password = data.get("password") if isinstance(data.get("password"), str) else ""
    row = await run_in_threadpool(find_user_by_login, login_value)
    ok = await run_in_threadpool(check_password, password, row["pass"] if row else "x$00$00")
    if not row or not ok:
        login_failures.hit(ip)
        raise ApiError(401, "Неверный логин или пароль.")
    token = await run_in_threadpool(create_session, row["id"])
    return with_session({"user": public_user(dict(row))}, token)


async def logout(request: Request) -> Response:
    await run_in_threadpool(drop_session, request.cookies.get(COOKIE_NAME))
    response = JSONResponse({"ok": True})
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


async def me(request: Request) -> Response:
    # для гостя это не ошибка: просто «никто не вошёл»
    user = await run_in_threadpool(user_by_token, request.cookies.get(COOKIE_NAME))
    return JSONResponse({"user": public_user(user) if user else None})


async def update_me(request: Request) -> Response:
    user = await current_user(request)
    data = await read_json(request)

    def apply() -> dict:
        with db() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            name = row["name"]
            if "name" in data:
                name = clean_name(data["name"])
                conn.execute("UPDATE users SET name = ? WHERE id = ?", (name, user["id"]))
            if "new_password" in data:
                if not check_password(str(data.get("password", "")), row["pass"]):
                    raise ApiError(403, "Текущий пароль введён неверно.", "password")
                new_password = clean_password(data["new_password"], "new_password")
                conn.execute("UPDATE users SET pass = ? WHERE id = ?", (hash_password(new_password), user["id"]))
            return {"login": row["login"], "name": name}

    return JSONResponse({"user": await run_in_threadpool(apply)})


async def delete_me(request: Request) -> Response:
    user = await current_user(request)
    data = await read_json(request)

    def apply() -> None:
        with db() as conn:
            row = conn.execute("SELECT pass FROM users WHERE id = ?", (user["id"],)).fetchone()
            if not check_password(str(data.get("password", "")), row["pass"]):
                raise ApiError(403, "Пароль введён неверно.", "password")
            conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))  # прогресс и сессии удалятся каскадом

    await run_in_threadpool(apply)
    response = JSONResponse({"ok": True})
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


async def get_progress(request: Request) -> Response:
    user = await current_user(request)
    return JSONResponse({"items": await run_in_threadpool(load_progress, user["id"])})


async def put_progress(request: Request) -> Response:
    """Принимает одну запись или список записей (так же переносится гостевой прогресс)."""
    user = await current_user(request)
    data = await read_json(request)
    items = data.get("items")
    if not isinstance(items, list) or len(items) > 500:
        raise ApiError(400, "Ожидается список записей (не больше 500).")
    records = [clean_record(item) for item in items]
    saved = await run_in_threadpool(save_records, user["id"], records)
    return JSONResponse({"items": saved})


async def reset_progress(request: Request) -> Response:
    user = await current_user(request)

    def apply() -> None:
        with db() as conn:
            conn.execute("DELETE FROM progress WHERE user_id = ?", (user["id"],))

    await run_in_threadpool(apply)
    return JSONResponse({"ok": True})


# ------------------------------------------------------------- обвязка


class Guard(BaseHTTPMiddleware):
    """Ошибки API в JSON, защита от чужих сайтов, заголовки безопасности и кеша."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/api/") and request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = request.headers.get("origin")
            if origin and origin.split("://", 1)[-1] != request.headers.get("host", ""):
                return JSONResponse({"error": "Запрос с другого сайта отклонён."}, status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        else:
            # файлы сайта: браузер каждый раз сверяет версию, поэтому правки видны сразу
            response.headers["Cache-Control"] = "no-cache"
        return response


async def api_error(request: Request, exc: ApiError) -> JSONResponse:
    payload = {"error": exc.message}
    if exc.field:
        payload["field"] = exc.field
    return JSONResponse(payload, status_code=exc.status)


async def api_not_found(request: Request) -> JSONResponse:
    return JSONResponse({"error": "Такого адреса в API нет."}, status_code=404)


init_db()

app = Starlette(
    routes=[
        Route("/api/register", register, methods=["POST"]),
        Route("/api/login", login, methods=["POST"]),
        Route("/api/logout", logout, methods=["POST"]),
        Route("/api/me", me, methods=["GET"]),
        Route("/api/me", update_me, methods=["PATCH"]),
        Route("/api/me", delete_me, methods=["DELETE"]),
        Route("/api/progress", get_progress, methods=["GET"]),
        Route("/api/progress", put_progress, methods=["PUT"]),
        Route("/api/progress", reset_progress, methods=["DELETE"]),
        Route("/api/{rest:path}", api_not_found, methods=["GET", "POST", "PUT", "PATCH", "DELETE"]),
        Mount("/", app=StaticFiles(directory=SITE_DIR, html=True), name="site"),
    ],
    middleware=[Middleware(Guard)],
    exception_handlers={ApiError: api_error},
)
