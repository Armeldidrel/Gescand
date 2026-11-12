import { uid } from '../../utils/dom.js';

const STORAGE_KEY = 'candidatures-v5';

const emptyState = () => ({ apps: [], skills: '' });

function read() {
  try {
    return { ...emptyState(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
  } catch {
    return emptyState();
  }
}

function write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('localStorage indisponible :', error);
  }
}

export const localRepository = {
  mode: 'local',

  async listApplications() {
    return read().apps;
  },

  async createApplication(application) {
    const data = read();
    const record = {
      ...application,
      id: application.id || uid(),
      nbRelances: application.nbRelances ?? 0,
    };
    data.apps = [record, ...data.apps];
    write(data);
    return record;
  },

  async updateApplication(id, patch) {
    const data = read();
    let updated = null;

    data.apps = data.apps.map((application) => {
      if (application.id !== id) return application;
      updated = { ...application, ...patch };
      return updated;
    });

    write(data);
    return updated;
  },

  async deleteApplication(id) {
    const data = read();
    data.apps = data.apps.filter((application) => application.id !== id);
    write(data);
  },

  async getProfile() {
    return { skills: read().skills || '' };
  },

  async updateProfile(patch) {
    const data = read();
    if ('skills' in patch) data.skills = patch.skills;
    write(data);
    return { skills: data.skills || '' };
  },
};
