// Список алгоритмов по группам — в том порядке, в котором их стоит проходить.

import { basics, tricks } from './algos1.js';
import { sorting } from './algos2.js';
import { numbers, recursion, structures } from './algos3.js';
import { graphs } from './algos4.js';

export const groups = [
  { id: 'start', title: 'С чего начать', items: basics },
  { id: 'sorting', title: 'Сортировки', items: sorting },
  { id: 'numbers', title: 'Числа', items: numbers },
  { id: 'recursion', title: 'Рекурсия и запоминание', items: recursion },
  { id: 'tricks', title: 'Приёмы и структуры данных', items: [...tricks, ...structures] },
  { id: 'graphs', title: 'Графы', items: graphs },
];

export const algos = groups.flatMap((group) => group.items.map((algo) => Object.assign(algo, { group })));

algos.forEach((algo, index) => {
  algo.index = index;
});

const byId = new Map(algos.map((algo) => [algo.id, algo]));
export const algoById = (id) => byId.get(id);
