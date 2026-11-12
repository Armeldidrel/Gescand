import { $, fillSelect } from '../utils/dom.js';
import {
  CHANNELS,
  COMPANY_SIZES,
  CONTRACT_LABELS,
  MOTIVATION_SCORES,
  REMINDER_DELAY_DAYS,
  STATUS,
  WAIT_STATUSES,
} from '../config/constants.js';
import { addDays, TODAY } from '../utils/date.js';
import { createApplication, updateApplication } from '../state/store.js';
import { toast } from '../utils/toast.js';

let editingId = null;
let initialized = false;

export function initDialog() {
  if (initialized) return;
  initialized = true;

  const form = $('#f');

  fillSelect(
    $('[name="statut"]'),
    Object.entries(STATUS).map(([value, label]) => ({ value, label })),
  );
  fillSelect(
    $('[name="canal"]'),
    CHANNELS.map((channel) => ({ value: channel, label: channel })),
  );
  fillSelect(
    $('[name="type"]'),
    CONTRACT_LABELS.map((label) => ({ value: label, label })),
  );
  fillSelect(
    $('[name="taille"]'),
    COMPANY_SIZES.map((size) => ({ value: size, label: size })),
  );
  fillSelect(
    $('[name="motivation"]'),
    MOTIVATION_SCORES.map((score) => ({ value: String(score), label: `${score} sur 5` })),
  );

  $('#cancel').addEventListener('click', () => $('#dlg').close());
  $('#dlgClose').addEventListener('click', () => $('#dlg').close());
  form.addEventListener('submit', handleSubmit);
}

export function openDialog(application = null) {
  editingId = application ? application.id : null;

  const form = $('#f');
  form.reset();
  $('#dlgTitle').textContent = application ? 'Modifier la candidature' : 'Nouvelle candidature';

  if (application) {
    for (const [key, value] of Object.entries(application)) {
      const field = form.elements[key];
      if (field) field.value = value ?? '';
    }
    if (!form.elements.type.value) form.elements.type.value = CONTRACT_LABELS[0];
  } else {
    form.elements.dateCand.value = TODAY();
    form.elements.dateRelance.value = addDays(TODAY(), REMINDER_DELAY_DAYS);
    form.elements.statut.value = 'envoyee';
    form.elements.motivation.value = '4';
    form.elements.type.value = CONTRACT_LABELS[0];
  }

  const body = $('#dlg .dialog__body');
  if (body) body.scrollTop = 0;

  $('#dlg').showModal();
}

async function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const original = submit.innerHTML;

  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === 'string' ? value.trim() : value;
  });

  if (!data.dateRelance && WAIT_STATUSES.includes(data.statut)) {
    data.dateRelance = addDays(data.dateCand || TODAY(), REMINDER_DELAY_DAYS);
  }
  data.motivation = Number(data.motivation) || 0;

  submit.disabled = true;
  submit.textContent = 'Enregistrement…';
  form.setAttribute('aria-busy', 'true');

  try {
    if (editingId) {
      await updateApplication(editingId, data);
    } else {
      await createApplication({ nbRelances: 0, ...data });
    }
    $('#dlg').close();
    toast('Candidature enregistrée');
  } catch (error) {
    toast(`Erreur : ${error.message}`);
  } finally {
    submit.disabled = false;
    submit.innerHTML = original;
    form.removeAttribute('aria-busy');
  }
}
