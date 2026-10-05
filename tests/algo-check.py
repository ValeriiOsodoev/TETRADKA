"""Проверяет эталонные решения тренажёра тем же кодом, что работает в браузере (harness.py)."""
import importlib.util, json, pathlib, signal, subprocess, sys

root = pathlib.Path(__file__).resolve().parent
subprocess.run(["node", str(root / "algo-check.mjs")], check=True, stdout=subprocess.DEVNULL)
sys.dont_write_bytecode = True  # не оставляем __pycache__ в папке сайта
spec = importlib.util.spec_from_file_location("harness", root.parent / "site/js/algo/harness.py")
harness = importlib.util.module_from_spec(spec); spec.loader.exec_module(harness)
data = json.loads((root / "algo-tasks.json").read_text())
problems = 0

def fail(msg):
    global problems
    problems += 1
    print("✗", msg)

reference = {r["id"]: r["code"] for r in data["reference"]}
for task in data["tasks"]:
    tests = json.dumps(task["tests"])
    res = json.loads(harness.run(task["solution"], "test", task["fn"], tests))
    if not res["ok"]:
        bad = [t for t in res["tests"] if not t["ok"]]
        fail(f'{task["id"]}: эталонное решение не проходит: {res["error"] or bad[:2]}')
    # заготовка должна быть синтаксически верной и не должна проходить тесты сама
    signal.signal(signal.SIGALRM, lambda *a: (_ for _ in ()).throw(TimeoutError()))
    signal.alarm(3)
    try:
        res = json.loads(harness.run(task["starter"], "test", task["fn"], tests))
    finally:
        signal.alarm(0)
    if any(t["error"] and t["error"]["type"] == "TimeoutError" for t in res["tests"]):
        fail(f'{task["id"]}: заготовка зависает')
    if res["error"] and res["error"]["type"] in ("SyntaxError", "IndentationError"):
        fail(f'{task["id"]}: заготовка не компилируется: {res["error"]}')
    if res["ok"]:
        fail(f'{task["id"]}: заготовка уже проходит все тесты')
    # код из анимации: если в нём есть нужная функция, он тоже обязан проходить
    ref = reference[task["id"].split("#")[0]]
    if f'def {task["fn"]}(' in ref:
        res = json.loads(harness.run(ref, "test", task["fn"], tests))
        if not res["ok"]:
            fail(f'{task["id"]}: код из анимации не проходит тесты: {res["error"] or [t for t in res["tests"] if not t["ok"]][:2]}')
        else:
            print(f'  {task["id"]}: код из анимации проходит тесты')
for rid, code in reference.items():
    res = json.loads(harness.run(code, "run"))
    if not res["ok"]:
        fail(f"{rid}: код из анимации не выполняется: {res['error']}")
for i, code in enumerate(data["basics"]):
    res = json.loads(harness.run(code, "run"))
    if not res["ok"] or not res["stdout"].strip():
        fail(f"основы Python, пример {i + 1}: {res}")

# сам проверяющий код: ошибки, бесконечная рекурсия, сравнение типов
checks = [
    ("def f(a):\n    return a +\n", "SyntaxError", 2),
    ("def f(a):\nreturn a\n", "IndentationError", 2),
    ("def f(a):\n    return b\n", None, None),
    ("x = 1 / 0\n", "ZeroDivisionError", 1),
    ("print(input())\n", "RuntimeError", 1),
]
for code, etype, line in checks:
    res = json.loads(harness.run(code, "test", "f", json.dumps([{"args": [1], "want": 1}])))
    if etype:
        if not res["error"] or res["error"]["type"] != etype or res["error"]["line"] != line:
            fail(f"ожидалась {etype} в строке {line}: {res['error']}")
    else:
        t = res["tests"][0]
        if t["ok"] or t["error"]["type"] != "NameError" or t["error"]["line"] != 2:
            fail(f"ожидалась NameError в тесте: {t}")
res = json.loads(harness.run("def f(n):\n    return f(n + 1)\n", "test", "f", json.dumps([{"args": [1], "want": 1}])))
if res["tests"][0]["error"]["type"] != "RecursionError": fail(f"рекурсия: {res}")
res = json.loads(harness.run("def f(a):\n    return 1\n", "test", "f", json.dumps([{"args": [1], "want": True}])))
if res["ok"]: fail("1 не должно приниматься вместо True")
res = json.loads(harness.run("def f(a):\n    return (1, 2)\n", "test", "f", json.dumps([{"args": [1], "want": [1, 2]}])))
if not res["ok"]: fail("кортеж должен приниматься вместо списка")
res = json.loads(harness.run("def f(a):\n    a.sort()\n", "test", "f", json.dumps([{"args": [[2, 1]], "want": [1, 2], "inplace": True}])))
if not res["ok"]: fail("сортировка на месте должна приниматься")
res = json.loads(harness.run("print('x' * 50000)\n", "run"))
if len(res["stdout"]) > 20001: fail("вывод не ограничен")
res = json.loads(harness.run("def f(a):\n    return float('nan')\n", "test", "f", json.dumps([{"args": [1], "want": 1}])))
json.dumps(res, allow_nan=False)

print(f'заданий: {len(data["tasks"])}, проблем: {problems}')
sys.exit(1 if problems else 0)
