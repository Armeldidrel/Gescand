import { $, esc } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { pendingFollowUps } from '../state/selectors.js';
import { fr } from '../utils/date.js';
import { dueClass, dueText } from '../utils/format.js';

export function renderFollowUps({ apps }) {
  const pending = pendingFollowUps(apps);

  const count = $('#relCount');
  if (count) {
    count.textContent = pending.length
      ? `${pending.length} à faire`
      : 'À jour';
    count.classList.toggle('pill--warning', pending.length > 0);
    count.classList.toggle('pill--success', pending.length === 0);
  }

  $('#relList').innerHTML = pending.length
    ? pending
        .map(
          (application) => `<div class="todo ${dueClass(application)}">
            <div class="idx">${application.d < 0 ? '!' : application.d === 0 ? '0' : application.d}</div>
            <div>
              <div class="n">${esc(application.entreprise)} <span class="todo__role">· ${esc(application.poste)}</span></div>
              <div class="meta">envoyée le ${fr(application.dateCand)} · relance n°${(application.nbRelances || 0) + 1}</div>
              <div class="due">${dueText(application)}</div>
            </div>
            <div class="rel__actions">
              <button class="btn btn--secondary btn--sm" type="button" data-act="copy" data-id="${application.id}">${icon('copy', 15)}Modèle</button>
              <button class="btn btn--primary btn--sm" type="button" data-act="relance" data-id="${application.id}" aria-label="Marquer la relance de ${esc(application.entreprise)} comme faite">${icon('check', 15)}Relancée</button>
              <button class="btn btn--ghost btn--sm" type="button" data-act="sans" data-id="${application.id}">Sans réponse</button>
            </div>
          </div>`,
        )
        .join('')
    : `<div class="empty-state">
        ${icon('inbox', 34)}
        <h3>Rien à relancer</h3>
        <p>Vous êtes à jour. Ajoutez une candidature pour préparer la prochaine relance.</p>
        <button class="btn btn--primary btn--sm" type="button" data-act="new">${icon('plus', 16)}Nouvelle candidature</button>
      </div>`;
}
