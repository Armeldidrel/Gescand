import { $, esc } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { STATUS } from '../config/constants.js';
import { matchScore, pendingFollowUps } from '../state/selectors.js';
import { fr } from '../utils/date.js';
import { dueClass, dueText } from '../utils/format.js';

export const filters = { q: '', s: 'all', o: 'relance' };

export function renderCandidates({ apps, skills }) {
  const query = filters.q.toLowerCase();

  const list = apps.filter((application) => {
    const haystack = [application.entreprise, application.poste, application.ville]
      .join(' ')
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = filters.s === 'all' || application.statut === filters.s;
    return matchesQuery && matchesStatus;
  });

  const score = (application) => matchScore(application, skills) ?? -1;

  list.sort((a, b) => {
    if (filters.o === 'relance') return (a.dateRelance || '9999') < (b.dateRelance || '9999') ? -1 : 1;
    if (filters.o === 'date') return (b.dateCand || '') < (a.dateCand || '') ? -1 : 1;
    if (filters.o === 'score') return score(b) - score(a);
    return (a.entreprise || '').localeCompare(b.entreprise || '');
  });

  const count = $('#candCount');
  if (count) {
    count.textContent = `${list.length} sur ${apps.length} candidature${apps.length > 1 ? 's' : ''}`;
  }

  const rows = $('#rows');
  const scroller = rows.closest('.tbl');
  const scrollLeft = scroller ? scroller.scrollLeft : 0;

  if (!apps.length) {
    rows.innerHTML = `<tr><td colspan="6"><div class="onboard">
      <span class="onboard__icon">${icon('briefcase', 28)}</span>
      <h3 class="onboard__title">Aucune candidature</h3>
      <p class="sub">Ajoutez la première, ou chargez des exemples pour voir le tableau se remplir.</p>
      <div class="onboard__actions">
        <button class="btn btn--primary" type="button" data-act="new">${icon('plus', 18)}Nouvelle candidature</button>
        <button class="btn btn--secondary" type="button" data-act="sample">Charger des exemples</button>
      </div>
    </div></td></tr>`;
    if (scroller) scroller.scrollLeft = scrollLeft;
    return;
  }

  if (!list.length) {
    rows.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      ${icon('search', 32)}
      <h3>Aucun résultat</h3>
      <p>Essayez un autre mot-clé ou un autre statut.</p>
      <button class="btn btn--secondary btn--sm" type="button" data-reset-filters>Réinitialiser les filtres</button>
    </div></td></tr>`;
    if (scroller) scroller.scrollLeft = scrollLeft;
    return;
  }

  const pendingMap = Object.fromEntries(pendingFollowUps(apps).map((item) => [item.id, item]));

  rows.innerHTML = list
    .map((application) => {
      const match = matchScore(application, skills);
      const pending = pendingMap[application.id];
      const options = Object.entries(STATUS)
        .map(
          ([value, label]) =>
            `<option value="${value}" ${value === application.statut ? 'selected' : ''}>${label}</option>`,
        )
        .join('');

      return `<tr class="row-click" data-open="${application.id}">
        <td>
          <button class="co cell-link" type="button" data-open-btn="${application.id}">${esc(application.entreprise)}</button>
          <div class="sm2">${esc(application.poste)}${application.ville ? ` · ${esc(application.ville)}` : ''}</div>
        </td>
        <td>
          <select class="status-select" data-act="st" data-id="${application.id}" data-status="${application.statut}" aria-label="Statut de ${esc(application.entreprise)}">${options}</select>
        </td>
        <td class="date">${fr(application.dateCand)}</td>
        <td class="date">${
          pending
            ? `${fr(application.dateRelance)}<span class="dt ${dueClass(pending)}">${dueText(pending)}</span>`
            : '<span class="muted">—</span>'
        }</td>
        <td>${
          match !== null
            ? `<div class="match" role="img" aria-label="Correspondance ${match}%"><div class="t"><i style="width:${match}%"></i></div>${match}%</div>`
            : '<span class="cell-empty">Fiche absente</span>'
        }</td>
        <td class="cell-actions">${
          pending
            ? `<button class="btn btn--primary btn--sm" type="button" data-act="relance" data-id="${application.id}" aria-label="Marquer la relance de ${esc(application.entreprise)} comme faite">${icon('check', 15)}Relancée</button>`
            : ''
        }<button class="btn btn--danger-ghost btn--sm" type="button" data-act="del" data-id="${application.id}" aria-label="Supprimer la candidature chez ${esc(application.entreprise)}">${icon('trash', 15)}Supprimer</button></td>
      </tr>`;
    })
    .join('');

  if (scroller) scroller.scrollLeft = scrollLeft;
}
