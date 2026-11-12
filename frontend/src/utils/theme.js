import { icon } from './icons.js';

const STORAGE_KEY = 'alternance-theme';
const THEME_COLORS = {
  light: '#f0f9ff',
  dark: '#071825',
};

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function syncButton(theme) {
  const button = document.querySelector('#themeToggle');
  if (!button) return;

  const isDark = theme === 'dark';
  const label = isDark ? 'Passer en thème clair' : 'Passer en thème sombre';

  button.innerHTML = icon(isDark ? 'sun' : 'moon');
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.setAttribute('aria-pressed', String(isDark));
}

function applyTheme(theme, persist = false) {
  const next = theme === 'dark' ? 'dark' : 'light';

  document.documentElement.dataset.theme = next;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[next]);

  syncButton(next);

  if (!persist) return;

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Stockage indisponible : le thème reste appliqué pour la session.
  }
}

export function initTheme() {
  const button = document.querySelector('#themeToggle');
  if (!button) return;

  const stored = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })();

  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = document.documentElement.dataset.theme || stored || preferred;

  applyTheme(theme);

  button.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    applyTheme(event.matches ? 'dark' : 'light');
  });
}
