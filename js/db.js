/*
 * fantaPLASTIC – couche de données
 *
 * Version "démo locale" : les données sont rangées dans le navigateur (localStorage).
 * Les fonctions ont la même forme (async) que celles qu'on aura avec Supabase,
 * pour pouvoir brancher la vraie base au sprint 2 sans toucher aux écrans.
 * Les tables imitent celles de supabase/schema.sql : profiles, sorties, inscriptions.
 */
(function () {
  'use strict';

  var EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // Rôles qu'on peut choisir soi-même en créant son compte (admin : jamais)
  var ROLES_INSCRIPTION = ['benevole', 'organisateur'];
  // Rôles qui ont le droit de créer une sortie (US2)
  var ROLES_ORGANISATION = ['organisateur', 'admin'];
  // Sécurité : l'asso fournit toujours ce matériel, à chaque sortie
  var MATERIEL_SECURITE = ['Gilets jaunes', 'Trousse de premiers secours'];

  function creerDB(options) {
    var prefixe = (options && options.prefixe) || 'fantaplastic';
    var CLE_DB = prefixe + '.db.v1';
    var CLE_SESSION = prefixe + '.session.v1';
    var memoire = {}; // secours si localStorage est bloqué (navigation privée, etc.)
    var cache = null;

    function lire(cle) {
      try {
        var brut = localStorage.getItem(cle);
        return brut ? JSON.parse(brut) : null;
      } catch (e) {
        return memoire[cle] || null;
      }
    }

    function ecrire(cle, valeur) {
      memoire[cle] = valeur;
      try {
        if (valeur === null) localStorage.removeItem(cle);
        else localStorage.setItem(cle, JSON.stringify(valeur));
      } catch (e) {
        /* on garde la copie en mémoire */
      }
    }

    function nouvelId() {
      if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function dansNJours(n, heure, minute) {
      var d = new Date();
      d.setDate(d.getDate() + n);
      d.setHours(heure, minute || 0, 0, 0);
      return d.toISOString();
    }

    async function hacher(motDePasse, sel) {
      var data = new TextEncoder().encode(sel + ':' + motDePasse);
      if (window.crypto && crypto.subtle) {
        var buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(function (b) {
          return b.toString(16).padStart(2, '0');
        }).join('');
      }
      // Repli si le navigateur refuse crypto.subtle : suffisant pour une démo locale,
      // la vraie authentification sera faite par Supabase.
      var h = 0;
      for (var i = 0; i < data.length; i++) h = (h * 31 + data[i]) | 0;
      return 'x' + (h >>> 0).toString(16);
    }

    // Données d'exemple (tâche J-1 du TD1 : "ajouter des exemples de sorties")
    function donneesDeDemo() {
      var maintenant = new Date().toISOString();
      var orga = { id: 'orga-demo', prenom: 'Asso (démo)', email: 'orga@demo.local', role: 'organisateur', created_at: maintenant };
      var modeles = [
        { titre: 'Ramassage à la plage du Moulin Blanc', lieu: 'Plage du Moulin Blanc', commune: 'Brest', j: 3, h: 10, m: 0, duree: 120, places: 25, inscrits: 18, lat: 48.3925, lng: -4.4330,
          fourni: ['Sacs poubelle', 'Pinces de ramassage', 'Seaux pour le tri'], apporter: ['Gants de jardinage', 'Chaussures fermées', 'Une gourde'] },
        { titre: "Nettoyage de l'anse de Sainte-Anne-du-Portzic", lieu: 'Anse de Sainte-Anne-du-Portzic', commune: 'Brest', j: 6, h: 14, m: 0, duree: 90, places: 15, inscrits: 15, lat: 48.3590, lng: -4.5510,
          fourni: ['Sacs poubelle', 'Gants'], apporter: ['Bottes', 'Un coupe-vent'] },
        { titre: 'Grève du Dellec', lieu: 'Plage du Dellec', commune: 'Plouzané', j: 10, h: 9, m: 30, duree: 120, places: 20, inscrits: 17, lat: 48.3555, lng: -4.5680,
          fourni: ['Sacs poubelle', 'Pinces de ramassage', 'Gants'], apporter: ['Bottes', 'Une gourde', 'Des vêtements chauds'] },
        { titre: 'Ramassage au port du Tinduff', lieu: 'Port du Tinduff', commune: 'Plougastel-Daoulas', j: 14, h: 10, m: 0, duree: 150, places: 30, inscrits: 2, lat: 48.3355, lng: -4.3720,
          fourni: ['Sacs poubelle', 'Pinces de ramassage', 'Une brouette pour les gros déchets'], apporter: ['Gants', 'Bottes', 'Un en-cas'] },
        { titre: 'Ramassage au Relecq-Kerhuon', lieu: 'Plage du Passage', commune: 'Le Relecq-Kerhuon', j: -5, h: 10, m: 0, duree: 120, places: 20, inscrits: 12, lat: 48.4040, lng: -4.3950,
          fourni: ['Sacs poubelle'], apporter: ['Gants'] }
      ];
      var sorties = [];
      var inscriptions = [];
      modeles.forEach(function (x) {
        var s = {
          id: nouvelId(), titre: x.titre, lieu: x.lieu, commune: x.commune,
          date_debut: dansNJours(x.j, x.h, x.m), duree_min: x.duree, places: x.places,
          materiel_fourni: avecSecurite(x.fourni), materiel_a_apporter: x.apporter,
          lat: x.lat, lng: x.lng, statut: 'prevue', organisateur_id: orga.id, created_at: maintenant
        };
        sorties.push(s);
        for (var k = 0; k < x.inscrits; k++) {
          inscriptions.push({ id: nouvelId(), sortie_id: s.id, benevole_id: 'demo-benevole-' + k, created_at: maintenant });
        }
      });
      return { profiles: [orga], comptes: [], sorties: sorties, inscriptions: inscriptions };
    }

    function donnees() {
      if (!cache) {
        cache = lire(CLE_DB);
        if (!cache) {
          cache = donneesDeDemo();
          ecrire(CLE_DB, cache);
        }
      }
      return cache;
    }

    function sauver() {
      ecrire(CLE_DB, cache);
    }

    // Le matériel est rangé sous forme de liste : ['Sacs', 'Pinces']. On accepte aussi un texte
    // "Sacs, pinces" (saisie du formulaire, ou données enregistrées avant le sprint 2).
    function enListe(valeur) {
      var morceaux = Array.isArray(valeur) ? valeur : String(valeur || '').split(/[,;\n]/);
      return morceaux
        .map(function (x) { return String(x).trim(); })
        .filter(function (x) { return x.length > 0; })
        .map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); });
    }

    // Met le matériel de sécurité en tête de la liste de l'asso, sans doublon
    // ("gilet jaune" écrit par l'organisateur = "Gilets jaunes")
    function cleObjet(x) {
      return x.toLowerCase().replace(/s\b/g, '').trim();
    }

    function avecSecurite(liste) {
      var cles = MATERIEL_SECURITE.map(cleObjet);
      return MATERIEL_SECURITE.concat(liste.filter(function (o) { return cles.indexOf(cleObjet(o)) === -1; }));
    }

    // Ajoute à une sortie ce que l'écran affiche : nombre d'inscrits, places restantes, matériel en liste
    function enrichir(s, d) {
      var nb = d.inscriptions.filter(function (i) { return i.sortie_id === s.id; }).length;
      return Object.assign({}, s, {
        materiel_fourni: avecSecurite(enListe(s.materiel_fourni)),
        materiel_a_apporter: enListe(s.materiel_a_apporter),
        nb_inscrits: nb,
        places_restantes: Math.max(0, s.places - nb)
      });
    }

    function profilPublic(p) {
      return p ? { id: p.id, prenom: p.prenom, email: p.email, role: p.role, created_at: p.created_at } : null;
    }

    function ouvrirSession(idProfil) {
      ecrire(CLE_SESSION, { profil_id: idProfil, ouverte_le: new Date().toISOString() });
    }

    // ---------- US15 : créer un compte / se connecter ----------

    async function inscrire(champs) {
      var prenom = String((champs && champs.prenom) || '').trim();
      var email = String((champs && champs.email) || '').trim().toLowerCase();
      var motDePasse = String((champs && champs.motDePasse) || '');
      var role = (champs && champs.role) || 'benevole';

      if (ROLES_INSCRIPTION.indexOf(role) === -1) throw new Error('Choisis si tu es bénévole ou organisateur.');
      if (!prenom) throw new Error('Indique ton prénom.');
      if (prenom.length > 40) throw new Error('Ton prénom doit faire 40 caractères maximum.');
      if (!EMAIL_OK.test(email)) throw new Error("L'adresse email n'est pas valide.");
      if (motDePasse.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.');

      var d = donnees();
      var existe = d.profiles.some(function (p) { return p.email === email; });
      if (existe) throw new Error('Un compte existe déjà avec cet email. Connecte-toi plutôt.');

      var profil = { id: nouvelId(), prenom: prenom, email: email, role: role, created_at: new Date().toISOString() };
      var sel = nouvelId();
      d.profiles.push(profil);
      d.comptes.push({ profil_id: profil.id, sel: sel, empreinte: await hacher(motDePasse, sel) });
      sauver();
      ouvrirSession(profil.id);
      return profilPublic(profil);
    }

    async function connecter(champs) {
      var email = String((champs && champs.email) || '').trim().toLowerCase();
      var motDePasse = String((champs && champs.motDePasse) || '');
      var d = donnees();
      var profil = d.profiles.find(function (p) { return p.email === email; });
      var compte = profil && d.comptes.find(function (c) { return c.profil_id === profil.id; });
      if (!compte || (await hacher(motDePasse, compte.sel)) !== compte.empreinte) {
        throw new Error('Email ou mot de passe incorrect.');
      }
      ouvrirSession(profil.id);
      return profilPublic(profil);
    }

    async function deconnecter() {
      ecrire(CLE_SESSION, null);
    }

    async function utilisateurCourant() {
      var session = lire(CLE_SESSION);
      if (!session) return null;
      var profil = donnees().profiles.find(function (p) { return p.id === session.profil_id; });
      return profilPublic(profil);
    }

    // ---------- US3 : consulter la liste des prochaines sorties ----------

    async function listerSortiesAVenir() {
      var d = donnees();
      var maintenant = Date.now();
      return d.sorties
        .filter(function (s) { return s.statut !== 'annulee' && new Date(s.date_debut).getTime() >= maintenant; })
        .sort(function (a, b) { return new Date(a.date_debut) - new Date(b.date_debut); })
        .map(function (s) { return enrichir(s, d); });
    }

    // ---------- US4 : détail d'une sortie (avec le matériel) ----------

    async function obtenirSortie(id) {
      var d = donnees();
      var s = d.sorties.find(function (x) { return x.id === id; });
      if (!s) return null;
      var orga = d.profiles.find(function (p) { return p.id === s.organisateur_id; });
      var session = lire(CLE_SESSION);
      var inscrit = !!session && d.inscriptions.some(function (i) { return i.sortie_id === s.id && i.benevole_id === session.profil_id; });
      return Object.assign(enrichir(s, d), { organisateur_prenom: orga ? orga.prenom : null, je_suis_inscrit: inscrit });
    }

    // ---------- US14 : s'inscrire à une sortie, après le formulaire de sécurité ----------

    // engagements = { risques_acceptes: true, engagement_incidents: true } (les deux cases du formulaire)
    async function inscrireASortie(sortieId, engagements) {
      var moi = await utilisateurCourant();
      if (!moi) throw new Error("Connecte-toi pour t'inscrire à une sortie.");
      var d = donnees();
      var s = d.sorties.find(function (x) { return x.id === sortieId; });
      if (!s || s.statut === 'annulee' || new Date(s.date_debut).getTime() < Date.now()) {
        throw new Error("Cette sortie n'est plus ouverte aux inscriptions.");
      }
      if (!engagements || engagements.risques_acceptes !== true || engagements.engagement_incidents !== true) {
        throw new Error("Coche les deux engagements de sécurité pour t'inscrire.");
      }
      if (d.inscriptions.some(function (i) { return i.sortie_id === s.id && i.benevole_id === moi.id; })) {
        throw new Error('Tu es déjà inscrit·e à cette sortie.');
      }
      if (enrichir(s, d).places_restantes <= 0) throw new Error('Désolé, cette sortie est complète.');

      var maintenant = new Date().toISOString();
      // On garde la date à laquelle le bénévole a accepté les consignes de sécurité
      d.inscriptions.push({ id: nouvelId(), sortie_id: s.id, benevole_id: moi.id, securite_acceptee_le: maintenant, created_at: maintenant });
      sauver();
      return obtenirSortie(s.id);
    }

    async function desinscrireDeSortie(sortieId) {
      var moi = await utilisateurCourant();
      if (!moi) throw new Error("Connecte-toi d'abord.");
      var d = donnees();
      d.inscriptions = d.inscriptions.filter(function (i) { return !(i.sortie_id === sortieId && i.benevole_id === moi.id); });
      sauver();
      return obtenirSortie(sortieId);
    }

    // ---------- US2 : un organisateur crée une sortie ----------

    async function creerSortie(champs) {
      champs = champs || {};
      var moi = await utilisateurCourant();
      if (!moi) throw new Error('Connecte-toi pour créer une sortie.');
      if (ROLES_ORGANISATION.indexOf(moi.role) === -1) throw new Error('Seuls les organisateurs peuvent créer une sortie.');

      var titre = String(champs.titre || '').trim();
      var lieu = String(champs.lieu || '').trim();
      var commune = String(champs.commune || '').trim();
      var debut = champs.date_debut ? new Date(champs.date_debut) : null;
      var dureeMin = Number(champs.duree_min);
      var places = Number(champs.places);
      var fourni = enListe(champs.materiel_fourni);
      var apporter = enListe(champs.materiel_a_apporter);

      if (!titre) throw new Error('Donne un titre à la sortie.');
      if (titre.length > 80) throw new Error('Le titre doit faire 80 caractères maximum.');
      if (!lieu) throw new Error('Indique le lieu de rendez-vous.');
      if (!commune) throw new Error('Indique la commune.');
      if (!debut || isNaN(debut.getTime())) throw new Error("Choisis la date et l'heure de la sortie.");
      if (debut.getTime() <= Date.now()) throw new Error('La sortie doit avoir lieu dans le futur.');
      if (!Number.isInteger(dureeMin) || dureeMin < 30 || dureeMin > 480) throw new Error('La durée doit être comprise entre 30 min et 8 h.');
      if (!Number.isInteger(places) || places < 1 || places > 500) throw new Error('Le nombre de places doit être compris entre 1 et 500.');
      if (fourni.length > 20 || apporter.length > 20) throw new Error('20 objets maximum par liste de matériel.');
      if (fourni.concat(apporter).some(function (o) { return o.length > 60; })) throw new Error('Chaque objet doit faire 60 caractères maximum.');

      var d = donnees();
      var s = {
        id: nouvelId(), titre: titre, lieu: lieu, commune: commune,
        date_debut: debut.toISOString(), duree_min: dureeMin, places: places,
        materiel_fourni: avecSecurite(fourni), materiel_a_apporter: apporter,
        lat: null, lng: null, statut: 'prevue', organisateur_id: moi.id, created_at: new Date().toISOString()
      };
      d.sorties.push(s);
      sauver();
      return obtenirSortie(s.id);
    }

    // Démo uniquement : passer de bénévole à organisateur sans recréer de compte, pour les revues.
    // Avec Supabase, l'utilisateur ne pourra pas changer son rôle lui-même (voir schema.sql).
    async function changerRoleDemo(role) {
      if (ROLES_INSCRIPTION.indexOf(role) === -1) throw new Error('Choisis si tu es bénévole ou organisateur.');
      var session = lire(CLE_SESSION);
      var profil = session && donnees().profiles.find(function (p) { return p.id === session.profil_id; });
      if (!profil) throw new Error("Connecte-toi d'abord.");
      profil.role = role;
      sauver();
      return profilPublic(profil);
    }

    // Remet les données de démo à zéro (pratique avant une revue de sprint)
    async function reinitialiser() {
      cache = null;
      ecrire(CLE_DB, null);
      ecrire(CLE_SESSION, null);
      donnees();
    }

    // Uniquement pour les tests : efface tout ce que cette instance a créé
    function _effacer() {
      cache = null;
      ecrire(CLE_DB, null);
      ecrire(CLE_SESSION, null);
    }

    return {
      inscrire: inscrire,
      connecter: connecter,
      deconnecter: deconnecter,
      utilisateurCourant: utilisateurCourant,
      listerSortiesAVenir: listerSortiesAVenir,
      obtenirSortie: obtenirSortie,
      creerSortie: creerSortie,
      inscrireASortie: inscrireASortie,
      desinscrireDeSortie: desinscrireDeSortie,
      changerRoleDemo: changerRoleDemo,
      materielSecurite: MATERIEL_SECURITE.slice(),
      reinitialiser: reinitialiser,
      _effacer: _effacer
    };
  }

  window.creerFantaDB = creerDB;
  window.FantaDB = creerDB({ prefixe: 'fantaplastic' });
})();
