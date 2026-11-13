import { repository } from '../lib/repositories/index.js';

const state = {
  apps: [],
  skills: '',
  ready: false,
  mode: repository.mode,
};

const listeners = new Set();

export const getState = () => state;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener(state));
}

export async function loadState() {
  const [apps, profile] = await Promise.all([
    repository.listApplications(),
    repository.getProfile(),
  ]);

  state.apps = apps;
  state.skills = profile?.skills || '';
  state.ready = true;
  emit();
}

export function resetState() {
  state.apps = [];
  state.skills = '';
  state.ready = false;
  emit();
}

export async function createApplication(application) {
  const created = await repository.createApplication(application);
  state.apps = [created, ...state.apps];
  emit();
  return created;
}

export async function updateApplication(id, patch) {
  const updated = await repository.updateApplication(id, patch);
  state.apps = state.apps.map((application) => (application.id === id ? updated : application));
  emit();
  return updated;
}

export async function deleteApplication(id) {
  await repository.deleteApplication(id);
  state.apps = state.apps.filter((application) => application.id !== id);
  emit();
}

export async function saveSkills(skills) {
  const profile = await repository.updateProfile({ skills });
  state.skills = profile?.skills ?? skills;
  emit();
}
