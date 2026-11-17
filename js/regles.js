/*
 * fantaPLASTIC – règles communes
 *
 * Utilisées par les deux couches de données (démo locale dans db.js, Supabase dans
 * db-supabase.js) pour que les contrôles et les messages soient les mêmes partout.
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

  function peutOrganiser(role) {
    return ROLES_ORGANISATION.indexOf(role) !== -1;
  }

  // ---------- US15 : création de compte ----------

  function validerCompte(champs) {
    champs = champs || {};
    var c = {
      prenom: String(champs.prenom || '').trim(),
      email: String(champs.email || '').trim().toLowerCase(),
      motDePasse: String(champs.motDePasse || ''),
      role: champs.role || 'benevole'
    };
    if (ROLES_INSCRIPTION.indexOf(c.role) === -1) throw new Error('Choisis si tu es bénévole ou organisateur.');
    if (!c.prenom) throw new Error('Indique ton prénom.');
    if (c.prenom.length > 40) throw new Error('Ton prénom doit faire 40 caractères maximum.');
    if (!EMAIL_OK.test(c.email)) throw new Error("L'adresse email n'est pas valide.");
    if (c.motDePasse.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.');
    return c;
  }

  function verifierRoleInscription(role) {
    if (ROLES_INSCRIPTION.indexOf(role) === -1) throw new Error('Choisis si tu es bénévole ou organisateur.');
  }

  // ---------- US2 : création d'une sortie ----------
  // Renvoie les colonnes prêtes à enregistrer (même forme que la table "sorties")

  function validerSortie(champs) {
    champs = champs || {};
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

    return {
      titre: titre, lieu: lieu, commune: commune,
      date_debut: debut.toISOString(), duree_min: dureeMin, places: places,
      materiel_fourni: avecSecurite(fourni), materiel_a_apporter: apporter
    };
  }

  // ---------- US14 : formulaire de sécurité ----------
  // engagements = { risques_acceptes: true, engagement_incidents: true } (les deux cases du formulaire)

  function verifierEngagements(engagements) {
    if (!engagements || engagements.risques_acceptes !== true || engagements.engagement_incidents !== true) {
      throw new Error("Coche les deux engagements de sécurité pour t'inscrire.");
    }
  }

  window.FantaRegles = {
    MATERIEL_SECURITE: MATERIEL_SECURITE,
    enListe: enListe,
    avecSecurite: avecSecurite,
    peutOrganiser: peutOrganiser,
    validerCompte: validerCompte,
    verifierRoleInscription: verifierRoleInscription,
    validerSortie: validerSortie,
    verifierEngagements: verifierEngagements
  };
})();
