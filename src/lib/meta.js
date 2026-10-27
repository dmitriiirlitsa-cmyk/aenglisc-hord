const META_RE = /```lexi-meta\s*([\s\S]*?)```/g;

// Извлекает служебные блоки lexi-meta из ответа модели и возвращает текст без них.
// Блоков может быть несколько — например, когда ответ сравнивает два слова.
export function parseEntry(text) {
  const metas = [];
  for (const match of text.matchAll(META_RE)) {
    try {
      const data = JSON.parse(match[1].trim());
      for (const m of Array.isArray(data) ? data : [data]) {
        const known = metas.some((x) => x.word.toLowerCase() === String(m?.word).toLowerCase());
        if (m?.word && !known) metas.push(m);
      }
    } catch {
      // битый блок просто пропускаем
    }
  }
  return { metas, body: text.replace(META_RE, '').trim() };
}

// Последнее разобранное слово в диалоге — для быстрых кнопок
export function lastWord(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;
    const { metas } = parseEntry(m.text);
    if (metas.length) return metas[0].word;
  }
  return null;
}
