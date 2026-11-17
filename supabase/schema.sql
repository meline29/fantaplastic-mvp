-- fantaPLASTIC – schéma de la base (tâche T2)
-- À coller dans Supabase > SQL Editor quand le projet Supabase de l'équipe est créé.
-- Pas encore exécuté : à tester au sprint 2 en branchant l'appli sur Supabase.

-- ---------- Tables ----------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  prenom      text not null check (char_length(prenom) between 1 and 40),
  role        text not null default 'benevole' check (role in ('benevole', 'organisateur', 'admin')),
  created_at  timestamptz not null default now()
);

create table public.sorties (
  id                   uuid primary key default gen_random_uuid(),
  titre                text not null,
  lieu                 text not null,
  commune              text not null,
  date_debut           timestamptz not null,
  duree_min            integer not null default 120 check (duree_min > 0),
  places               integer not null check (places > 0),
  materiel_fourni      text,
  materiel_a_apporter  text,
  lat                  double precision,
  lng                  double precision,
  statut               text not null default 'prevue' check (statut in ('prevue', 'modifiee', 'annulee')),
  organisateur_id      uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now()
);

create table public.inscriptions (
  id           uuid primary key default gen_random_uuid(),
  sortie_id    uuid not null references public.sorties (id) on delete cascade,
  benevole_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (sortie_id, benevole_id)
);

create table public.signalements (
  id           uuid primary key default gen_random_uuid(),
  auteur_id    uuid references public.profiles (id) on delete set null,
  photo_url    text,
  lat          double precision not null,
  lng          double precision not null,
  commentaire  text,
  created_at   timestamptz not null default now()
);

-- ---------- Création automatique du profil à l'inscription (US15) ----------
-- L'appli envoie le prénom et le rôle choisi dans les métadonnées :
--   supabase.auth.signUp({ email, password, options: { data: { prenom, role } } })
-- MVP : le rôle "organisateur" se choisit à l'inscription. Plus tard, il devra être
-- validé par l'asso (TD2, risque R7 et article 6 du contrat). "admin" ne se choisit jamais.

create or replace function public.creer_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, prenom, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'prenom'), ''), 'Bénévole'),
    case when new.raw_user_meta_data ->> 'role' = 'organisateur' then 'organisateur' else 'benevole' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Rôle de l'utilisateur connecté (fonction "security definer" pour éviter
-- une boucle infinie dans les règles d'accès de la table profiles)
create or replace function public.mon_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- Liste des prochaines sorties avec places restantes (US3) ----------
-- Vue exécutée avec les droits de son propriétaire : elle peut compter toutes les
-- inscriptions sans montrer qui est inscrit.

create view public.sorties_a_venir as
select s.*,
       count(i.id)::int              as nb_inscrits,
       s.places - count(i.id)::int   as places_restantes
from public.sorties s
left join public.inscriptions i on i.sortie_id = s.id
where s.date_debut >= now()
  and s.statut <> 'annulee'
group by s.id
order by s.date_debut;

grant select on public.sorties_a_venir to anon, authenticated;

-- ---------- Règles d'accès (RLS) – voir risque R7 du TD2 ----------

alter table public.profiles     enable row level security;
alter table public.sorties      enable row level security;
alter table public.inscriptions enable row level security;
alter table public.signalements enable row level security;

-- Profils : chacun voit le sien, les organisateurs voient ceux des bénévoles (liste des inscrits)
create policy "profils_lecture" on public.profiles
  for select using (id = auth.uid() or public.mon_role() in ('organisateur', 'admin'));

-- On ne peut modifier que son prénom (pas son rôle)
create policy "profils_modif_perso" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (prenom) on public.profiles to authenticated;

-- Sorties : visibles par tout le monde, gérées par les organisateurs
create policy "sorties_lecture" on public.sorties
  for select using (true);
create policy "sorties_creation" on public.sorties
  for insert with check (public.mon_role() in ('organisateur', 'admin'));
create policy "sorties_modif" on public.sorties
  for update using (public.mon_role() in ('organisateur', 'admin'));

-- Inscriptions : un bénévole gère les siennes, les organisateurs voient tout
create policy "inscriptions_lecture" on public.inscriptions
  for select using (benevole_id = auth.uid() or public.mon_role() in ('organisateur', 'admin'));
create policy "inscriptions_creation" on public.inscriptions
  for insert with check (benevole_id = auth.uid());
create policy "inscriptions_suppression" on public.inscriptions
  for delete using (benevole_id = auth.uid());

-- Signalements : n'importe quel compte peut signaler, seuls les organisateurs voient tout
create policy "signalements_creation" on public.signalements
  for insert with check (auteur_id = auth.uid());
create policy "signalements_lecture" on public.signalements
  for select using (auteur_id = auth.uid() or public.mon_role() in ('organisateur', 'admin'));

-- ---------- Sorties d'exemple (tâche J-1 du TD1) ----------

insert into public.sorties (titre, lieu, commune, date_debut, duree_min, places, materiel_fourni, materiel_a_apporter, lat, lng) values
  ('Ramassage à la plage du Moulin Blanc', 'Plage du Moulin Blanc', 'Brest', date_trunc('day', now()) + interval '3 days 10 hours', 120, 25, 'Sacs et pinces', 'Gants, chaussures fermées', 48.3925, -4.4330),
  ('Nettoyage de l''anse de Sainte-Anne-du-Portzic', 'Anse de Sainte-Anne-du-Portzic', 'Brest', date_trunc('day', now()) + interval '6 days 14 hours', 90, 15, 'Sacs', 'Gants, bottes', 48.3590, -4.5510),
  ('Grève du Dellec', 'Plage du Dellec', 'Plouzané', date_trunc('day', now()) + interval '10 days 9 hours 30 minutes', 120, 20, 'Sacs, pinces, gants', 'Bottes, une gourde', 48.3555, -4.5680),
  ('Ramassage au port du Tinduff', 'Port du Tinduff', 'Plougastel-Daoulas', date_trunc('day', now()) + interval '14 days 10 hours', 150, 30, 'Sacs et pinces', 'Gants, bottes', 48.3355, -4.3720);
