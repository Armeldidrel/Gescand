# Candidatures alternance

Application de suivi de candidatures en alternance — **frontend Vite** en
JavaScript modulaire, **backend Supabase** (PostgreSQL + Auth + RLS).
Fonctionne aussi **hors ligne** en mode local (localStorage) tant que les clés
Supabase ne sont pas configurées.

## Fonctionnalités

- Tableau de bord : relances à faire, taux de réponse, entretiens, délai moyen.
- Pipeline des candidatures par étape + activité par semaine + réponses par canal.
- CRUD complet des candidatures, recherche, filtres et tris.
- Relances : marquer comme relancée, copier un modèle de message, sans réponse.
- Compétences : score de correspondance avec la fiche de poste.
- Mode en ligne sécurisé par Supabase Auth (lien magique) et RLS par utilisateur.

## Architecture

```
logi/
├── frontend/                     # Application Vite (vanilla JS ES modules)
│   ├── index.html                # Coquille HTML (structure des vues)
│   ├── vite.config.js
│   ├── .env.example
│   ├── public/favicon.svg
│   └── src/
│       ├── main.js               # Bootstrap : auth, routeur, événements
│       ├── router.js             # Navigation par hash (#/home, #/cands…)
│       ├── render.js             # Orchestration du rendu des vues
│       ├── actions.js            # Cas d'usage (relancer, supprimer, exemples…)
│       ├── config/
│       │   ├── env.js            # Lecture des variables VITE_*
│       │   └── constants.js      # Statuts, canaux, contrats, couleurs
│       ├── lib/
│       │   ├── supabase.js       # Client Supabase (null si non configuré)
│       │   ├── auth.js           # Connexion par lien magique / session
│       │   ├── mappers.js        # Modèle métier FR <-> colonnes SQL
│       │   └── repositories/     # Patron repository : remote | local
│       ├── state/
│       │   ├── store.js          # État applicatif + pub/sub
│       │   └── selectors.js      # Dérivés (stats, relances, score)
│       ├── views/                # Accueil, candidatures, relances, profil
│       ├── components/           # Dialogue de candidature
│       ├── data/                 # Jeu d'exemples
│       ├── utils/                # dom, dates, format, toast
│       └── styles/               # CSS mobile-first (base, layout, components…)
├── backend/                      # Supabase (BaaS)
│   ├── supabase/migrations/      # Schéma SQL, RLS, triggers
│   ├── supabase/seed.sql         # Données d'exemple (optionnel)
│   └── README.md                 # Mise en place détaillée
└── legacy/                       # Ancien fichier HTML monolithique (référence)
```

### Principes

- **Séparation des responsabilités** : vues = rendu, store = état, actions =
  cas d'usage, repositories = persistance.
- **Patron repository** : le même code métier fonctionne avec Supabase ou
  localStorage, sans condition dans les vues.
- **Mapping explicite** entre le modèle métier (français) et les colonnes SQL
  (anglais, `snake_case`).
- **CSS modulaire et mobile-first** importé via `src/styles/main.css` : styles de
  base pensés pour le mobile, améliorations progressives aux breakpoints
  **680px** (tablette) et **1000px** (desktop). Navigation défilante, toolbar
  pleine largeur et listes empilées sur petit écran.

## Démarrage rapide

Prérequis : Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

L'app s'ouvre sur http://localhost:5173 en **mode local** (données dans le
navigateur). Aucune configuration requise.

### Activer la base en ligne (Supabase)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Exécute `backend/supabase/migrations/20260101000000_init.sql` dans le
   **SQL Editor** (crée tables, index, triggers et politiques RLS).
3. Active la connexion email et ajoute `http://localhost:5173` dans
   *Authentication → URL Configuration* (Site URL + Redirect URLs).
4. Copie `frontend/.env.example` en `frontend/.env.local` et renseigne :

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Relance `npm run dev`. L'app passe en mode **En ligne** avec connexion par
   lien magique.

Détails complets : [`backend/README.md`](backend/README.md).

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production dans `frontend/dist` |
| `npm run preview` | Prévisualisation du build |

## Déploiement

- **Frontend** : Vercel, Netlify ou GitHub Pages (dossier `frontend`, build
  `npm run build`, sortie `dist`). Ajoute les variables `VITE_SUPABASE_URL` et
  `VITE_SUPABASE_ANON_KEY` dans le dashboard.
- **Backend** : déjà hébergé par Supabase. Pense à ajouter l'URL de production
  dans *Authentication → URL Configuration*.

## Sécurité

- La clé `anon` est publique **par conception** : RLS garantit que chaque
  utilisateur n'accède qu'à ses lignes (`auth.uid() = user_id`).
- Ne jamais exposer la clé `service_role` côté client.
- `.env.local` est ignoré par Git.
