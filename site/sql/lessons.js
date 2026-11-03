// Теория темы 1, с нуля. Каждый раздел: одна идея, простые слова, живой пример «было → стало».
// demo(sql) рисует на странице: сам запрос, исходную таблицу (отброшенные строки зачёркнуты,
// выбранные колонки подсвечены) и результат. Всё считается настоящим PostgreSQL в браузере.

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const demo = (sql, note = '') => `<div class="demo" data-sql="${attr(sql)}"${note ? ` data-note="${attr(note)}"` : ''}></div>`;
const parts = (rows) => `<table class="parts"><tbody>${rows.map(([code, text]) => `<tr><td><code>${code}</code></td><td>${text}</td></tr>`).join('')}</tbody></table>`;

export const LESSONS = [
  {
    id: 'l-table',
    title: 'Таблица, строка, колонка',
    html: `
<p>Представь классный журнал. В нём есть список учеников, и про каждого записано одно и то же: имя, возраст, оценки.</p>
<p>База данных устроена так же. Она хранит сведения в <b>таблицах</b>, а таблица выглядит как такой журнал или лист в Excel.</p>
<ul>
<li><b>Строка</b> идёт слева направо. Одна строка это один ученик, или один человек, или одна пицца.</li>
<li><b>Колонка</b> идёт сверху вниз. Одна колонка это одно свойство: у всех людей есть имя, значит, есть колонка «имя».</li>
<li>В клетке на пересечении строки и колонки лежит одно значение. Например, возраст Анны: 16.</li>
</ul>
<p>Вот таблица <code>person</code>. В ней 9 строк (9 людей) и 5 колонок: <code>id</code> (номер), <code>name</code> (имя), <code>age</code> (возраст), <code>gender</code> (пол), <code>address</code> (город).</p>
<div class="demo-table" data-table="person"></div>
<p>В нашей базе пять таких таблиц про людей и пиццерии. Их список всегда открыт в «Песочнице».</p>
<p><b>SQL</b> это язык, на котором мы задаём таблицам вопросы. Один вопрос называется <b>запросом</b>. Например: «покажи имена всех, кто старше 20». Ответ на запрос тоже выглядит как таблица.</p>`,
    example: `SELECT * FROM pizzeria;`,
    exampleNote: 'Нажми «Запустить»: увидишь таблицу pizzeria целиком.',
    recall: { q: 'Что такое строка и что такое колонка в таблице person?', a: 'Строка это один человек (одна запись). Колонка это одно свойство всех людей: имя, возраст, город.' },
  },
  {
    id: 'l-first',
    title: 'Первый запрос: SELECT * FROM',
    html: `
<p>Самый простой запрос показывает таблицу целиком:</p>
<pre class="snip">SELECT * FROM person;</pre>
<p>Разберём каждое слово:</p>
${parts([
  ['SELECT', '«выбери». С этого слова начинается почти каждый запрос.'],
  ['*', '«все колонки». Звёздочка значит «всё, что есть».'],
  ['FROM person', '«из таблицы person». После FROM пишем имя таблицы.'],
  [';', 'конец запроса, как точка в предложении.'],
])}
<p>Получается: «выбери все колонки из таблицы person».</p>
<p>Большие и маленькие буквы в словах SQL не важны: <code>select</code> и <code>SELECT</code> работают одинаково. Ключевые слова принято писать большими буквами, чтобы они отличались от имён таблиц и колонок.</p>`,
    example: `SELECT * FROM menu;`,
    exampleNote: 'Запусти. Потом поменяй menu на pizzeria или person и запусти снова.',
    recall: { q: 'Что значат * и FROM в запросе SELECT * FROM person?', a: '* это все колонки. FROM person означает, что данные берём из таблицы person.' },
  },
  {
    id: 'l-columns',
    title: 'Выбираем нужные колонки',
    html: `
<p>Обычно нужна не вся таблица, а только некоторые колонки. Вместо <code>*</code> перечисли их через запятую:</p>
${demo(`SELECT name, age FROM person;`)}
<p>Подсвеченные колонки попали в ответ, остальные нет. Колонки в ответе идут в том порядке, в котором ты их написал:</p>
${demo(`SELECT age, name FROM person;`)}
<p>Две частые ошибки:</p>
<ul>
<li>Запятая перед FROM: <code>SELECT name, age, FROM person</code>. Это ошибка.</li>
<li>Опечатка в имени колонки: <code>nmae</code>. PostgreSQL ответит, что такой колонки нет.</li>
</ul>`,
    example: `SELECT name, address FROM person;`,
    exampleNote: 'Выведи имя и город. Потом попробуй вывести название пиццы и цену из таблицы menu.',
    recall: { q: 'Как вывести из таблицы menu только название пиццы и цену?', a: 'SELECT pizza_name, price FROM menu;' },
  },
  {
    id: 'l-expr',
    title: 'Вычисления и новые имена колонок',
    html: `
<p>В SELECT можно не только брать колонку как есть, но и считать. Например, цена со скидкой 10%:</p>
${demo(`SELECT pizza_name, price, price * 0.9 FROM menu WHERE pizzeria_id = 1;`)}
<p>У вычисленной колонки некрасивое имя. Дадим ей своё через <code>AS</code> («как»):</p>
${demo(`SELECT pizza_name, price * 0.9 AS sale_price FROM menu WHERE pizzeria_id = 1;`)}
<p><code>AS</code> работает и для обычных колонок: <code>name AS person_name</code>. Это называется <b>алиас</b>, то есть псевдоним.</p>
<h4>Склеиваем текст</h4>
<p>Два вертикальных штриха <code>||</code> склеивают кусочки текста в одну строку. Свой текст пишем в <b>одинарных</b> кавычках:</p>
${demo(`SELECT name || ' from ' || address AS info FROM person;`)}
<ul>
<li><code>'Kazan'</code> в одинарных кавычках это текст. <code>"Kazan"</code> в двойных PostgreSQL примет за имя колонки и выдаст ошибку.</li>
<li>Если внутри текста нужна сама кавычка, её пишут два раза: <code>'it''s'</code>.</li>
</ul>`,
    example: `SELECT name || ' (' || age || ')' AS person_info FROM person;`,
    exampleNote: 'Запусти. Потом поменяй текст в кавычках и имя после AS.',
    recall: { q: 'Как назвать вычисленную колонку price * 2 именем double_price? Какими кавычками пишется текст?', a: "price * 2 AS double_price. Текст пишется в одинарных кавычках: 'Kazan'." },
  },
  {
    id: 'l-where',
    title: 'WHERE: оставляем только нужные строки',
    html: `
<p>SELECT выбирает <b>колонки</b>. А чтобы выбрать <b>строки</b>, нужен <code>WHERE</code> («где»).</p>
<p>Представь охранника у двери с правилом «пускать только тех, кому больше 20». Люди подходят по одному. Если правило выполнено, человек проходит. Если нет, остаётся за дверью.</p>
<p>WHERE работает так же: берёт строки по одной и проверяет условие. Если оно верно, строка остаётся в ответе. Если нет, строка выбрасывается.</p>
${demo(`SELECT name, age FROM person WHERE age > 20;`, 'Зачёркнутые строки не прошли проверку: 16, 13 и 18 не больше 20. Остальные остались.')}
<p>Знаки сравнения:</p>
${parts([
  ['=', 'равно'],
  ['<> или !=', 'не равно'],
  ['>  <', 'больше, меньше'],
  ['>=  <=', 'больше или равно, меньше или равно'],
])}
<p>С текстом сравнивают так же, только значение в одинарных кавычках:</p>
${demo(`SELECT name, address FROM person WHERE address = 'Kazan';`)}
<p>Регистр в тексте важен: <code>'kazan'</code> и <code>'Kazan'</code> это разные значения.</p>`,
    example: `SELECT * FROM menu WHERE price < 900;`,
    exampleNote: 'Запусти и нажми «Показать выполнение»: увидишь, какие строки отбросил WHERE.',
    recall: { q: 'Чем WHERE отличается от SELECT? Что WHERE делает с каждой строкой?', a: 'SELECT выбирает колонки, WHERE выбирает строки. WHERE проверяет условие для каждой строки и оставляет только те, где оно верно.' },
  },
  {
    id: 'l-andor',
    title: 'Несколько условий: AND, OR, NOT',
    html: `
<p>Условия можно соединять.</p>
${parts([
  ['AND', '«и»: строка остаётся, если верны <b>оба</b> условия.'],
  ['OR', '«или»: строка остаётся, если верно <b>хотя бы одно</b>.'],
  ['NOT', '«не»: переворачивает условие.'],
])}
<p>Женщины из Казани, то есть оба условия сразу:</p>
${demo(`SELECT name, gender, address FROM person WHERE gender = 'female' AND address = 'Kazan';`)}
<p>Люди из Казани или из Москвы, то есть подходит любое из двух:</p>
${demo(`SELECT name, address FROM person WHERE address = 'Kazan' OR address = 'Moscow';`)}
<h4>Ловушка: AND сильнее OR</h4>
<p>Как в математике умножение выполняется раньше сложения, так и AND выполняется раньше OR. Хотим «мужчины старше 20 из Москвы или Казани». Если написать без скобок:</p>
${demo(`SELECT name, gender, age, address FROM person WHERE address = 'Moscow' OR address = 'Kazan' AND gender = 'male' AND age > 20;`, 'Без скобок: Moscow OR (Kazan AND male AND >20). Анна, Андрей и все москвичи прошли, хотя это не то, что мы хотели.')}
<p>Со скобками получается то, что задумано:</p>
${demo(`SELECT name, gender, age, address FROM person WHERE (address = 'Moscow' OR address = 'Kazan') AND gender = 'male' AND age > 20;`)}
<p>Правило: если в условии есть и AND, и OR, ставь скобки.</p>`,
    example: `SELECT name, age, address FROM person
WHERE (address = 'Kazan' OR address = 'Samara') AND age < 20;`,
    exampleNote: 'Убери скобки, запусти снова и сравни результат.',
    recall: { q: 'Что выполняется раньше, AND или OR? Как это исправить, если нужно иначе?', a: 'AND выполняется раньше OR. Нужный порядок задаётся скобками.' },
  },
  {
    id: 'l-short',
    title: 'Короткие условия: IN, BETWEEN, LIKE, IS NULL',
    html: `
<p>Есть слова, которые заменяют длинные условия.</p>
<h4>IN: одно из списка</h4>
<p><code>address IN ('Kazan', 'Moscow')</code> значит то же, что <code>address = 'Kazan' OR address = 'Moscow'</code>.</p>
${demo(`SELECT name, address FROM person WHERE address IN ('Kazan', 'Samara');`)}
<p><code>NOT IN</code> наоборот: всё, кроме списка.</p>
<h4>BETWEEN: от и до</h4>
<p><code>price BETWEEN 800 AND 1000</code> значит «от 800 до 1000», <b>включая</b> оба края. То же самое, что <code>price >= 800 AND price <= 1000</code>.</p>
${demo(`SELECT pizza_name, price FROM menu WHERE price BETWEEN 800 AND 900;`)}
<h4>LIKE: поиск по кусочку текста</h4>
<p>В LIKE есть два особых символа:</p>
${parts([
  ['%', 'любое количество любых символов, даже ноль'],
  ['_', 'ровно один любой символ'],
])}
<p><code>'D%'</code> значит «начинается на D». <code>'%a'</code> значит «заканчивается на a». <code>'%pizza%'</code> значит «где-то внутри есть pizza».</p>
${demo(`SELECT name FROM person WHERE name LIKE 'D%';`)}
<p>LIKE различает большие и маленькие буквы. <code>ILIKE</code> работает так же, но не различает.</p>
<p>Чтобы найти всё, что <b>не</b> подходит под шаблон, пиши <code>NOT LIKE</code> или <code>NOT ILIKE</code>. Например, имена без буквы e: <code>name NOT ILIKE '%e%'</code>.</p>
<h4>IS NULL: пустое значение</h4>
<p><code>NULL</code> значит «значения нет». Его нельзя сравнить через <code>=</code>: условие <code>address = NULL</code> никогда не бывает верным. Проверять можно только <code>address IS NULL</code> или <code>address IS NOT NULL</code>.</p>`,
    example: `SELECT pizza_name, price FROM menu
WHERE pizza_name LIKE 's%' AND price BETWEEN 900 AND 1200;`,
    exampleNote: 'Пиццы на букву s по цене от 900 до 1200. Попробуй поменять s% на %e%.',
    recall: { q: "Что значат % и _ в LIKE? Включает ли BETWEEN 800 AND 1000 сами 800 и 1000?", a: '% это любое количество символов, _ ровно один символ. BETWEEN включает оба края.' },
  },
  {
    id: 'l-order',
    title: 'ORDER BY: сортировка',
    html: `
<p>Без сортировки строки идут в случайном порядке. Если в задании сказано «отсортируй», нужен <code>ORDER BY</code> («упорядочить по»). Он пишется после WHERE.</p>
${parts([
  ['ORDER BY age', 'по возрастанию: от меньшего к большему. Так по умолчанию, можно дописать ASC.'],
  ['ORDER BY age DESC', 'по убыванию: от большего к меньшему.'],
])}
${demo(`SELECT name, age FROM person ORDER BY age DESC;`)}
<p>Текст сортируется по алфавиту.</p>
<h4>Сортировка по двум колонкам</h4>
<p>Сначала строки сортируются по первой колонке. Вторая колонка нужна только там, где первая совпала. Здесь люди сгруппированы по городу, а внутри города идут по возрасту от старших:</p>
${demo(`SELECT address, name, age FROM person ORDER BY address, age DESC;`)}
<p>Внимание: <code>DESC</code> относится только к той колонке, после которой написан. В примере выше город идёт по алфавиту (A→Z), а возраст по убыванию.</p>`,
    example: `SELECT pizza_name, price FROM menu
ORDER BY price DESC, pizza_name;`,
    exampleNote: 'Нажми «Показать выполнение» и посмотри, как строки переставляются на шаге ORDER BY.',
    recall: { q: 'ORDER BY address, age DESC: в каком направлении сортируется address?', a: 'По возрастанию, по алфавиту. DESC относится только к age.' },
  },
  {
    id: 'l-distinct',
    title: 'DISTINCT, LIMIT и OFFSET',
    html: `
<h4>DISTINCT: убрать повторы</h4>
<p>В меню у разных пиццерий есть одинаковые пиццы. Если нужен список названий без повторов, пиши <code>DISTINCT</code> сразу после SELECT:</p>
${demo(`SELECT DISTINCT pizza_name FROM menu;`)}
<p>Если колонок несколько, повтором считается строка, где совпадают <b>все</b> колонки.</p>
<h4>LIMIT: только первые N строк</h4>
<p><code>LIMIT 3</code> оставляет первые три строки. Почти всегда идёт вместе с ORDER BY, иначе непонятно, какие строки «первые». Три самые дорогие позиции:</p>
${demo(`SELECT pizza_name, price FROM menu ORDER BY price DESC, id LIMIT 3;`)}
<h4>OFFSET: пропустить первые N</h4>
<p><code>LIMIT 3 OFFSET 3</code> значит «пропусти 3 и возьми следующие 3», то есть строки с 4-й по 6-ю.</p>
${demo(`SELECT pizza_name, price FROM menu ORDER BY price DESC, id LIMIT 3 OFFSET 3;`)}`,
    example: `SELECT DISTINCT address FROM person ORDER BY address;`,
    exampleNote: 'Список городов без повторов. Убери DISTINCT и сравни.',
    recall: { q: 'Что делает DISTINCT? Какие строки вернёт LIMIT 5 OFFSET 10?', a: 'DISTINCT убирает повторяющиеся строки. LIMIT 5 OFFSET 10 пропускает 10 строк и берёт следующие 5, с 11-й по 15-ю.' },
  },
  {
    id: 'l-case',
    title: 'CASE: если… то… иначе',
    html: `
<p><code>CASE</code> позволяет написать «если» прямо в SELECT. Для каждой строки он выбирает одно значение.</p>
<pre class="snip">CASE
  WHEN условие1 THEN значение1   -- если условие1 верно
  WHEN условие2 THEN значение2   -- иначе, если условие2 верно
  ELSE значение3                 -- во всех остальных случаях
END AS имя_колонки</pre>
<p>Подпишем каждого человека: младше 18 это teen, остальные adult.</p>
${demo(`SELECT name, age, CASE WHEN age < 18 THEN 'teen' ELSE 'adult' END AS age_group FROM person;`)}
<ul>
<li>Условия проверяются сверху вниз, срабатывает первое верное.</li>
<li>Если ни одно не подошло и нет ELSE, получится NULL (пусто).</li>
<li>CASE всегда заканчивается словом <code>END</code>. Его забывают чаще всего.</li>
</ul>`,
    example: `SELECT pizza_name, price,
  CASE
    WHEN price < 800 THEN 'cheap'
    WHEN price <= 1000 THEN 'normal'
    ELSE 'expensive'
  END AS category
FROM menu
ORDER BY price;`,
    exampleNote: 'Каждой пицце присваивается ценовая категория. Поменяй границы и посмотри, что изменится.',
    recall: { q: 'Из каких слов состоит CASE, и каким словом он заканчивается?', a: 'CASE WHEN … THEN … ELSE … END. Заканчивается словом END.' },
  },
  {
    id: 'l-bits',
    title: 'Полезные мелочи: числа, даты, среднее',
    html: `
<p>В заданиях встречаются ещё несколько вещей. Каждая простая.</p>
<h4>Остаток от деления: %</h4>
<p><code>7 % 2</code> это остаток от деления 7 на 2, то есть 1. У чётного числа остаток от деления на 2 равен 0. Поэтому «чётные id» записываются так: <code>WHERE id % 2 = 0</code>. Нечётные: <code>id % 2 = 1</code>.</p>
${demo(`SELECT id, name FROM person WHERE id % 2 = 0;`)}
<h4>Округление: ROUND</h4>
<p><code>ROUND(число)</code> округляет до целого. <code>ROUND(число, 1)</code> оставляет одну цифру после запятой.</p>
${demo(`SELECT pizza_name, price, ROUND(price * 0.85) AS discount_price FROM menu WHERE pizzeria_id = 4;`)}
<h4>Даты</h4>
<p>Дата пишется в одинарных кавычках в виде год-месяц-день: <code>'2022-01-07'</code>. Даты можно сравнивать, как числа: более ранняя дата считается меньше.</p>
${demo(`SELECT person_id, visit_date FROM person_visits WHERE visit_date < '2022-01-03';`)}
<h4>Среднее, наибольшее, наименьшее</h4>
<p>Эти слова считают одно число по всей колонке:</p>
${parts([
  ['AVG(price)', 'среднее значение'],
  ['MAX(price)', 'самое большое'],
  ['MIN(price)', 'самое маленькое'],
  ['COUNT(*)', 'сколько всего строк'],
])}
${demo(`SELECT AVG(price), MAX(price), MIN(price), COUNT(*) FROM menu;`)}
<p>В этой теме они понадобятся внутри подзапроса. Подробно ими займёмся в следующей теме.</p>`,
    example: `SELECT id, pizza_name, price FROM menu
WHERE id % 2 = 1 AND price <= 900;`,
    exampleNote: 'Нечётные id и цена не больше 900.',
    recall: { q: 'Как выбрать строки с чётным id? Как записать дату 7 января 2022?', a: "WHERE id % 2 = 0. Дата: '2022-01-07'." },
  },
  {
    id: 'l-sub',
    title: 'Подзапрос: запрос внутри запроса',
    html: `
<p>Иногда для ответа нужны две таблицы. Например: «имена людей, которые заказывали пиццу 7 января». Имена лежат в <code>person</code>, а заказы в <code>person_order</code>. Заказ ссылается на человека по номеру: колонка <code>person_id</code> равна <code>id</code> в таблице person.</p>
<p>Решаем в два шага. Сначала узнаём номера людей, которые заказывали 7 января:</p>
${demo(`SELECT person_id FROM person_order WHERE order_date = '2022-01-07';`)}
<p>Номер 4 повторился, потому что этот человек заказал три пиццы. Теперь вставляем этот запрос в скобки внутрь другого запроса. Получается «люди, чей id есть в этом списке»:</p>
${demo(`SELECT name FROM person WHERE id IN (SELECT person_id FROM person_order WHERE order_date = '2022-01-07');`)}
<p>Запрос в скобках называется <b>подзапросом</b>. Сначала выполняется он, а его результат подставляется во внешний запрос.</p>
<ul>
<li>Подзапрос внутри <code>IN (...)</code> должен вернуть одну колонку.</li>
<li>Если подзапрос возвращает одно число, его можно сравнивать через <code>&gt;</code> или <code>=</code>. Например, пиццы дороже средней цены: <code>WHERE price &gt; (SELECT AVG(price) FROM menu)</code>. Здесь <code>AVG</code> считает среднее.</li>
</ul>`,
    example: `SELECT pizza_name, price FROM menu
WHERE price > (SELECT AVG(price) FROM menu)
ORDER BY price DESC;`,
    extraHtml: `<h4>Подзапрос в SELECT</h4>
<p>Подзапрос можно поставить и в SELECT, чтобы для каждой строки достать одно значение из другой таблицы. Например, к каждому заказу подписать имя заказчика:</p>
${demo(`SELECT (SELECT name FROM person WHERE id = po.person_id) AS name, order_date FROM person_order po WHERE order_date = '2022-01-07';`)}
<p>Здесь <code>po</code> после имени таблицы это её короткое прозвище. Запись <code>po.person_id</code> значит «колонка person_id из той строки person_order, которую сейчас обрабатываем». Для каждой строки заказа подзапрос находит одного человека и возвращает его имя.</p>`,
    exampleNote: 'Сначала запусти отдельно SELECT AVG(price) FROM menu и посмотри, какое там число.',
    recall: { q: 'Как найти имена людей, чьи id есть в таблице person_order, без JOIN?', a: 'SELECT name FROM person WHERE id IN (SELECT person_id FROM person_order);' },
  },
  {
    id: 'l-flow',
    title: 'Как всё работает вместе',
    html: `
<p>Теперь соберём всё в один запрос. Важная вещь: запрос <b>пишется</b> в одном порядке, а <b>выполняется</b> в другом.</p>
<div class="order-strip" aria-label="Порядок выполнения">
  <div><span>пишем</span><b>SELECT</b><b>FROM</b><b>WHERE</b><b>ORDER BY</b><b>LIMIT</b></div>
  <div><span>выполняется</span><b class="o1">1 FROM</b><b class="o2">2 WHERE</b><b class="o3">3 SELECT</b><b class="o4">4 ORDER BY</b><b class="o5">5 LIMIT</b></div>
</div>
<ol>
<li><b>FROM</b>: берём таблицу.</li>
<li><b>WHERE</b>: выбрасываем ненужные строки.</li>
<li><b>SELECT</b>: оставляем нужные колонки и считаем выражения.</li>
<li><b>ORDER BY</b>: сортируем.</li>
<li><b>LIMIT</b>: обрезаем.</li>
</ol>
<p>Отсюда правило, которое часто проверяют: имя, придуманное через <code>AS</code> в SELECT, нельзя использовать в WHERE, потому что WHERE выполняется раньше и этого имени ещё нет. А в ORDER BY можно.</p>
<p>Запусти пример ниже и нажми «Показать выполнение», потом «Проиграть»: таблица пройдёт все пять шагов.</p>`,
    example: `SELECT name, age
FROM person
WHERE age > 20
ORDER BY age DESC
LIMIT 4;`,
    exampleNote: '',
    recall: { q: 'Расставь по порядку выполнения: SELECT, LIMIT, FROM, ORDER BY, WHERE.', a: 'FROM → WHERE → SELECT → ORDER BY → LIMIT' },
  },
  {
    id: 'l-check',
    title: 'Проверь себя перед сдачей',
    html: `
<p>Автопроверка сравнивает ответ целиком. Лишняя колонка, другое имя колонки или другой порядок строк означают, что задание не сдано. Перед каждой сдачей пройди по списку:</p>
<ol class="checklist">
<li>Колонки те, что просят, и в том же порядке.</li>
<li>Имена колонок как в задании. Если просят <code>person_information</code>, нужен <code>AS person_information</code>.</li>
<li>Текст в одинарных кавычках: <code>'Kazan'</code>.</li>
<li>Нет запятой перед FROM.</li>
<li>Если в условии есть и AND, и OR, стоят скобки.</li>
<li>Для пустых значений <code>IS NULL</code>, а не <code>= NULL</code>.</li>
<li>Есть ORDER BY, если просили сортировку, и у каждой колонки правильное направление.</li>
<li>У CASE есть END.</li>
</ol>`,
    example: `-- В этом запросе 3 ошибки. Найди и исправь их, потом запусти.
SELECT name, age, FROM person
WHERE address = "Kazan" OR address = 'Moscow' AND age > 18
ORDER BY age DESC`,
    exampleNote: 'Нужно: люди из Казани или Москвы старше 18, по возрасту от старших.',
    recall: { q: 'Назови по памяти хотя бы 5 пунктов списка.', a: 'Нужные колонки в нужном порядке; имена через AS; одинарные кавычки; нет запятой перед FROM; скобки при AND и OR; IS NULL; ORDER BY и направления; END у CASE.' },
  },
];
