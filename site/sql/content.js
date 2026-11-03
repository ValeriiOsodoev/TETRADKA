// Контент: тема 1 «SELECT» здесь, тема 2 «JOIN» в topic-join.js.
// База данных повторяет схему SQL Bootcamp Школы 21 (пиццерии).

export const SEED_SQL = `
CREATE TABLE person (
  id bigint PRIMARY KEY,
  name varchar NOT NULL,
  age integer NOT NULL DEFAULT 10,
  gender varchar DEFAULT 'female' NOT NULL,
  address varchar
);
INSERT INTO person VALUES
 (1,'Anna',16,'female','Moscow'),
 (2,'Andrey',21,'male','Moscow'),
 (3,'Kate',33,'female','Kazan'),
 (4,'Denis',13,'male','Kazan'),
 (5,'Elvira',45,'female','Kazan'),
 (6,'Irina',21,'female','Saint-Petersburg'),
 (7,'Peter',24,'male','Saint-Petersburg'),
 (8,'Nataly',30,'female','Novosibirsk'),
 (9,'Dmitriy',18,'male','Samara');

CREATE TABLE pizzeria (
  id bigint PRIMARY KEY,
  name varchar NOT NULL,
  rating numeric NOT NULL DEFAULT 0
);
INSERT INTO pizzeria VALUES
 (1,'Pizza Hut',4.6),(2,'Dominos',4.3),(3,'DoDo Pizza',3.2),
 (4,'Papa Johns',4.9),(5,'Best Pizza',2.3),(6,'DinoPizza',4.2);

CREATE TABLE menu (
  id bigint PRIMARY KEY,
  pizzeria_id bigint NOT NULL REFERENCES pizzeria(id),
  pizza_name varchar NOT NULL,
  price numeric NOT NULL DEFAULT 1
);
INSERT INTO menu VALUES
 (1,1,'cheese pizza',900),(2,1,'pepperoni pizza',1200),(3,1,'sausage pizza',1200),
 (4,1,'supreme pizza',1200),(5,6,'cheese pizza',950),(6,6,'pepperoni pizza',800),
 (7,6,'sausage pizza',1000),(8,2,'cheese pizza',800),(9,2,'mushroom pizza',1100),
 (10,3,'cheese pizza',780),(11,3,'supreme pizza',850),(12,4,'cheese pizza',700),
 (13,4,'mushroom pizza',950),(14,4,'pepperoni pizza',1000),(15,4,'sausage pizza',950),
 (16,5,'cheese pizza',700),(17,5,'pepperoni pizza',800),(18,5,'supreme pizza',850);

CREATE TABLE person_visits (
  id bigint PRIMARY KEY,
  person_id bigint NOT NULL REFERENCES person(id),
  pizzeria_id bigint NOT NULL REFERENCES pizzeria(id),
  visit_date date NOT NULL DEFAULT current_date
);
INSERT INTO person_visits VALUES
 (1,1,1,'2022-01-01'),(2,2,2,'2022-01-01'),(3,2,1,'2022-01-02'),(4,3,5,'2022-01-03'),
 (5,3,6,'2022-01-04'),(6,4,5,'2022-01-07'),(7,4,6,'2022-01-08'),(8,5,2,'2022-01-08'),
 (9,5,6,'2022-01-09'),(10,6,2,'2022-01-09'),(11,6,4,'2022-01-01'),(12,7,1,'2022-01-03'),
 (13,7,2,'2022-01-05'),(14,8,1,'2022-01-05'),(15,8,2,'2022-01-06'),(16,8,4,'2022-01-07'),
 (17,9,4,'2022-01-08'),(18,9,5,'2022-01-09'),(19,9,6,'2022-01-10');

CREATE TABLE person_order (
  id bigint PRIMARY KEY,
  person_id bigint NOT NULL REFERENCES person(id),
  menu_id bigint NOT NULL REFERENCES menu(id),
  order_date date NOT NULL DEFAULT current_date
);
INSERT INTO person_order VALUES
 (1,1,1,'2022-01-01'),(2,1,2,'2022-01-01'),(3,2,8,'2022-01-01'),(4,2,9,'2022-01-01'),
 (5,3,16,'2022-01-04'),(6,4,16,'2022-01-07'),(7,4,17,'2022-01-07'),(8,4,18,'2022-01-07'),
 (9,4,6,'2022-01-08'),(10,4,7,'2022-01-08'),(11,5,6,'2022-01-09'),(12,5,7,'2022-01-09'),
 (13,6,13,'2022-01-01'),(14,7,3,'2022-01-03'),(15,7,9,'2022-01-05'),(16,7,4,'2022-01-05'),
 (17,8,8,'2022-01-06'),(18,8,14,'2022-01-07'),(19,9,18,'2022-01-09'),(20,9,6,'2022-01-10');
`;

export const SCHEMA = [
  { name: 'person', note: 'люди, которые любят пиццу', cols: ['id', 'name', 'age', 'gender', 'address'] },
  { name: 'pizzeria', note: 'пиццерии', cols: ['id', 'name', 'rating'] },
  { name: 'menu', note: 'меню и цены', cols: ['id', 'pizzeria_id → pizzeria', 'pizza_name', 'price'] },
  { name: 'person_visits', note: 'визиты в пиццерии', cols: ['id', 'person_id → person', 'pizzeria_id → pizzeria', 'visit_date'] },
  { name: 'person_order', note: 'заказы', cols: ['id', 'person_id → person', 'menu_id → menu', 'order_date'] },
];

// ---------- Теория ----------
// Каждый раздел: текст, пример для запуска, вопрос «вспомни, не подглядывая».
import { LESSONS } from './lessons.js';
import { TOPIC_JOIN } from './topic-join.js';

// ---------- Задачи тренажёра ----------
// ordered: важен ли порядок строк. Проверка сравнивает результат с эталоном.
const TASKS = [
  { id: 't01', level: 1, title: 'Люди из Казани', text: 'Выведи имя и возраст всех людей, которые живут в Казани (<code>Kazan</code>).', ref: `SELECT name, age FROM person WHERE address = 'Kazan'`, ordered: false, hint: "WHERE address = 'Kazan'" },
  { id: 't02', level: 1, title: 'Женщины по алфавиту', text: 'Выведи имена женщин из Казани, отсортированные по имени.', ref: `SELECT name FROM person WHERE address = 'Kazan' AND gender = 'female' ORDER BY name`, ordered: true, hint: 'Два условия через AND, потом ORDER BY name' },
  { id: 't03', level: 1, title: 'Хорошие пиццерии', text: 'Выведи название и рейтинг пиццерий с рейтингом от 3.5 до 5 включительно. Сортировка по рейтингу, сначала лучшие.', ref: `SELECT name, rating FROM pizzeria WHERE rating BETWEEN 3.5 AND 5 ORDER BY rating DESC`, ordered: true, hint: 'BETWEEN 3.5 AND 5 и ORDER BY rating DESC' },
  { id: 't04', level: 1, title: 'Чётные id', text: 'Выведи все колонки людей с чётным <code>id</code>, сортировка по <code>id</code> по убыванию.', ref: `SELECT * FROM person WHERE id % 2 = 0 ORDER BY id DESC`, ordered: true, hint: 'id % 2 = 0' },
  { id: 't05', level: 2, title: 'Цена в диапазоне', text: 'Выведи название пиццы и цену для пицц стоимостью от 800 до 1000 включительно. Сортировка по цене, при равной цене по названию.', ref: `SELECT pizza_name, price FROM menu WHERE price BETWEEN 800 AND 1000 ORDER BY price, pizza_name`, ordered: true, hint: 'ORDER BY price, pizza_name' },
  { id: 't06', level: 2, title: 'Уникальные пиццы', text: 'Выведи уникальные названия пицц из меню, отсортированные по убыванию названия. <span class="rule">Нельзя: GROUP BY.</span>', ref: `SELECT DISTINCT pizza_name FROM menu ORDER BY pizza_name DESC`, ordered: true, forbid: [/\bgroup\s+by\b/i], hint: 'SELECT DISTINCT' },
  { id: 't07', level: 2, title: 'Не Москва и не Казань', text: 'Выведи имя и город людей, которые живут не в Москве и не в Казани. Сортировка по городу, затем по имени.', ref: `SELECT name, address FROM person WHERE address NOT IN ('Moscow', 'Kazan') ORDER BY address, name`, ordered: true, hint: 'NOT IN (...)' },
  { id: 't08', level: 2, title: 'Буква в имени', text: 'Выведи имена людей, в которых есть буква «a» в любом регистре. Сортировка по имени.', ref: `SELECT name FROM person WHERE name ILIKE '%a%' ORDER BY name`, ordered: true, hint: "ILIKE '%a%'" },
  { id: 't09', level: 2, title: 'Приоритет AND и OR', text: 'Выведи имя, возраст и город для людей, которые либо женщины старше 25 лет, либо живут в Самаре (<code>Samara</code>). Сортировка по имени.', ref: `SELECT name, age, address FROM person WHERE (gender = 'female' AND age > 25) OR address = 'Samara' ORDER BY name`, ordered: true, hint: 'Скобки вокруг AND-части' },
  { id: 't10', level: 2, title: 'Визиты за период', text: 'Выведи <code>person_id</code> и <code>visit_date</code> из визитов с 6 по 9 января 2022 года включительно или в пиццерию номер 2 (в этой таблице это колонка <code>pizzeria_id</code>, а <code>id</code> здесь номер самого визита). Сортировка: <code>person_id</code> по возрастанию, затем дата по убыванию.', ref: `SELECT person_id, visit_date FROM person_visits WHERE visit_date BETWEEN '2022-01-06' AND '2022-01-09' OR pizzeria_id = 2 ORDER BY person_id, visit_date DESC`, ordered: true, hint: "Даты пишутся строкой: '2022-01-06'" },
  { id: 't11', level: 3, title: 'Склейка строки', text: 'Выведи одну колонку <code>person_information</code> в формате <code>Anna (age:16,gender:\'female\',address:\'Moscow\')</code>. Сортировка по этой колонке.', ref: `SELECT name || ' (age:' || age || ',gender:''' || gender || ''',address:''' || address || ''')' AS person_information FROM person ORDER BY person_information`, ordered: true, hint: "Кавычка внутри строки пишется как ''", checkNames: ['person_information'] },
  { id: 't12', level: 3, title: 'Три самые дорогие', text: 'Выведи <code>id</code>, название и цену трёх самых дорогих позиций меню. При равной цене меньший <code>id</code> идёт первым.', ref: `SELECT id, pizza_name, price FROM menu ORDER BY price DESC, id LIMIT 3`, ordered: true, hint: 'ORDER BY price DESC, id LIMIT 3' },
  { id: 't13', level: 3, title: 'Страница результата', text: 'Отсортируй меню по цене по возрастанию (при равенстве по <code>id</code>), пропусти первые 4 строки и выведи следующие 5: <code>id</code>, <code>pizza_name</code>, <code>price</code>.', ref: `SELECT id, pizza_name, price FROM menu ORDER BY price, id LIMIT 5 OFFSET 4`, ordered: true, hint: 'LIMIT 5 OFFSET 4' },
  { id: 't14', level: 3, title: 'Скидка 15%', text: 'Для пиццерии с <code>id = 4</code> выведи название пиццы, цену и цену со скидкой 15%, округлённую до целого, в колонке <code>discount_price</code>. Сортировка по <code>id</code> меню.', ref: `SELECT pizza_name, price, ROUND(price * 0.85) AS discount_price FROM menu WHERE pizzeria_id = 4 ORDER BY id`, ordered: true, hint: 'ROUND(price * 0.85)', checkNames: ['discount_price'] },
  { id: 't15', level: 3, title: 'Возрастные интервалы', text: 'Выведи имя и колонку <code>interval_info</code>: <code>interval #1</code> для возраста от 10 до 20, <code>interval #2</code> для 21–23, иначе <code>interval #3</code>. Сортировка по <code>interval_info</code>, затем по имени.', ref: `SELECT name, CASE WHEN age BETWEEN 10 AND 20 THEN 'interval #1' WHEN age BETWEEN 21 AND 23 THEN 'interval #2' ELSE 'interval #3' END AS interval_info FROM person ORDER BY interval_info, name`, ordered: true, hint: 'CASE WHEN … THEN … ELSE … END AS interval_info', checkNames: ['interval_info'] },
  { id: 't16', level: 3, title: 'Кто заказывал 7 января', text: 'Выведи имена людей, которые делали заказ 7 января 2022 года, по алфавиту. <span class="rule">Нельзя: JOIN.</span>', ref: `SELECT name FROM person WHERE id IN (SELECT person_id FROM person_order WHERE order_date = '2022-01-07') ORDER BY name`, ordered: true, forbid: [/\bjoin\b/i], hint: 'WHERE id IN (SELECT person_id FROM person_order WHERE …)' },
  { id: 't17', level: 4, title: 'Дороже средней', text: 'Выведи название пиццы и цену для всех позиций дороже средней цены по меню. Сортировка по цене по убыванию, затем по названию.', ref: `SELECT pizza_name, price FROM menu WHERE price > (SELECT AVG(price) FROM menu) ORDER BY price DESC, pizza_name`, ordered: true, hint: 'Скалярный подзапрос (SELECT AVG(price) FROM menu)' },
  { id: 't18', level: 4, title: 'Имя через подзапрос', text: 'Для заказов с <code>menu_id</code> 13, 14 или 18 за 7 января 2022 выведи имя заказчика в колонке <code>name</code>, используя подзапрос в SELECT. Сортировка по имени. <span class="rule">Нельзя: JOIN.</span>', ref: `SELECT (SELECT name FROM person WHERE id = po.person_id) AS name FROM person_order po WHERE menu_id IN (13, 14, 18) AND order_date = '2022-01-07' ORDER BY name`, ordered: true, forbid: [/\bjoin\b/i], hint: 'SELECT (SELECT name FROM person WHERE id = po.person_id) AS name FROM person_order po', checkNames: ['name'] },
];

// ---------- Пул для пробного экзамена (не пересекается с тренажёром) ----------
const EXAM_TASKS = [
  { id: 'e01', level: 1, title: 'Взрослые мужчины', text: 'Выведи имя и возраст мужчин старше 18 лет. Сортировка по возрасту по убыванию.', ref: `SELECT name, age FROM person WHERE gender = 'male' AND age > 18 ORDER BY age DESC`, ordered: true },
  { id: 'e02', level: 1, title: 'Пиццерии с рейтингом', text: 'Выведи названия пиццерий с рейтингом ниже 4, по алфавиту.', ref: `SELECT name FROM pizzeria WHERE rating < 4 ORDER BY name`, ordered: true },
  { id: 'e03', level: 2, title: 'Пиццы на «s»', text: 'Выведи уникальные названия пицц, которые начинаются на букву «s». Сортировка по названию.', ref: `SELECT DISTINCT pizza_name FROM menu WHERE pizza_name LIKE 's%' ORDER BY pizza_name`, ordered: true },
  { id: 'e04', level: 3, title: 'Город и имя', text: 'Выведи колонку <code>info</code> в формате <code>Kate from Kazan</code> для всех людей старше 20. Сортировка по <code>info</code>.', ref: `SELECT name || ' from ' || address AS info FROM person WHERE age > 20 ORDER BY info`, ordered: true, checkNames: ['info'] },
  { id: 'e05', level: 2, title: 'Дешёвые позиции', text: 'Выведи <code>pizzeria_id</code>, <code>pizza_name</code> и <code>price</code> позиций дешевле 850 или с названием <code>supreme pizza</code>. Сортировка по <code>pizzeria_id</code>, затем по цене по убыванию.', ref: `SELECT pizzeria_id, pizza_name, price FROM menu WHERE price < 850 OR pizza_name = 'supreme pizza' ORDER BY pizzeria_id, price DESC`, ordered: true },
  { id: 'e06', level: 3, title: 'Категории цен', text: 'Выведи название пиццы, цену и колонку <code>category</code>: <code>cheap</code> если цена меньше 800, <code>normal</code> от 800 до 1000 включительно, иначе <code>expensive</code>. Сортировка по цене, затем по <code>id</code>.', ref: `SELECT pizza_name, price, CASE WHEN price < 800 THEN 'cheap' WHEN price <= 1000 THEN 'normal' ELSE 'expensive' END AS category FROM menu ORDER BY price, id`, ordered: true, checkNames: ['category'] },
  { id: 'e07', level: 4, title: 'Пиццерия без гостей', text: 'Выведи названия пиццерий, которые никто ни разу не посещал. <span class="rule">Нельзя: JOIN.</span>', ref: `SELECT name FROM pizzeria WHERE id NOT IN (SELECT pizzeria_id FROM person_visits)`, ordered: false, forbid: [/\bjoin\b/i] },
  { id: 'e08', level: 2, title: 'Самая старшая пара', text: 'Выведи имя и возраст двух самых старших людей.', ref: `SELECT name, age FROM person ORDER BY age DESC LIMIT 2`, ordered: true },
  { id: 'e09', level: 2, title: 'Визиты в январе', text: 'Выведи уникальные <code>person_id</code> тех, кто посещал пиццерию с <code>id</code> 1 или 4 до 5 января 2022 (не включая). Сортировка по <code>person_id</code>.', ref: `SELECT DISTINCT person_id FROM person_visits WHERE pizzeria_id IN (1, 4) AND visit_date < '2022-01-05' ORDER BY person_id`, ordered: true },
  { id: 'e10', level: 1, title: 'Нечётные из меню', text: 'Выведи все колонки меню с нечётным <code>id</code> и ценой не больше 900. Сортировка по <code>id</code> по убыванию.', ref: `SELECT * FROM menu WHERE id % 2 = 1 AND price <= 900 ORDER BY id DESC`, ordered: true },
  { id: 'e11', level: 4, title: 'Рейтинг выше среднего', text: 'Выведи название и рейтинг пиццерий с рейтингом выше среднего. Сортировка по рейтингу по убыванию.', ref: `SELECT name, rating FROM pizzeria WHERE rating > (SELECT AVG(rating) FROM pizzeria) ORDER BY rating DESC`, ordered: true },
  { id: 'e12', level: 2, title: 'Имя без буквы «e»', text: 'Выведи имена людей, в которых нет буквы «e» ни в каком регистре. Сортировка по имени.', ref: `SELECT name FROM person WHERE name NOT ILIKE '%e%' ORDER BY name`, ordered: true },
  { id: 'e13', level: 3, title: 'Средняя часть прайса', text: 'Отсортируй меню по цене по убыванию (при равной цене по <code>id</code>). Выведи <code>id</code>, <code>pizza_name</code>, <code>price</code> для 4-й, 5-й и 6-й строк этого списка.', ref: `SELECT id, pizza_name, price FROM menu ORDER BY price DESC, id LIMIT 3 OFFSET 3`, ordered: true },
  { id: 'e14', level: 3, title: 'Цена в тысячах', text: 'Выведи <code>pizza_name</code> и колонку <code>price_k</code>: цена, делённая на 1000 и округлённая до одного знака после запятой. Только для пиццерии с <code>id = 1</code>, сортировка по <code>id</code>.', ref: `SELECT pizza_name, ROUND(price / 1000, 1) AS price_k FROM menu WHERE pizzeria_id = 1 ORDER BY id`, ordered: true, checkNames: ['price_k'] },
  { id: 'e15', level: 4, title: 'Гости Pizza Hut', text: 'Выведи имена людей, которые хотя бы раз посещали пиццерию <code>Pizza Hut</code>. Сортировка по имени. <span class="rule">Нельзя: JOIN.</span>', ref: `SELECT name FROM person WHERE id IN (SELECT person_id FROM person_visits WHERE pizzeria_id = (SELECT id FROM pizzeria WHERE name = 'Pizza Hut')) ORDER BY name`, ordered: true, forbid: [/\bjoin\b/i] },
];

// ---------- Карточки для интервального повторения ----------
// type 'recall': вспомни и оцени себя. type 'write': напиши запрос, проверка автоматически.
const CARDS = [
  { id: 'c01', type: 'recall', q: 'Порядок выполнения: FROM, WHERE, SELECT, ORDER BY, LIMIT. Расставь.', a: 'FROM → WHERE → SELECT → ORDER BY → LIMIT' },
  { id: 'c02', type: 'recall', q: 'Почему нельзя написать WHERE alias > 5, если alias объявлен в SELECT?', a: 'WHERE выполняется раньше SELECT, алиаса ещё нет.' },
  { id: 'c03', type: 'recall', q: 'Как проверить, что значение пустое (NULL)?', a: 'col IS NULL. Сравнение col = NULL никогда не даёт TRUE.' },
  { id: 'c04', type: 'recall', q: 'Что значат % и _ в LIKE?', a: '% любое число символов (и ноль), _ ровно один символ.' },
  { id: 'c05', type: 'recall', q: 'Чем ILIKE отличается от LIKE?', a: 'ILIKE не различает регистр.' },
  { id: 'c06', type: 'recall', q: 'BETWEEN 800 AND 1000: границы включаются?', a: 'Да, обе: это >= 800 AND <= 1000.' },
  { id: 'c07', type: 'recall', q: "Какие кавычки для строк, какие для имён колонок?", a: "Строки в одинарных: 'Kazan'. Двойные для идентификаторов: \"name\"." },
  { id: 'c08', type: 'recall', q: 'Что выполняется раньше: AND или OR?', a: 'AND. a OR b AND c = a OR (b AND c).' },
  { id: 'c09', type: 'recall', q: 'Синтаксис CASE полностью.', a: 'CASE WHEN усл THEN знач [WHEN …] [ELSE знач] END [AS имя]' },
  { id: 'c10', type: 'recall', q: 'Оператор склейки строк в PostgreSQL?', a: '|| , например name || \' \' || age' },
  { id: 'c11', type: 'recall', q: 'LIMIT 5 OFFSET 10: какие строки попадут в результат?', a: 'С 11-й по 15-ю (10 пропускаются, 5 берутся).' },
  { id: 'c12', type: 'recall', q: 'Как записать одинарную кавычку внутри строки?', a: "Удвоить: 'it''s'" },
  { id: 'c13', type: 'recall', q: 'Назови 5 таблиц базы Bootcamp и их колонки.', a: 'person(id,name,age,gender,address), pizzeria(id,name,rating), menu(id,pizzeria_id,pizza_name,price), person_visits(id,person_id,pizzeria_id,visit_date), person_order(id,person_id,menu_id,order_date)' },
  { id: 'c14', type: 'write', q: 'Имена людей младше 20 лет, по возрасту по возрастанию.', ref: `SELECT name FROM person WHERE age < 20 ORDER BY age`, ordered: true },
  { id: 'c15', type: 'write', q: 'Уникальные города из person, по алфавиту.', ref: `SELECT DISTINCT address FROM person ORDER BY address`, ordered: true },
  { id: 'c16', type: 'write', q: 'Название и цена позиций пиццерии с id = 1 дороже 1000.', ref: `SELECT pizza_name, price FROM menu WHERE pizzeria_id = 1 AND price > 1000`, ordered: false },
  { id: 'c17', type: 'write', q: 'Все визиты (все колонки) 1 января 2022, сортировка по person_id.', ref: `SELECT * FROM person_visits WHERE visit_date = '2022-01-01' ORDER BY person_id`, ordered: true },
  { id: 'c18', type: 'write', q: 'Самая дешёвая позиция меню: pizza_name и price (одна строка, при равенстве меньший id).', ref: `SELECT pizza_name, price FROM menu ORDER BY price, id LIMIT 1`, ordered: true },
  { id: 'c19', type: 'write', q: 'Имена людей с именем из 4 букв (используй LIKE и _).', ref: `SELECT name FROM person WHERE name LIKE '____'`, ordered: false },
  { id: 'c20', type: 'write', q: 'Имя и колонка is_adult со значением yes/no (18 и старше = yes), по имени.', ref: `SELECT name, CASE WHEN age >= 18 THEN 'yes' ELSE 'no' END AS is_adult FROM person ORDER BY name`, ordered: true },
];

// ---------- Тест по теме ----------
const TEST = [
  { id: 'q1', type: 'choice', q: 'Какой запрос вернёт людей, у которых address не заполнен?', options: ["WHERE address = NULL", "WHERE address IS NULL", "WHERE address = ''", "WHERE NOT address"], correct: 1, why: 'С NULL работает только IS NULL.' },
  { id: 'q2', type: 'choice', q: 'Что выполнится раньше?', options: ['SELECT', 'ORDER BY', 'WHERE', 'LIMIT'], correct: 2, why: 'FROM → WHERE → SELECT → ORDER BY → LIMIT.' },
  { id: 'q3', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT name FROM person WHERE age BETWEEN 18 AND 24;`, why: 'BETWEEN включает обе границы.' },
  { id: 'q4', type: 'choice', q: "Какое условие эквивалентно WHERE gender = 'male' OR age > 30 AND address = 'Kazan'?", options: ["(gender = 'male' OR age > 30) AND address = 'Kazan'", "gender = 'male' OR (age > 30 AND address = 'Kazan')", 'Запрос вызовет ошибку', 'Зависит от СУБД'], correct: 1, why: 'AND связывает сильнее OR.' },
  { id: 'q5', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT DISTINCT pizza_name FROM menu;`, why: 'DISTINCT убирает повторы.' },
  { id: 'q6', type: 'choice', q: 'Какой запрос выдаст ошибку в PostgreSQL?', options: ['SELECT age * 2 AS dbl FROM person ORDER BY dbl', 'SELECT age * 2 AS dbl FROM person WHERE dbl > 30', "SELECT name FROM person WHERE name LIKE 'A%'", 'SELECT DISTINCT address FROM person'], correct: 1, why: 'Алиас из SELECT ещё не существует на шаге WHERE.' },
  { id: 'q7', type: 'write', q: 'Напиши запрос: названия пиццерий с рейтингом не меньше 4.5, сортировка по названию.', ref: `SELECT name FROM pizzeria WHERE rating >= 4.5 ORDER BY name`, ordered: true },
  { id: 'q8', type: 'choice', q: "Что найдёт LIKE '_a%'?", options: ['Строки, начинающиеся на a', 'Строки, где вторая буква a', 'Строки, заканчивающиеся на a', 'Строки ровно из 2 символов'], correct: 1, why: '_ это ровно один любой символ.' },
  { id: 'q9', type: 'count', q: 'Сколько строк вернёт запрос?', sql: `SELECT * FROM menu WHERE price > 900 OR pizzeria_id = 5 AND price < 800;`, why: 'Сначала AND, потом OR.' },
  { id: 'q10', type: 'write', q: 'Напиши запрос: имя и возраст трёх самых молодых людей (при равенстве по имени).', ref: `SELECT name, age FROM person ORDER BY age, name LIMIT 3`, ordered: true },
];

// ---------- Темы по порядку ----------
// id задач, карточек и вопросов уникальны во всех темах: прогресс хранится общим словарём.
export const TOPICS = [
  {
    id: 'select', n: 1,
    title: 'SELECT: выборка, фильтрация, сортировка',
    short: 'SELECT',
    day: 'Bootcamp Day 00',
    lead: 'Одна таблица: выбрать колонки, отфильтровать строки, отсортировать, посчитать выражения, CASE и простые подзапросы.',
    lessons: LESSONS, tasks: TASKS, exam: EXAM_TASKS, cards: CARDS, test: TEST,
  },
  TOPIC_JOIN,
];

export const METHOD = [
  { t: 'Вспоминание вместо перечитывания', d: 'После каждого раздела теории вопрос, на который нужно ответить по памяти, и только потом открыть ответ. Попытка вспомнить закрепляет сильнее, чем повторное чтение.' },
  { t: 'Интервальные повторения', d: 'Карточки возвращаются через 10 минут, 1, 2, 4 и 7 дней. Если ошибся, карточка снова уходит в начало. Интервалы сжаты под неделю до экзамена.' },
  { t: 'Без подсказок, как на экзамене', d: 'Редактор без автодополнения. В режиме экзамена нет подсказок, эталона и визуализации, а каждая неверная сдача считается ошибкой. В карточках и тесте запрос пишется вообще без запуска: так проверяется память.' },
  { t: 'Картинка выполнения', d: 'Визуализация показывает, как строки проходят через FROM, WHERE, SELECT, ORDER BY и LIMIT. Запоминается образ, а не только текст.' },
];
