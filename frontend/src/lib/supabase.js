import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const initialAuthHash =
  typeof window !== 'undefined' ? window.location.hash : '';

export const supabase = env.isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
