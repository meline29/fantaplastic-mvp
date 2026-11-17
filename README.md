# fantaPLASTIC – MVP « Zéro déchets en rade de Brest »

Application web (PWA) pour les bénévoles ramasseurs de la rade de Brest.

## Lancer l'appli

- **Le plus simple :** double-cliquer sur `index.html` (il faut une connexion internet, car React et Tailwind sont chargés depuis un CDN).
- **Ou avec un petit serveur :** `python -m http.server 8000` dans ce dossier, puis ouvrir http://localhost:8000

Les tests s'ouvrent de la même façon :
- `tests/index.html` : 20 tests de la couche de données (comptes, rôles, liste des sorties) ;
- `tests/ui.html` : rejoue le parcours dans l'appli, en 19 étapes (sorties, création de compte avec choix du rôle, onglets, connexion). **Attention, il remet les données de démo à zéro.**

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
| `js/app.js` | les écrans : en-tête, accueil, liste des sorties, formulaires de compte |
| `js/db.js` | la couche de données. Pour l'instant en « démo locale » (stockage du navigateur), avec les mêmes fonctions que celles qu'on aura avec Supabase |
| `supabase/schema.sql` | tables, règles d'accès (RLS) et sorties d'exemple pour Supabase |
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

## Depuis la fin du sprint 1

- À la création du compte, on choisit son rôle : **bénévole** (par défaut) ou **organisateur**. Plus tard, un compte organisateur devra être validé par l'asso (TD2, R7).
- Barre d'onglets en bas de l'écran : **Sorties**, **Carte**, **Signaler**, **Profil** (badges et profil). Seul « Sorties » a du contenu, les autres onglets sont prêts mais vides.
