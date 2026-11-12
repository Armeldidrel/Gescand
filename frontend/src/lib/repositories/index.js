import { env } from '../../config/env.js';
import { localRepository } from './localRepository.js';
import { remoteRepository } from './remoteRepository.js';

export const repository = env.isSupabaseConfigured ? remoteRepository : localRepository;
