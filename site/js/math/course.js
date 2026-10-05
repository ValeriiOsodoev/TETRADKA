// Программа по математике: разделы по порядку, в каждом — уроки.

import { numbersAndCounting, addSub, mulDiv } from './lessons1.js';
import { divisibility, fractions, percentRatio, negatives } from './lessons2.js';
import { algebra, functions } from './lessons3.js';
import { geometry } from './lessons4.js';
import { senior } from './lessons5.js';

export const sections = [
  { id: 'count', title: 'Числа и счёт', grade: '1 класс', lessons: numbersAndCounting },
  { id: 'addsub', title: 'Сложение и вычитание', grade: '1–2 класс', lessons: addSub },
  { id: 'muldiv', title: 'Умножение и деление', grade: '2–4 класс', lessons: mulDiv },
  { id: 'divis', title: 'Делимость', grade: '5–6 класс', lessons: divisibility },
  { id: 'fractions', title: 'Дроби', grade: '5–6 класс', lessons: fractions },
  { id: 'percent', title: 'Проценты и отношения', grade: '5–6 класс', lessons: percentRatio },
  { id: 'negative', title: 'Отрицательные числа', grade: '6 класс', lessons: negatives },
  { id: 'algebra', title: 'Выражения и уравнения', grade: '7 класс', lessons: algebra },
  { id: 'functions', title: 'Функции и графики', grade: '7–9 класс', lessons: functions },
  { id: 'geometry', title: 'Геометрия', grade: '5–9 класс', lessons: geometry },
  { id: 'senior', title: 'Старшие классы', grade: '9–11 класс', lessons: senior },
];

/** Все уроки подряд — в том порядке, в котором их стоит проходить. */
export const lessons = sections.flatMap((section) => section.lessons.map((lesson) => Object.assign(lesson, { section })));

lessons.forEach((lesson, index) => {
  lesson.index = index;
});

const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
export const lessonById = (id) => byId.get(id);
