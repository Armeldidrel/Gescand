-- =====================================================================
-- Candidatures alternance — schéma initial
-- À exécuter dans le SQL Editor de Supabase, ou via `supabase db push`.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
do $$
begin
  create type public.application_status as enum (
    'aenvoyer', 'envoyee', 'relancee', 'entretien', 'test', 'offre', 'refus', 'sans'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.contract_type as enum (
    'apprentissage', 'professionnalisation', 'stage'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- Profils (une ligne par utilisateur)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  skills      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Candidatures
-- ---------------------------------------------------------------------
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company         text not null,
  position        text not null,
  city            text,
  sector          text,
  company_size    text,
  website         text,
  contract_type   public.contract_type,
  channel         text,
  status          public.application_status not null default 'envoyee',
  motivation      smallint check (motivation between 1 and 5),
  applied_on      date,
  follow_up_on    date,
  response_on     date,
  contact_name    text,
  contact_email   text,
  job_url         text,
  job_description text,
  notes           text,
  follow_up_count integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists applications_user_idx      on public.applications (user_id);
create index if not exists applications_status_idx    on public.applications (status);
create index if not exists applications_follow_up_idx on public.applications (follow_up_on);

-- ---------------------------------------------------------------------
-- Trigger : mise à jour de updated_at
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
-- Trigger : création automatique du profil à l'inscription
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

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- applications
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
