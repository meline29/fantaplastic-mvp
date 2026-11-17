# fantaPLASTIC – MVP « Zéro déchets en rade de Brest »

Application web (PWA) pour les bénévoles ramasseurs de la rade de Brest.

## Lancer l'appli

- **Le plus simple :** double-cliquer sur `index.html` (il faut une connexion internet, car React et Tailwind sont chargés depuis un CDN).
- **Ou avec un petit serveur :** `python -m http.server 8000` dans ce dossier, puis ouvrir http://localhost:8000

Les tests s'ouvrent de la même façon :
- `tests/index.html` : 49 tests de la couche de données (comptes, rôles, liste et fiche des sorties, création d'une sortie, matériel de sécurité, inscription) ;
- `tests/ui.html` : rejoue le parcours dans l'appli, en 38 étapes (sorties, fiche d'une sortie, création de compte organisateur, création d'une sortie, bascule de rôle, formulaire de sécurité et inscription, onglets, connexion). **Attention, il remet les données de démo à zéro.**

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
| US14 – S'inscrire à une sortie | 2 | Fait en mode démo locale : bouton « Je m'inscris » sur la fiche, puis **formulaire de sécurité** obligatoire. Désinscription possible. Pas d'inscription en double ni sur une sortie complète. |

Le **formulaire de sécurité** s'affiche au moment de l'inscription :
- les risques auxquels le bénévole s'expose : **blessure, coupure, chute**, avec les bons réflexes ;
- le matériel de sécurité fourni par l'asso ;
- deux cases à cocher, obligatoires : avoir lu les risques, et **s'engager à remonter à l'association tout incident, physique ou moral**. La date de cet engagement est gardée avec l'inscription.

Une fois inscrit, la fiche rappelle de signaler tout incident à l'asso.

**Matériel de sécurité :** l'asso fournit toujours des **gilets jaunes** et une **trousse de premiers secours**. Ils sont ajoutés automatiquement en tête de « Ce que l'asso apporte » pour chaque sortie (contrainte équivalente dans `supabase/schema.sql`).
