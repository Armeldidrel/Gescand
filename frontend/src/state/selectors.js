import {
  INTERVIEW_STATUSES,
  RESPONSE_STATUSES,
  WAIT_STATUSES,
} from '../config/constants.js';
import { diffDays, TODAY } from '../utils/date.js';

export function skillsArray(skills) {
  return (skills || '')
    .split(',')
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
}

export function matchScore(application, skills) {
  const list = skillsArray(skills);
  if (!list.length || !application.fiche) return null;

  const description = application.fiche.toLowerCase();
  const found = list.filter((skill) => description.includes(skill)).length;
  return Math.round((found / list.length) * 100);
}

export function pendingFollowUps(applications) {
  return applications
    .filter((application) => WAIT_STATUSES.includes(application.statut) && application.dateRelance)
    .map((application) => ({ ...application, d: diffDays(application.dateRelance, TODAY()) }))
    .sort((a, b) => a.d - b.d);
}

export function countByStatus(applications, status) {
  return applications.filter((application) => application.statut === status).length;
}

export function computeStats(applications) {
  const sent = applications.filter((application) => application.statut !== 'aenvoyer');
  const responses = applications.filter((application) => RESPONSE_STATUSES.includes(application.statut));
  const interviews = applications.filter((application) => INTERVIEW_STATUSES.includes(application.statut));

  const delays = applications
    .filter((application) => application.reponseDate && application.dateCand)
    .map((application) => diffDays(application.reponseDate, application.dateCand));

  return {
    total: applications.length,
    sent,
    responses,
    interviews,
    rate: sent.length ? Math.round((responses.length / sent.length) * 100) : null,
    avg: delays.length ? Math.round(delays.reduce((sum, value) => sum + value, 0) / delays.length) : null,
  };
}
