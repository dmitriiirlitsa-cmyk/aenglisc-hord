import { useEffect, useRef, useState } from 'react';
import EntryCard from './EntryCard.jsx';
import { lastWord, parseEntry } from '../lib/meta.js';
import { MAX_INPUT, fitPrompt } from '../lib/limits.js';
import { CheckIcon, CopyIcon, PencilIcon, RetryIcon, ShuffleIcon } from './Icons.jsx';
import { randomStarters } from '../lib/starters.js';
import Logo from './Logo.jsx';

// Короткие запросы: подробности того, что делать по каждому, описаны в системном промпте
const QUICK_ACTIONS = [
  { label: '+ Ещё примеры', prefix: 'Ещё примеры: ' },
  { label: 'Предлоги', prefix: 'Предлоги: ' },
  { label: 'Сравнить синонимы', prefix: 'Сравнить синонимы: ' },
];

export default function Chat({ messages, setMessages, isSaved, onSave }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const word = lastWord(messages);
  const [starters, setStarters] = useState(() => randomStarters(isSaved));
  const shuffleStarters = () => setStarters(randomStarters(isSaved));

  // Новый набор подсказок каждый раз, когда чат очищается
  useEffect(() => {
    if (messages.length === 0) shuffleStarters();
  }, [messages.length === 0]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    request([...messages, { role: 'user', text: trimmed }]);
  }

  // Повторная отправка: история обрезается до этого сообщения включительно
  function resend(index) {
    if (loading) return;
    request(messages.slice(0, index + 1));
  }

  // Редактирование: сообщение заменяется, всё после него отбрасывается
  function edit(index, text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    request([...messages.slice(0, index), { role: 'user', text: trimmed }]);
  }

  async function request(history) {
    // Отправляемый вопрос всегда «чистый», даже если раньше он не дошёл
    const last = history.at(-1);
    const next = [...history.slice(0, -1), { role: last.role, text: last.text }];
    setMessages(next);
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => !m.failed) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Ошибка сервера (${res.status})`);
      setMessages([...next, { role: 'assistant', text: data.text, model: data.model }]);
    } catch (err) {
      // Вопрос без ответа помечается и не попадёт в контекст следующих запросов
      setMessages([...next.slice(0, -1), { ...next.at(-1), failed: true }]);
      setError(err.message || 'Не удалось связаться с сервером');
    } finally {
      setLoading(false);
    }
  }

  const lastIsAssistant = messages.at(-1)?.role === 'assistant';

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
              <Logo kind="full" className="mx-auto mb-5 h-36 w-auto sm:h-44" />
              <h2 className="text-lg font-semibold">Введите английское слово, выражение или вопрос</h2>
              <p className="mt-1 text-sm text-muted">
                Получите словарную статью с транскрипцией, уровнем CEFR, примерами и типичными ошибками.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-line bg-subtle px-3 py-1 text-sm hover:border-gold-line hover:bg-gold-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={shuffleStarters}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
              >
                <ShuffleIcon size={14} />
                Другие слова
              </button>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <UserMessage
                key={i}
                text={m.text}
                failed={m.failed}
                disabled={loading}
                onResend={() => resend(i)}
                onEdit={(text) => edit(i, text)}
              />
            ) : (
              <AssistantMessage key={i} text={m.text} isSaved={isSaved} onSave={onSave} />
            )
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gold" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
              <span className="ml-1">Думаю…</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-line bg-surface">
        {/* Снизу учитываем «домашнюю полоску» iPhone */}
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {lastIsAssistant && !loading && (
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => send(word ? fitPrompt(a.prefix, word) : a.prefix.replace(/:\s$/, ''))}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-body transition hover:border-gold-line hover:bg-gold-soft"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={MAX_INPUT}
                placeholder="Слово или фраза: Compare with abandon"
                className="w-full rounded-xl border border-line-strong bg-surface py-2.5 pl-4 pr-14 text-ink outline-none placeholder:text-faint focus:border-gold-line focus:ring-2 focus:ring-gold-soft"
              />
              <span
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${
                  input.length >= MAX_INPUT ? 'text-red-500' : 'text-faint'
                }`}
              >
                {input.length}/{MAX_INPUT}
              </span>
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-accent px-5 font-medium text-on-accent transition hover:bg-accent-hover disabled:opacity-40"
            >
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Clipboard API, а если браузер его запрещает — старый способ через скрытое поле
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function ActionButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function UserMessage({ text, failed, disabled, onResend, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function save() {
    if (!draft.trim()) return;
    setEditing(false);
    onEdit(draft);
  }

  if (editing) {
    return (
      <div className="ml-auto w-full max-w-[80%] rounded-2xl border border-line bg-subtle p-3">
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX_INPUT}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-full resize-none bg-transparent text-ink outline-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="mr-auto text-xs tabular-nums text-faint">
            {draft.length}/{MAX_INPUT}
          </span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm font-medium text-ink hover:bg-bg"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim() || disabled}
            className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-40"
          >
            Отправить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-end">
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-bubble px-4 py-2 text-on-bubble ${
          failed ? 'opacity-50' : ''
        }`}
      >
        {text}
      </div>
      {failed && (
        <span className="mt-1 text-xs text-red-500">Без ответа — нажмите ↻, чтобы отправить снова</span>
      )}
      {/* Как в ChatGPT: на компьютере видны при наведении, на телефоне всегда */}
      <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <ActionButton label={copied ? 'Скопировано' : 'Копировать'} onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </ActionButton>
        <ActionButton label="Отправить повторно" onClick={onResend} disabled={disabled}>
          <RetryIcon />
        </ActionButton>
        <ActionButton
          label="Редактировать"
          disabled={disabled}
          onClick={() => {
            setDraft(text);
            setEditing(true);
          }}
        >
          <PencilIcon />
        </ActionButton>
      </div>
    </div>
  );
}

function AssistantMessage({ text, isSaved, onSave }) {
  const { metas, body } = parseEntry(text);
  return <EntryCard metas={metas} body={body} isSaved={isSaved} onSave={(meta) => onSave(meta, body)} />;
}
