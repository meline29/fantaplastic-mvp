-- fantaPLASTIC – schéma de la base (tâche T2)
-- À exécuter UNE SEULE FOIS dans un projet Supabase neuf :
--   Supabase > SQL Editor > New query > coller tout ce fichier > Run
-- Résultat attendu : « Success. No rows returned ».
-- Si une première exécution s'est arrêtée à moitié, lancer d'abord le bloc
-- « Tout recommencer » tout en bas du fichier.

-- ---------- Tables ----------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  prenom      text not null check (char_length(prenom) between 1 and 40),
  role        text not null default 'benevole' check (role in ('benevole', 'organisateur', 'admin')),
  created_at  timestamptz not null default now()
);

create table public.sorties (
  id                   uuid primary key default gen_random_uuid(),
  titre                text not null check (char_length(titre) between 1 and 80),
  lieu                 text not null,
  commune              text not null,
  date_debut           timestamptz not null,
  duree_min            integer not null default 120 check (duree_min between 30 and 480),
  places               integer not null check (places between 1 and 500),
  -- US4 : ce que l'asso apporte. Gilets jaunes et trousse de premiers secours sont obligatoires.
  materiel_fourni      text[] not null default array['Gilets jaunes', 'Trousse de premiers secours']
                       check (materiel_fourni @> array['Gilets jaunes', 'Trousse de premiers secours']),
  materiel_a_apporter  text[] not null default '{}',   -- US4 : ce que chaque bénévole apporte
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
  -- US14 : date à laquelle le bénévole a accepté le formulaire de sécurité
  -- (risques blessure / coupure / chute + engagement à remonter tout incident à l'asso)
  securite_acceptee_le  timestamptz not null,
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

-- Elle donne aussi le prénom de l'organisateur (et seulement lui), pour la fiche (US4).

create view public.sorties_a_venir as
select s.*,
       count(i.id)::int                          as nb_inscrits,
       greatest(s.places - count(i.id)::int, 0)  as places_restantes,
       p.prenom                                  as organisateur_prenom
from public.sorties s
left join public.inscriptions i on i.sortie_id = s.id
left join public.profiles p     on p.id = s.organisateur_id
where s.date_debut >= now()
  and s.statut <> 'annulee'
group by s.id, p.id
order by s.date_debut;

grant select on public.sorties_a_venir to anon, authenticated;

-- ---------- US14 : pas d'inscription sur une sortie complète, passée ou annulée ----------

create or replace function public.verifier_inscription()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s public.sorties;
begin
  -- "for update" : deux inscriptions en même temps ne peuvent pas prendre la dernière place
  select * into s from public.sorties where id = new.sortie_id for update;
  if s.id is null or s.statut = 'annulee' or s.date_debut < now() then
    raise exception 'Cette sortie n''est plus ouverte aux inscriptions.';
  end if;
  if (select count(*) from public.inscriptions where sortie_id = new.sortie_id) >= s.places then
    raise exception 'Désolé, cette sortie est complète.';
  end if;
  return new;
end;
$$;

create trigger avant_inscription
  before insert on public.inscriptions
  for each row execute function public.verifier_inscription();

-- ---------- Droits de base de l'API (anon = visiteur, authenticated = connecté) ----------
-- Les règles RLS ci-dessous filtrent ensuite ligne par ligne.

grant usage on schema public to anon, authenticated;
grant select on public.sorties to anon, authenticated;
grant insert, update on public.sorties to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, delete on public.inscriptions to authenticated;
grant select, insert on public.signalements to authenticated;

-- ---------- Règles d'accès (RLS) – voir risque R7 du TD2 ----------

alter table public.profiles     enable row level security;
alter table public.sorties      enable row level security;
alter table public.inscriptions enable row level security;
alter table public.signalements enable row level security;

-- Profils : chacun voit le sien, les organisateurs voient ceux des bénévoles (liste des inscrits)
create policy "profils_lecture" on public.profiles
  for select using (id = auth.uid() or public.mon_role() in ('organisateur', 'admin'));

-- On ne peut modifier que son prénom (pas son rôle). La bascule « Démo · rôle » de
-- l'appli n'existe donc qu'en démo locale (elle est masquée quand on est sur Supabase).
create policy "profils_modif_perso" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (prenom) on public.profiles to authenticated;

-- Sorties : visibles par tout le monde, gérées par les organisateurs
create policy "sorties_lecture" on public.sorties
  for select using (true);
-- US2 : un organisateur crée une sortie, à son nom
create policy "sorties_creation" on public.sorties
  for insert with check (public.mon_role() in ('organisateur', 'admin') and organisateur_id = auth.uid());
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
-- Dates calculées à partir du jour où le script est lancé (J+3 à J+14), à l'heure de Brest.
-- Une fois passées, elles disparaissent de la liste : les organisateurs en créent d'autres dans l'appli.

insert into public.sorties (titre, lieu, commune, date_debut, duree_min, places, materiel_fourni, materiel_a_apporter, lat, lng) values
  ('Ramassage à la plage du Moulin Blanc', 'Plage du Moulin Blanc', 'Brest', (date_trunc('day', now() at time zone 'Europe/Paris') + interval '3 days 10 hours') at time zone 'Europe/Paris', 120, 25,
   array['Gilets jaunes', 'Trousse de premiers secours', 'Sacs poubelle', 'Pinces de ramassage', 'Seaux pour le tri'], array['Gants de jardinage', 'Chaussures fermées', 'Une gourde'], 48.3925, -4.4330),
  ('Nettoyage de l''anse de Sainte-Anne-du-Portzic', 'Anse de Sainte-Anne-du-Portzic', 'Brest', (date_trunc('day', now() at time zone 'Europe/Paris') + interval '6 days 14 hours') at time zone 'Europe/Paris', 90, 15,
   array['Gilets jaunes', 'Trousse de premiers secours', 'Sacs poubelle', 'Gants'], array['Bottes', 'Un coupe-vent'], 48.3590, -4.5510),
  ('Grève du Dellec', 'Plage du Dellec', 'Plouzané', (date_trunc('day', now() at time zone 'Europe/Paris') + interval '10 days 9 hours 30 minutes') at time zone 'Europe/Paris', 120, 20,
   array['Gilets jaunes', 'Trousse de premiers secours', 'Sacs poubelle', 'Pinces de ramassage', 'Gants'], array['Bottes', 'Une gourde', 'Des vêtements chauds'], 48.3555, -4.5680),
  ('Ramassage au port du Tinduff', 'Port du Tinduff', 'Plougastel-Daoulas', (date_trunc('day', now() at time zone 'Europe/Paris') + interval '14 days 10 hours') at time zone 'Europe/Paris', 150, 30,
   array['Gilets jaunes', 'Trousse de premiers secours', 'Sacs poubelle', 'Pinces de ramassage', 'Une brouette pour les gros déchets'], array['Gants', 'Bottes', 'Un en-cas'], 48.3355, -4.3720);

-- ---------- Tout recommencer (EFFACE toutes les données de l'appli) ----------
-- À n'utiliser que si le script a planté à moitié. Enlever les « -- » des lignes suivantes,
-- les exécuter seules, puis relancer tout le fichier.
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop view if exists public.sorties_a_venir;
-- drop table if exists public.signalements, public.inscriptions, public.sorties, public.profiles cascade;
-- drop function if exists public.creer_profil(), public.mon_role(), public.verifier_inscription();
