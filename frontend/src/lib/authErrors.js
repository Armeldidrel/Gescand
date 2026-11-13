const CODE_MESSAGES = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  email_not_confirmed:
    'Confirmez votre adresse email avant de vous connecter. Vérifiez votre boîte mail.',
  user_already_exists:
    'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.',
  email_exists:
    'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.',
  weak_password: 'Le mot de passe doit contenir au moins 8 caractères.',
  same_password: 'Le nouveau mot de passe doit être différent de l’ancien.',
  signup_disabled: 'Les inscriptions sont temporairement désactivées.',
  email_address_invalid: 'Adresse email invalide.',
  otp_expired: 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.',
  session_not_found: 'Votre session a expiré. Reconnectez-vous.',
  refresh_token_not_found: 'Votre session a expiré. Reconnectez-vous.',
  over_email_send_rate_limit:
    'Trop d’emails envoyés en peu de temps. Patientez avant de réessayer.',
  over_request_rate_limit:
    'Trop de tentatives en peu de temps. Patientez avant de réessayer.',
  validation_failed: 'Les informations saisies ne sont pas valides.',
};

const MESSAGE_RULES = [
  [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [
    /email not confirmed|email.*not.*confirmed/i,
    'Confirmez votre adresse email avant de vous connecter. Vérifiez votre boîte mail.',
  ],
  [
    /already registered|already been registered|user already exists/i,
    'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.',
  ],
  [
    /password should be at least|weak.?password|password.*too short/i,
    'Le mot de passe doit contenir au moins 8 caractères.',
  ],
  [
    /new password should be different|same password/i,
    'Le nouveau mot de passe doit être différent de l’ancien.',
  ],
  [/signups? not allowed|signup.*disabled/i, 'Les inscriptions sont temporairement désactivées.'],
  [/unable to validate email|invalid email/i, 'Adresse email invalide.'],
  [/otp.*expired|link.*expired|token.*expired/i, 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.'],
  [
    /failed to fetch|networkerror|network request failed|load failed/i,
    'Connexion impossible. Vérifiez votre réseau puis réessayez.',
  ],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => EMAIL_PATTERN.test(String(email || '').trim());

export function passwordError(password) {
  if (!password || password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  return '';
}

export function rateLimitSeconds(error) {
  const message = String(error?.message || '');
  const match = message.match(/(?:after|in)\s+(\d+)\s+seconds?/i);
  if (match) {
    const seconds = Number(match[1]);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
  }
  if (/rate limit/i.test(message)) return 60;
  return 0;
}

export function translateAuthError(error) {
  const code = String(error?.code || '');
  if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const message = String(error?.message || '').trim();
  for (const [pattern, translated] of MESSAGE_RULES) {
    if (pattern.test(message)) return translated;
  }

  if (rateLimitSeconds(error)) {
    return 'Trop de tentatives en peu de temps. Patientez avant de réessayer.';
  }

  return message || 'Une erreur inattendue est survenue. Réessayez.';
}

export function parseAuthUrlError(hash) {
  const raw = String(hash || '').replace(/^[#?]/, '');
  if (!raw) return '';

  const params = new URLSearchParams(raw);
  const code = params.get('error_code') || '';
  const description = (params.get('error_description') || params.get('error') || '').replace(/\+/g, ' ');

  if (!code && !description) return '';

  if (code === 'otp_expired' || /expired/i.test(description)) {
    return 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.';
  }

  if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  return description
    ? `Lien invalide : ${description}`
    : 'Le lien de connexion est invalide. Demandez-en un nouveau.';
}

export function getAuthUrlError(hash) {
  const source = hash ?? (typeof window !== 'undefined' ? window.location.hash : '');
  return parseAuthUrlError(source);
}
