export const STATUS = {
  aenvoyer: 'À envoyer',
  envoyee: 'Envoyée',
  relancee: 'Relancée',
  entretien: 'Entretien',
  test: 'Test',
  offre: 'Offre',
  refus: 'Refus',
  sans: 'Sans réponse',
};

export const STATUS_COLORS = {
  aenvoyer: 'var(--status-aenvoyer)',
  envoyee: 'var(--status-envoyee)',
  relancee: 'var(--status-relancee)',
  entretien: 'var(--status-entretien)',
  test: 'var(--status-test)',
  offre: 'var(--status-offre)',
  refus: 'var(--status-refus)',
  sans: 'var(--status-sans)',
};

export const WAIT_STATUSES = ['envoyee', 'relancee'];

export const RESPONSE_STATUSES = ['entretien', 'test', 'offre', 'refus'];

export const INTERVIEW_STATUSES = ['entretien', 'test', 'offre'];

export const CHANNELS = [
  'LinkedIn',
  'Site carrière',
  'Indeed',
  'Welcome to the Jungle',
  'Email direct',
  'Candidature spontanée',
  'Recommandation',
  'Salon / forum',
  'Autre',
];

export const COMPANY_SIZES = ['1-10', '11-50', '51-250', '251-1000', '1000+'];

// Libellé affiché (domaine) -> valeur stockée dans l'enum PostgreSQL
export const CONTRACT_TO_DB = {
  "Contrat d'apprentissage": 'apprentissage',
  'Contrat de professionnalisation': 'professionnalisation',
  Stage: 'stage',
};

export const DB_TO_CONTRACT = {
  apprentissage: "Contrat d'apprentissage",
  professionnalisation: 'Contrat de professionnalisation',
  stage: 'Stage',
};

export const CONTRACT_LABELS = Object.keys(CONTRACT_TO_DB);

export const MOTIVATION_SCORES = [5, 4, 3, 2, 1];

export const REMINDER_DELAY_DAYS = 7;

export const WEEKS_SHOWN = 8;
