import { $, esc } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import {
  RESPONSE_STATUSES,
  STATUS,
  STATUS_COLORS,
  WEEKS_SHOWN,
} from '../config/constants.js';
import { computeStats, countByStatus, pendingFollowUps } from '../state/selectors.js';
import { fr, startOfWeek } from '../utils/date.js';
import { dueClass, dueText } from '../utils/format.js';

export function renderHome({ apps }) {
  const stats = computeStats(apps);
  const pending = pendingFollowUps(apps);
  const late = pending.filter((item) => item.d < 0).length;
  const hour = new Date().getHours();

  $('#greet').textContent = hour < 18 ? 'Bonjour' : 'Bonsoir';
  $('#today').textContent = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const focusCount = $('#focusCount');
  focusCount.textContent = pending.length
    ? `${pending.length} en attente`
    : 'À jour';
  focusCount.classList.toggle('pill--warning', pending.length > 0);
  focusCount.classList.toggle('pill--success', pending.length === 0);

  $('#focus').innerHTML = pending.length
    ? pending
        .slice(0, 5)
        .map(
          (application) => `<div class="todo ${dueClass(application)}">
            <div class="idx">${application.d < 0 ? '!' : application.d === 0 ? '0' : application.d}</div>
            <div>
              <div class="n">${esc(application.entreprise)}</div>
              <div class="meta">${esc(application.poste)} · envoyée le ${fr(application.dateCand)} · relance n°${(application.nbRelances || 0) + 1}</div>
              <div class="due">${dueText(application)}</div>
            </div>
            <button class="btn btn--primary btn--sm" type="button" data-act="relance" data-id="${application.id}">
              ${icon('check', 15)}Relancée
            </button>
          </div>`,
        )
        .join('')
    : `<div class="empty-state">
        ${icon('inbox', 34)}
        <h3>Vous êtes à jour</h3>
        <p>Aucune relance en attente. Ajoutez une candidature pour continuer sur votre lancée.</p>
      </div>`;

  let message;
  if (!stats.total) {
    message = 'Commencez par ajouter une candidature. Le tableau se remplira au fur et à mesure.';
  } else if (late) {
    message = `${late} relance${late > 1 ? 's sont' : ' est'} en retard. Commencez par celle-là, en haut de la liste.`;
  } else if (stats.interviews.length) {
    message = "Un entretien est prévu ou a eu lieu. Relisez la fiche de poste avant la prochaine étape.";
  } else if (!pending.length) {
    message = 'Rien à relancer. Envoyez une nouvelle candidature pour garder un rythme régulier.';
  } else {
    message = `${pending.length} relance${pending.length > 1 ? 's' : ''} à faire. Une par jour suffit.`;
  }
  $('#bubble').textContent = message;

  $('#kRate').textContent = stats.rate === null ? '–' : `${stats.rate}%`;
  $('#kRateHint').textContent = stats.sent.length
    ? `${stats.responses.length} réponse${stats.responses.length > 1 ? 's' : ''} sur ${stats.sent.length}`
    : "Aucun envoi pour l'instant";
  $('#rateBar').style.width = `${stats.rate ?? 0}%`;
  $('#kTotal').textContent = stats.sent.length;
  $('#kTotalHint').textContent = `${stats.total} au total dans le suivi`;
  $('#kInter').textContent = stats.interviews.length;
  $('#kAvg').textContent = stats.avg === null ? '–' : `${stats.avg} j`;

  const statusKeys = Object.keys(STATUS);
  const total = stats.total || 1;
  const counts = Object.fromEntries(statusKeys.map((key) => [key, countByStatus(apps, key)]));

  $('#seg').innerHTML = stats.total
    ? statusKeys
        .map((key) => {
          const count = counts[key];
          return count
            ? `<i style="width:${(count / total) * 100}%;background:${STATUS_COLORS[key]}" title="${STATUS[key]} : ${count}"></i>`
            : '';
        })
        .join('')
    : `<i style="width:100%;background:var(--color-muted)"></i>`;

  $('#seg').setAttribute(
    'aria-label',
    stats.total
      ? `Répartition des candidatures : ${statusKeys.map((key) => `${STATUS[key]} ${counts[key]}`).join(', ')}`
      : 'Aucune candidature pour le moment',
  );

  $('#legend').innerHTML = statusKeys
    .map(
      (key) =>
        `<span><i class="sw" style="background:${STATUS_COLORS[key]}"></i>${STATUS[key]} <b>${counts[key]}</b></span>`,
    )
    .join('');

  const monday = startOfWeek();
  const weeks = [];
  for (let index = WEEKS_SHOWN - 1; index >= 0; index -= 1) {
    const start = new Date(monday);
    start.setDate(start.getDate() - 7 * index);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const count = apps.filter((application) => {
      if (!application.dateCand) return false;
      const applied = new Date(`${application.dateCand}T00:00`);
      return applied >= start && applied < end;
    }).length;

    weeks.push({
      label: start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      count,
    });
  }

  const maxWeek = Math.max(1, ...weeks.map((week) => week.count));
  $('#weeks').innerHTML = weeks
    .map((week) => {
      const height = week.count ? Math.max(8, Math.round((week.count / maxWeek) * 100)) : 0;
      return `<div class="week" title="Semaine du ${week.label} : ${week.count} envoi${week.count > 1 ? 's' : ''}">
        <span class="week__value">${week.count}</span>
        <div class="week__track"><i style="height:${height}%"></i></div>
        <span class="week__label">${week.label}</span>
      </div>`;
    })
    .join('');

  $('#weeks').setAttribute(
    'aria-label',
    `Envois par semaine : ${weeks.map((week) => `semaine du ${week.label}, ${week.count} envoi${week.count > 1 ? 's' : ''}`).join(' ; ')}`,
  );

  const channels = [...new Set(apps.map((application) => application.canal || 'Autre'))];
  $('#canaux').innerHTML = channels.length
    ? channels
        .map((channel) => {
          const sent = apps.filter(
            (application) => (application.canal || 'Autre') === channel && application.statut !== 'aenvoyer',
          );
          const responses = sent.filter((application) => RESPONSE_STATUSES.includes(application.statut));
          const percent = sent.length ? Math.round((responses.length / sent.length) * 100) : 0;
          return `<div class="bar">
            <span>${esc(channel)}</span>
            <div class="t" role="img" aria-label="${esc(channel)} : ${percent}% de réponses"><i style="width:${percent}%"></i></div>
            <b>${percent}%</b>
          </div>`;
        })
        .join('')
    : '<p class="empty">Pas encore de données.</p>';
}
