// Темы раздела «Грамматика» — Markdown-файлы в content/grammar, которые пишутся через админку /admin.
// Сайт читает их прямо из репозитория GitHub при открытии, поэтому публикация темы
// не требует пересборки на Netlify. Версия, вшитая при последней сборке, — запасной вариант
// на случай, если GitHub недоступен.
import { useEffect, useState } from 'react';
import { parse } from 'yaml';

const REPO = 'dmitriiirlitsa-cmyk/aenglisc-hord'; // совпадает с backend.repo в public/admin/config.yml
const BRANCH = 'main';
const DIR = 'content/grammar';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

// Картинки из админки лежат в public/uploads репозитория: берём их оттуда же, без пересборки сайта
const withRepoImages = (markdown) => markdown.replace(/(\]\(|src=["'])\/uploads\//g, `$1${RAW}/public/uploads/`);

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
    body: withRepoImages((match ? match[2] : raw).trim()),
  };
}

const publish = (topics) =>
  topics.filter((t) => !t.draft).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));

const bundledFiles = import.meta.glob('/content/grammar/*.md', { query: '?raw', import: 'default', eager: true });
const bundledTopics = publish(Object.entries(bundledFiles).map(([path, raw]) => parseTopic(path, raw)));

async function fetchTopics() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${DIR}?ref=${BRANCH}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return []; // папки ещё нет — ни одной темы не публиковали
  if (!res.ok) throw new Error(`GitHub ответил ${res.status}`);
  const files = (await res.json()).filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  const topics = await Promise.all(
    files.map(async (f) => {
      // ?v=sha — свежая версия файла сразу после правки, мимо кэша raw.githubusercontent.com
      const raw = await fetch(`${RAW}/${f.path}?v=${f.sha}`).then((r) => {
        if (!r.ok) throw new Error(`Не загрузился ${f.path}`);
        return r.text();
      });
      return parseTopic(f.path, raw);
    })
  );
  return publish(topics);
}

// Один запрос на всю страницу: его результат делят меню и раздел «Грамматика»
let request;
let latest = bundledTopics;

export function useGrammarTopics() {
  const [topics, setTopics] = useState(latest);
  useEffect(() => {
    request ??= fetchTopics()
      .then((fresh) => (latest = fresh))
      .catch((err) => {
        console.warn('Темы грамматики не загрузились с GitHub, показываю сохранённые при сборке:', err.message);
        return latest;
      });
    let alive = true;
    request.then((t) => alive && setTopics(t));
    return () => {
      alive = false;
    };
  }, []);
  return topics;
}
