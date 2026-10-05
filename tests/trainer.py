"""Проверка тренажёра в браузере. Вместо Pyodide (он грузится из интернета, здесь его нет)
подставляется поток-заглушка, который исполняет тот же harness.py настоящим Python."""
import asyncio, importlib.util, json, os, pathlib, subprocess, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("TETRADKA_URL", "http://127.0.0.1:8000/")
OUT = os.environ.get("TETRADKA_SHOTS", "")  # папка для снимков экрана; пусто — не снимать
root = pathlib.Path(__file__).resolve().parent
sys.dont_write_bytecode = True  # не оставляем __pycache__ в папке сайта
spec = importlib.util.spec_from_file_location("harness", root.parent / "site/js/algo/harness.py")
harness = importlib.util.module_from_spec(spec); spec.loader.exec_module(harness)
subprocess.run(["node", str(root / "algo-check.mjs")], check=True, stdout=subprocess.DEVNULL)  # выгружает задания в algo-tasks.json
tasks = {t["id"]: t for t in json.loads((root / "algo-tasks.json").read_text())["tasks"]}

STUB = """
self.onmessage = async (ev) => {
  const msg = ev.data;
  if (msg.type === 'init') { setTimeout(() => self.postMessage({ type: 'ready' }), 300); return; }
  const res = await fetch('/__harness', { method: 'POST', body: JSON.stringify(msg) });
  self.postMessage({ type: 'result', id: msg.id, result: await res.json() });
};
"""

async def main():
    problems = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1000})
        page = await ctx.new_page()
        async def guard(route):
            url = route.request.url
            if url.endswith("/js/algo/py-worker.js"):
                await route.fulfill(body=STUB, content_type="text/javascript")
            elif url.endswith("/__harness"):
                msg = json.loads(route.request.post_data)
                if "while True" in msg["code"]:
                    await asyncio.sleep(9.5)  # изображаем бесконечный цикл
                    try: await route.abort()
                    except Exception: pass
                    return
                out = harness.run(msg["code"], msg["mode"], msg.get("fn", ""), json.dumps(msg.get("tests", [])))
                await route.fulfill(body=out, content_type="application/json")
            elif url.startswith(BASE): await route.continue_()
            else: await route.abort()
        await ctx.route("**/*", guard)
        errors = []
        page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type == "error" and "ERR_FAILED" not in m.text else None)
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))

        async def set_code(code):
            await page.evaluate("""(code) => { const a = document.querySelector('.trainer .ed-area'); a.value = code; a.dispatchEvent(new Event('input', { bubbles: true })); }""", code)
        async def check():
            await page.click(".trainer-actions .btn.primary")
            await page.wait_for_function("document.querySelector('.trainer-actions .btn.primary').textContent === 'Проверить' && document.querySelector('.run-out').children.length > 0", timeout=20000)

        await page.goto(BASE + "#/algo/find-max"); await page.wait_for_selector(".trainer")
        # а) заготовка: часть тестов не проходит
        await check()
        summary = await page.inner_text(".run-summary")
        print("заготовка:", summary)
        if OUT: await page.locator(".trainer").screenshot(path=OUT + "t_fail.png")
        # б) синтаксическая ошибка
        await set_code("def find_max(a):\n    best = a[0]\n    for x in a\n        best = x\n    return best\n")
        await check()
        print("ошибка:", (await page.inner_text(".run-error")).replace("\n", " | "))
        if await page.locator(".ed-gutter .err").count() != 1: problems.append("строка с ошибкой не отмечена")
        if OUT: await page.locator(".trainer").screenshot(path=OUT + "t_error.png")
        # в) ошибка во время работы внутри теста
        await set_code("def find_max(a):\n    return a[len(a)]\n")
        await check()
        print("ошибка в тесте:", (await page.inner_text(".test-list li.bad >> nth=0")).replace("\n", " "))
        # г) запуск с print
        await set_code("def find_max(a):\n    return max(a)\n\nprint('ответ:', find_max([3, 9, 2]))\n")
        await page.click("text=Запустить"); await page.wait_for_selector(".run-stdout")
        print("вывод:", await page.inner_text(".run-stdout"))
        # д) подсказки и решение
        await page.click(".trainer-actions .icon-btn"); await page.click(".trainer-actions .icon-btn")
        print("подсказок показано:", await page.locator(".hint").count(), "| кнопка:", await page.inner_text(".trainer-actions .icon-btn"))
        await page.click("text=Показать решение"); await page.wait_for_selector(".solution")
        # е) верное решение → алгоритм засчитан
        await set_code(tasks["find-max#1"]["solution"]); await check()
        print("верное решение:", (await page.inner_text(".result.ok")).replace("\n", " | "))
        if OUT: await page.locator(".trainer").screenshot(path=OUT + "t_ok.png")
        print("статус:", await page.inner_text(".lesson-meta .status"))
        # ж) вторая задача
        await page.click(".result-actions .btn.primary")
        print("вторая задача:", await page.inner_text(".task-tab[aria-selected=true]"))
        await set_code(tasks["find-max#2"]["solution"]); await check()
        print("вторая решена:", await page.inner_text(".result-score"))
        # з) код сохраняется: перезагружаем страницу
        await page.wait_for_timeout(1200); await page.reload(); await page.wait_for_selector(".trainer")
        saved = await page.evaluate("document.querySelector('.trainer .ed-area').value")
        if saved.strip() != tasks["find-max#1"]["solution"].strip(): problems.append("код первой задачи не сохранился")
        print("галочек на вкладках:", await page.locator(".task-tab .icon").count())
        # и) бесконечный цикл
        await set_code("def find_max(a):\n    while True:\n        pass\n"); await check()
        print("зависание:", (await page.inner_text(".run-error"))[:80])
        # к) сброс кода
        await page.click("text=Сбросить код")
        if (await page.evaluate("document.querySelector('.trainer .ed-area').value")) != tasks["find-max#1"]["starter"]: problems.append("сброс кода не вернул заготовку")
        # л) клавиатура в редакторе: Enter после двоеточия добавляет отступ, Tab — 4 пробела
        await set_code("")
        await page.click(".trainer .ed-area"); await page.keyboard.type("def f(a):"); await page.keyboard.press("Enter"); await page.keyboard.type("if a:"); await page.keyboard.press("Enter"); await page.keyboard.type("return 1"); await page.keyboard.press("Enter"); await page.keyboard.press("Backspace"); await page.keyboard.type("return 0")
        typed = await page.evaluate("document.querySelector('.trainer .ed-area').value")
        if typed != "def f(a):\n    if a:\n        return 1\n    return 0": problems.append("отступы в редакторе: " + repr(typed))
        # м) все эталонные решения проходят через интерфейс
        for tid, task in tasks.items():
            aid, num = tid.split("#")
            await page.goto(BASE + "#/algo/" + aid); await page.wait_for_selector(".trainer")
            if num == "2": await page.click(".task-tab >> nth=1")
            await set_code(task["solution"]); await check()
            if await page.locator(".result.ok").count() != 1: problems.append(f"{tid}: решение не принято в интерфейсе")
        print("все решения проверены через интерфейс:", len(tasks))
        # н) основы Python
        await page.goto(BASE + "#/algo/python"); await page.wait_for_selector(".py-card")
        n = await page.locator(".runbox").count()
        for i in range(n):
            box = page.locator(".runbox").nth(i)
            await box.locator(".btn.primary").click(); await box.locator(".run-stdout").wait_for()
        print("примеров Python запущено:", n, "| первый вывод:", (await page.locator(".run-stdout").first.inner_text()).replace("\n", " / "))
        if OUT: await page.locator(".py-card").first.screenshot(path=OUT + "t_py.png")
        await page.goto(BASE + "#/me"); await page.wait_for_selector(".cabinet")
        print("кабинет:", (await page.inner_text(".head-row")).replace("\n", " | "))
        await browser.close()
    for e in errors[:20]: print(" консоль:", e)
    for pr in problems: print(" ✗", pr)
    print("проблем:", len(problems) + len(errors))
    sys.exit(1 if problems or errors else 0)

asyncio.run(main())
