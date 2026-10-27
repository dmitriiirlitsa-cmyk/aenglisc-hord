import { useEffect, useRef, useState } from 'react';
import Chat from './components/Chat.jsx';
import Dictionary from './components/Dictionary.jsx';
import { loadChat, loadWords, saveChat, saveWords } from './lib/storage.js';
import NewChatButton from './components/NewChatButton.jsx';
import Logo from './components/Logo.jsx';
import SideMenu from './components/SideMenu.jsx';
import Grammar from './components/Grammar.jsx';
import { useGrammarTopics } from './lib/grammar.js';
import {
  BookIcon,
  ChatIcon,
  CoffeeIcon,
  GrammarIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from './components/Icons.jsx';
import { THEMES, applyTheme, loadTheme, watchSystemTheme } from './lib/theme.js';

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, coffee: CoffeeIcon, system: MonitorIcon };

export default function App() {
  const [tab, setTab] = useState('chat');
  const [menuOpen, setMenuOpen] = useState(false);
  const grammarTopics = useGrammarTopics();
  const [messages, setMessages] = useState(loadChat);
  const [words, setWords] = useState(loadWords);
  const [theme, setTheme] = useState(loadTheme);
  const themeRef = useRef(theme);

  useEffect(() => saveChat(messages), [messages]);
  useEffect(() => saveWords(words), [words]);
  useEffect(() => {
    themeRef.current = theme;
    applyTheme(theme);
  }, [theme]);
  useEffect(() => watchSystemTheme(() => themeRef.current), []);

  const normalize = (w) => w.trim().toLowerCase();
  const isSaved = (word) => words.some((w) => normalize(w.word) === normalize(word));

  function saveWord(meta, entry) {
    if (isSaved(meta.word)) return;
    setWords((prev) => [{ ...meta, entry, savedAt: Date.now() }, ...prev]);
  }

  function removeWord(word) {
    setWords((prev) => prev.filter((w) => normalize(w.word) !== normalize(word)));
  }

  const sections = [
    { id: 'chat', label: 'Чат', Icon: ChatIcon },
    { id: 'dict', label: 'Мой словарь', Icon: BookIcon, badge: words.length || null },
    { id: 'grammar', label: 'Грамматика', Icon: GrammarIcon, badge: grammarTopics.length || 'скоро' },
  ];

  const themeSwitcher = (
    <div
      className="flex w-fit items-center gap-0.5 rounded-lg border border-line bg-subtle p-0.5"
      role="radiogroup"
      aria-label="Тема оформления"
    >
      {THEMES.map((t) => {
        const ThemeIcon = THEME_ICONS[t.id];
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            title={t.label}
            onClick={() => setTheme(t.id)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-faint hover:text-muted'
            }`}
          >
            <ThemeIcon />
          </button>
        );
      })}
    </div>
  );

  return (
    // Каркас приклеен к видимой области экрана: шапка и поле ввода стоят на месте, прокручивается только содержимое
    <div className="fixed inset-0 flex flex-col">
      {/* Отступ сверху — под строку состояния iPhone, когда сайт открыт с экрана «Домой» */}
      <header className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Logo className="h-9 w-auto shrink-0 sm:h-10" alt="" />
            <div className="min-w-0">
              <h1 className="whitespace-nowrap font-serif text-lg font-bold tracking-[0.12em] text-ink sm:text-xl">
                ÆNGLISC <span className="text-gold">HORD</span>
              </h1>
              <p className="hidden text-xs text-muted sm:block">Онлайн-словарь английского</p>
            </div>
          </div>
          {/* На телефоне переключатель темы живёт в меню, чтобы шапка не переполнялась */}
          <div className="hidden sm:block">{themeSwitcher}</div>
          {tab === 'chat' && messages.length > 0 && <NewChatButton onConfirm={() => setMessages([])} />}
        </div>
      </header>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sections={sections}
        current={tab}
        onSelect={(id) => {
          setTab(id);
          setMenuOpen(false);
        }}
      >
        {themeSwitcher}
      </SideMenu>

      <main className="min-h-0 flex-1">
        {tab === 'chat' && (
          <Chat messages={messages} setMessages={setMessages} isSaved={isSaved} onSave={saveWord} />
        )}
        {tab === 'dict' && <Dictionary words={words} onRemove={removeWord} />}
        {tab === 'grammar' && <Grammar />}
      </main>
    </div>
  );
}
