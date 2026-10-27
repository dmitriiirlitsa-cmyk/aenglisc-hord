import { useEffect, useRef, useState } from 'react';
import { NewChatIcon } from './Icons.jsx';

// Кнопка «Новый диалог» со своим окошком подтверждения:
// стандартный confirm() блокируется во встроенных браузерах и сразу отвечает «Отмена»
export default function NewChatButton({ onConfirm, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Новый диалог"
        aria-label="Новый диалог"
        aria-expanded={open}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-subtle hover:text-ink ${
          open ? 'bg-subtle text-ink' : 'text-faint'
        }`}
      >
        <NewChatIcon size={18} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Начать новый диалог"
          className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-line bg-surface p-3 shadow-lg"
        >
          <p className="text-sm font-medium text-ink">Начать новый диалог?</p>
          <p className="mt-1 text-xs text-muted">Текущая переписка удалится. «Мой словарь» сохранится.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-subtle hover:text-ink"
            >
              Отмена
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-hover"
            >
              Новый диалог
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
