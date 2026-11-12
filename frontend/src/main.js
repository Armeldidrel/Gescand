import './styles/main.css';

import { $, fillSelect } from './utils/dom.js';
import { initIcons } from './utils/icons.js';
import { initTheme } from './utils/theme.js';
import { RESPONSE_STATUSES, STATUS } from './config/constants.js';
import {
  getState,
  loadState,
  saveSkills,
  subscribe,
  updateApplication,
} from './state/store.js';
import {
  getSession,
  isAuthRequired,
  onAuthChange,
  signInWithEmail,
  signOut,
} from './lib/auth.js';
import { clearUserCache } from './lib/repositories/remoteRepository.js';
import { initDialog, openDialog } from './components/applicationDialog.js';
import { initRouter } from './router.js';
import { renderAll } from './render.js';
import { filters, renderCandidates } from './views/candidates.js';
import { renderProfile } from './views/profile.js';
import { handleAction } from './actions.js';
import { toast } from './utils/toast.js';
import { TODAY } from './utils/date.js';

function updateModeBadge() {
  const badge = $('#modeBadge');
  if (!badge) return;

  const online = getState().mode === 'remote';
  badge.textContent = online ? 'En ligne' : 'Mode local';
  badge.classList.toggle('mode-badge--online', online);
  badge.classList.toggle('mode-badge--local', !online);
  badge.title = online
    ? 'Données synchronisées avec Supabase'
    : 'Configurez frontend/.env.local pour synchroniser en ligne';
}

function setAppInert(inert) {
  document.querySelectorAll('.skip-link, .top, #main').forEach((element) => {
    element.inert = inert;
  });
}

function showAuth() {
  $('#auth').hidden = false;
  $('#signOut').hidden = true;
  setAppInert(true);
}

function hideAuth() {
  $('#auth').hidden = true;
  $('#signOut').hidden = !isAuthRequired();
  setAppInert(false);
}

function resetFilters() {
  filters.q = '';
  filters.s = 'all';
  filters.o = 'relance';

  $('#q').value = '';
  $('#fs').value = 'all';
  $('#fo').value = 'relance';

  renderCandidates(getState());
}

function bindFilters() {
  fillSelect($('#fs'), [
    { value: 'all', label: 'Tous les statuts' },
    ...Object.entries(STATUS).map(([value, label]) => ({ value, label })),
  ]);

  $('#q').addEventListener('input', (event) => {
    filters.q = event.target.value;
    renderCandidates(getState());
  });

  $('#fs').addEventListener('change', (event) => {
    filters.s = event.target.value;
    renderCandidates(getState());
  });

  $('#fo').addEventListener('change', (event) => {
    filters.o = event.target.value;
    renderCandidates(getState());
  });

  $('#skillsIn').addEventListener('input', (event) => {
    renderProfile({ skills: event.target.value });
  });

  $('#saveSkills').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const original = button.innerHTML;

    button.disabled = true;
    button.textContent = 'Enregistrement…';

    try {
      await saveSkills($('#skillsIn').value);
      toast('Compétences enregistrées');
    } catch (error) {
      toast(`Erreur : ${error.message}`);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });
}

function bindGlobalEvents() {
  document.addEventListener('click', async (event) => {
    const reset = event.target.closest('[data-reset-filters]');
    if (reset) {
      event.preventDefault();
      resetFilters();
      return;
    }

    const openTrigger = event.target.closest('[data-open-btn]');
    if (openTrigger) {
      event.preventDefault();
      const application = getState().apps.find((item) => item.id === openTrigger.dataset.openBtn);
      if (application) openDialog(application);
      return;
    }

    const trigger = event.target.closest('[data-act]');
    if (trigger && trigger.tagName !== 'SELECT') {
      event.preventDefault();
      try {
        await handleAction(trigger.dataset.act, trigger.dataset.id);
      } catch (error) {
        toast(`Erreur : ${error.message}`);
      }
      return;
    }

    const row = event.target.closest('tr[data-open]');
    if (row && !event.target.closest('button, select, a')) {
      openDialog(getState().apps.find((application) => application.id === row.dataset.open));
    }
  });

  document.addEventListener('change', async (event) => {
    if (event.target.dataset.act !== 'st') return;

    const application = getState().apps.find((item) => item.id === event.target.dataset.id);
    if (!application) return;

    const previousStatus = application.statut;
    const statut = event.target.value;
    const patch = { statut };
    if (RESPONSE_STATUSES.includes(statut) && !application.reponseDate) {
      patch.reponseDate = TODAY();
    }

    event.target.dataset.status = statut;

    try {
      await updateApplication(application.id, patch);
      toast('Statut mis à jour');
    } catch (error) {
      event.target.value = previousStatus;
      event.target.dataset.status = previousStatus;
      toast(`Erreur : ${error.message}`);
    }
  });
}

function bindAuth() {
  $('#authForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = $('#authEmail').value.trim();
    const message = $('#authMsg');
    const button = $('#authSubmit');
    const original = button.innerHTML;

    button.disabled = true;
    button.textContent = 'Envoi en cours…';
    message.dataset.state = '';
    message.textContent = '';

    try {
      await signInWithEmail(email);
      message.dataset.state = 'success';
      message.textContent = 'Lien envoyé. Vérifiez votre boîte mail.';
    } catch (error) {
      message.dataset.state = 'error';
      message.textContent = `Erreur : ${error.message}`;
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });

  $('#signOut').addEventListener('click', async () => {
    try {
      await signOut();
    } catch (error) {
      toast(`Erreur : ${error.message}`);
    }
  });
}

async function loadWithFeedback() {
  try {
    await loadState();
  } catch (error) {
    toast(`Erreur : ${error.message}`);
  }
}

async function boot() {
  initIcons();
  initTheme();
  initDialog();
  initRouter();
  bindFilters();
  bindAuth();
  bindGlobalEvents();
  updateModeBadge();
  subscribe(renderAll);
  renderAll();

  if (!isAuthRequired()) {
    hideAuth();
    await loadWithFeedback();
    return;
  }

  try {
    const session = await getSession();
    if (session) {
      hideAuth();
      await loadWithFeedback();
    } else {
      showAuth();
    }
  } catch (error) {
    showAuth();
    $('#authMsg').dataset.state = 'error';
    $('#authMsg').textContent = `Erreur : ${error.message}`;
  }

  onAuthChange(async (session) => {
    if (session) {
      hideAuth();
      await loadWithFeedback();
    } else {
      clearUserCache();
      showAuth();
    }
  });

  if (window.location.hash.includes('access_token')) {
    setTimeout(() => {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }, 500);
  }
}

boot();
