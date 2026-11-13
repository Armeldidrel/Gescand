import assert from 'node:assert/strict';

import {
  isValidEmail,
  parseAuthUrlError,
  passwordError,
  rateLimitSeconds,
  translateAuthError,
} from '../src/lib/authErrors.js';
import { toDomain, toRow } from '../src/lib/mappers.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('email valide / invalide', () => {
  assert.equal(isValidEmail('etudiant@exemple.fr'), true);
  assert.equal(isValidEmail('etudiant@exemple'), false);
  assert.equal(isValidEmail(''), false);
});

test('mot de passe trop court', () => {
  assert.match(passwordError('court'), /8 caractères/);
  assert.equal(passwordError('motdepasse'), '');
});

test('erreurs Auth traduites (code et message)', () => {
  assert.equal(
    translateAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    'Email ou mot de passe incorrect.',
  );
  assert.equal(
    translateAuthError({ message: 'Email not confirmed' }),
    'Confirmez votre adresse email avant de vous connecter. Vérifiez votre boîte mail.',
  );
  assert.equal(
    translateAuthError({ message: 'User already registered' }),
    'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.',
  );
  assert.match(translateAuthError({ message: 'Failed to fetch' }), /réseau/);
});

test('détection du délai de rate limit', () => {
  assert.equal(
    rateLimitSeconds({ message: 'For security purposes, you can only request this after 43 seconds.' }),
    43,
  );
  assert.equal(rateLimitSeconds({ message: 'Email rate limit exceeded' }), 60);
  assert.equal(rateLimitSeconds({ message: 'Invalid login credentials' }), 0);
});

test('erreur de lien expiré dans l’URL', () => {
  const message = parseAuthUrlError(
    '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
  );
  assert.match(message, /expiré/);
  assert.equal(parseAuthUrlError(''), '');
});

test('mapping domaine <-> SQL', () => {
  const row = toRow({
    entreprise: 'Doctolib',
    poste: 'Alternant',
    type: "Contrat d'apprentissage",
    motivation: '4',
    nbRelances: '2',
  });

  assert.equal(row.company, 'Doctolib');
  assert.equal(row.position, 'Alternant');
  assert.equal(row.contract_type, 'apprentissage');
  assert.equal(row.motivation, 4);
  assert.equal(row.follow_up_count, 2);

  const domain = toDomain({
    id: 'abc',
    company: 'Doctolib',
    position: 'Alternant',
    contract_type: 'stage',
    status: 'envoyee',
    motivation: 5,
    follow_up_count: 1,
  });

  assert.equal(domain.entreprise, 'Doctolib');
  assert.equal(domain.type, 'Stage');
  assert.equal(domain.nbRelances, 1);
});

let failures = 0;

for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(`  ${error.message}`);
  }
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} tests réussis.`);
}
