-- =====================================================================
-- Durcissement multi-utilisateurs : user_id + RLS
--
-- À exécuter APRÈS 20260101000000_init.sql, de préférence sur un projet
-- Supabase de test. Cette migration est non destructive : elle ne supprime
-- aucune candidature et ne réattribue aucune donnée automatiquement.
--
-- Données existantes sans user_id :
--   1. Les compter et les inspecter :
--      select id, company, position, created_at
--      from public.applications
--      where user_id is null;
--   2. Les rattacher explicitement à un compte (remplace l'UUID) :
--      update public.applications
--      set user_id = '<UUID_UTILISATEUR>'
--      where user_id is null;
--   3. Relancer cette migration pour appliquer la contrainte NOT NULL.
-- =====================================================================

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Profils (idempotent : ne recrée rien si la table existe déjà)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  skills      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- applications.user_id : ajout sûr si le schéma est plus ancien
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.applications') is null then
    raise exception 'Table public.applications introuvable : appliquez d''abord 20260101000000_init.sql.';
  end if;

  execute 'alter table public.applications add column if not exists user_id uuid';
  execute 'alter table public.applications alter column user_id set default auth.uid()';
end $$;

-- Clé étrangère vers auth.users (ajoutée seulement si absente)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.applications'::regclass
      and conname = 'applications_user_id_fkey'
  ) then
    begin
      alter table public.applications
        add constraint applications_user_id_fkey
        foreign key (user_id) references auth.users (id) on delete cascade not valid;
      alter table public.applications validate constraint applications_user_id_fkey;
      raise notice 'Contrainte applications_user_id_fkey ajoutée.';
    exception when others then
      raise warning 'Contrainte FK non ajoutée (%): %', sqlstate, sqlerrm;
    end;
  end if;
end $$;

-- NOT NULL uniquement si aucune candidature orpheline n'est présente
do $$
declare
  orphans bigint;
begin
  select count(*) into orphans
  from public.applications
  where user_id is null;

  if orphans = 0 then
    execute 'alter table public.applications alter column user_id set not null';
    raise notice 'applications.user_id : contrainte NOT NULL appliquée.';
  else
    raise warning
      '% candidature(s) sans user_id. Aucune donnée modifiée. Rattachez-les manuellement puis relancez la migration.',
      orphans;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Index utiles aux politiques RLS et aux statistiques par utilisateur
-- ---------------------------------------------------------------------
create index if not exists applications_user_idx      on public.applications (user_id);
create index if not exists applications_status_idx    on public.applications (status);
create index if not exists applications_follow_up_idx on public.applications (follow_up_on);

-- ---------------------------------------------------------------------
-- Profil automatique pour les comptes existants sans ligne profiles
-- ---------------------------------------------------------------------
insert into public.profiles (id)
select users.id
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where profiles.id is null;

-- ---------------------------------------------------------------------
-- Triggers updated_at (idempotents)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Profil créé à l'inscription (idempotent)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security : chaque utilisateur ne voit que ses données
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.applications enable row level security;

-- profiles : lecture / création / modification / suppression de sa ligne
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- applications : lecture / création / modification / suppression de ses lignes
drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own" on public.applications
  for select using (auth.uid() = user_id);

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own" on public.applications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own" on public.applications
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Vérification finale
-- ---------------------------------------------------------------------
do $$
declare
  orphans bigint;
begin
  select count(*) into orphans
  from public.applications
  where user_id is null;

  raise notice 'RLS applications : %, RLS profiles : %',
    (select relrowsecurity from pg_class where oid = 'public.applications'::regclass),
    (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass);
  raise notice 'Candidatures sans user_id restantes : %', orphans;
end $$;

commit;

-- ---------------------------------------------------------------------
-- Supabase Storage (non utilisé aujourd'hui) : si un bucket privé est
-- ajouté, restreindre chaque objet à son propriétaire, par exemple :
--   create policy "storage_own" on storage.objects
--     for all using (
--       bucket_id = 'mon-bucket'
--       and (storage.foldername(name))[1] = auth.uid()::text
--     ) with check (
--       bucket_id = 'mon-bucket'
--       and (storage.foldername(name))[1] = auth.uid()::text
--     );
-- ---------------------------------------------------------------------
