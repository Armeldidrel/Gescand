import { $$ } from './utils/dom.js';

const VIEWS = ['home', 'cands', 'rel', 'profil'];
const DEFAULT_VIEW = 'home';
const TITLES = {
  home: 'Tableau de bord',
  cands: 'Candidatures',
  rel: 'Relances',
  profil: 'Compétences',
};

function viewFromHash() {
  const hash = window.location.hash;
  if (hash.includes('access_token') || hash.includes('error_description')) return DEFAULT_VIEW;

  const view = hash.replace(/^#\/?/, '').trim();
  return VIEWS.includes(view) ? view : DEFAULT_VIEW;
}

export function showView(view) {
  const target = VIEWS.includes(view) ? view : DEFAULT_VIEW;

  $$('[data-v]').forEach((button) => {
    const active = button.dataset.v === target;
    button.classList.toggle('on', active);
    if (active) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  $$('.view').forEach((section) => {
    section.classList.toggle('on', section.id === `v-${target}`);
  });

  document.title = `${TITLES[target]} · Alternance`;
}

export function navigate(view) {
  showView(view);
  if (window.location.hash !== `#/${view}`) {
    history.replaceState(null, '', `#/${view}`);
  }
}

export function initRouter() {
  $$('[data-v]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.v));
  });

  window.addEventListener('hashchange', () => showView(viewFromHash()));
  showView(viewFromHash());

  if (!window.location.hash) {
    history.replaceState(null, '', `#/${DEFAULT_VIEW}`);
  }
}
