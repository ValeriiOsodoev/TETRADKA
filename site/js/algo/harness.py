"""Запуск кода ученика и проверка тестами.

Этот файл выполняется внутри Pyodide (Python в браузере). Он же без изменений
запускается обычным Python — так проверяются эталонные решения (tests/algo-check.py).
"""

import copy
import io
import json
import math
import sys
import traceback

OUTPUT_LIMIT = 20000  # больше символов вывода не сохраняем
SOURCE = "<solution>"


class _Output(io.StringIO):
    def write(self, text):
        room = OUTPUT_LIMIT - self.tell()
        if room > 0:
            super().write(text[:room])
        return len(text)


def _no_input(*args):
    raise RuntimeError("В тренажёре нет ввода с клавиатуры: данные приходят в функцию как аргументы.")


def _error(exc):
    line = None
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == SOURCE:
            line = frame.lineno
    message = str(exc)
    if isinstance(exc, SyntaxError):
        message = exc.msg or message
        if exc.filename == SOURCE:
            line = exc.lineno
    return {"type": type(exc).__name__, "message": message, "line": line}


def _plain(value):
    """Приводит результат к виду, который можно сравнить и показать на странице."""
    if isinstance(value, bool) or value is None or isinstance(value, (int, str)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else repr(value)
    if isinstance(value, (list, tuple)):
        return [_plain(v) for v in value]
    if isinstance(value, (set, frozenset)):
        items = [_plain(v) for v in value]
        try:
            return sorted(items)
        except TypeError:
            return items
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    return repr(value)


def _same(got, want):
    if isinstance(want, bool) or isinstance(got, bool):
        return got is want
    if isinstance(want, float) or isinstance(got, float):
        try:
            return abs(got - want) < 1e-6
        except TypeError:
            return False
    if isinstance(want, list):
        return isinstance(got, list) and len(got) == len(want) and all(_same(g, w) for g, w in zip(got, want))
    if isinstance(want, dict):
        return isinstance(got, dict) and got.keys() == want.keys() and all(_same(got[k], want[k]) for k in want)
    return type(got) is type(want) and got == want


def run(code, mode="run", fn_name="", tests_json="[]"):
    """mode='run' — просто выполнить код; mode='test' — ещё и вызвать функцию на тестах.

    Возвращает JSON: { ok, stdout, error, tests: [{ args, want, got, ok, error }] }.
    """
    result = {"ok": True, "stdout": "", "error": None, "tests": []}
    output = _Output()
    env = {"__name__": "__main__", "input": _no_input}
    saved = sys.stdout
    sys.stdout = output
    try:
        try:
            exec(compile(code, SOURCE, "exec"), env)
        except BaseException as exc:  # noqa: BLE001 — показываем ученику любую ошибку
            result["ok"] = False
            result["error"] = _error(exc)
        else:
            if mode == "test":
                fn = env.get(fn_name)
                if not callable(fn):
                    result["ok"] = False
                    result["error"] = {"type": "NoFunction", "message": fn_name, "line": None}
                else:
                    for test in json.loads(tests_json):
                        args = copy.deepcopy(test["args"])
                        item = {"args": test["args"], "want": test["want"], "got": None, "ok": False, "error": None}
                        try:
                            got = fn(*args)
                            if got is None and test.get("inplace"):
                                got = args[0]  # функция изменила список на месте — тоже годится
                            item["got"] = _plain(got)
                            item["ok"] = _same(item["got"], test["want"])
                        except BaseException as exc:  # noqa: BLE001
                            item["error"] = _error(exc)
                        result["tests"].append(item)
                    result["ok"] = all(item["ok"] for item in result["tests"])
    finally:
        sys.stdout = saved
        result["stdout"] = output.getvalue()
    return json.dumps(result, ensure_ascii=False)
