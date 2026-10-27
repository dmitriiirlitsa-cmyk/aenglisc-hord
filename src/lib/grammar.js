// Темы раздела «Грамматика»: Markdown-файлы из content/grammar, которые пишутся через админку /admin.
// Vite вшивает их в сборку, поэтому новая тема появляется на сайте после пересборки на Netlify.
import { parse } from 'yaml';

const files = import.meta.glob('/content/grammar/*.md', { query: '?raw', import: 'default', eager: true });

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseTopic(path, raw) {
  const match = raw.match(FRONTMATTER);
  let data = {};
  try {
    data = match ? parse(match[1]) || {} : {};
  } catch {
    data = {};
  }
  return {
    id: path.split('/').pop().replace(/\.md$/, ''),
    title: data.title || 'Без названия',
    level: data.level || '',
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 999,
    summary: data.summary || '',
    draft: Boolean(data.draft),
    body: (match ? match[2] : raw).trim(),
  };
}

export const grammarTopics = Object.entries(files)
  .map(([path, raw]) => parseTopic(path, raw))
  .filter((t) => !t.draft)
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
