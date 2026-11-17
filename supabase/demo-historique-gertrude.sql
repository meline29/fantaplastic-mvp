-- fantaPLASTIC – faux historique de DÉMO pour le compte « Gertrude » (vrai site)
-- Ajoute 24 ramassages passés (sorties marquées « (démo) ») pour débloquer, dans son profil :
--   Sardine Plastic (1), Cabillaud Bouteille (5), Poulpe Bouchon (20)
--   et le badge spécial « Événement Sainte-Anne » (ramassage de la Sainte-Anne, septembre 2026).
--
-- À exécuter une seule fois : Supabase > SQL Editor > New query > coller ce fichier > Run.
-- Le script s'arrête sans rien changer s'il ne trouve pas exactement un compte « Gertrude »,
-- ou si l'historique de démo a déjà été ajouté. En cas d'erreur, rien n'est enregistré.
--
-- Pour tout retirer plus tard (les inscriptions liées partent avec) :
--   delete from public.sorties where titre like '% (démo)';

do $$
declare
  gertrude uuid;
  nb int;
  k int;
  lieux text[] := array['Plage du Moulin Blanc', 'Plage du Dellec', 'Port du Tinduff', 'Plage du Passage'];
  communes text[] := array['Brest', 'Plouzané', 'Plougastel-Daoulas', 'Le Relecq-Kerhuon'];
  quand timestamptz;
  nouvelle uuid;
begin
  select count(*) into nb from public.profiles where prenom ilike 'gertrude';
  if nb <> 1 then
    raise exception 'Il faut exactement un compte « Gertrude » (trouvé : %).', nb;
  end if;
  select id into gertrude from public.profiles where prenom ilike 'gertrude';

  if exists (select 1 from public.inscriptions i join public.sorties s on s.id = i.sortie_id
             where i.benevole_id = gertrude and s.titre like '% (démo)') then
    raise exception 'Le faux historique de démo a déjà été ajouté à Gertrude.';
  end if;

  -- Le trigger refuse (à raison) les inscriptions à des sorties passées : on le coupe le temps du script
  alter table public.inscriptions disable trigger avant_inscription;

  -- 23 ramassages, environ un tous les 9 jours sur les 7 derniers mois, à 10h (heure de Brest)
  for k in 1..23 loop
    quand := (date_trunc('day', now() at time zone 'Europe/Paris') - make_interval(days => 9 * k + 4) + interval '10 hours')
             at time zone 'Europe/Paris';
    insert into public.sorties (titre, lieu, commune, date_debut, duree_min, places, materiel_fourni, materiel_a_apporter)
    values ('Ramassage – ' || lieux[(k % 4) + 1] || ' (démo)', lieux[(k % 4) + 1], communes[(k % 4) + 1], quand, 120, 20,
            array['Gilets jaunes', 'Trousse de premiers secours', 'Sacs poubelle'], array['Gants'])
    returning id into nouvelle;
    insert into public.inscriptions (sortie_id, benevole_id, securite_acceptee_le, created_at)
    values (nouvelle, gertrude, quand - interval '2 days', quand - interval '2 days');
  end loop;

  -- Le ramassage de la Sainte-Anne, samedi 12 septembre 2026 → badge spécial « Événement Sainte-Anne »
  quand := timestamp '2026-09-12 10:00' at time zone 'Europe/Paris';
  insert into public.sorties (titre, lieu, commune, date_debut, duree_min, places, materiel_fourni, materiel_a_apporter, lat, lng)
  values ('Ramassage de la Sainte-Anne – Anse de Sainte-Anne-du-Portzic (démo)', 'Anse de Sainte-Anne-du-Portzic', 'Brest', quand, 180, 60,
          array['Gilets jaunes', 'Trousse de premiers secours', 'Sacs poubelle', 'Pinces de ramassage'], array['Gants', 'Bottes'], 48.3590, -4.5510)
  returning id into nouvelle;
  insert into public.inscriptions (sortie_id, benevole_id, securite_acceptee_le, created_at)
  values (nouvelle, gertrude, quand - interval '3 days', quand - interval '3 days');

  alter table public.inscriptions enable trigger avant_inscription;
end $$;

-- Vérification : 24 ramassages de démo, dont 1 à la Sainte-Anne en septembre 2026
select count(*) as ramassages_demo,
       count(*) filter (where s.titre like '%Sainte-Anne%' and to_char(s.date_debut at time zone 'Europe/Paris', 'YYYY-MM') = '2026-09') as sainte_anne_sept_2026
from public.inscriptions i
join public.sorties s on s.id = i.sortie_id
join public.profiles p on p.id = i.benevole_id
where p.prenom ilike 'gertrude' and s.titre like '% (démo)' and s.date_debut < now();
