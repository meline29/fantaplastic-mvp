/*
 * fantaPLASTIC – couche de données, version « démo locale »
 *
 * Les données sont rangées dans le navigateur (localStorage). Les fonctions ont exactement
 * la même forme (async) que celles de db-supabase.js : les écrans ne voient pas la différence.
 * Les tables imitent celles de supabase/schema.sql : profiles, sorties, inscriptions.
 * Les contrôles (comptes, sorties, sécurité) sont dans regles.js, communs aux deux versions.
 */
(function () {
  'use strict';

  var R = window.FantaRegles;

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
      // la vraie authentification est faite par Supabase.
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
          materiel_fourni: R.avecSecurite(x.fourni), materiel_a_apporter: x.apporter,
          lat: x.lat, lng: x.lng, statut: 'prevue', organisateur_id: orga.id, created_at: maintenant
        };
        sorties.push(s);
        for (var k = 0; k < x.inscrits; k++) {
          inscriptions.push({ id: nouvelId(), sortie_id: s.id, benevole_id: 'demo-benevole-' + k, created_at: maintenant });
        }
      });
      return { profiles: [orga], comptes: [], sorties: sorties, inscriptions: inscriptions, signalements: [] };
    }

    // Faux compte de démo, avec déjà 23 ramassages passés, pour montrer le profil et les badges
    // pendant les revues. Identifiant : demo@fantaplastic.fr (mot de passe dans le README).
    // Comme pour les autres comptes de la démo, seule l'empreinte du mot de passe est gardée.
    var COMPTE_DEMO = {
      id: 'demo-nolwenn', prenom: 'Nolwenn (démo)', email: 'demo@fantaplastic.fr', role: 'benevole',
      sel: 'demo-sel-nolwenn-2026', empreinte: 'bf3defd098638de042ecbf6ed2cc78bd02e5635bed5a1d302fc858488f674a61'
    };

    function ajouterCompteDemo(d) {
      if (d.profiles.some(function (p) { return p.id === COMPTE_DEMO.id || p.email === COMPTE_DEMO.email; })) return false;
      var membreDepuis = new Date();
      membreDepuis.setMonth(membreDepuis.getMonth() - 8);
      d.profiles.push({ id: COMPTE_DEMO.id, prenom: COMPTE_DEMO.prenom, email: COMPTE_DEMO.email, role: COMPTE_DEMO.role, created_at: membreDepuis.toISOString() });
      d.comptes.push({ profil_id: COMPTE_DEMO.id, sel: COMPTE_DEMO.sel, empreinte: COMPTE_DEMO.empreinte });
      var lieux = [
        ['Plage du Moulin Blanc', 'Brest', 48.3925, -4.4330], ['Plage du Dellec', 'Plouzané', 48.3555, -4.5680],
        ['Port du Tinduff', 'Plougastel-Daoulas', 48.3355, -4.3720], ['Plage du Passage', 'Le Relecq-Kerhuon', 48.4040, -4.3950]
      ];
      // 23 ramassages, environ un tous les 9 jours sur les 7 derniers mois → Sardine, Cabillaud et Poulpe
      for (var k = 1; k <= 23; k++) {
        var l = lieux[k % lieux.length];
        var date = new Date();
        date.setDate(date.getDate() - (9 * k + 4));
        date.setHours(10, 0, 0, 0);
        var s = {
          id: nouvelId(), titre: 'Ramassage – ' + l[0], lieu: l[0], commune: l[1],
          date_debut: date.toISOString(), duree_min: 120, places: 20,
          materiel_fourni: R.avecSecurite(['Sacs poubelle']), materiel_a_apporter: ['Gants'],
          lat: l[2], lng: l[3], statut: 'prevue', organisateur_id: 'orga-demo', created_at: date.toISOString()
        };
        d.sorties.push(s);
        d.inscriptions.push({ id: nouvelId(), sortie_id: s.id, benevole_id: COMPTE_DEMO.id, securite_acceptee_le: date.toISOString(), created_at: date.toISOString() });
      }
      // Et inscrite à une prochaine sortie
      var prochaine = d.sorties.find(function (s) { return s.titre === 'Ramassage au port du Tinduff' && new Date(s.date_debut) > new Date(); });
      if (prochaine) {
        var maintenant = new Date().toISOString();
        d.inscriptions.push({ id: nouvelId(), sortie_id: prochaine.id, benevole_id: COMPTE_DEMO.id, securite_acceptee_le: maintenant, created_at: maintenant });
      }
      return true;
    }

    function donnees() {
      if (!cache) {
        cache = lire(CLE_DB);
        if (!cache) {
          cache = donneesDeDemo();
          ecrire(CLE_DB, cache);
        }
        if (!cache.signalements) cache.signalements = []; // données enregistrées avant les signalements
        if (ajouterCompteDemo(cache)) ecrire(CLE_DB, cache); // aussi pour les navigateurs qui avaient déjà la démo
      }
      return cache;
    }

    // Comme sauver(), mais signale quand le navigateur n'a plus de place (photos des signalements)
    function sauverOuSignalerPlein() {
      memoire[CLE_DB] = cache;
      try {
        localStorage.setItem(CLE_DB, JSON.stringify(cache));
      } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) throw e;
        /* localStorage indisponible : on garde la copie en mémoire */
      }
    }

    function lireCommeDataUrl(blob) {
      return new Promise(function (ok, ko) {
        var lecteur = new FileReader();
        lecteur.onload = function () { ok(lecteur.result); };
        lecteur.onerror = function () { ko(new Error("La photo n'a pas pu être lue.")); };
        lecteur.readAsDataURL(blob);
      });
    }

    function sauver() {
      ecrire(CLE_DB, cache);
    }

    // Ajoute à une sortie ce que l'écran affiche : nombre d'inscrits, places restantes, matériel en liste
    function enrichir(s, d) {
      var nb = d.inscriptions.filter(function (i) { return i.sortie_id === s.id; }).length;
      return Object.assign({}, s, {
        materiel_fourni: R.avecSecurite(R.enListe(s.materiel_fourni)),
        materiel_a_apporter: R.enListe(s.materiel_a_apporter),
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
      var c = R.validerCompte(champs);
      var d = donnees();
      var existe = d.profiles.some(function (p) { return p.email === c.email; });
      if (existe) throw new Error('Un compte existe déjà avec cet email. Connecte-toi plutôt.');

      var profil = { id: nouvelId(), prenom: c.prenom, email: c.email, role: c.role, created_at: new Date().toISOString() };
      var sel = nouvelId();
      d.profiles.push(profil);
      d.comptes.push({ profil_id: profil.id, sel: sel, empreinte: await hacher(c.motDePasse, sel) });
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

    async function inscrireASortie(sortieId, engagements) {
      var moi = await utilisateurCourant();
      if (!moi) throw new Error("Connecte-toi pour t'inscrire à une sortie.");
      var d = donnees();
      var s = d.sorties.find(function (x) { return x.id === sortieId; });
      if (!s || s.statut === 'annulee' || new Date(s.date_debut).getTime() < Date.now()) {
        throw new Error("Cette sortie n'est plus ouverte aux inscriptions.");
      }
      R.verifierEngagements(engagements);
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
      var moi = await utilisateurCourant();
      if (!moi) throw new Error('Connecte-toi pour créer une sortie.');
      if (!R.peutOrganiser(moi.role)) throw new Error('Seuls les organisateurs peuvent créer une sortie.');
      var colonnes = R.validerSortie(champs);

      var d = donnees();
      var s = Object.assign({ id: nouvelId() }, colonnes, {
        statut: 'prevue', organisateur_id: moi.id, created_at: new Date().toISOString()
      });
      d.sorties.push(s);
      sauver();
      return obtenirSortie(s.id);
    }

    // ---------- US1 / US16 : signaler un endroit pollué, voir les signalements sur la carte ----------

    function versEcranSignalement(s) {
      return { id: s.id, lat: s.lat, lng: s.lng, precision_m: s.precision_m, commentaire: s.commentaire, created_at: s.created_at, photo: s.photo_url };
    }

    // champs = { photo (Blob), lat, lng, precision_m, commentaire } – position prise au moment de l'envoi
    async function creerSignalement(champs) {
      var moi = await utilisateurCourant();
      if (!moi) throw new Error('Connecte-toi pour signaler un endroit pollué.');
      var s = R.validerSignalement(champs);
      var photo = await lireCommeDataUrl(s.photo); // dans la démo locale, la photo est gardée dans le navigateur
      var d = donnees();
      var signalement = {
        id: nouvelId(), auteur_id: moi.id, photo_url: photo, lat: s.lat, lng: s.lng,
        precision_m: s.precision_m, commentaire: s.commentaire, created_at: new Date().toISOString()
      };
      d.signalements.push(signalement);
      try {
        sauverOuSignalerPlein();
      } catch (e) {
        d.signalements.pop();
        throw new Error('Plus de place pour les photos dans la démo locale : réinitialise les données de démo.');
      }
      return versEcranSignalement(signalement);
    }

    // Visible seulement une fois connecté (comme sur Supabase), du plus récent au plus ancien
    async function listerSignalements() {
      if (!(await utilisateurCourant())) return [];
      return donnees().signalements.slice()
        .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
        .map(versEcranSignalement);
    }

    // ---------- Profil : historique des ramassages, score de fidélité, badges ----------

    async function monProfil() {
      var moi = await utilisateurCourant();
      if (!moi) throw new Error('Connecte-toi pour voir ton profil.');
      var d = donnees();
      var sorties = d.inscriptions
        .filter(function (i) { return i.benevole_id === moi.id; })
        .map(function (i) {
          var s = d.sorties.find(function (x) { return x.id === i.sortie_id; });
          return s ? { id: s.id, titre: s.titre, lieu: s.lieu, commune: s.commune, date_debut: s.date_debut, duree_min: s.duree_min, statut: s.statut } : null;
        });
      var h = R.historique(sorties);
      var nbSignalements = d.signalements.filter(function (s) { return s.auteur_id === moi.id; }).length;
      return { profil: moi, ramassages: h.faits, aVenir: h.aVenir, bilan: R.bilanFidelite(h.faits, nbSignalements) };
    }

    // Démo uniquement : ajoute des ramassages déjà passés au compte connecté, pour montrer
    // les badges pendant une revue (sinon il faut attendre que les sorties aient eu lieu).
    async function ajouterRamassagesDemo(nombre) {
      var moi = await utilisateurCourant();
      if (!moi) throw new Error("Connecte-toi d'abord.");
      var d = donnees();
      var lieux = [['Plage du Moulin Blanc', 'Brest'], ['Plage du Dellec', 'Plouzané'], ['Port du Tinduff', 'Plougastel-Daoulas'], ['Plage du Passage', 'Le Relecq-Kerhuon']];
      var deja = d.inscriptions.filter(function (i) { return i.benevole_id === moi.id; }).length;
      for (var k = 0; k < nombre; k++) {
        var lieu = lieux[(deja + k) % lieux.length];
        var date = new Date();
        date.setDate(date.getDate() - 9 * (deja + k + 1)); // une sortie tous les 9 jours environ, dans le passé
        date.setHours(10, 0, 0, 0);
        var s = {
          id: nouvelId(), titre: 'Ramassage – ' + lieu[0], lieu: lieu[0], commune: lieu[1],
          date_debut: date.toISOString(), duree_min: 120, places: 20,
          materiel_fourni: R.avecSecurite([]), materiel_a_apporter: ['Gants'],
          lat: null, lng: null, statut: 'prevue', organisateur_id: 'orga-demo', created_at: date.toISOString()
        };
        d.sorties.push(s);
        d.inscriptions.push({ id: nouvelId(), sortie_id: s.id, benevole_id: moi.id, securite_acceptee_le: date.toISOString(), created_at: date.toISOString() });
      }
      sauver();
    }

    // Démo uniquement : passer de bénévole à organisateur sans recréer de compte, pour les revues.
    // N'existe pas avec Supabase, où l'utilisateur ne peut pas changer son rôle lui-même.
    async function changerRoleDemo(role) {
      R.verifierRoleInscription(role);
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
      mode: 'local',
      inscrire: inscrire,
      connecter: connecter,
      deconnecter: deconnecter,
      utilisateurCourant: utilisateurCourant,
      listerSortiesAVenir: listerSortiesAVenir,
      obtenirSortie: obtenirSortie,
      creerSortie: creerSortie,
      inscrireASortie: inscrireASortie,
      desinscrireDeSortie: desinscrireDeSortie,
      creerSignalement: creerSignalement,
      listerSignalements: listerSignalements,
      monProfil: monProfil,
      ajouterRamassagesDemo: ajouterRamassagesDemo,
      changerRoleDemo: changerRoleDemo,
      materielSecurite: R.MATERIEL_SECURITE.slice(),
      reinitialiser: reinitialiser,
      _effacer: _effacer
    };
  }

  window.creerFantaDB = creerDB;
  window.FantaDB = creerDB({ prefixe: 'fantaplastic' });
})();
