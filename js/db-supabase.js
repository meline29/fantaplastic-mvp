/*
 * fantaPLASTIC – couche de données branchée sur Supabase (base PostgreSQL + comptes)
 *
 * Mêmes fonctions que db.js (démo locale) : les écrans ne voient pas la différence.
 * Activée seulement si js/config.js contient l'URL et la clé « anon » du projet Supabase.
 * Ajouter ?mode=local à l'adresse force la démo locale (pratique pour une revue hors ligne).
 *
 * Les droits sont vérifiés par Supabase lui-même (règles RLS et triggers de supabase/schema.sql) :
 * les contrôles faits ici servent surtout à afficher des messages clairs.
 */
(function () {
  'use strict';

  var config = window.FANTA_CONFIG || {};
  var forcerLocal = /[?&]mode=local\b/.test(window.location.search);
  if (forcerLocal || !config.supabaseUrl || !config.supabaseAnonKey) return; // on garde la démo locale
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('fantaPLASTIC : la librairie Supabase ne s\'est pas chargée, on reste en démo locale.');
    return;
  }

  var R = window.FantaRegles;
  var sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  // Transforme les erreurs de Supabase en messages compréhensibles par un bénévole
  function traduire(err) {
    var m = (err && err.message) || '';
    var code = (err && err.code) || '';
    if (code === 'user_already_exists' || /already registered|already exists/i.test(m)) {
      return new Error('Un compte existe déjà avec cet email. Connecte-toi plutôt.');
    }
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(m)) return new Error('Email ou mot de passe incorrect.');
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(m)) {
      return new Error("Confirme d'abord ton adresse avec le lien reçu par email, puis reconnecte-toi.");
    }
    if (code === '23505') return new Error('Tu es déjà inscrit·e à cette sortie.');
    if (code === '42501' || /row-level security/i.test(m)) return new Error("Tu n'as pas le droit de faire ça avec ce compte.");
    if (/failed to fetch|networkerror|load failed/i.test(m)) return new Error('Pas de connexion au serveur. Vérifie ta connexion internet et réessaie.');
    if (code === 'P0001') return new Error(m); // messages des triggers, déjà écrits en français
    console.error('Supabase :', err);
    return new Error('Une erreur est survenue, réessaie dans un instant.');
  }

  function verifier(reponse) {
    if (reponse.error) throw traduire(reponse.error);
    return reponse.data;
  }

  async function sessionCourante() {
    var r = await sb.auth.getSession();
    return (r.data && r.data.session) || null;
  }

  // Profil de la personne connectée (table profiles, remplie par le trigger creer_profil)
  async function profilCourant() {
    var session = await sessionCourante();
    if (!session) return null;
    var p = verifier(await sb.from('profiles').select('id, prenom, role, created_at').eq('id', session.user.id).maybeSingle());
    var meta = session.user.user_metadata || {};
    return {
      id: session.user.id,
      prenom: p ? p.prenom : (meta.prenom || 'Bénévole'),
      email: session.user.email,
      role: p ? p.role : 'benevole',
      created_at: p ? p.created_at : session.user.created_at
    };
  }

  // Une ligne de la vue sorties_a_venir, mise au format attendu par les écrans
  function versEcran(s) {
    return Object.assign({}, s, {
      materiel_fourni: R.avecSecurite(R.enListe(s.materiel_fourni)),
      materiel_a_apporter: R.enListe(s.materiel_a_apporter),
      places_restantes: Math.max(0, s.places_restantes)
    });
  }

  // ---------- US15 : créer un compte / se connecter ----------

  async function inscrire(champs) {
    var c = R.validerCompte(champs);
    var r = await sb.auth.signUp({
      email: c.email,
      password: c.motDePasse,
      options: { data: { prenom: c.prenom, role: c.role } } // lus par le trigger creer_profil
    });
    if (r.error) throw traduire(r.error);
    var user = r.data && r.data.user;
    // Avec la confirmation par email activée, Supabase ne dit pas que l'email existe déjà :
    // il renvoie un compte sans « identité ».
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      throw new Error('Un compte existe déjà avec cet email. Connecte-toi plutôt.');
    }
    if (!r.data.session) {
      throw new Error("Ton compte est créé ! Clique sur le lien reçu par email pour l'activer, puis connecte-toi.");
    }
    return profilCourant();
  }

  async function connecter(champs) {
    var r = await sb.auth.signInWithPassword({
      email: String((champs && champs.email) || '').trim().toLowerCase(),
      password: String((champs && champs.motDePasse) || '')
    });
    if (r.error) throw traduire(r.error);
    return profilCourant();
  }

  async function deconnecter() {
    await sb.auth.signOut();
  }

  async function utilisateurCourant() {
    return profilCourant();
  }

  // ---------- US3 : liste des prochaines sorties ----------

  async function listerSortiesAVenir() {
    var lignes = verifier(await sb.from('sorties_a_venir').select('*').order('date_debut', { ascending: true }));
    return lignes.map(versEcran);
  }

  // ---------- US4 : détail d'une sortie ----------

  async function obtenirSortie(id) {
    var s = verifier(await sb.from('sorties_a_venir').select('*').eq('id', id).maybeSingle());
    if (!s) return null;
    var inscrit = false;
    var session = await sessionCourante();
    if (session) {
      var miennes = verifier(await sb.from('inscriptions').select('id').eq('sortie_id', id).eq('benevole_id', session.user.id));
      inscrit = miennes.length > 0;
    }
    return Object.assign(versEcran(s), { je_suis_inscrit: inscrit });
  }

  // ---------- US2 : un organisateur crée une sortie ----------

  async function creerSortie(champs) {
    var moi = await profilCourant();
    if (!moi) throw new Error('Connecte-toi pour créer une sortie.');
    if (!R.peutOrganiser(moi.role)) throw new Error('Seuls les organisateurs peuvent créer une sortie.');
    var colonnes = R.validerSortie(champs);
    var creee = verifier(await sb.from('sorties')
      .insert(Object.assign(colonnes, { organisateur_id: moi.id }))
      .select('id')
      .single());
    return obtenirSortie(creee.id);
  }

  // ---------- US14 : inscription après le formulaire de sécurité ----------

  async function inscrireASortie(sortieId, engagements) {
    var moi = await profilCourant();
    if (!moi) throw new Error("Connecte-toi pour t'inscrire à une sortie.");
    R.verifierEngagements(engagements);
    // Places, sortie passée ou annulée : vérifiés par le trigger verifier_inscription
    verifier(await sb.from('inscriptions').insert({
      sortie_id: sortieId,
      benevole_id: moi.id,
      securite_acceptee_le: new Date().toISOString()
    }));
    return obtenirSortie(sortieId);
  }

  async function desinscrireDeSortie(sortieId) {
    var moi = await profilCourant();
    if (!moi) throw new Error("Connecte-toi d'abord.");
    verifier(await sb.from('inscriptions').delete().eq('sortie_id', sortieId).eq('benevole_id', moi.id));
    return obtenirSortie(sortieId);
  }

  // Pas de bascule de rôle ni de remise à zéro ici : ce sont des outils de la démo locale.
  window.FantaDB = {
    mode: 'supabase',
    inscrire: inscrire,
    connecter: connecter,
    deconnecter: deconnecter,
    utilisateurCourant: utilisateurCourant,
    listerSortiesAVenir: listerSortiesAVenir,
    obtenirSortie: obtenirSortie,
    creerSortie: creerSortie,
    inscrireASortie: inscrireASortie,
    desinscrireDeSortie: desinscrireDeSortie,
    materielSecurite: R.MATERIEL_SECURITE.slice()
  };
})();
