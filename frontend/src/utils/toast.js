import { $, esc } from './dom.js';
import { icon } from './icons.js';

let hideTimer;

export function toast(message, variant) {
  const element = $('#toast');
  if (!element) return;

  const isError = variant ? variant === 'error' : /^erreur/i.test(message);

  element.dataset.variant = isError ? 'error' : 'success';
  element.innerHTML = `<span class="toast__icon">${icon(isError ? 'alert-triangle' : 'check-circle', 18)}</span><span>${esc(message)}</span>`;
  element.classList.add('show');

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => element.classList.remove('show'), 3200);
}
