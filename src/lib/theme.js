const THEME_KEY = 'aenglisc.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export const THEMES = [
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'coffee', label: 'Кофейная' },
  { id: 'system', label: 'Как в системе' },
];

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'system';
  } catch {
    return 'system';
  }
}

// Ставит классы на <html>: .dark для всех тёмных тем, .coffee дополнительно для кофейной
export function applyTheme(theme) {
  const dark = theme === 'dark' || theme === 'coffee' || (theme === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('coffee', theme === 'coffee');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // выбор просто не запомнится
  }
}

// Следит за сменой темы ОС, пока выбран режим «Как в системе»
export function watchSystemTheme(getTheme) {
  const onChange = () => getTheme() === 'system' && applyTheme('system');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
