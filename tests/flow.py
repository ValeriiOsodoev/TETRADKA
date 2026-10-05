"""Сквозная проверка в браузере: все страницы открываются без ошибок, тренировка и кабинет работают."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("TETRADKA_URL", "http://127.0.0.1:8000/")
OUT = os.environ.get("TETRADKA_SHOTS", "")  # папка для снимков экрана; пусто — не снимать

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        async def guard(route):
            if route.request.url.startswith(BASE): await route.continue_()
            else: await route.abort()
        await page.route("**/*", guard)
        errors = []
        page.on("console", lambda m: errors.append(f"[{m.type}] {page.url} :: {m.text}") if m.type in ("error", "warning") and "ERR_FAILED" not in m.text else None)
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {page.url} :: {e}"))

        await page.goto(BASE)
        await page.wait_for_selector(".hero")
        ids = await page.evaluate("""async () => {
            const c = await import('/js/math/course.js'); const a = await import('/js/algo/catalog.js');
            return { lessons: c.lessons.map(l => l.id), algos: a.algos.map(x => x.id) };
        }""")
        # 1. каждая страница урока: открывается, картинки нарисованы, ползунки двигаются
        for lid in ids["lessons"]:
            await page.goto(BASE + f"#/math/{lid}")
            await page.wait_for_selector(".lesson-body")
            bad = await page.evaluate("""() => {
                const out = [];
                document.querySelectorAll('.widget').forEach((w, i) => {
                    if (!w.querySelector('.w-out').textContent.trim()) out.push('пустой результат у картинки ' + i);
                    w.querySelectorAll('input[type=range]').forEach(r => {
                        for (const v of [r.min, r.max, String((+r.min + +r.max) / 2 | 0)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }
                    });
                    w.querySelectorAll('button').forEach(b => { if (!b.disabled) b.click(); });
                    const text = w.textContent;
                    if (/NaN|undefined|Infinity/.test(text)) out.push('мусор в картинке ' + i + ': ' + text.slice(0, 200));
                });
                document.querySelectorAll('.example button').forEach(b => { for (let k = 0; k < 8 && b.isConnected; k++) b.click(); });
                const body = document.querySelector('.page').textContent;
                if (/NaN|undefined|\\[object/.test(body)) out.push('мусор на странице');
                return out;
            }""")
            for b in bad: errors.append(f"{lid}: {b}")
        print("уроков открыто:", len(ids["lessons"]))
        # 2. каждая страница алгоритма: анимация проигрывается до конца
        for aid in ids["algos"]:
            await page.goto(BASE + f"#/algo/{aid}")
            await page.wait_for_selector(".viz")
            bad = await page.evaluate("""() => {
                const out = [];
                const scrub = document.querySelector('.viz-controls input[type=range]');
                for (let i = 0; i <= +scrub.max; i++) { scrub.value = i; scrub.dispatchEvent(new Event('input', { bubbles: true })); 
                    if (!document.querySelector('.cv-line.active')) out.push('нет подсвеченной строки на шаге ' + i);
                    if (!document.querySelector('.viz-note').textContent.trim()) out.push('нет подписи на шаге ' + i); }
                document.querySelectorAll('.viz-input button').forEach(b => b.click());
                const text = document.querySelector('.page').textContent;
                if (/NaN|undefined|\\[object/.test(text)) out.push('мусор на странице');
                return out;
            }""")
            for b in bad[:3]: errors.append(f"{aid}: {b}")
        print("алгоритмов открыто:", len(ids["algos"]))
        for h in ["/", "/math", "/algo", "/algo/python", "/login", "/register", "/me", "/nope"]:
            await page.goto(BASE + "#" + h); await page.wait_for_timeout(150)

        # 3. тренировка: решаем тему верно, используя правильные ответы из генератора
        await page.goto(BASE + "#/math/add")
        await page.wait_for_selector(".practice")
        await page.evaluate("""async () => {
            const tasks = await import('/js/math/tasks.js');
            window.__answer = null;
        }""")
        for i in range(6):
            q = await page.inner_text(".task-q")
            # вычисляем ответ по тексту задачи: «a + b =» или «? + b = s»
            import re
            nums = [int(x) for x in re.findall(r"\d+", q)]
            ans = nums[1] - nums[0] if "?" in q else nums[0] + nums[1]
            await page.fill(".answer", str(ans))
            await page.keyboard.press("Enter")
            await page.wait_for_selector(".feedback.ok, .feedback.bad")
            cls = await page.get_attribute(".feedback", "class")
            if "ok" not in cls: errors.append(f"ответ {ans} на «{q}» не принят")
            await page.click(".feedback .btn")
        score = await page.inner_text(".result-score")
        print("итог тренировки:", score)
        if OUT: await page.screenshot(path=OUT + "result.png")
        # 4. неверные ответы: тема попадает в список на повтор
        await page.goto(BASE + "#/math/sub")
        await page.wait_for_selector(".practice")
        for i in range(6):
            await page.fill(".answer", "100000")
            await page.keyboard.press("Enter")
            await page.wait_for_selector(".feedback.bad")
            await page.click(".feedback .btn")
        print("итог тренировки с ошибками:", await page.inner_text(".result-score"))
        # 5. регистрация: гостевой прогресс переносится
        await page.goto(BASE + "#/register")
        await page.fill("input[name=name]", "Тест")
        await page.fill("input[name=login]", "flow_user")
        await page.fill("input[name=password]", "secret12")
        await page.click("button[type=submit]")
        await page.wait_for_selector(".cabinet")
        await page.wait_for_timeout(300)
        print("кабинет:", (await page.inner_text(".page-head")).replace("\n", " | "))
        print("на повтор:", (await page.inner_text(".review-list")).replace("\n", " | "))
        if OUT: await page.screenshot(path=OUT + "cabinet.png", full_page=True)
        # 6. тот же аккаунт в другом браузере: прогресс на месте
        ctx2 = await browser.new_context()
        page2 = await ctx2.new_page()
        await page2.route("**/*", guard)
        await page2.goto(BASE + "#/login")
        await page2.fill("input[name=login]", "flow_user")
        await page2.fill("input[name=password]", "secret12")
        await page2.click("button[type=submit]")
        await page2.wait_for_selector(".cabinet")
        print("второй браузер:", (await page2.inner_text(".head-row")).replace("\n", " | "))
        # 7. выход и удаление аккаунта
        await page2.click("text=Удалить аккаунт")
        await page2.fill(".confirm input", "secret12")
        await page2.click(".confirm .danger-btn")
        await page2.wait_for_selector(".hero")
        print("аккаунт удалён")
        await browser.close()
        print("ошибок:", len(errors))
        for e in errors[:40]: print(" ", e)
        sys.exit(1 if errors else 0)

asyncio.run(main())
