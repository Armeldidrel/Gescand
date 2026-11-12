import { CONTRACT_TO_DB, DB_TO_CONTRACT } from '../config/constants.js';

// Clé du modèle métier (français) -> colonne PostgreSQL (anglais)
const FIELD_MAP = {
  entreprise: 'company',
  poste: 'position',
  ville: 'city',
  secteur: 'sector',
  taille: 'company_size',
  site: 'website',
  type: 'contract_type',
  canal: 'channel',
  statut: 'status',
  motivation: 'motivation',
  dateCand: 'applied_on',
  dateRelance: 'follow_up_on',
  reponseDate: 'response_on',
  contact: 'contact_name',
  email: 'contact_email',
  lien: 'job_url',
  fiche: 'job_description',
  notes: 'notes',
  nbRelances: 'follow_up_count',
};

export function toRow(application) {
  const row = {};

  for (const [domainKey, column] of Object.entries(FIELD_MAP)) {
    if (!(domainKey in application)) continue;

    let value = application[domainKey];
    if (value === undefined) continue;
    if (value === '') value = null;

    if (value !== null) {
      if (domainKey === 'type') value = CONTRACT_TO_DB[value] ?? null;
      else if (domainKey === 'motivation') value = Number(value) || null;
      else if (domainKey === 'nbRelances') value = Number(value) || 0;
    }

    row[column] = value;
  }

  return row;
}

export function toDomain(row) {
  return {
    id: row.id,
    entreprise: row.company,
    poste: row.position,
    ville: row.city || '',
    secteur: row.sector || '',
    taille: row.company_size || '',
    site: row.website || '',
    type: DB_TO_CONTRACT[row.contract_type] || '',
    canal: row.channel || '',
    statut: row.status,
    motivation: row.motivation ?? 0,
    dateCand: row.applied_on || '',
    dateRelance: row.follow_up_on || '',
    reponseDate: row.response_on || '',
    contact: row.contact_name || '',
    email: row.contact_email || '',
    lien: row.job_url || '',
    fiche: row.job_description || '',
    notes: row.notes || '',
    nbRelances: row.follow_up_count ?? 0,
  };
}
