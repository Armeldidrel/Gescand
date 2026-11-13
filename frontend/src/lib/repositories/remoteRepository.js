import { supabase } from '../supabase.js';
import { toDomain, toRow } from '../mappers.js';

let cachedUserId = null;

export function clearUserCache() {
  cachedUserId = null;
}

async function currentUserId() {
  if (cachedUserId) return cachedUserId;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Session expirée. Reconnectez-vous.');

  cachedUserId = user.id;
  return cachedUserId;
}

function throwIfError(error) {
  if (error) throw new Error(error.message);
}

const toSkillsArray = (skills) =>
  (skills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

const toSkillsString = (skills) => (skills || []).join(', ');

export const remoteRepository = {
  mode: 'remote',

  async listApplications() {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    throwIfError(error);
    return (data || []).map(toDomain);
  },

  async createApplication(application) {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('applications')
      .insert({ ...toRow(application), user_id: userId })
      .select()
      .single();

    throwIfError(error);
    return toDomain(data);
  },

  async updateApplication(id, patch) {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('applications')
      .update(toRow(patch))
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    throwIfError(error);
    return toDomain(data);
  },

  async deleteApplication(id) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    throwIfError(error);
  },

  async getProfile() {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    throwIfError(error);
    if (data) return { skills: toSkillsString(data.skills) };

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select()
      .single();

    throwIfError(insertError);
    return { skills: toSkillsString(created.skills) };
  },

  async updateProfile(patch) {
    const userId = await currentUserId();
    const row = { id: userId };
    if ('skills' in patch) row.skills = toSkillsArray(patch.skills);

    const { data, error } = await supabase
      .from('profiles')
      .upsert(row)
      .select()
      .single();

    throwIfError(error);
    return { skills: toSkillsString(data.skills) };
  },
};
