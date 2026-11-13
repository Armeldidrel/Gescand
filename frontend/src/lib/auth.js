import { initialAuthHash, supabase } from './supabase.js';
import { rateLimitSeconds, translateAuthError } from './authErrors.js';

const COOLDOWN_KEY = 'alternance-auth-cooldown';
const DEFAULT_COOLDOWN_SECONDS = 60;

export const isAuthRequired = () => Boolean(supabase);

function assertClient() {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
}

function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function cooldownKey(kind, email) {
  return `${kind}:${String(email || '').trim().toLowerCase()}`;
}

function readCooldowns() {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_KEY)) || {};
  } catch {
    return {};
  }
}

function writeCooldowns(data) {
  try {
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
  } catch {
    // localStorage indisponible : le cooldown reste limité à la session en cours.
  }
}

export function markEmailCooldown(kind, email, seconds = DEFAULT_COOLDOWN_SECONDS) {
  if (!String(email || '').trim()) return;

  const data = readCooldowns();
  data[cooldownKey(kind, email)] = Date.now() + Math.max(1, seconds) * 1000;
  writeCooldowns(data);
}

export function remainingEmailCooldown(kind, email) {
  if (!String(email || '').trim()) return 0;

  const data = readCooldowns();
  const key = cooldownKey(kind, email);
  const until = data[key];
  if (!until) return 0;

  const remaining = Math.ceil((until - Date.now()) / 1000);
  if (remaining > 0) return remaining;

  delete data[key];
  writeCooldowns(data);
  return 0;
}

function emailRequestError(kind, email, error) {
  const seconds = rateLimitSeconds(error);
  if (seconds) markEmailCooldown(kind, email, seconds);
  return new Error(translateAuthError(error));
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(translateAuthError(error));
  return data.session;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email) {
  assertClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl() },
  });
  if (error) throw emailRequestError('magic', email, error);

  markEmailCooldown('magic', email);
}

export async function signUpWithPassword(email, password) {
  assertClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl() },
  });
  if (error) throw emailRequestError('confirm', email, error);

  if (data.session) {
    return { session: data.session, needsConfirmation: false, existingAccount: false };
  }

  if (data.user) markEmailCooldown('confirm', email);

  const existingAccount = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
  return {
    session: null,
    needsConfirmation: Boolean(data.user),
    existingAccount,
  };
}

export async function signInWithPassword(email, password) {
  assertClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error));
  return data.session;
}

export async function signOut() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(translateAuthError(error));
}

export async function requestPasswordReset(email) {
  assertClient();

  const remaining = remainingEmailCooldown('reset', email);
  if (remaining) {
    throw new Error(`Patientez ${remaining} s avant de demander un nouveau lien.`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl(),
  });
  if (error) throw emailRequestError('reset', email, error);

  markEmailCooldown('reset', email);
}

export async function resendConfirmation(email) {
  assertClient();

  const remaining = remainingEmailCooldown('confirm', email);
  if (remaining) {
    throw new Error(`Patientez ${remaining} s avant de demander un nouvel email.`);
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectUrl() },
  });
  if (error) throw emailRequestError('confirm', email, error);

  markEmailCooldown('confirm', email);
}

export async function updatePassword(password) {
  assertClient();

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(translateAuthError(error));
}

function authHash() {
  if (initialAuthHash) return initialAuthHash;
  return typeof window !== 'undefined' ? window.location.hash : '';
}

export function isPasswordRecoveryUrl() {
  const params = new URLSearchParams(authHash().replace(/^#/, ''));
  return params.get('type') === 'recovery';
}

export function hasAuthCallback() {
  const raw = authHash().replace(/^#/, '');
  if (!raw) return false;

  const params = new URLSearchParams(raw);
  return Boolean(params.get('access_token') || params.get('error') || params.get('error_description'));
}

export function cleanAuthUrl() {
  if (typeof window === 'undefined') return;
  const { origin, pathname, search } = window.location;
  history.replaceState(null, '', `${origin}${pathname}${search}#/home`);
}
