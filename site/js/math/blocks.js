// Кирпичики урока. Текст размечается так: **жирный**, ==маркер==, `код`, $формула$.

export const p = (text) => ({ t: 'p', text });
export const rule = (text) => ({ t: 'rule', text });
export const formula = (text) => ({ t: 'formula', text });
export const list = (...items) => ({ t: 'list', items });
export const sub = (text) => ({ t: 'sub', text });
/** Разобранный пример: условие, шаги решения, ответ. */
export const ex = (q, steps, a) => ({ t: 'ex', q, steps, a });
/** Интерактивная картинка из widgets.js. */
export const w = (name, props = {}, caption = '') => ({ t: 'w', name, props, caption });
export const tip = (text) => ({ t: 'tip', text });
export const warn = (text) => ({ t: 'warn', text });
