// Должно совпадать с MAX_USER_INPUT в server/index.js
export const MAX_INPUT = 50;

// Собирает короткий запрос «префикс + слово», укладываясь в лимит
export function fitPrompt(prefix, word) {
  const room = MAX_INPUT - prefix.length;
  return prefix + (word.length > room ? word.slice(0, room - 1) + '…' : word);
}
