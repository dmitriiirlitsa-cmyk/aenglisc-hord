import { useEffect, useRef, useState } from 'react';
import { GrammarIcon } from './Icons.jsx';
import { LevelBadge, Markdown } from './EntryCard.jsx';
import { grammarTopics } from '../lib/grammar.js';

// Раздел «Грамматика»: список тем из админки и страница выбранной темы
export default function Grammar() {
  const [openId, setOpenId] = useState(null);
  const scrollRef = useRef(null);
  const topic = grammarTopics.find((t) => t.id === openId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [openId]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {topic ? (
          <TopicPage topic={topic} onBack={() => setOpenId(null)} />
        ) : grammarTopics.length === 0 ? (
          <EmptyState />
        ) : (
          <TopicList topics={grammarTopics} onOpen={setOpenId} />
        )}
      </div>
    </div>
  );
}

function TopicList({ topics, onOpen }) {
  return (
    <>
      <h2 className="mb-4 font-serif text-2xl font-bold tracking-wide text-ink">Грамматика</h2>
      <ul className="space-y-2">
        {topics.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onOpen(t.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-gold-line hover:bg-gold-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{t.title}</span>
                  <LevelBadge level={t.level} />
                </div>
                {t.summary && <p className="mt-0.5 text-sm text-muted">{t.summary}</p>}
              </div>
              <span className="mt-0.5 text-faint" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function TopicPage({ topic, onBack }) {
  return (
    <article>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
      >
        ‹ Все темы
      </button>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <header className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl font-bold tracking-wide text-ink">{topic.title}</h2>
            <LevelBadge level={topic.level} />
          </div>
          {topic.summary && <p className="mt-1 text-sm text-muted">{topic.summary}</p>}
        </header>
        <div className="px-5 py-4">
          <Markdown>{topic.body}</Markdown>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold">
        <GrammarIcon size={26} />
      </div>
      <h2 className="font-serif text-xl font-bold tracking-wide text-ink">Грамматика</h2>
      <p className="mt-2 text-sm text-muted">Раздел в разработке. Скоро здесь появятся правила и упражнения.</p>
    </div>
  );
}
