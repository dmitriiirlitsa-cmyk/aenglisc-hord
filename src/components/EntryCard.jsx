import { Children, isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SpeakButton from './SpeakButton.jsx';
import { englishPart, speak } from '../lib/speech.js';

const LEVEL_COLORS = {
  // Фирменные цвета во всех темах: A — светлая плашка, B — золото, C — контрастная (инверсия)
  A1: 'bg-subtle text-ink',
  A2: 'bg-subtle text-ink',
  B1: 'bg-gold-soft text-gold',
  B2: 'bg-gold-soft text-gold',
  C1: 'bg-accent text-on-accent',
  C2: 'bg-accent text-on-accent',
};

export function LevelBadge({ level }) {
  if (!level) return null;
  const key = String(level).toUpperCase().slice(0, 2);
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_COLORS[key] || 'bg-subtle text-muted'}`}>
      {level}
    </span>
  );
}

function textOf(children) {
  return Children.toArray(children)
    .map((c) => (typeof c === 'string' ? c : isValidElement(c) ? textOf(c.props.children) : ''))
    .join('');
}

const markdownComponents = {
  // Пример с английским предложением получает кнопку озвучки
  li({ node, children, ...props }) {
    const phrase = englishPart(textOf(children));
    return (
      <li {...props}>
        {children}
        {phrase && <SpeakButton text={phrase} className="ml-1.5 align-middle" />}
      </li>
    );
  },
  // Жирные английские слова озвучиваются по клику
  strong({ node, children, ...props }) {
    const phrase = englishPart(textOf(children));
    if (!phrase) return <strong {...props}>{children}</strong>;
    return (
      <strong
        {...props}
        onClick={() => speak(phrase)}
        title="Нажмите, чтобы озвучить"
        className="cursor-pointer decoration-gold-line decoration-dotted underline-offset-4 hover:underline"
      >
        {children}
      </strong>
    );
  },
  table({ node, ...props }) {
    return (
      <div className="table-wrap">
        <table {...props} />
      </div>
    );
  },
};

export function Markdown({ children }) {
  return (
    <div className="entry">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

// Строка шапки для одного слова: озвучка, транскрипция, уровень и (если onSave задан) кнопка сохранения
function WordRow({ meta, compact, saved, onSave }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3">
      <SpeakButton text={meta.word} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={`font-bold text-ink ${compact ? 'text-lg' : 'text-xl'}`}>{meta.word}</span>
          <span className="font-mono text-sm text-muted">{meta.ipa}</span>
          <LevelBadge level={meta.level} />
        </div>
        <div className="text-sm text-muted">
          {meta.pos && <em>{meta.pos}</em>} {meta.translation && `— ${meta.translation}`}
        </div>
      </div>
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            saved ? 'bg-subtle text-muted' : 'bg-accent text-on-accent hover:bg-accent-hover'
          }`}
        >
          {saved ? '✓ В словаре' : '+ В мой словарь'}
        </button>
      )}
    </div>
  );
}

// metas — одно слово для статьи или несколько, если ответ сравнивает слова.
// Кнопка «В мой словарь» одна — у первого слова; остальные только с озвучкой и транскрипцией
export default function EntryCard({ metas = [], body, isSaved, onSave }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      {metas.length > 0 && (
        <header className="divide-y divide-line border-b border-line bg-surface dark:bg-gradient-to-r dark:from-gold-soft dark:to-surface">
          {metas.map((meta, i) => (
            <WordRow
              key={meta.word}
              meta={meta}
              compact={metas.length > 1}
              saved={isSaved(meta.word)}
              onSave={i === 0 ? () => onSave(meta) : null}
            />
          ))}
        </header>
      )}
      <div className="px-5 py-4">
        <Markdown>{body}</Markdown>
      </div>
    </article>
  );
}
