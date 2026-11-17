# fantaPLASTIC – MVP « Zéro déchets en rade de Brest »

Application web (PWA) pour les bénévoles ramasseurs de la rade de Brest.

## Lancer l'appli

- **En ligne :** le site est hébergé sur Vercel et les données sont dans Supabase (voir « Mise en ligne » plus bas).
- **En local :** double-cliquer sur `index.html`, ou `python -m http.server 8000` dans ce dossier puis ouvrir http://localhost:8000 (il faut internet, car React, Tailwind et Supabase sont chargés depuis un CDN).
- **Deux modes :** si `js/config.js` contient l'URL et la clé Supabase, l'appli utilise la vraie base. Sinon, ou si on ajoute `?mode=local` à l'adresse, elle tourne en **démo locale** (données dans le navigateur, bascule « Démo · rôle » et remise à zéro disponibles).

Les tests s'ouvrent de la même façon (ils tournent toujours sur la démo locale) :
- `tests/index.html` : 61 tests de la couche de données (comptes, rôles, liste et fiche des sorties, création d'une sortie avec son point de rendez-vous, matériel de sécurité, inscription, signalements) ;
- `tests/ui.html` : rejoue le parcours dans l'appli, en 56 étapes (sorties, fiche d'une sortie, création de compte organisateur, création d'une sortie avec son point sur la carte, bascule de rôle, formulaire de sécurité et inscription, carte des sorties, signalement avec photo, onglets, connexion). La position GPS et la recherche de lieux y sont simulées. **Attention, il remet les données de démo à zéro.**
- `tests/supabase.html` : vérifie la base en ligne, en lecture seule (config remplie, script SQL exécuté, règles d'accès qui bloquent un visiteur).

## Revenir à une version précédente (git)

```bash
git log --oneline --decorate   # voir toutes les versions
git switch --detach sprint-1   # regarder l'appli telle qu'elle était à la fin du sprint 1
git switch main                # revenir à la dernière version
```

À la fin de chaque sprint, on marque la version avec un tag : `git tag -a sprint-2 -m "Fin du sprint 2"`.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | page unique, charge React 18, htm (JSX sans compilation) et Tailwind |
| `js/app.js` | les écrans : en-tête, accueil, liste et fiche des sorties, création d'une sortie, formulaires de compte, onglets |
| `js/carte.js` | les cartes (Leaflet + fonds OpenStreetMap) : l'onglet « Carte » (sorties et déchets signalés) et le choix du point de rendez-vous |
| `js/signaler.js` | l'onglet « Signaler » : photo des déchets, position GPS prise à l'envoi |
| `js/regles.js` | les règles communes : contrôles des comptes et des sorties, matériel de sécurité, engagements |
| `js/db.js` | la couche de données en « démo locale » (stockage du navigateur) |
| `js/db-supabase.js` | la même couche de données, branchée sur Supabase (comptes, base PostgreSQL) |
| `js/config.js` | l'URL du projet Supabase et sa clé publique « publishable » (jamais la clé secrète) |
| `supabase/schema.sql` | tables, règles d'accès (RLS), triggers, stockage des photos et sorties d'exemple, à exécuter une fois dans un projet Supabase neuf |
| `supabase/migration-2-signalements.sql` | ajout des signalements avec photo dans un projet déjà créé (déjà exécuté sur le projet « fantaplastic ») |
| `manifest.webmanifest`, `assets/` | icônes et logo, pour installer l'appli sur un téléphone |

Il n'y a pas d'étape de build, parce que Node n'était pas installé sur le poste utilisé. Si l'équipe passe à Vite + TypeScript plus tard, les composants de `app.js` se reprennent tels quels.

## Sprint 1 : ce qui a été codé

Objectif proposé : *un bénévole peut créer son compte, se connecter et voir les prochaines sorties.*

| Élément | Points (TD1) | État |
|---|---|---|
| T1 – Initialiser le projet | 2 | Fait : structure, charte graphique (couleurs du logo), manifest PWA. Il manque le dépôt GitHub. |
| T2 – Base de données | 4 | Commencé : le schéma `supabase/schema.sql` est écrit mais il n'a pas été exécuté, faute de projet Supabase. Pas « fini ». |
| US15 – Créer un compte / se connecter | 5 | Fait en mode démo locale : création de compte, connexion, déconnexion, messages d'erreur. Les vrais comptes arriveront avec le branchement Supabase. |
| US3 – Consulter les prochaines sorties | 2 | Fait : sorties à venir triées par date, horaires, lieu, places restantes, « Complet » et « Plus que N places ». |

Ce qui reste à décider en équipe : la Definition of Done (une US branchée sur le stockage local compte-t-elle comme « finie » ?) et la suite du backlog.

## Entre le sprint 1 et le sprint 2

- À la création du compte, on choisit son rôle : **bénévole** (par défaut) ou **organisateur**. Plus tard, un compte organisateur devra être validé par l'asso (TD2, R7).
- Barre d'onglets en bas de l'écran : **Sorties**, **Carte**, **Signaler**, **Profil** (badges et profil). Seul « Sorties » a du contenu, les autres onglets sont prêts mais vides.

## Sprint 2 : ce qui a été codé

| Élément | Points (TD1) | État |
|---|---|---|
| US2 – Créer une sortie | 3 | Fait en mode démo locale : en organisateur, bouton « Créer une sortie » (titre, lieu, commune, date, heure, durée, places, matériel). Contrôles : date dans le futur, 1 à 500 places, 30 min à 8 h. La sortie apparaît tout de suite dans la liste. |
| US4 – Matériel à prévoir | 2 | Fait : un clic sur une sortie ouvre sa fiche avec « Ce que tu apportes » et « Ce que l'asso apporte ». |

En plus :
- **Démo · rôle** : une fois connecté, une bascule bénévole / organisateur en haut de la liste permet de tester les deux modes sans recréer de compte (pratique pour les revues croisées). Elle n'existera plus avec Supabase, où l'utilisateur ne peut pas changer son rôle lui-même.
- La phrase grise « MVP · données de démonstration… » est de nouveau affichée en bas des écrans de connexion et d'inscription.

Toujours pas fait : le branchement sur Supabase (T2) et l'inscription à une sortie (US14).

## Depuis la fin du sprint 2

| Élément | Points (TD1) | État |
|---|---|---|
| US14 – S'inscrire à une sortie | 2 | Fait : bouton « Je m'inscris » sur la fiche, puis **formulaire de sécurité** obligatoire. Désinscription possible. Pas d'inscription en double ni sur une sortie complète. |
| US6 – Carte des rendez-vous | 3 | Fait : onglet **Carte** avec un point par sortie à venir (vert : places libres, jaune : 3 places ou moins, rouge : complet). Un clic sur un point ouvre une bulle, puis « Voir la sortie » ouvre la fiche. À la création, le point de rendez-vous **se place tout seul** d'après le lieu et la commune (recherche sur OpenStreetMap, puis dans la Base Adresse Nationale) ; l'organisateur le vérifie et peut le déplacer ou le poser à la main. Point obligatoire, autour de la rade de Brest. |
| T2 / T3 – Base de données et déploiement | 4 + 5 | Fait : base Supabase et site en ligne sur Vercel (voir plus bas). |
| US1 – Signaler un endroit pollué | 3 | Fait : onglet **Signaler**, réservé aux comptes connectés. On prend une photo des déchets (l'appareil photo s'ouvre), on ajoute un commentaire si on veut, puis « Envoyer le signalement ». **La position GPS n'est demandée qu'à ce moment-là**, une seule fois. La photo est allégée et ses métadonnées (modèle du téléphone, position enregistrée dans le fichier) sont retirées avant l'envoi. |
| US16 – Signalements sur la carte | 2 | Fait : chaque signalement est un rond corail avec un appareil photo sur la carte, avec la photo, la date et le commentaire dans sa bulle. Visible seulement par les comptes connectés. Après l'envoi, la carte s'ouvre directement sur la photo. |

Les sorties créées avant la carte n'ont pas de point : elles sont listées sous la carte, dans « Pas encore sur la carte ».

Les photos des signalements sont dans un stockage Supabase **privé** (bucket « signalements », 5 Mo max par photo) : une photo peut montrer des personnes ou des plaques (TD2, risque R7). L'appli les affiche avec des liens temporaires valables 1 h, réservés aux comptes connectés.

La recherche automatique n'envoie que le lieu et la commune tapés (par exemple « Plage du Dellec, Plouzané ») aux services OpenStreetMap (Nominatim) et IGN (Géoplateforme), rien sur la personne. Elle ne se lance que quand on quitte le champ, pas à chaque lettre, comme le demandent les règles d'utilisation de Nominatim.

Le **formulaire de sécurité** s'affiche au moment de l'inscription :
- les risques auxquels le bénévole s'expose : **blessure, coupure, chute**, avec les bons réflexes ;
- le matériel de sécurité fourni par l'asso ;
- deux cases à cocher, obligatoires : avoir lu les risques, et **s'engager à remonter à l'association tout incident, physique ou moral**. La date de cet engagement est gardée avec l'inscription.

Une fois inscrit, la fiche rappelle de signaler tout incident à l'asso.

**Matériel de sécurité :** l'asso fournit toujours des **gilets jaunes** et une **trousse de premiers secours**. Ils sont ajoutés automatiquement en tête de « Ce que l'asso apporte » pour chaque sortie (contrainte équivalente dans `supabase/schema.sql`).

## Mise en ligne (GitHub + Supabase + Vercel)

| | Où | |
|---|---|---|
| **Site** | https://fantaplastic-mvp.vercel.app | ouvert à tous, à tester sur téléphone |
| **Code** | https://github.com/meline29/fantaplastic-mvp | dépôt public |
| **Base de données et comptes** | Supabase, organisation « fantaPLASTIC », projet « fantaplastic », région West EU (Paris) | offre gratuite |
| **Hébergement** | Vercel, projet « fantaplastic-mvp » | offre gratuite (Hobby) |
| **Vérification** | https://fantaplastic-mvp.vercel.app/tests/supabase.html | lecture seule |

Pour travailler à plusieurs : ajouter les membres de l'équipe comme collaborateurs du dépôt GitHub (Settings > Collaborators) et comme membres de l'organisation Supabase (Team > Invite). L'offre gratuite de Vercel n'a pas de membres d'équipe, mais chaque push sur `main` redéploie le site, quel que soit son auteur, car le dépôt est public.

Comment ça a été mis en place (à refaire si on recrée un projet) :

1. **GitHub** : le code est sur un dépôt GitHub. Chaque `git push` sur `main` met le site à jour en 30 secondes environ.
2. **Supabase** (base de données et comptes), dans un projet hébergé en Europe :
   - SQL Editor > New query > coller `supabase/schema.sql` > Run (une seule fois) ;
   - Authentication > Sign In / Providers > Email : « Confirm email » désactivé pour le MVP (l'envoi d'emails gratuit de Supabase est limité à quelques messages par heure) ;
   - Project Settings > API Keys : copier l'URL du projet et la clé « publishable » (`sb_publishable_…`) dans `js/config.js`. Les anciennes clés « anon » sont retirées par Supabase début 2027.
3. **Vercel** (hébergement) : Add New > Project > importer le dépôt GitHub, Framework Preset « Other », aucune commande de build, puis Deploy. Ensuite, dans Supabase > Authentication > URL Configuration, mettre l'adresse Vercel comme « Site URL ».
4. **Vérifier** : ouvrir `https://<adresse-vercel>/tests/supabase.html`, puis faire le parcours complet sur téléphone (compte organisateur, création d'une sortie, compte bénévole, inscription avec le formulaire de sécurité).

À savoir :
- un projet Supabase gratuit se met en pause après une semaine sans activité : il se relance depuis le tableau de bord ;
- les sorties d'exemple sont datées de J+3 à J+14 à partir du jour où le script SQL a été lancé : une fois passées, il faut en créer de nouvelles dans l'appli.
