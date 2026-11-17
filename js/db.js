/*
 * fantaPLASTIC – couche de données (sprint 1)
 *
 * Version "démo locale" : les données sont rangées dans le navigateur (localStorage).
 * Les fonctions ont la même forme (async) que celles qu'on aura avec Supabase,
 * pour pouvoir brancher la vraie base au sprint 2 sans toucher aux écrans.
 * Les tables imitent celles de supabase/schema.sql : profiles, sorties, inscriptions.
 */
(function () {
  'use strict';

  var EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
        { titre: 'Ramassage à la plage du Moulin Blanc', lieu: 'Plage du Moulin Blanc', commune: 'Brest', j: 3, h: 10, m: 0, duree: 120, places: 25, inscrits: 18, lat: 48.3925, lng: -4.4330, fourni: 'Sacs et pinces', apporter: 'Gants, chaussures fermées' },
        { titre: "Nettoyage de l'anse de Sainte-Anne-du-Portzic", lieu: 'Anse de Sainte-Anne-du-Portzic', commune: 'Brest', j: 6, h: 14, m: 0, duree: 90, places: 15, inscrits: 15, lat: 48.3590, lng: -4.5510, fourni: 'Sacs', apporter: 'Gants, bottes' },
        { titre: 'Grève du Dellec', lieu: 'Plage du Dellec', commune: 'Plouzané', j: 10, h: 9, m: 30, duree: 120, places: 20, inscrits: 17, lat: 48.3555, lng: -4.5680, fourni: 'Sacs, pinces, gants', apporter: 'Bottes, une gourde' },
        { titre: 'Ramassage au port du Tinduff', lieu: 'Port du Tinduff', commune: 'Plougastel-Daoulas', j: 14, h: 10, m: 0, duree: 150, places: 30, inscrits: 2, lat: 48.3355, lng: -4.3720, fourni: 'Sacs et pinces', apporter: 'Gants, bottes' },
        { titre: 'Ramassage au Relecq-Kerhuon', lieu: 'Plage du Passage', commune: 'Le Relecq-Kerhuon', j: -5, h: 10, m: 0, duree: 120, places: 20, inscrits: 12, lat: 48.4040, lng: -4.3950, fourni: 'Sacs', apporter: 'Gants' }
      ];
      var sorties = [];
      var inscriptions = [];
      modeles.forEach(function (x) {
        var s = {
          id: nouvelId(), titre: x.titre, lieu: x.lieu, commune: x.commune,
          date_debut: dansNJours(x.j, x.h, x.m), duree_min: x.duree, places: x.places,
          materiel_fourni: x.fourni, materiel_a_apporter: x.apporter,
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

      if (!prenom) throw new Error('Indique ton prénom.');
      if (prenom.length > 40) throw new Error('Ton prénom doit faire 40 caractères maximum.');
      if (!EMAIL_OK.test(email)) throw new Error("L'adresse email n'est pas valide.");
      if (motDePasse.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.');

      var d = donnees();
      var existe = d.profiles.some(function (p) { return p.email === email; });
      if (existe) throw new Error('Un compte existe déjà avec cet email. Connecte-toi plutôt.');

      var profil = { id: nouvelId(), prenom: prenom, email: email, role: 'benevole', created_at: new Date().toISOString() };
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
        .map(function (s) {
          var nb = d.inscriptions.filter(function (i) { return i.sortie_id === s.id; }).length;
          return Object.assign({}, s, { nb_inscrits: nb, places_restantes: Math.max(0, s.places - nb) });
        });
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
      reinitialiser: reinitialiser,
      _effacer: _effacer
    };
  }

  window.creerFantaDB = creerDB;
  window.FantaDB = creerDB({ prefixe: 'fantaplastic' });
})();
