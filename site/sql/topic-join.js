// Тема 2: JOIN и операции над множествами (Bootcamp Day 01–03).
// Та же база пиццерий. Теория простыми словами, демо «было → стало» считает настоящий PostgreSQL.

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const demo = (sql, note = '') => `<div class="demo" data-sql="${attr(sql)}"${note ? ` data-note="${attr(note)}"` : ''}></div>`;
const parts = (rows) => `<table class="parts"><tbody>${rows.map(([code, text]) => `<tr><td><code>${code}</code></td><td>${text}</td></tr>`).join('')}</tbody></table>`;

const LESSONS = [
  {
    id: 'l2-why',
    title: 'Зачем соединять таблицы',
    html: `
<p>Посмотри на таблицу заказов <code>person_order</code>. В ней нет ни имён, ни названий пицц, только номера:</p>
${demo(`SELECT * FROM person_order WHERE id <= 4;`)}
<p>Строка <code>person_id = 1, menu_id = 1</code> значит: «человек номер 1 заказал позицию меню номер 1». Кто такой человек номер 1? Это написано в другой таблице, <code>person</code>:</p>
${demo(`SELECT id, name FROM person WHERE id <= 2;`)}
<p>Человек с <code>id = 1</code> это Anna. Значит, первый заказ сделала Anna.</p>
<p>Это как номерки в гардеробе. На крючке висит номерок 7, а чья куртка, записано в тетрадке гардеробщика под номером 7. Колонка <code>person_id</code> это номерок, а <code>person.id</code> это строчка в тетрадке.</p>
<p>Такая колонка-номерок называется <b>ссылкой</b> (по-взрослому, внешним ключом). В схеме базы ссылки отмечены стрелкой: <code>person_id → person</code>.</p>
<p>Искать глазами долго. Команда <b>JOIN</b> делает это за нас: к каждой строке заказа приклеивает подходящую строку человека. Про неё следующие разделы.</p>`,
    example: `SELECT * FROM person_visits WHERE id <= 5;`,
    exampleNote: 'Это визиты. Попробуй по таблице person понять, кто приходил в визите номер 3.',
    recall: { q: 'Что значит person_id = 3 в таблице person_order?', a: 'Заказ сделал человек, у которого id = 3 в таблице person. person_id это ссылка (номерок) на строку другой таблицы.' },
  },
  {
    id: 'l2-cross',
    title: 'Все пары: CROSS JOIN',
    html: `
<p>Начнём с самого простого соединения. У тебя 3 футболки и 2 пары штанов. Сколько разных нарядов? 3 × 2 = 6: каждую футболку можно надеть с каждыми штанами.</p>
<p><b>CROSS JOIN</b> делает то же самое с таблицами: склеивает <b>каждую</b> строку первой таблицы с <b>каждой</b> строкой второй.</p>
${demo(`SELECT person.name, pizzeria.name
FROM person
CROSS JOIN pizzeria
WHERE person.id <= 2;`, 'Два человека × шесть пиццерий = 12 строк.')}
<p>Без WHERE получилось бы 9 × 6 = 54 строки: все люди со всеми пиццериями.</p>
<p>В обеих таблицах есть колонка <code>name</code>. Чтобы PostgreSQL понял, какую ты имеешь в виду, пиши <b>имя_таблицы.колонка</b>: <code>person.name</code>, <code>pizzeria.name</code>.</p>
<p>Ещё CROSS JOIN можно записать через запятую: <code>FROM person, pizzeria</code>. Это то же самое.</p>`,
    example: `SELECT person.name AS person_name, pizzeria.name AS pizzeria_name
FROM person
CROSS JOIN pizzeria
ORDER BY person_name, pizzeria_name;`,
    exampleNote: 'Запусти и посмотри внизу, сколько строк. Должно быть 54.',
    recall: { q: 'В одной таблице 9 строк, в другой 6. Сколько строк даст CROSS JOIN?', a: '9 × 6 = 54: каждая строка первой таблицы с каждой строкой второй.' },
  },
  {
    id: 'l2-inner',
    title: 'JOIN … ON: только подходящие пары',
    html: `
<p>CROSS JOIN даёт все пары, и большинство из них бессмысленные: заказ Анны рядом с Денисом. Нам нужны только пары, где номерок совпал с номером человека.</p>
<p>Для этого есть <b>JOIN … ON</b>. После ON пишем, какие пары оставить:</p>
${demo(`SELECT person_order.order_date, person.name
FROM person_order
JOIN person ON person_order.person_id = person.id;`)}
${parts([
  ['JOIN person', 'приклеить таблицу person'],
  ['ON …', '«при условии». Оставить только пары, где условие верно'],
  ['person_order.person_id = person.id', 'номерок из заказа равен номеру человека'],
])}
<p>Писать длинные имена таблиц утомительно. Таблице можно дать короткое <b>прозвище</b> (алиас): пишешь его сразу после имени таблицы.</p>
${demo(`SELECT po.order_date, p.name
FROM person_order po
JOIN person p ON po.person_id = p.id
WHERE p.address = 'Kazan';`, 'po это person_order, p это person. После JOIN можно, как обычно, фильтровать через WHERE.')}
<p>Важно:</p>
<ul>
<li>Если прозвище дал, дальше пиши только его: <code>p.name</code>, а не <code>person.name</code>.</li>
<li>Если колонка есть в обеих таблицах (например, <code>id</code>), без прозвища будет ошибка <code>column reference "id" is ambiguous</code> («непонятно, какой id»). Пиши <code>p.id</code> или <code>po.id</code>.</li>
<li>Строки, которым не нашлось пары, в ответ <b>не попадают</b>. Поэтому такой JOIN ещё называют INNER JOIN («внутренний»). <code>JOIN</code> и <code>INNER JOIN</code> это одно и то же.</li>
</ul>
<p>Нажми «Показать выполнение» у примера ниже: первым шагом таблицы склеятся, потом WHERE выбросит лишние строки.</p>`,
    extraHtml: `<p class="muted small">Ещё бывает <code>NATURAL JOIN</code>: он сам склеивает по колонкам с одинаковыми именами. В нашей базе это опасно: у всех таблиц есть <code>id</code>, и он склеит по id. На экзамене пиши ON явно.</p>`,
    example: `SELECT p.name, pv.visit_date
FROM person_visits pv
JOIN person p ON pv.person_id = p.id
WHERE pv.visit_date = '2022-01-01';`,
    exampleNote: 'Кто приходил в пиццерии 1 января? Запусти, потом «Показать выполнение».',
    recall: { q: 'Что пишут после ON и что происходит со строкой, которой не нашлось пары?', a: 'После ON условие склейки, обычно ссылка = id (po.person_id = p.id). Строка без пары в обычный JOIN не попадает.' },
  },
  {
    id: 'l2-chain',
    title: 'Цепочка из трёх и больше таблиц',
    html: `
<p>Хотим узнать: кто, какую пиццу и в какой пиццерии заказал. В заказе есть только <code>person_id</code> и <code>menu_id</code>. Название пиццерии лежит ещё дальше:</p>
<pre class="snip">person_order.menu_id → menu.id
menu.pizzeria_id     → pizzeria.id</pre>
<p>Каждый JOIN приклеивает ещё одну таблицу. Цепочка идёт по стрелкам, как по ссылкам:</p>
${demo(`SELECT p.name, m.pizza_name, z.name AS pizzeria_name
FROM person_order po
JOIN person p ON po.person_id = p.id
JOIN menu m ON po.menu_id = m.id
JOIN pizzeria z ON m.pizzeria_id = z.id
WHERE po.order_date = '2022-01-07'
ORDER BY p.name, m.pizza_name;`)}
<p>Совет для экзамена: на листке нарисуй цепочку стрелками, прежде чем писать запрос. Например: <code>po → person</code>, <code>po → menu → pizzeria</code>. Потом каждая стрелка превращается в одну строчку <code>JOIN … ON …</code>.</p>
<p>Две колонки <code>name</code> (у человека и у пиццерии) в ответе были бы неразличимы, поэтому вторую переименовали: <code>z.name AS pizzeria_name</code>.</p>`,
    example: `SELECT p.name, z.name AS pizzeria_name, pv.visit_date
FROM person_visits pv
JOIN person p ON pv.person_id = p.id
JOIN pizzeria z ON pv.pizzeria_id = z.id
ORDER BY pv.visit_date, p.name;`,
    exampleNote: 'Визиты с именами и названиями пиццерий. Попробуй оставить только визиты в Dominos.',
    recall: { q: 'Через какие таблицы и по каким колонкам дойти от заказа до названия пиццерии?', a: 'person_order.menu_id = menu.id, затем menu.pizzeria_id = pizzeria.id.' },
  },
  {
    id: 'l2-left',
    title: 'LEFT JOIN: никого не теряем',
    html: `
<p>Обычный JOIN выбрасывает строки без пары. Иногда это плохо. Например, нужен список <b>всех</b> пиццерий с их визитами, даже если в пиццерию никто не приходил.</p>
<p><b>LEFT JOIN</b> оставляет <b>все</b> строки левой таблицы (той, что написана до слова JOIN). Если пары нет, в колонках правой таблицы будет пусто, то есть <code>NULL</code>.</p>
${demo(`SELECT z.name, pv.visit_date
FROM pizzeria z
LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id
ORDER BY z.name, pv.visit_date;`, 'Найди строку DoDo Pizza: у неё visit_date пустой (NULL). В неё никто не приходил, но LEFT JOIN её оставил.')}
<p>Отсюда главный приём: <b>как найти тех, у кого нет пары</b>. Делаем LEFT JOIN и оставляем строки, где справа пусто:</p>
${demo(`SELECT z.name
FROM pizzeria z
LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id
WHERE pv.id IS NULL;`, 'Пиццерии, в которые никто не приходил.')}
<p>Проверяем пустоту через <code>IS NULL</code>, как в теме 1. Проверять лучше колонку, которая у настоящей строки никогда не бывает пустой, например <code>id</code>.</p>`,
    example: `SELECT m.id, m.pizza_name, po.order_date
FROM menu m
LEFT JOIN person_order po ON po.menu_id = m.id
WHERE po.id IS NULL
ORDER BY m.id;`,
    exampleNote: 'Позиции меню, которые никто ни разу не заказывал.',
    recall: { q: 'Как с помощью LEFT JOIN найти строки, у которых нет пары?', a: 'A LEFT JOIN B ON … WHERE B.id IS NULL. LEFT JOIN оставляет все строки A, а у строк без пары колонки B пустые.' },
  },
  {
    id: 'l2-onwhere',
    title: 'Условие в ON или в WHERE',
    html: `
<p>Ловушка, на которой ошибаются чаще всего. Задача: все пиццерии и визиты к ним <b>1 января</b>. Если визитов не было, всё равно показать пиццерию.</p>
<p>Вариант 1: дата в <b>ON</b>.</p>
${demo(`SELECT z.name, pv.visit_date
FROM pizzeria z
LEFT JOIN person_visits pv
  ON pv.pizzeria_id = z.id AND pv.visit_date = '2022-01-01'
ORDER BY z.name;`, 'Все 6 пиццерий. Там, где 1 января никого не было, дата пустая. Это правильный ответ.')}
<p>Вариант 2: дата в <b>WHERE</b>.</p>
${demo(`SELECT z.name, pv.visit_date
FROM pizzeria z
LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id
WHERE pv.visit_date = '2022-01-01'
ORDER BY z.name;`, 'Осталось только 3 пиццерии. Пустые строки потерялись.')}
<p>Почему так? Вспомни порядок: сначала FROM и JOIN, потом WHERE. Во втором варианте LEFT JOIN честно оставил пустые строки, а потом WHERE проверил <code>NULL = '2022-01-01'</code>. Это не «да», и строки выбросились. LEFT JOIN превратился в обычный JOIN.</p>
<p><b>Правило:</b> при LEFT JOIN условия на правую таблицу пиши в ON. В WHERE пиши условия на левую таблицу и проверку <code>IS NULL</code>.</p>`,
    example: `SELECT p.name, po.order_date
FROM person p
LEFT JOIN person_order po
  ON po.person_id = p.id AND po.order_date = '2022-01-01'
ORDER BY p.name;`,
    exampleNote: 'Все люди и их заказы 1 января. Перенеси условие с датой в WHERE и посмотри, сколько людей пропадёт.',
    recall: { q: 'Почему при LEFT JOIN условие на правую таблицу нельзя писать в WHERE?', a: 'WHERE выполняется после JOIN и выбрасывает строки, где справа NULL. LEFT JOIN превращается в обычный JOIN. Условие на правую таблицу пишут в ON.' },
  },
  {
    id: 'l2-with',
    title: 'Подзапрос во FROM и WITH',
    html: `
<p>Ответ на любой запрос это тоже таблица. Значит, его можно поставить во FROM, как будто это обычная таблица. Ему нужно дать прозвище:</p>
${demo(`SELECT k.name, k.age
FROM (SELECT * FROM person WHERE address = 'Kazan') AS k
WHERE k.age > 20;`)}
<p>Когда подзапрос большой, читать такое трудно. Поэтому есть <b>WITH</b>: сначала даёшь кусочку имя, потом пользуешься им как таблицей.</p>
${demo(`WITH kazan AS (
  SELECT id, name FROM person WHERE address = 'Kazan'
)
SELECT k.name, pv.visit_date
FROM kazan k
JOIN person_visits pv ON pv.person_id = k.id
ORDER BY k.name, pv.visit_date;`)}
${parts([
  ['WITH kazan AS ( … )', '«пусть kazan это вот такой ответ». Такой кусок называют CTE'],
  ['FROM kazan k', 'дальше kazan работает как обычная таблица'],
])}
<p>Можно сделать несколько кусков через запятую: <code>WITH a AS (…), b AS (…) SELECT …</code>. Слово WITH пишется один раз.</p>`,
    example: `WITH cheap AS (
  SELECT * FROM menu WHERE price < 800
)
SELECT c.pizza_name, c.price, z.name AS pizzeria_name
FROM cheap c
JOIN pizzeria z ON c.pizzeria_id = z.id
ORDER BY c.price;`,
    exampleNote: 'Дешёвые пиццы и где их купить.',
    recall: { q: 'Как устроен запрос с WITH?', a: 'WITH имя AS (SELECT …) SELECT … FROM имя. Сначала даём имя подзапросу, потом пользуемся им как таблицей. Несколько кусков через запятую.' },
  },
  {
    id: 'l2-full',
    title: 'RIGHT JOIN и FULL JOIN',
    html: `
<p><b>RIGHT JOIN</b> это LEFT JOIN наоборот: оставляет все строки <b>правой</b> таблицы. <code>A RIGHT JOIN B</code> то же самое, что <code>B LEFT JOIN A</code>. На практике обычно пишут LEFT и ставят нужную таблицу слева.</p>
<p><b>FULL JOIN</b> оставляет всех с обеих сторон. Где пары нет, пусто либо справа, либо слева.</p>
${demo(`SELECT p.name, v.visit_date
FROM (SELECT * FROM person WHERE address = 'Kazan') p
FULL JOIN (SELECT * FROM person_visits WHERE visit_date = '2022-01-08') v
  ON v.person_id = p.id
ORDER BY p.name, v.visit_date;`, 'Слева люди из Казани, справа визиты 8 января. Kate в тот день не приходила: дата пустая. А один визит сделал человек не из Казани: пустое имя.')}
<p>Сравним все виды:</p>
${parts([
  ['JOIN', 'только пары'],
  ['LEFT JOIN', 'пары + левые без пары'],
  ['RIGHT JOIN', 'пары + правые без пары'],
  ['FULL JOIN', 'пары + левые без пары + правые без пары'],
  ['CROSS JOIN', 'все со всеми, без ON'],
])}`,
    example: `SELECT p.name, v.visit_date
FROM (SELECT * FROM person WHERE address = 'Moscow') p
FULL JOIN (SELECT * FROM person_visits WHERE visit_date = '2022-01-05') v
  ON v.person_id = p.id;`,
    exampleNote: 'Москвичи и визиты 5 января: здесь пары нет ни у кого.',
    recall: { q: 'Чем отличаются JOIN, LEFT JOIN и FULL JOIN?', a: 'JOIN: только пары. LEFT: пары и все строки левой таблицы. FULL: пары и все строки обеих таблиц; где пары нет, NULL.' },
  },
  {
    id: 'l2-coalesce',
    title: 'COALESCE: прочерк вместо пустоты',
    html: `
<p>После LEFT и FULL JOIN в ответе много <code>NULL</code>. Часто просят вместо пустоты написать что-то понятное, например прочерк <code>'-'</code>.</p>
<p><b>COALESCE(a, b, …)</b> возвращает первое значение в скобках, которое не пустое. Как «если первого нет, возьми второе».</p>
${parts([
  ["COALESCE('Anna', '-')", "'Anna'"],
  ["COALESCE(NULL, '-')", "'-'"],
  ["COALESCE(NULL, NULL, 'x')", "'x'"],
])}
${demo(`SELECT COALESCE(p.name, '-') AS person_name, v.visit_date
FROM (SELECT * FROM person WHERE address = 'Kazan') p
FULL JOIN (SELECT * FROM person_visits WHERE visit_date = '2022-01-08') v
  ON v.person_id = p.id
ORDER BY person_name, v.visit_date;`)}
<p>Значения в COALESCE должны быть одного типа. Текст с текстом, число с числом. Прочерк вместо даты так не поставить: <code>COALESCE(visit_date, '-')</code> даст ошибку.</p>`,
    example: `SELECT z.name, COALESCE(pv.person_id, 0) AS person_id
FROM pizzeria z
LEFT JOIN person_visits pv
  ON pv.pizzeria_id = z.id AND pv.visit_date = '2022-01-01'
ORDER BY z.name;`,
    exampleNote: 'Вместо пустого person_id стоит 0.',
    recall: { q: "Что вернёт COALESCE(NULL, NULL, 'x', 'y')?", a: "'x': первое непустое значение." },
  },
  {
    id: 'l2-self',
    title: 'Таблица сама с собой',
    html: `
<p>Задача: найти пары людей, которые живут в одном городе. Нужно сравнить человека с другим человеком из той же таблицы.</p>
<p>Решение: приклеить таблицу <code>person</code> саму к себе. Даём ей два разных прозвища, как будто это две копии: <code>p1</code> и <code>p2</code>.</p>
${demo(`SELECT p1.name AS person_name1, p2.name AS person_name2, p1.address AS common_address
FROM person p1
JOIN person p2 ON p1.address = p2.address AND p1.id > p2.id
ORDER BY 1, 2, 3;`)}
<p>Зачем <code>p1.id &gt; p2.id</code>? Без него будут пары человека с самим собой (Anna–Anna) и каждая пара дважды (Anna–Andrey и Andrey–Anna). Условие «первый номер больше второго» оставляет каждую пару ровно один раз.</p>
<p><code>ORDER BY 1, 2, 3</code> значит «сортируй по первой, второй и третьей колонке ответа». Это короткая запись, она тоже работает.</p>`,
    example: `SELECT m1.pizza_name, m1.pizzeria_id AS pizzeria_1, m2.pizzeria_id AS pizzeria_2, m1.price
FROM menu m1
JOIN menu m2 ON m1.pizza_name = m2.pizza_name AND m1.price = m2.price AND m1.id > m2.id
ORDER BY 1;`,
    exampleNote: 'Одинаковые пиццы по одинаковой цене в разных пиццериях.',
    recall: { q: 'Зачем в самосоединении пишут p1.id > p2.id?', a: 'Чтобы убрать пары человека с самим собой и не выводить каждую пару дважды (A–B и B–A).' },
  },
  {
    id: 'l2-union',
    title: 'UNION: ответы столбиком',
    html: `
<p>JOIN клеит таблицы <b>вбок</b>: колонок становится больше. А <b>UNION</b> ставит ответы двух запросов <b>друг под другом</b>: становится больше строк.</p>
${demo(`SELECT name FROM person WHERE address = 'Kazan'
UNION
SELECT name FROM person WHERE age > 30
ORDER BY name;`, 'Сверху люди из Казани (Kate, Denis, Elvira), снизу люди старше 30 (Kate, Elvira). Повторы убраны.')}
<p>Правила UNION:</p>
<ol>
<li>В обоих запросах <b>одинаковое число колонок</b>, и типы подходят друг к другу: текст под текстом, число под числом.</li>
<li>Имена колонок берутся из <b>первого</b> запроса. Поэтому AS пишут в первом.</li>
<li><code>UNION</code> убирает повторяющиеся строки. <code>UNION ALL</code> оставляет все.</li>
<li><code>ORDER BY</code> пишется <b>один раз в самом конце</b> и сортирует весь общий ответ.</li>
</ol>
${demo(`SELECT name FROM person WHERE address = 'Kazan'
UNION ALL
SELECT name FROM person WHERE age > 30
ORDER BY name;`, 'С UNION ALL Kate и Elvira встречаются дважды.')}`,
    example: `SELECT id AS object_id, name AS object_name FROM person
UNION
SELECT id, pizza_name FROM menu
ORDER BY object_id, object_name;`,
    exampleNote: 'Люди и пиццы одним списком. Имена колонок взяты из первого запроса.',
    recall: { q: 'Назови правила UNION. Чем UNION отличается от UNION ALL?', a: 'Одинаковое число колонок и совместимые типы; имена из первого запроса; ORDER BY один раз в конце. UNION убирает повторы, UNION ALL нет.' },
  },
  {
    id: 'l2-sets',
    title: 'INTERSECT и EXCEPT',
    html: `
<p>Представь два круга: в одном люди из Казани, в другом люди старше 30.</p>
${parts([
  ['A UNION B', 'кто есть хотя бы в одном круге'],
  ['A INTERSECT B', 'кто есть в <b>обоих</b> кругах (пересечение)'],
  ['A EXCEPT B', 'кто есть в A, но <b>нет</b> в B (вычитание)'],
])}
${demo(`SELECT name FROM person WHERE address = 'Kazan'
INTERSECT
SELECT name FROM person WHERE age > 30
ORDER BY name;`, 'Из Казани и старше 30.')}
${demo(`SELECT name FROM person WHERE address = 'Kazan'
EXCEPT
SELECT name FROM person WHERE age > 30
ORDER BY name;`, 'Из Казани, но не старше 30.')}
<p>Для EXCEPT важен порядок: <code>A EXCEPT B</code> и <code>B EXCEPT A</code> дают разное. Правила те же, что у UNION: одинаковое число колонок, ORDER BY в конце, повторы убираются.</p>
<p>EXCEPT это третий способ найти «тех, у кого нет пары». Например, позиции меню, которые никто не заказывал:</p>
${demo(`SELECT id FROM menu
EXCEPT
SELECT menu_id FROM person_order
ORDER BY id;`)}`,
    extraHtml: `<p>Итого у задачи «найти без пары» три решения, и на экзамене иногда запрещают одно из них:</p>
<ol><li><code>LEFT JOIN … WHERE b.id IS NULL</code></li><li><code>WHERE id NOT IN (SELECT …)</code></li><li><code>SELECT … EXCEPT SELECT …</code></li></ol>`,
    example: `SELECT pizzeria_id FROM person_visits WHERE person_id = 3
INTERSECT
SELECT pizzeria_id FROM person_visits WHERE person_id = 9;`,
    exampleNote: 'Пиццерии, где были и Kate (id 3), и Dmitriy (id 9). Замени INTERSECT на EXCEPT.',
    recall: { q: 'Что вернут A INTERSECT B и A EXCEPT B?', a: 'INTERSECT: строки, которые есть и в A, и в B. EXCEPT: строки из A, которых нет в B. Порядок у EXCEPT важен.' },
  },
  {
    id: 'l2-series',
    title: 'generate_series: список дат',
    html: `
<p>Иногда нужно найти, чего <b>нет</b> в таблице. Например, дни, когда никто не приходил. Но в таблице есть только дни, когда приходили. Пропущенных дней в ней нет, сравнивать не с чем.</p>
<p>Поможет <b>generate_series</b>: он сам создаёт таблицу из ряда значений.</p>
${demo(`SELECT gs::date AS day
FROM generate_series('2022-01-01'::date, '2022-01-10', '1 day') AS gs;`, 'От 1 до 10 января с шагом в один день.')}
${parts([
  ["'2022-01-01'::date", 'знак :: превращает текст в дату'],
  ["'1 day'", 'шаг: один день'],
  ['gs::date', 'generate_series выдаёт дату со временем, ::date оставляет только дату'],
])}
<p>Теперь приклеиваем визиты через LEFT JOIN и оставляем дни без пары. Это уже знакомый приём:</p>
${demo(`SELECT gs::date AS missing_date
FROM generate_series('2022-01-01'::date, '2022-01-10', '1 day') AS gs
LEFT JOIN (SELECT visit_date FROM person_visits WHERE person_id IN (1, 2)) v
  ON v.visit_date = gs::date
WHERE v.visit_date IS NULL
ORDER BY missing_date;`, 'Дни, когда ни Anna, ни Andrey не приходили.')}
<p>С числами generate_series работает так же: <code>generate_series(1, 5)</code> даст 1, 2, 3, 4, 5.</p>`,
    example: `SELECT gs::date AS missing_date
FROM generate_series('2022-01-01'::date, '2022-01-10', '1 day') AS gs
LEFT JOIN person_order po ON po.order_date = gs::date
WHERE po.id IS NULL;`,
    exampleNote: 'В какие дни никто ничего не заказывал?',
    recall: { q: 'Как получить все даты с 1 по 10 января 2022?', a: "generate_series('2022-01-01'::date, '2022-01-10', '1 day'), а значение привести к дате: gs::date." },
  },
  {
    id: 'l2-check',
    title: 'Проверь себя: JOIN и множества',
    html: `
<p>Список перед сдачей задания с несколькими таблицами:</p>
<ol class="checklist">
<li>На листке нарисована цепочка таблиц, и у каждой таблицы своё прозвище.</li>
<li>В каждом <code>JOIN</code> есть <code>ON</code> со связью «ссылка = id».</li>
<li>Колонки, которые есть в нескольких таблицах (<code>id</code>, <code>name</code>), написаны с прозвищем: <code>p.name</code>.</li>
<li>Одинаковые имена в ответе разведены через AS: <code>z.name AS pizzeria_name</code>.</li>
<li>Если строки без пары тоже нужны, стоит LEFT JOIN, а условие на правую таблицу в ON.</li>
<li>«Нет пары» ищется через <code>LEFT JOIN … IS NULL</code>, <code>NOT IN</code> или <code>EXCEPT</code>.</li>
<li>В UNION, INTERSECT и EXCEPT одинаковое число колонок, а ORDER BY стоит один раз в конце.</li>
<li>Если строки задваиваются, проверь ON. Если повторы правда лишние, поставь DISTINCT.</li>
</ol>`,
    example: `-- Нужно: id, название всех пиццерий и даты визитов 1 января.
-- Пиццерии без визитов тоже показать. Здесь 2 ошибки.
SELECT id, name, visit_date
FROM pizzeria z
LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id
WHERE pv.visit_date = '2022-01-01'
ORDER BY name;`,
    exampleNote: 'Подсказка: одна ошибка видна сразу при запуске, вторую найдёшь, если посчитать строки.',
    recall: { q: 'Назови по памяти хотя бы 5 пунктов списка.', a: 'Цепочка и прозвища; ON у каждого JOIN; общие колонки через прозвище; AS для одинаковых имён; LEFT JOIN и условие в ON; «нет пары»: IS NULL, NOT IN, EXCEPT; одинаковое число колонок в UNION, ORDER BY в конце; дубли: проверь ON.' },
  },
];

const TASKS = [
  { id: 'j01', level: 1, title: 'Кто и когда заказывал', text: 'Выведи дату заказа <code>order_date</code> и имя заказчика <code>name</code> для всех заказов. Сортировка по дате, затем по имени.', ref: `SELECT po.order_date, p.name FROM person_order po JOIN person p ON po.person_id = p.id ORDER BY po.order_date, p.name`, ordered: true, hint: 'FROM person_order po JOIN person p ON po.person_id = p.id' },
  { id: 'j02', level: 1, title: 'Недорогие пиццы', text: 'Выведи <code>pizza_name</code>, название пиццерии в колонке <code>pizzeria_name</code> и <code>price</code> для позиций меню не дороже 800. Сортировка по <code>pizzeria_name</code>, затем по <code>pizza_name</code>.', ref: `SELECT m.pizza_name, z.name AS pizzeria_name, m.price FROM menu m JOIN pizzeria z ON m.pizzeria_id = z.id WHERE m.price <= 800 ORDER BY pizzeria_name, m.pizza_name`, ordered: true, checkNames: ['pizzeria_name'], hint: 'JOIN pizzeria z ON m.pizzeria_id = z.id, и z.name AS pizzeria_name' },
  { id: 'j03', level: 1, title: 'Все пары', text: 'Выведи все пары «москвич + пиццерия»: колонки <code>person_name</code> и <code>pizzeria_name</code>. Москвичи это люди с <code>address = \'Moscow\'</code>. Сортировка по обеим колонкам.', ref: `SELECT p.name AS person_name, z.name AS pizzeria_name FROM person p CROSS JOIN pizzeria z WHERE p.address = 'Moscow' ORDER BY person_name, pizzeria_name`, ordered: true, checkNames: ['person_name', 'pizzeria_name'], hint: 'CROSS JOIN, условие на город в WHERE' },
  { id: 'j04', level: 2, title: 'Где бывал Денис', text: 'Выведи даты визитов <code>visit_date</code> и названия пиццерий <code>pizzeria_name</code> для всех визитов человека по имени <code>Denis</code>. Сортировка по дате.', ref: `SELECT pv.visit_date, z.name AS pizzeria_name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id WHERE p.name = 'Denis' ORDER BY pv.visit_date`, ordered: true, checkNames: ['pizzeria_name'], hint: 'Две стрелки: pv → person и pv → pizzeria' },
  { id: 'j05', level: 2, title: 'Пиццерия без гостей', text: 'Выведи названия пиццерий, в которые никто ни разу не приходил. <span class="rule">Решай через LEFT JOIN. Нельзя: NOT IN, EXISTS, EXCEPT.</span>', ref: `SELECT z.name FROM pizzeria z LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id WHERE pv.id IS NULL`, ordered: false, forbid: [/\bnot\s+in\b/i, /\bexists\b/i, /\bexcept\b/i], hint: 'LEFT JOIN person_visits … WHERE pv.id IS NULL' },
  { id: 'j06', level: 2, title: 'Никто не заказал', text: 'Выведи <code>id</code> позиций меню, которые никто ни разу не заказывал, в колонке <code>menu_id</code>. Сортировка по <code>menu_id</code>. <span class="rule">Нельзя: JOIN, IN.</span>', ref: `SELECT id AS menu_id FROM menu EXCEPT SELECT menu_id FROM person_order ORDER BY menu_id`, ordered: true, checkNames: ['menu_id'], forbid: [/\bjoin\b/i, /\bin\b/i], hint: 'SELECT id AS menu_id FROM menu EXCEPT SELECT menu_id FROM person_order' },
  { id: 'j07', level: 2, title: 'Один общий список', text: 'Выведи людей и пиццы одним списком: колонки <code>object_id</code> и <code>object_name</code>. Для людей это <code>id</code> и <code>name</code> из <code>person</code>, для пицц <code>id</code> и <code>pizza_name</code> из <code>menu</code>. Сортировка по <code>object_id</code>, затем по <code>object_name</code>.', ref: `SELECT id AS object_id, name AS object_name FROM person UNION SELECT id, pizza_name FROM menu ORDER BY object_id, object_name`, ordered: true, checkNames: ['object_id', 'object_name'], hint: 'UNION, а AS только в первом запросе' },
  { id: 'j08', level: 2, title: 'Без DISTINCT', text: 'Выведи уникальные названия пицц из меню, по убыванию названия. <span class="rule">Нельзя: DISTINCT, GROUP BY.</span>', ref: `SELECT pizza_name FROM menu UNION SELECT pizza_name FROM menu ORDER BY pizza_name DESC`, ordered: true, forbid: [/\bdistinct\b/i, /\bgroup\s+by\b/i], hint: 'UNION сам убирает повторы: склей запрос сам с собой' },
  { id: 'j09', level: 2, title: 'Пришёл и заказал', text: 'Найди дни, когда человек и приходил в пиццерию, и делал заказ. Выведи <code>action_date</code> и <code>person_id</code>. Сортировка по <code>action_date</code>, затем по <code>person_id</code> по убыванию. <span class="rule">Нельзя: JOIN.</span>', ref: `SELECT order_date AS action_date, person_id FROM person_order INTERSECT SELECT visit_date, person_id FROM person_visits ORDER BY action_date, person_id DESC`, ordered: true, checkNames: ['action_date'], forbid: [/\bjoin\b/i], hint: 'INTERSECT двух запросов: (дата, person_id) из заказов и из визитов' },
  { id: 'j10', level: 3, title: 'Все пиццерии 1 января', text: 'Выведи все пиццерии (<code>pizzeria_name</code>) и <code>person_id</code> тех, кто приходил в них 1 января 2022. Если в пиццерию в этот день никто не приходил, всё равно выведи её с пустым <code>person_id</code>. Сортировка по <code>pizzeria_name</code>, затем по <code>person_id</code>.', ref: `SELECT z.name AS pizzeria_name, pv.person_id FROM pizzeria z LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id AND pv.visit_date = '2022-01-01' ORDER BY pizzeria_name, pv.person_id`, ordered: true, checkNames: ['pizzeria_name'], hint: 'Дата в ON, а не в WHERE' },
  { id: 'j11', level: 3, title: 'Заказы казанцев', text: 'Для заказов людей из Казани выведи имя <code>person_name</code>, <code>pizza_name</code> и название пиццерии <code>pizzeria_name</code>. Сортировка по всем трём колонкам по порядку.', ref: `SELECT p.name AS person_name, m.pizza_name, z.name AS pizzeria_name FROM person_order po JOIN person p ON po.person_id = p.id JOIN menu m ON po.menu_id = m.id JOIN pizzeria z ON m.pizzeria_id = z.id WHERE p.address = 'Kazan' ORDER BY 1, 2, 3`, ordered: true, checkNames: ['person_name', 'pizzeria_name'], hint: 'Цепочка: po → person, po → menu → pizzeria' },
  { id: 'j12', level: 3, title: 'Соседи', text: 'Выведи пары людей из одного города: <code>person_name1</code>, <code>person_name2</code>, <code>common_address</code>. В паре первым идёт человек с большим <code>id</code>, каждая пара один раз. Сортировка по всем трём колонкам.', ref: `SELECT p1.name AS person_name1, p2.name AS person_name2, p1.address AS common_address FROM person p1 JOIN person p2 ON p1.address = p2.address AND p1.id > p2.id ORDER BY 1, 2, 3`, ordered: true, checkNames: ['person_name1', 'person_name2', 'common_address'], hint: 'person p1 JOIN person p2 ON … AND p1.id > p2.id' },
  { id: 'j13', level: 3, title: 'Пропущенные дни', text: 'Выведи дни с 1 по 10 января 2022 (колонка <code>missing_date</code>), когда ни человек с <code>id = 1</code>, ни человек с <code>id = 2</code> не приходили в пиццерии. Сортировка по дате.', ref: `SELECT gs::date AS missing_date FROM generate_series('2022-01-01'::date, '2022-01-10', '1 day') AS gs LEFT JOIN (SELECT visit_date FROM person_visits WHERE person_id IN (1, 2)) v ON v.visit_date = gs::date WHERE v.visit_date IS NULL ORDER BY missing_date`, ordered: true, checkNames: ['missing_date'], hint: "generate_series('2022-01-01'::date, '2022-01-10', '1 day') и LEFT JOIN с визитами" },
  { id: 'j14', level: 3, title: 'Прочерк вместо пустоты', text: 'Возьми визиты с 1 по 3 января 2022 включительно и соедини их через FULL JOIN со всеми людьми и всеми пиццериями. Выведи <code>person_name</code>, <code>visit_date</code>, <code>pizzeria_name</code>; пустые имена замени на <code>\'-\'</code>. Сортировка по <code>person_name</code>, <code>visit_date</code>, <code>pizzeria_name</code>.', ref: `SELECT COALESCE(p.name, '-') AS person_name, v.visit_date, COALESCE(z.name, '-') AS pizzeria_name FROM (SELECT * FROM person_visits WHERE visit_date BETWEEN '2022-01-01' AND '2022-01-03') v FULL JOIN person p ON v.person_id = p.id FULL JOIN pizzeria z ON v.pizzeria_id = z.id ORDER BY person_name, v.visit_date, pizzeria_name`, ordered: true, checkNames: ['person_name', 'pizzeria_name'], hint: 'Подзапрос с визитами во FROM, два FULL JOIN, COALESCE(p.name, \'-\')' },
  { id: 'j15', level: 4, title: 'Был, но не заказал', text: 'Выведи названия пиццерий (<code>pizzeria_name</code>), в которые приходил <code>Andrey</code>, но ничего в них не заказывал. Сортировка по названию.', ref: `SELECT z.name AS pizzeria_name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id WHERE p.name = 'Andrey' EXCEPT SELECT z.name FROM person_order po JOIN person p ON po.person_id = p.id JOIN menu m ON po.menu_id = m.id JOIN pizzeria z ON m.pizzeria_id = z.id WHERE p.name = 'Andrey' ORDER BY pizzeria_name`, ordered: true, checkNames: ['pizzeria_name'], hint: 'Пиццерии визитов Andrey EXCEPT пиццерии его заказов' },
  { id: 'j16', level: 4, title: 'Одна цена в двух местах', text: 'Найди одинаковые пиццы с одинаковой ценой в разных пиццериях. Выведи <code>pizza_name</code>, <code>pizzeria_name_1</code>, <code>pizzeria_name_2</code>, <code>price</code>. Первой идёт пиццерия той позиции меню, у которой <code>id</code> больше, каждая пара один раз. Сортировка по <code>pizza_name</code>.', ref: `SELECT m1.pizza_name, z1.name AS pizzeria_name_1, z2.name AS pizzeria_name_2, m1.price FROM menu m1 JOIN menu m2 ON m1.pizza_name = m2.pizza_name AND m1.price = m2.price AND m1.id > m2.id JOIN pizzeria z1 ON m1.pizzeria_id = z1.id JOIN pizzeria z2 ON m2.pizzeria_id = z2.id ORDER BY m1.pizza_name`, ordered: true, checkNames: ['pizzeria_name_1', 'pizzeria_name_2'], hint: 'menu m1 JOIN menu m2 … AND m1.id > m2.id, потом две пиццерии z1 и z2' },
  { id: 'j17', level: 4, title: 'И пепперони, и сырная', text: 'Выведи имена женщин, которые заказывали и <code>pepperoni pizza</code>, и <code>cheese pizza</code>. Сортировка по имени.', ref: `SELECT p.name FROM person_order po JOIN person p ON po.person_id = p.id JOIN menu m ON po.menu_id = m.id WHERE p.gender = 'female' AND m.pizza_name = 'pepperoni pizza' INTERSECT SELECT p.name FROM person_order po JOIN person p ON po.person_id = p.id JOIN menu m ON po.menu_id = m.id WHERE p.gender = 'female' AND m.pizza_name = 'cheese pizza' ORDER BY name`, ordered: true, hint: 'Два одинаковых запроса с разной пиццей, между ними INTERSECT' },
];

const EXAM = [
  { id: 'je01', level: 1, title: 'Гости Papa Johns', text: 'Выведи <code>visit_date</code> и имя <code>name</code> для визитов в пиццерию с <code>id = 4</code>. Сортировка по дате.', ref: `SELECT pv.visit_date, p.name FROM person_visits pv JOIN person p ON pv.person_id = p.id WHERE pv.pizzeria_id = 4 ORDER BY pv.visit_date`, ordered: true },
  { id: 'je02', level: 1, title: 'Меню лучших', text: 'Выведи <code>pizza_name</code> и <code>pizzeria_name</code> для пиццерий с рейтингом выше 4.5. Сортировка по <code>pizzeria_name</code>, затем по <code>pizza_name</code>.', ref: `SELECT m.pizza_name, z.name AS pizzeria_name FROM menu m JOIN pizzeria z ON m.pizzeria_id = z.id WHERE z.rating > 4.5 ORDER BY pizzeria_name, m.pizza_name`, ordered: true, checkNames: ['pizzeria_name'] },
  { id: 'je03', level: 1, title: 'Все имена', text: 'Выведи одной колонкой <code>name</code> имена всех людей и названия всех пиццерий, по алфавиту.', ref: `SELECT name FROM person UNION SELECT name FROM pizzeria ORDER BY name`, ordered: true, checkNames: ['name'] },
  { id: 'je04', level: 2, title: 'Не пришли 1 января', text: 'Выведи имена людей, которые не приходили ни в одну пиццерию 1 января 2022. Сортировка по имени. <span class="rule">Нельзя: NOT IN, EXISTS.</span>', ref: `SELECT name FROM person EXCEPT SELECT p.name FROM person_visits pv JOIN person p ON pv.person_id = p.id WHERE pv.visit_date = '2022-01-01' ORDER BY name`, ordered: true, forbid: [/\bnot\s+in\b/i, /\bexists\b/i] },
  { id: 'je05', level: 2, title: 'Заказы 7 января', text: 'Выведи всех людей (<code>name</code>) и даты их заказов <code>order_date</code> за 7 января 2022. Если человек в тот день не заказывал, дата пустая. Сортировка по имени.', ref: `SELECT p.name, po.order_date FROM person p LEFT JOIN person_order po ON po.person_id = p.id AND po.order_date = '2022-01-07' ORDER BY p.name`, ordered: true },
  { id: 'je06', level: 2, title: 'Общие пиццерии', text: 'Выведи названия пиццерий (<code>pizzeria_name</code>), в которых побывали и <code>Kate</code>, и <code>Dmitriy</code>. Сортировка по названию.', ref: `SELECT z.name AS pizzeria_name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id WHERE p.name = 'Kate' INTERSECT SELECT z.name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id WHERE p.name = 'Dmitriy' ORDER BY pizzeria_name`, ordered: true, checkNames: ['pizzeria_name'] },
  { id: 'je07', level: 3, title: 'День без заказов', text: 'Выведи дни с 1 по 10 января 2022 (колонка <code>missing_date</code>), когда никто ничего не заказывал. Сортировка по дате.', ref: `SELECT gs::date AS missing_date FROM generate_series('2022-01-01'::date, '2022-01-10', '1 day') AS gs LEFT JOIN person_order po ON po.order_date = gs::date WHERE po.id IS NULL ORDER BY missing_date`, ordered: true, checkNames: ['missing_date'] },
  { id: 'je08', level: 3, title: 'Почти ровесники', text: 'Выведи пары людей одного пола, у которых возраст отличается не больше чем на 3 года: <code>person_name1</code>, <code>person_name2</code>. В паре первым идёт человек с большим <code>id</code>, каждая пара один раз. Сортировка по обеим колонкам.', ref: `SELECT p1.name AS person_name1, p2.name AS person_name2 FROM person p1 JOIN person p2 ON p1.gender = p2.gender AND p1.id > p2.id AND ABS(p1.age - p2.age) <= 3 ORDER BY 1, 2`, ordered: true, checkNames: ['person_name1', 'person_name2'] },
  { id: 'je09', level: 3, title: 'Москвичи 5 января', text: 'Соедини через FULL JOIN людей из Москвы и визиты 5 января 2022 (по <code>person_id</code>). Выведи <code>person_name</code> (пустое имя замени на <code>\'-\'</code>) и <code>visit_date</code>. Сортировка по <code>person_name</code>, затем по <code>visit_date</code>.', ref: `SELECT COALESCE(p.name, '-') AS person_name, v.visit_date FROM (SELECT * FROM person WHERE address = 'Moscow') p FULL JOIN (SELECT * FROM person_visits WHERE visit_date = '2022-01-05') v ON v.person_id = p.id ORDER BY person_name, v.visit_date`, ordered: true, checkNames: ['person_name'] },
  { id: 'je10', level: 4, title: 'Зашла и ушла', text: 'Выведи названия пиццерий (<code>pizzeria_name</code>), в которых была <code>Kate</code>, но ничего там не заказывала.', ref: `SELECT z.name AS pizzeria_name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id WHERE p.name = 'Kate' EXCEPT SELECT z.name FROM person_order po JOIN person p ON po.person_id = p.id JOIN menu m ON po.menu_id = m.id JOIN pizzeria z ON m.pizzeria_id = z.id WHERE p.name = 'Kate'`, ordered: false, checkNames: ['pizzeria_name'] },
  { id: 'je11', level: 4, title: 'Невостребованные пиццы', text: 'Выведи <code>pizza_name</code>, <code>price</code> и <code>pizzeria_name</code> для позиций меню, которые никто не заказывал. Сортировка по <code>pizza_name</code>, затем по <code>price</code>.', ref: `SELECT m.pizza_name, m.price, z.name AS pizzeria_name FROM menu m JOIN pizzeria z ON m.pizzeria_id = z.id LEFT JOIN person_order po ON po.menu_id = m.id WHERE po.id IS NULL ORDER BY m.pizza_name, m.price`, ordered: true, checkNames: ['pizzeria_name'] },
  { id: 'je12', level: 4, title: 'Дешёвая пицца Дмитрия', text: 'Найди пиццерию (<code>pizzeria_name</code>), в которой <code>Dmitriy</code> был 8 января 2022 и где есть пицца дешевле 800.', ref: `SELECT DISTINCT z.name AS pizzeria_name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id JOIN menu m ON m.pizzeria_id = z.id WHERE p.name = 'Dmitriy' AND pv.visit_date = '2022-01-08' AND m.price < 800`, ordered: false, checkNames: ['pizzeria_name'] },
];

const CARDS = [
  { id: 'jc01', type: 'recall', q: 'Что делает JOIN … ON?', a: 'Склеивает строки двух таблиц и оставляет только пары, для которых условие после ON верно (обычно ссылка = id).' },
  { id: 'jc02', type: 'recall', q: 'В таблицах 9 и 6 строк. Сколько строк даст CROSS JOIN?', a: '54: каждая строка с каждой.' },
  { id: 'jc03', type: 'recall', q: 'Чем LEFT JOIN отличается от JOIN?', a: 'LEFT JOIN оставляет все строки левой таблицы. У строк без пары колонки правой таблицы NULL.' },
  { id: 'jc04', type: 'recall', q: 'Как найти строки без пары через LEFT JOIN?', a: 'A LEFT JOIN B ON … WHERE B.id IS NULL' },
  { id: 'jc05', type: 'recall', q: 'LEFT JOIN: условие на правую таблицу пишем в ON или в WHERE?', a: 'В ON. В WHERE оно выбросит строки с NULL, и LEFT JOIN станет обычным JOIN.' },
  { id: 'jc06', type: 'recall', q: 'Ошибка column reference "id" is ambiguous. Что делать?', a: 'Колонка id есть в нескольких таблицах. Написать её с прозвищем таблицы: p.id.' },
  { id: 'jc07', type: 'recall', q: 'Чем UNION отличается от UNION ALL?', a: 'UNION убирает повторяющиеся строки, UNION ALL оставляет все.' },
  { id: 'jc08', type: 'recall', q: 'Три правила UNION.', a: 'Одинаковое число колонок и совместимые типы; имена колонок из первого запроса; ORDER BY один раз в конце.' },
  { id: 'jc09', type: 'recall', q: 'Что вернут INTERSECT и EXCEPT?', a: 'INTERSECT: строки, которые есть в обоих ответах. A EXCEPT B: строки из A, которых нет в B.' },
  { id: 'jc10', type: 'recall', q: "Что вернёт COALESCE(NULL, NULL, 'x', 'y')?", a: "'x', первое непустое значение." },
  { id: 'jc11', type: 'recall', q: 'Как выглядит запрос с WITH?', a: 'WITH имя AS (SELECT …) SELECT … FROM имя' },
  { id: 'jc12', type: 'recall', q: 'Как получить все даты с 1 по 10 января 2022?', a: "SELECT gs::date FROM generate_series('2022-01-01'::date, '2022-01-10', '1 day') AS gs" },
  { id: 'jc13', type: 'recall', q: 'Три способа найти «тех, у кого нет пары».', a: 'LEFT JOIN … WHERE b.id IS NULL; NOT IN (SELECT …); SELECT … EXCEPT SELECT …' },
  { id: 'jc14', type: 'write', q: 'Название пиццы (pizza_name) и название пиццерии (pizzeria_name) для всех позиций меню.', ref: `SELECT m.pizza_name, z.name AS pizzeria_name FROM menu m JOIN pizzeria z ON m.pizzeria_id = z.id`, ordered: false, checkNames: ['pizzeria_name'] },
  { id: 'jc15', type: 'write', q: 'Имена людей, которые хотя бы раз были в Pizza Hut, без повторов (через JOIN).', ref: `SELECT DISTINCT p.name FROM person_visits pv JOIN person p ON pv.person_id = p.id JOIN pizzeria z ON pv.pizzeria_id = z.id WHERE z.name = 'Pizza Hut'`, ordered: false },
  { id: 'jc16', type: 'write', q: 'id позиций меню, которые никто не заказывал (через EXCEPT), по возрастанию.', ref: `SELECT id FROM menu EXCEPT SELECT menu_id FROM person_order ORDER BY id`, ordered: true },
  { id: 'jc17', type: 'write', q: 'Все пиццерии (name) и даты визитов (visit_date), включая пиццерии без визитов.', ref: `SELECT z.name, pv.visit_date FROM pizzeria z LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id`, ordered: false },
];

const TEST = [
  { id: 'jq1', type: 'choice', q: 'В таблице A 4 строки, в таблице B 3 строки. Сколько строк вернёт A CROSS JOIN B?', options: ['7', '12', '4', '3'], correct: 1, why: 'Каждая строка A с каждой строкой B: 4 × 3.' },
  { id: 'jq2', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT z.name FROM pizzeria z JOIN person_visits pv ON pv.pizzeria_id = z.id;`, why: 'У каждого визита ровно одна пиццерия, поэтому строк столько же, сколько визитов.' },
  { id: 'jq3', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT z.name FROM pizzeria z LEFT JOIN person_visits pv ON pv.pizzeria_id = z.id;`, why: 'Все визиты плюс одна строка для пиццерии без визитов.' },
  { id: 'jq4', type: 'choice', q: 'Что будет со строкой левой таблицы, у которой нет пары, при LEFT JOIN?', options: ['Она пропадёт', 'Она останется, колонки правой таблицы будут NULL', 'Запрос выдаст ошибку', 'Она склеится с первой строкой правой таблицы'], correct: 1, why: 'LEFT JOIN сохраняет все строки левой таблицы.' },
  { id: 'jq5', type: 'choice', q: 'Какой запрос выдаст ошибку?', options: ['SELECT p.id FROM person p JOIN person_visits pv ON pv.person_id = p.id', 'SELECT id FROM person p JOIN person_visits pv ON pv.person_id = p.id', 'SELECT name FROM person p JOIN person_visits pv ON pv.person_id = p.id', 'SELECT visit_date FROM person p JOIN person_visits pv ON pv.person_id = p.id'], correct: 1, why: 'id есть в обеих таблицах: column reference "id" is ambiguous.' },
  { id: 'jq6', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT name FROM person WHERE address = 'Kazan'\nUNION ALL\nSELECT name FROM person WHERE age > 30;`, why: 'UNION ALL оставляет повторы: 3 + 2.' },
  { id: 'jq7', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT name FROM person WHERE address = 'Kazan'\nUNION\nSELECT name FROM person WHERE age > 30;`, why: 'UNION убирает повторы: Kate и Elvira есть в обоих списках.' },
  { id: 'jq8', type: 'choice', q: 'Что вернёт SELECT id FROM menu EXCEPT SELECT menu_id FROM person_order?', options: ['id всех позиций меню', 'id позиций, которые заказывали', 'id позиций, которые никто не заказывал', 'Ошибку: разные имена колонок'], correct: 2, why: 'EXCEPT вычитает из первого ответа второй. Имена колонок могут отличаться.' },
  { id: 'jq9', type: 'choice', q: "Чему равен LEFT JOIN, если в WHERE стоит условие на правую таблицу, например pv.visit_date = '2022-01-01'?", options: ['Обычному JOIN', 'FULL JOIN', 'CROSS JOIN', 'Ничего не меняется'], correct: 0, why: 'WHERE выбрасывает строки с NULL справа, остаются только пары.' },
  { id: 'jq10', type: 'write', q: 'Напиши запрос: имя (name) и дата заказа (order_date) для всех заказов 1 января 2022, сортировка по имени.', ref: `SELECT p.name, po.order_date FROM person_order po JOIN person p ON po.person_id = p.id WHERE po.order_date = '2022-01-01' ORDER BY p.name`, ordered: true },
  { id: 'jq11', type: 'write', q: 'Напиши запрос: названия пиццерий, в которые никто не приходил (любым способом).', ref: `SELECT name FROM pizzeria WHERE id NOT IN (SELECT pizzeria_id FROM person_visits)`, ordered: false },
];

export const TOPIC_JOIN = {
  id: 'join',
  n: 2,
  title: 'JOIN и операции над множествами',
  short: 'JOIN',
  day: 'Bootcamp Day 01–03',
  lead: 'Как собрать ответ из нескольких таблиц: JOIN, LEFT и FULL JOIN, самосоединение, UNION, INTERSECT, EXCEPT, WITH и generate_series.',
  lessons: LESSONS, tasks: TASKS, exam: EXAM, cards: CARDS, test: TEST,
};
