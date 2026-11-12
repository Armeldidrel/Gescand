import { getState } from './state/store.js';
import { renderHome } from './views/home.js';
import { renderCandidates } from './views/candidates.js';
import { renderFollowUps } from './views/followups.js';
import { renderProfile } from './views/profile.js';

export function renderAll() {
  const state = getState();
  renderHome(state);
  renderCandidates(state);
  renderFollowUps(state);
  renderProfile(state);
}
