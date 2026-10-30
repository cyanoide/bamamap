-- Comptes Bamamap : chaque compte a un pseudo et un rôle ('user' par défaut, 'admin' sur décision d'un admin).
-- Les profils ne sont modifiables que par l'Edge Function admin-users (clé service_role) : aucune
-- politique d'écriture côté client, donc personne ne peut s'attribuer le statut admin.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[a-z0-9._-]{3,24}$'),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create unique index profiles_pseudo_key on public.profiles (pseudo);

alter table public.profiles enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

revoke execute on function public.is_admin(), public.is_member() from public, anon;
grant execute on function public.is_admin(), public.is_member() to authenticated;

create policy "profil lisible par son titulaire ou un admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;

-- Tout nouveau compte reçoit un profil 'user' ; le pseudo vient des métadonnées ou de l'e-mail.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'pseudo', split_part(new.email, '@', 1))), '[^a-z0-9._-]', '', 'g');
  base := left(case when length(base) < 3 then 'user' else base end, 20);
  candidate := base;
  while exists (select 1 from public.profiles where pseudo = candidate) loop
    n := n + 1;
    candidate := base || n;
  end loop;
  insert into public.profiles (id, pseudo, role) values (new.id, candidate, 'user');
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Le compte existant (admin de Cyanocast) devient le premier admin de Bamamap.
insert into public.profiles (id, pseudo, role)
values ('5634321b-7bdb-48e8-8ffd-40b6a86200eb', 'constantin', 'admin')
on conflict (id) do nothing;

-- Lecture pour tout compte, écriture réservée aux admins.
drop policy "admin lit bamamap" on public.bamamap_projects;
drop policy "admin ajoute bamamap" on public.bamamap_projects;
drop policy "admin modifie bamamap" on public.bamamap_projects;
drop policy "admin supprime bamamap" on public.bamamap_projects;
drop policy "admin lit config bamamap" on public.bamamap_config;

create policy "comptes lisent bamamap" on public.bamamap_projects
  for select to authenticated using ((select public.is_member()));
create policy "admins ajoutent bamamap" on public.bamamap_projects
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins modifient bamamap" on public.bamamap_projects
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins suppriment bamamap" on public.bamamap_projects
  for delete to authenticated using ((select public.is_admin()));
create policy "comptes lisent config bamamap" on public.bamamap_config
  for select to authenticated using ((select public.is_member()));

revoke all on public.bamamap_projects, public.bamamap_config from anon;
