-- =====================================================================
-- Jeu de données d'exemple (optionnel).
-- 1. Remplace la valeur de :user_id ci-dessous par l'UUID de ton
--    utilisateur Supabase (Authentication > Users).
-- 2. Exécute ce script dans le SQL Editor.
-- Les dates sont relatives à la date d'exécution.
-- =====================================================================

-- Remplace cet UUID par le tien :
-- 00000000-0000-0000-0000-000000000000

insert into public.profiles (id, skills)
values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  array['python', 'sql', 'excel', 'react', 'communication', 'power bi', 'seo']
)
on conflict (id) do update set skills = excluded.skills;

insert into public.applications (
  user_id, company, position, city, contract_type, channel, status,
  applied_on, follow_up_on, response_on, follow_up_count, motivation,
  contact_name, job_description, notes
)
values
  ('00000000-0000-0000-0000-000000000000'::uuid,
   'Doctolib', 'Alternant développeur full-stack', 'Paris', 'apprentissage', 'LinkedIn', 'entretien',
   current_date - 20, current_date - 13, current_date - 12, 0, 5,
   'Sarah L. (RH)', 'React, TypeScript, Node.js, API REST, tests unitaires, git, agile',
   'Entretien technique jeudi, réviser les hooks React'),
  ('00000000-0000-0000-0000-000000000000'::uuid,
   'Lyon Data Lab', 'Alternant data analyst', 'Lyon', 'apprentissage', 'Site carrière', 'envoyee',
   current_date - 9, current_date - 2, null, 0, 4,
   null, 'Python, SQL, pandas, dashboards, statistiques, Power BI', null),
  ('00000000-0000-0000-0000-000000000000'::uuid,
   'Nova Studio', 'Alternant marketing digital', 'Villeurbanne', 'apprentissage', 'Candidature spontanée', 'relancee',
   current_date - 16, current_date, null, 1, 3,
   null, 'SEO, Google Ads, réseaux sociaux, Canva, communication', null),
  ('00000000-0000-0000-0000-000000000000'::uuid,
   'Banque Atlas', 'Alternant chargé de projet IT', 'Lyon', 'apprentissage', 'Indeed', 'refus',
   current_date - 30, current_date - 23, current_date - 25, 0, 2,
   null, 'gestion de projet, Jira, SQL, excel', null);
