import { $, $$ } from '../utils/dom.js';
import {
  isPasswordRecoveryUrl,
  remainingEmailCooldown,
  requestPasswordReset,
  resendConfirmation,
  signInWithEmail,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
} from '../lib/auth.js';
import { isValidEmail, passwordError, translateAuthError } from '../lib/authErrors.js';

const MODES = {
  signin: {
    kicker: 'Connexion',
    title: 'Mes candidatures',
    subtitle: 'Connectez-vous avec votre email et votre mot de passe.',
    fields: ['email', 'password'],
    submit: 'Se connecter',
    tabs: true,
    forgot: true,
    magic: true,
    resend: false,
    back: false,
  },
  signup: {
    kicker: 'Inscription',
    title: 'Créer un compte',
    subtitle: 'Inscrivez-vous pour retrouver vos candidatures sur tous vos appareils.',
    fields: ['email', 'password', 'confirm'],
    submit: 'Créer mon compte',
    tabs: true,
    forgot: false,
    magic: false,
    resend: false,
    back: false,
  },
  forgot: {
    kicker: 'Mot de passe oublié',
    title: 'Réinitialiser mon mot de passe',
    subtitle: 'Saisissez votre email : nous vous enverrons un lien de réinitialisation.',
    fields: ['email'],
    submit: 'Envoyer le lien',
    tabs: false,
    forgot: false,
    magic: false,
    resend: false,
    back: true,
  },
  recovery: {
    kicker: 'Nouveau mot de passe',
    title: 'Choisir un mot de passe',
    subtitle: 'Définissez un nouveau mot de passe pour votre compte.',
    fields: ['password', 'confirm'],
    submit: 'Enregistrer le mot de passe',
    tabs: false,
    forgot: false,
    magic: false,
    resend: false,
    back: false,
  },
  confirm: {
    kicker: 'Vérification',
    title: 'Vérifiez votre email',
    subtitle: '',
    fields: [],
    submit: '',
    tabs: false,
    forgot: false,
    magic: false,
    resend: true,
    back: true,
  },
};

let mode = 'signin';
let busy = false;
let lastEmail = '';
let cooldownTimer;
let onAuthenticated = () => {};
let el = null;

function elements() {
  return {
    section: $('#auth'),
    tabs: $('#authTabs'),
    tabButtons: $$('[data-auth-mode]'),
    kicker: $('#authKicker'),
    title: $('#authTitle'),
    subtitle: $('#authSubtitle'),
    form: $('#authForm'),
    emailField: $('#authEmailField'),
    email: $('#authEmail'),
    passwordField: $('#authPasswordField'),
    password: $('#authPassword'),
    confirmField: $('#authPasswordConfirmField'),
    confirm: $('#authPasswordConfirm'),
    submit: $('#authSubmit'),
    submitLabel: $('#authSubmitLabel'),
    msg: $('#authMsg'),
    forgot: $('#authForgot'),
    magic: $('#authMagic'),
    resend: $('#authResend'),
    back: $('#authBack'),
  };
}

function setMessage(text, state = '') {
  if (!el?.msg) return;
  el.msg.textContent = text || '';
  el.msg.dataset.state = state;
}

export function setAuthMessage(text, state = '') {
  setMessage(text, state);
}

function setLink(button, label, seconds) {
  if (!button) return;
  button.textContent = seconds > 0 ? `${label} (${seconds} s)` : label;
  button.disabled = busy || seconds > 0;
}

function refreshLinks() {
  if (!el) return;

  const email = (el.email?.value || lastEmail || '').trim();
  const resetLeft = remainingEmailCooldown('reset', email);
  const magicLeft = remainingEmailCooldown('magic', email);
  const confirmLeft = remainingEmailCooldown('confirm', email || lastEmail);

  setLink(el.forgot, 'Mot de passe oublié ?', resetLeft);
  setLink(el.magic, 'Recevoir un lien magique', magicLeft);
  setLink(el.resend, "Renvoyer l'email de confirmation", confirmLeft);
  if (el.back) el.back.disabled = busy;
}

function setBusy(value) {
  if (!el) return;

  busy = value;
  [el.email, el.password, el.confirm].forEach((input) => {
    if (input) input.disabled = value;
  });
  el.tabButtons.forEach((button) => {
    button.disabled = value;
  });

  if (el.submit) {
    el.submit.disabled = value;
    el.submitLabel.textContent = value ? 'En cours…' : MODES[mode].submit;
  }

  refreshLinks();
}

function failure(message) {
  setMessage(message, 'error');
  return undefined;
}

function applyMode(nextMode, { message = '', state = '' } = {}) {
  if (!el) return;

  mode = MODES[nextMode] ? nextMode : 'signin';
  const config = MODES[mode];
  const has = (field) => config.fields.includes(field);

  el.emailField.hidden = !has('email');
  el.passwordField.hidden = !has('password');
  el.confirmField.hidden = !has('confirm');
  el.form.hidden = config.fields.length === 0;
  el.tabs.hidden = !config.tabs;
  el.forgot.hidden = !config.forgot;
  el.magic.hidden = !config.magic;
  el.resend.hidden = !config.resend;
  el.back.hidden = !config.back;

  el.kicker.textContent = config.kicker;
  el.title.textContent = config.title;
  el.subtitle.textContent = config.subtitle;
  el.subtitle.hidden = !config.subtitle;

  if (el.submit) {
    el.submit.hidden = !config.submit;
    el.submitLabel.textContent = config.submit;
  }

  el.email.required = has('email');
  el.password.required = has('password');
  el.confirm.required = has('confirm');
  el.password.autocomplete = has('confirm') ? 'new-password' : 'current-password';
  el.password.value = '';
  el.confirm.value = '';

  el.tabButtons.forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });

  setMessage(message, state);
  setBusy(false);

  if (!el.section?.hidden) {
    const target = has('email') ? el.email : el.password;
    window.setTimeout(() => target?.focus({ preventScroll: true }), 0);
  }
}

export function showAuthPanel(nextMode, options) {
  if (!el) return;
  if (nextMode) applyMode(nextMode, options);
  else if (options?.message) setMessage(options.message, options.state);
}

async function handleSubmit(event) {
  event.preventDefault();
  if (busy || !el) return;

  const config = MODES[mode];
  const email = el.email.value.trim();
  const password = el.password.value;
  const confirmation = el.confirm.value;

  if (config.fields.includes('email') && !isValidEmail(email)) {
    return failure('Saisissez une adresse email valide.');
  }

  if (config.fields.includes('password')) {
    const error = passwordError(password);
    if (error) return failure(error);
  }

  if (config.fields.includes('confirm') && password !== confirmation) {
    return failure('Les deux mots de passe ne correspondent pas.');
  }

  setBusy(true);
  setMessage('Vérification en cours…');

  try {
    if (mode === 'signin') {
      await signInWithPassword(email, password);
      lastEmail = email;
      setMessage('Connexion réussie. Chargement de vos données…', 'success');
      await onAuthenticated();
    } else if (mode === 'signup') {
      const result = await signUpWithPassword(email, password);
      lastEmail = email;

      if (result.session) {
        setMessage('Compte créé. Connexion…', 'success');
        await onAuthenticated();
      } else if (result.existingAccount) {
        applyMode('signin', {
          message:
            'Un compte existe déjà avec cet email. Connectez-vous ou utilisez « Mot de passe oublié ».',
          state: 'error',
        });
      } else {
        applyMode('confirm', {
          message: `Un email de confirmation a été envoyé à ${email}. Cliquez sur le lien pour activer votre compte.`,
          state: 'success',
        });
      }
    } else if (mode === 'forgot') {
      await requestPasswordReset(email);
      lastEmail = email;
      applyMode('signin', {
        message: 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.',
        state: 'success',
      });
    } else if (mode === 'recovery') {
      await updatePassword(password);
      setMessage('Mot de passe mis à jour. Chargement…', 'success');
      await onAuthenticated();
    }
  } catch (error) {
    setMessage(translateAuthError(error), 'error');
  } finally {
    setBusy(false);
  }
}

async function handleMagicLink() {
  if (busy || !el) return;

  const email = el.email.value.trim();
  if (!isValidEmail(email)) return failure('Saisissez votre email pour recevoir un lien.');

  const remaining = remainingEmailCooldown('magic', email);
  if (remaining) return failure(`Patientez ${remaining} s avant de demander un nouveau lien.`);

  setBusy(true);
  try {
    await signInWithEmail(email);
    lastEmail = email;
    setMessage('Lien magique envoyé. Vérifiez votre boîte mail.', 'success');
  } catch (error) {
    setMessage(translateAuthError(error), 'error');
  } finally {
    setBusy(false);
  }
}

async function handleResend() {
  if (busy || !el) return;

  const email = (lastEmail || el.email.value).trim();
  if (!isValidEmail(email)) return failure('Adresse email manquante. Revenez à la connexion.');

  const remaining = remainingEmailCooldown('confirm', email);
  if (remaining) return failure(`Patientez ${remaining} s avant de demander un nouvel email.`);

  setBusy(true);
  try {
    await resendConfirmation(email);
    setMessage('Email de confirmation renvoyé. Vérifiez votre boîte mail.', 'success');
  } catch (error) {
    setMessage(translateAuthError(error), 'error');
  } finally {
    setBusy(false);
  }
}

function bind() {
  el.form.addEventListener('submit', handleSubmit);
  el.email.addEventListener('input', refreshLinks);
  el.magic.addEventListener('click', handleMagicLink);
  el.resend.addEventListener('click', handleResend);
  el.forgot.addEventListener('click', () => applyMode('forgot'));
  el.back.addEventListener('click', () => applyMode('signin'));

  el.tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (busy || button.dataset.authMode === mode) return;
      applyMode(button.dataset.authMode);
    });
  });
}

export function initAuthPanel({ onSuccess } = {}) {
  el = elements();
  onAuthenticated = typeof onSuccess === 'function' ? onSuccess : () => {};

  bind();
  applyMode(isPasswordRecoveryUrl() ? 'recovery' : 'signin');

  clearInterval(cooldownTimer);
  cooldownTimer = window.setInterval(refreshLinks, 1000);
}
