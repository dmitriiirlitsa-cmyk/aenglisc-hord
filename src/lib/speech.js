let cachedVoice = null;

function pickVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const us = voices.filter((v) => v.lang === 'en-US' || v.lang === 'en_US');
  // Предпочитаем «естественные» голоса, если они есть
  cachedVoice =
    us.find((v) => /natural|google|samantha|aria|jenny/i.test(v.name)) || us[0] || null;
  return cachedVoice;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text, rate = 0.95) {
  if (!canSpeak || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  const voice = pickVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// Достаёт английскую часть из строки вида «English sentence. — Перевод»
export function englishPart(text) {
  const cleaned = text
    .replace(/[❌✅⚠️]/gu, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/·\s*[ABC][12]/g, '')
    .trim();
  const first = cleaned.split(/\s[—–-]\s/)[0].trim();
  if (!/[a-z]/i.test(first) || /[а-яё]/i.test(first)) return null;
  return first;
}
