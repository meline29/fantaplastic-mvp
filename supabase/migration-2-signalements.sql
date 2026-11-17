-- fantaPLASTIC – migration 2 : signalements avec photo (US1, US16)
-- À exécuter UNE SEULE FOIS dans le projet Supabase déjà créé :
--   SQL Editor > New query > coller ce fichier > Run   (résultat attendu : « Success. No rows returned »)
-- Pour un projet neuf, inutile : schema.sql contient déjà tout.

-- ---------- Table des signalements ----------
-- La position est celle du téléphone au moment de l'envoi de la photo.

alter table public.signalements
  add column if not exists precision_m integer check (precision_m is null or precision_m >= 0);
alter table public.signalements alter column photo_url set not null;   -- chemin de la photo dans le stockage
alter table public.signalements
  add constraint signalements_position check (lat between -90 and 90 and lng between -180 and 180),
  add constraint signalements_commentaire check (commentaire is null or char_length(commentaire) <= 280);

-- On ne signale qu'à son nom, avec une photo rangée dans son propre dossier
drop policy if exists "signalements_creation" on public.signalements;
create policy "signalements_creation" on public.signalements
  for insert to authenticated
  with check (auteur_id = auth.uid() and photo_url like auth.uid()::text || '/%');

-- Tous les comptes connectés voient les signalements sur la carte (les visiteurs, non)
drop policy if exists "signalements_lecture" on public.signalements;
create policy "signalements_lecture" on public.signalements
  for select to authenticated
  using (true);

-- ---------- Stockage des photos ----------
-- Privé : une photo peut montrer des personnes ou des plaques (TD2, risque R7).
-- L'appli les affiche avec des liens temporaires, réservés aux comptes connectés.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signalements', 'signalements', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Chacun envoie ses photos dans son propre dossier : <id du compte>/<photo>.jpg
create policy "photos_signalements_envoi" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'signalements' and (storage.foldername(name))[1] = auth.uid()::text);

-- Tous les comptes connectés peuvent voir les photos
create policy "photos_signalements_lecture" on storage.objects
  for select to authenticated
  using (bucket_id = 'signalements');

-- L'auteur peut supprimer ses photos (l'appli le fait si l'enregistrement du signalement échoue)
create policy "photos_signalements_suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'signalements' and (storage.foldername(name))[1] = auth.uid()::text);
