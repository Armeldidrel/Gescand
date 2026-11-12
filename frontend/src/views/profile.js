import { $, esc } from '../utils/dom.js';

export function renderProfile({ skills }) {
  const field = $('#skillsIn');
  if (!field) return;

  if (document.activeElement !== field) field.value = skills;

  const list = (skills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  const cloud = $('#skillCloud');
  if (cloud) {
    cloud.innerHTML = list.length
      ? list.map((skill) => `<span class="tag tag--skill">${esc(skill)}</span>`).join('')
      : '<span class="muted">Vos compétences apparaîtront ici.</span>';
  }

  const count = $('#skillCount');
  if (count) {
    count.textContent = `${list.length} compétence${list.length > 1 ? 's' : ''}`;
  }
}
