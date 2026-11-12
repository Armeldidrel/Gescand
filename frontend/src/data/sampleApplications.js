import { addDays, TODAY } from '../utils/date.js';

export function buildSampleApplications() {
  const day = (offset) => addDays(TODAY(), offset);

  return [
    {
      entreprise: 'Doctolib',
      poste: 'Alternant développeur full-stack',
      ville: 'Paris',
      type: "Contrat d'apprentissage",
      canal: 'LinkedIn',
      statut: 'entretien',
      dateCand: day(-20),
      dateRelance: day(-13),
      reponseDate: day(-12),
      nbRelances: 0,
      motivation: 5,
      contact: 'Sarah L. (RH)',
      fiche: 'React, TypeScript, Node.js, API REST, tests unitaires, git, agile',
      notes: 'Entretien technique jeudi, réviser les hooks React',
    },
    {
      entreprise: 'Lyon Data Lab',
      poste: 'Alternant data analyst',
      ville: 'Lyon',
      type: "Contrat d'apprentissage",
      canal: 'Site carrière',
      statut: 'envoyee',
      dateCand: day(-9),
      dateRelance: day(-2),
      nbRelances: 0,
      motivation: 4,
      fiche: 'Python, SQL, pandas, dashboards, statistiques, Power BI',
    },
    {
      entreprise: 'Nova Studio',
      poste: 'Alternant marketing digital',
      ville: 'Villeurbanne',
      type: "Contrat d'apprentissage",
      canal: 'Candidature spontanée',
      statut: 'relancee',
      dateCand: day(-16),
      dateRelance: day(0),
      nbRelances: 1,
      motivation: 3,
      fiche: 'SEO, Google Ads, réseaux sociaux, Canva, communication',
    },
    {
      entreprise: 'Banque Atlas',
      poste: 'Alternant chargé de projet IT',
      ville: 'Lyon',
      type: "Contrat d'apprentissage",
      canal: 'Indeed',
      statut: 'refus',
      dateCand: day(-30),
      dateRelance: day(-23),
      reponseDate: day(-25),
      nbRelances: 0,
      motivation: 2,
      fiche: 'gestion de projet, Jira, SQL, excel',
    },
  ];
}
