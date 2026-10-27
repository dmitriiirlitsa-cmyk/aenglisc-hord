import { useMemo, useState } from 'react';
import SpeakButton from './SpeakButton.jsx';
import { LevelBadge, Markdown } from './EntryCard.jsx';

const LEVELS = ['Все', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function Dictionary({ words, onRemove }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('Все');
  const [openWord, setOpenWord] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      const matchesQuery =
        !q || w.word.toLowerCase().includes(q) || (w.translation || '').toLowerCase().includes(q);
      const matchesLevel = level === 'Все' || String(w.level).toUpperCase().startsWith(level);
      return matchesQuery && matchesLevel;
    });
  }, [words, query, level]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по слову или переводу…"
            className="flex-1 rounded-xl border border-line-strong bg-surface px-4 py-2.5 outline-none focus:border-gold-line focus:ring-2 focus:ring-gold-soft"
          />
          <div className="flex flex-wrap gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                  level === l ? 'bg-accent text-on-accent' : 'bg-surface text-muted hover:bg-subtle'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {words.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center text-muted">
            Словарь пуст. Нажмите «+ В мой словарь» на карточке слова в чате.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">Ничего не найдено.</div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((w) => {
              const open = openWord === w.word;
              return (
                <li key={w.word} className="overflow-hidden rounded-xl border border-line bg-surface">
                  <div
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-subtle"
                    onClick={() => setOpenWord(open ? null : w.word)}
                  >
                    <SpeakButton text={w.word} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-ink">{w.word}</span>
                        <span className="font-mono text-xs text-muted">{w.ipa}</span>
                        <LevelBadge level={w.level} />
                      </div>
                      <div className="truncate text-sm text-muted">
                        {w.pos && <em>{w.pos} </em>}
                        {w.translation}
                      </div>
                    </div>
                    <span className="text-xs text-faint">
                      {new Date(w.savedAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="text-faint">{open ? '▲' : '▼'}</span>
                  </div>
                  {open && (
                    <div className="border-t border-line px-4 py-4">
                      <Markdown>{w.entry}</Markdown>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => onRemove(w.word)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
