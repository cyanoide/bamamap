-- Projet BAMAMAP : le contenu du fichier JSON (repères, groupes, flèches, logos en base64) vit ici,
-- jamais dans le dépôt. Aucune lecture publique : seul l'utilisateur admin (le même que Cyanocast) y accède.
create table public.bamamap_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique default 'default',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bamamap_projects enable row level security;

create policy "admin lit bamamap" on public.bamamap_projects
  for select to authenticated
  using (auth.uid() = '5634321b-7bdb-48e8-8ffd-40b6a86200eb');

create policy "admin ajoute bamamap" on public.bamamap_projects
  for insert to authenticated
  with check (auth.uid() = '5634321b-7bdb-48e8-8ffd-40b6a86200eb');

create policy "admin modifie bamamap" on public.bamamap_projects
  for update to authenticated
  using (auth.uid() = '5634321b-7bdb-48e8-8ffd-40b6a86200eb')
  with check (auth.uid() = '5634321b-7bdb-48e8-8ffd-40b6a86200eb');

create policy "admin supprime bamamap" on public.bamamap_projects
  for delete to authenticated
  using (auth.uid() = '5634321b-7bdb-48e8-8ffd-40b6a86200eb');

create function public.bamamap_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger bamamap_touch before update on public.bamamap_projects
  for each row execute function public.bamamap_touch();

-- Configuration lue après connexion (jeton Mapbox public « pk. »), pour ne pas l'écrire dans le dépôt.
-- Valeur insérée à la main : insert into public.bamamap_config values ('mapbox_token', 'pk....');
create table public.bamamap_config (
  key text primary key,
  value text not null
);

alter table public.bamamap_config enable row level security;

create policy "admin lit config bamamap" on public.bamamap_config
  for select to authenticated
  using (auth.uid() = '5634321b-7bdb-48e8-8ffd-40b6a86200eb');
