# Backend — Supabase (PostgreSQL + Auth + RLS)

Ce dossier contient tout ce qui concerne la base de données en ligne.
L'application utilise **Supabase** comme backend (BaaS) : pas de serveur à
maintenir, l'API REST est générée automatiquement et sécurisée par RLS.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260101000000_init.sql` | Schéma complet : types, tables, index, triggers, RLS |
| `supabase/migrations/20260102000000_auth_multi_utilisateurs.sql` | Durcissement non destructif : `user_id`, FK, RLS, profils manquants |
| `supabase/seed.sql` | Données d'exemple (optionnel) |
| `supabase/config.toml` | Config locale du CLI Supabase |

## Modèle de données

### `applications`
Chaque ligne = une candidature, rattachée à `auth.users` via `user_id`.

- `company` / `position` (obligatoires), `city`, `sector`, `company_size`, `website`
- `contract_type` : `apprentissage` | `professionnalisation` | `stage`
- `channel` : LinkedIn, Indeed, etc.
- `status` : `aenvoyer`, `envoyee`, `relancee`, `entretien`, `test`, `offre`, `refus`, `sans`
- `motivation` : note de 1 à 5
- `applied_on`, `follow_up_on`, `response_on` : dates métier
- `contact_name`, `contact_email`, `job_url`, `job_description`, `notes`
- `follow_up_count`, `created_at`, `updated_at`

### `profiles`
Une ligne par utilisateur, contient `skills` (`text[]`).
Créée automatiquement à l'inscription via un trigger.

## Sécurité (RLS)

RLS est activé sur les deux tables. Chaque utilisateur ne peut lire/écrire que
ses propres lignes (`auth.uid() = user_id` pour `applications`, `auth.uid() = id`
pour `profiles`). La clé `anon` peut donc être exposée côté frontend sans risque.

## Mise en place pas à pas

### 1. Créer le projet

1. Va sur [supabase.com](https://supabase.com) → **New project**.
2. Note l'**URL du projet** et la **clé `anon` `public`** :
   *Project Settings → API*.

### 2. Appliquer le schéma

Option A — **SQL Editor** (le plus simple) :

1. Ouvre *SQL Editor* → *New query*.
2. Colle le contenu de `supabase/migrations/20260101000000_init.sql`.
3. **Run**.

Option B — **CLI** :

```bash
supabase link --project-ref <ton-project-ref>
supabase db push
```

### 3. Activer la connexion par email

*Authentication → Providers → Email* doit être activé (c'est le cas par défaut).
Dans *Authentication → URL Configuration* :

- **Site URL** : `http://localhost:5173` en local, puis ton URL de prod.
- **Redirect URLs** : ajoute `http://localhost:5173` et l'URL de production
  (ajoute aussi les URLs de Preview Vercel si tu testes les branches).

L'application propose **inscription et connexion par email + mot de passe**,
« Mot de passe oublié », la confirmation d'adresse email et, en option, le
**lien magique** (soumis à un délai anti-spam de 60 s).

Le flux par défaut est le suivant :

1. L'étudiant crée un compte (email + mot de passe).
2. Il reçoit un email de confirmation : le lien le ramène sur l'application.
3. Il se connecte ; la session est conservée par le SDK Supabase.
4. Chaque requête est filtrée par RLS selon `auth.uid()`.
5. « Mot de passe oublié » envoie un lien de réinitialisation qui ouvre le
   formulaire « nouveau mot de passe ».

### 4. (Optionnel) Données d'exemple

Récupère ton UUID dans *Authentication → Users*, remplace les
`00000000-0000-0000-0000-000000000000` dans `seed.sql`, puis exécute le script.

> Alternative : clique sur **« Charger des exemples »** directement dans l'app,
> qui insère les données via l'API (donc rattachées à ton compte).

## Variables d'environnement

Le frontend a besoin de ces deux valeurs (voir `frontend/.env.example`) :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

L'ancien nom `VITE_SUPABASE_ANON_KEY` reste accepté en secours par
`frontend/src/config/env.js`, mais **utilise le nom publishable** pour les
nouveaux environnements (local, Vercel Preview, Vercel Production).

> La clé `service_role` et les identifiants SMTP ne doivent **jamais** être
> exposés côté client ni commités.

## Authentification (SDK officiel)

Les appels utilisés sont exclusivement ceux du SDK Supabase JS :

| Action | Méthode |
| --- | --- |
| Inscription | `supabase.auth.signUp` |
| Connexion | `supabase.auth.signInWithPassword` |
| Lien magique (option) | `supabase.auth.signInWithOtp` |
| Déconnexion | `supabase.auth.signOut` |
| Mot de passe oublié | `supabase.auth.resetPasswordForEmail` |
| Nouveau mot de passe | `supabase.auth.updateUser` |
| Renvoi confirmation | `supabase.auth.resend` |
| Session | `supabase.auth.getSession` |
| Changements de session | `supabase.auth.onAuthStateChange` |

Garde-fous côté client : boutons désactivés pendant les requêtes, messages
d'erreur traduits, délai de 60 s entre deux demandes d'email (stocké dans
`localStorage`), validation de l'email et mot de passe (8 caractères minimum),
gestion des liens expirés et du retour `type=recovery`.

## SMTP personnalisé (Resend ou Brevo)

Toute la configuration se fait **dans le dashboard Supabase**, jamais dans le
frontend.

1. **Connecter le SMTP** : *Authentication → SMTP Settings* (ou
   *Project Settings → Auth → SMTP* selon la version du dashboard).
2. **Renseigner les identifiants** :
   - Resend : hôte `smtp.resend.com`, port `465` (SSL/TLS), utilisateur
     `resend`, mot de passe = clé API Resend, expéditeur
     `no-reply@ton-domaine.fr`.
   - Brevo : hôte `smtp-relay.brevo.com`, port `587` (STARTTLS), utilisateur =
     ton identifiant SMTP Brevo, mot de passe = clé SMTP Brevo, expéditeur
     vérifié.
   - Renseigne aussi « Sender name » et l'email expéditeur vérifié chez le
     fournisseur.
3. **Personnaliser les emails** : *Authentication → Email Templates* →
   `Confirm signup`, `Reset password`, `Magic Link`. Utilise les variables
   Supabase (`{{ .ConfirmationURL }}`, `{{ .Token }}`) et garde un lien clair
   vers l'application.
4. **URL de redirection** : *Authentication → URL Configuration* → Site URL =
   domaine de production, Redirect URLs = `http://localhost:5173`, URL Vercel
   de production et URLs de Preview. Le frontend envoie
   `emailRedirectTo = origin + pathname`.
5. **Tester l'envoi** : crée un compte de test, vérifie la réception de
   l'email de confirmation, le lien, puis le flux « Mot de passe oublié ».
   Vérifie aussi les courriers indésirables et les logs *Auth → Logs*.
6. **Quotas et erreurs** : Supabase limite le débit d'emails (souvent quelques
   envois par heure sur le SMTP intégré) ; Resend/Brevo ont leurs propres
   quotas. L'app affiche un message clair pour `over_email_send_rate_limit`,
   `over_request_rate_limit` et les erreurs réseau, et bloque les demandes
   répétées côté client. Pour la production, configure un SMTP dédié plutôt
   que le SMTP Supabase par défaut.

> Les identifiants SMTP restent dans Supabase. Ne les mets jamais dans
> `.env`, dans le bundle Vite ou dans le dépôt Git.

## Migration multi-utilisateurs

Le schéma initial contient déjà `user_id`, les policies RLS et le trigger de
profil. La migration de durcissement
`supabase/migrations/20260102000000_auth_multi_utilisateurs.sql` est
**idempotente et non destructive** :

- ajoute `applications.user_id` s'il manque, avec `default auth.uid()` ;
- ajoute la clé étrangère vers `auth.users` si elle manque ;
- applique `NOT NULL` **seulement** si aucune candidature orpheline n'existe ;
- recrée les index, triggers et policies RLS (select/insert/update/delete) ;
- crée les profils manquants pour les comptes existants.

Avant de l'exécuter en production : sauvegarde la base, teste sur un projet
Supabase de test, puis inspecte les candidatures sans `user_id` avec la requête
indiquée en tête du fichier. Aucune donnée n'est supprimée ni réattribuée
automatiquement.

## Vercel — checklist

- **Root Directory** du projet Vercel : `frontend`.
- Framework preset : Vite ; build `npm run build` ; output `dist`.
- Variables d'environnement (Production + Preview) :
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Ajoute l'URL Vercel dans *Supabase → Authentication → URL Configuration*
  (Site URL + Redirect URLs), y compris les URLs de Preview.
- Le routage par hash (`#/home`, `#/cands`, …) ne nécessite pas de rewrites
  SPA ; un rechargement de page fonctionne.
- Les variables `VITE_*` sont **figées au build** : redéploie après tout
  changement.
- Vérifie le bundle `dist` : aucune clé `service_role`, aucun identifiant SMTP.
  La clé `publishable` est publique par conception et protégée par RLS.

## Tester l'isolation avec deux comptes

À faire sur un **projet Supabase de test** (jamais directement en production) :

1. Compte A : inscription, confirmation email, connexion, création de deux
   candidatures.
2. Compte B : inscription, connexion, création d'une candidature.
3. Avec le compte B, vérifier que la liste ne contient que ses candidatures et
   que les tentatives de modification/suppression des IDs du compte A échouent
   (erreur ou 0 ligne affectée).
4. Test API direct (avec le JWT du compte B) :

   ```bash
   curl "https://<projet>.supabase.co/rest/v1/applications?select=*" \
     -H "apikey: <publishable_key>" \
     -H "Authorization: Bearer <access_token_compte_B>"
   ```

   La réponse ne doit contenir que les lignes de B.
5. Vérifier dans le SQL Editor que RLS est actif :

   ```sql
   select relname, relrowsecurity
   from pg_class
   where relname in ('applications', 'profiles');
   ```

6. Tester la réinitialisation du mot de passe, les liens expirés et les
   messages d'erreur. Ne jamais désactiver RLS pour faire passer un test.
