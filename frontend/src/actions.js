import { getState, createApplication, updateApplication, deleteApplication } from './state/store.js';
import { addDays, fr, TODAY } from './utils/date.js';
import { toast } from './utils/toast.js';
import { REMINDER_DELAY_DAYS } from './config/constants.js';
import { openDialog } from './components/applicationDialog.js';
import { buildSampleApplications } from './data/sampleApplications.js';

export async function handleAction(action, id) {
  const application = getState().apps.find((item) => item.id === id);

  switch (action) {
    case 'new':
      return openDialog();
    case 'sample':
      return loadSamples();
    case 'del':
      return removeApplication(application);
    case 'relance':
      return markFollowedUp(application);
    case 'sans':
      return markWithoutResponse(application);
    case 'copy':
      return copyTemplate(application);
    default:
      return undefined;
  }
}

async function loadSamples() {
  if (getState().apps.length && !window.confirm('Ajouter les exemples à vos candidatures existantes ?')) {
    return;
  }

  for (const sample of buildSampleApplications()) {
    await createApplication(sample);
  }
  toast('Exemples chargés');
}

function removeApplication(application) {
  if (!application) return undefined;
  if (!window.confirm(`Supprimer la candidature chez ${application.entreprise} ?`)) return undefined;

  return deleteApplication(application.id).then(() => toast('Candidature supprimée'));
}

function markFollowedUp(application) {
  if (!application) return undefined;

  const patch = {
    statut: application.statut === 'envoyee' ? 'relancee' : application.statut,
    nbRelances: (application.nbRelances || 0) + 1,
    dateRelance: addDays(TODAY(), REMINDER_DELAY_DAYS),
  };

  return updateApplication(application.id, patch).then(() =>
    toast('Relance notée, prochaine dans 7 jours'),
  );
}

function markWithoutResponse(application) {
  if (!application) return undefined;

  return updateApplication(application.id, { statut: 'sans' }).then(() =>
    toast('Marquée sans réponse'),
  );
}

function copyTemplate(application) {
  if (!application) return undefined;

  const firstName = application.contact ? application.contact.split(' ')[0] : '';
  const text = `Bonjour${firstName ? ` ${firstName}` : ''},\n\nJe me permets de revenir vers vous au sujet de ma candidature au poste de ${application.poste} chez ${application.entreprise}, envoyée le ${fr(application.dateCand)}. Très motivé(e) par votre entreprise, je reste disponible pour échanger sur mon profil.\n\nCordialement,`;

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => toast('Modèle copié'))
      .catch(() => window.prompt('Copiez ce texte :', text));
  }

  window.prompt('Copiez ce texte :', text);
  return undefined;
}
