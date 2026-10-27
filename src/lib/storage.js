const WORDS_KEY = 'lexitutor.words';
const CHAT_KEY = 'lexitutor.chat';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // хранилище недоступно или переполнено — работаем без сохранения
  }
}

export const loadWords = () => read(WORDS_KEY, []);
export const saveWords = (words) => write(WORDS_KEY, words);
export const loadChat = () => read(CHAT_KEY, []);
export const saveChat = (messages) => write(CHAT_KEY, messages.slice(-60));
