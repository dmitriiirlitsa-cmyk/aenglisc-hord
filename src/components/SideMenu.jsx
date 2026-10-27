import { useEffect } from 'react';
import Logo from './Logo.jsx';
import { CloseIcon } from './Icons.jsx';

// Выезжающее слева меню с разделами сайта; внизу — переключатель темы
export default function SideMenu({ open, onClose, sections, current, onSelect, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <nav
        aria-label="Разделы"
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-line bg-surface shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Logo className="h-9 w-auto" alt="" />
          <span className="flex-1 whitespace-nowrap font-serif text-lg font-bold tracking-[0.12em] text-ink">
            ÆNGLISC <span className="text-gold">HORD</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-subtle hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <ul className="flex-1 space-y-1 p-3">
          {sections.map(({ id, label, Icon, badge }) => {
            const active = current === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle hover:text-ink'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-gold' : ''} />
                  <span className="flex-1">{label}</span>
                  {badge && <span className="text-xs text-faint">{badge}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line p-4">
          <p className="mb-2 text-xs text-muted">Тема оформления</p>
          {children}
        </div>
      </nav>
    </div>
  );
}
