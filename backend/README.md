# Backend — Supabase (PostgreSQL + Auth + RLS)

Ce dossier contient tout ce qui concerne la base de données en ligne.
L'application utilise **Supabase** comme backend (BaaS) : pas de serveur à
maintenir, l'API REST est générée automatiquement et sécurisée par RLS.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260101000000_init.sql` | Schéma complet : types, tables, index, triggers, RLS |
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
- **Redirect URLs** : ajoute `http://localhost:5173` et l'URL de production.

L'app enverra un **lien magique** (magic link) par email : aucun mot de passe à gérer.

### 4. (Optionnel) Données d'exemple

Récupère ton UUID dans *Authentication → Users*, remplace les
`00000000-0000-0000-0000-000000000000` dans `seed.sql`, puis exécute le script.

> Alternative : clique sur **« Charger des exemples »** directement dans l'app,
> qui insère les données via l'API (donc rattachées à ton compte).

## Variables d'environnement

Le frontend a besoin de ces deux valeurs (voir `frontend/.env.example`) :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> La clé `service_role` ne doit **jamais** être exposée côté client.
