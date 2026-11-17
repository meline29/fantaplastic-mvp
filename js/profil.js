/*
 * fantaPLASTIC – onglet « Profil » : historique des ramassages, score de fidélité et badges
 *
 * Badges (un par palier de ramassages) : Sardine Plastic (1), Cabillaud Bouteille (5),
 * Poulpe Bouchon (20), Tortue Filet (50), Requin Recyclé (100). Règles dans regles.js.
 */
(function () {
  'use strict';

  var useState = React.useState;
  var useEffect = React.useEffect;
  var html = htm.bind(React.createElement);

  var formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  var NOMS_ROLES = { benevole: 'Bénévole', organisateur: 'Organisateur', admin: 'Admin' };

  function majuscule(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 && !/s$/.test(mot) ? 's' : ''); }

  function Carte(props) {
    return html`<section className=${'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marine/10 ' + (props.className || '')}>${props.children}</section>`;
  }

  function Badge(props) {
    var b = props.badge;
    return html`
      <li className="flex flex-col items-center text-center">
        <img src=${'assets/badges/' + b.id + '.png'} width="88" height="96"
          alt=${'Badge ' + b.nom + (b.obtenu ? ' (obtenu)' : ' (pas encore obtenu)')}
          className=${'h-24 w-auto transition ' + (b.obtenu ? 'drop-shadow-md' : 'opacity-40 grayscale')} />
        <span className=${'mt-1 text-sm font-bold leading-tight ' + (b.obtenu ? 'text-marine' : 'text-slate-400')}>${b.nom}</span>
        <span className="text-xs text-slate-500">${b.obtenu ? 'Obtenu' : 'Dès ' + pluriel(b.seuil, 'ramassage')}</span>
      </li>`;
  }

  function ListeSorties(props) {
    if (!props.sorties.length) return html`<p className="mt-2 text-sm text-slate-500">${props.siVide}</p>`;
    return html`
      <ul className="mt-2 divide-y divide-slate-100">
        ${props.sorties.map(function (s) {
          return html`<li key=${s.id}>
            <button type="button" className="flex w-full items-start justify-between gap-3 py-2.5 text-left hover:bg-sable/60"
              onClick=${function () { props.onOuvrir(s.id); }}>
              <span>
                <span className="block text-sm font-semibold text-marine">${s.titre}</span>
                <span className="block text-xs text-slate-500">${majuscule(formatJour.format(new Date(s.date_debut)))} · ${s.commune}</span>
              </span>
              <span aria-hidden="true" className="text-lagon-fonce">›</span>
            </button>
          </li>`;
        })}
      </ul>`;
  }

  function OngletProfil(props) {
    var _d = useState(null), donnees = _d[0], setDonnees = _d[1];
    var _e = useState(''), erreur = _e[0], setErreur = _e[1];
    var db = window.FantaDB;

    function charger() {
      setErreur('');
      db.monProfil().then(setDonnees).catch(function (err) { setErreur(err.message); });
    }

    useEffect(function () { if (props.utilisateur) charger(); }, [props.utilisateur ? props.utilisateur.id : null]);

    if (!props.utilisateur) {
      return html`
        <section>
          <h1 className="text-xl font-bold text-marine">Mon profil</h1>
          <${Carte} className="mt-3 text-center">
            <p className="font-semibold text-marine">Connecte-toi pour voir ton profil</p>
            <p className="mt-1 text-sm text-slate-600">Ton historique de ramassages, ton score de fidélité et tes badges, de la Sardine Plastic au Requin Recyclé.</p>
            <button type="button" className="mt-4 w-full rounded-xl bg-marine px-4 py-3 font-semibold text-white transition hover:bg-marine/90" onClick=${props.onSeConnecter}>Me connecter</button>
            <button type="button" className="mt-2 text-sm font-semibold text-lagon-fonce underline" onClick=${props.onCreerCompte}>Créer un compte</button>
          </${Carte}>
        </section>`;
    }

    if (erreur) return html`<section><h1 className="text-xl font-bold text-marine">Mon profil</h1><p role="alert" className="mt-3 rounded-xl bg-corail/10 px-3 py-2 text-sm text-corail-fonce">${erreur}</p></section>`;
    if (!donnees) return html`<section><h1 className="text-xl font-bold text-marine">Mon profil</h1><p className="py-8 text-center text-slate-500">Chargement du profil…</p></section>`;

    var p = donnees.profil, b = donnees.bilan;
    var depuis = p.created_at ? 'Membre depuis ' + formatMois.format(new Date(p.created_at)) : '';
    var avancement = b.prochain ? Math.round(100 * b.nbRamassages / b.prochain.seuil) : 100;

    function ajouterDemo() {
      db.ajouterRamassagesDemo(5).then(charger);
    }

    return html`
      <section className="space-y-4">
        <h1 className="text-xl font-bold text-marine">Mon profil</h1>

        <${Carte} className="flex items-center gap-4">
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-marine text-2xl font-extrabold text-lagon">${p.prenom.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-marine">${p.prenom}</p>
            <p className="text-sm text-slate-600">
              <span className="mr-2 rounded-full bg-lagon/15 px-2 py-0.5 text-xs font-semibold text-lagon-fonce">${NOMS_ROLES[p.role] || p.role}</span>${depuis}
            </p>
            <p className="truncate text-xs text-slate-500">${p.email}</p>
          </div>
        </${Carte}>

        <${Carte}>
          <h2 className="font-bold text-marine">Score de fidélité</h2>
          <p className="mt-1"><span className="text-4xl font-extrabold text-marine">${b.score}</span> <span className="font-semibold text-lagon-fonce">points</span></p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li className="flex justify-between gap-3"><span>${pluriel(b.nbRamassages, 'ramassage')} × ${window.FantaRegles.POINTS.ramassage} pts</span><span className="font-semibold">${b.detail.ramassages}</span></li>
            <li className="flex justify-between gap-3"><span>${pluriel(b.nbSignalements, 'signalement')} de déchets × ${window.FantaRegles.POINTS.signalement} pts</span><span className="font-semibold">${b.detail.signalements}</span></li>
            <li className="flex justify-between gap-3"><span>Régularité : ${pluriel(b.nbMoisActifs, 'mois')} avec un ramassage × ${window.FantaRegles.POINTS.moisActif} pts</span><span className="font-semibold">${b.detail.regularite}</span></li>
          </ul>
        </${Carte}>

        <${Carte}>
          <h2 className="font-bold text-marine">Mes badges</h2>
          <p className="mt-1 text-sm text-slate-600">
            ${b.prochain
              ? 'Encore ' + pluriel(b.restants, 'ramassage') + ' pour débloquer ' + b.prochain.nom + ' !'
              : 'Bravo, tu as tous les badges : tu es un Requin Recyclé !'}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progression vers le prochain badge"
            aria-valuemin="0" aria-valuemax="100" aria-valuenow=${avancement}>
            <div className="h-full rounded-full bg-lagon" style=${{ width: avancement + '%' }}></div>
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5" aria-label="Badges">
            ${b.badges.map(function (badge) { return html`<${Badge} key=${badge.id} badge=${badge} />`; })}
          </ul>
        </${Carte}>

        <${Carte}>
          <h2 className="font-bold text-marine">Mes ramassages (${b.nbRamassages})</h2>
          <${ListeSorties} sorties=${donnees.ramassages} onOuvrir=${props.onOuvrirSortie}
            siVide="Pas encore de ramassage : inscris-toi à une sortie pour décrocher la Sardine Plastic !" />
          ${donnees.ramassages.length ? null : html`<button type="button" className="mt-2 text-sm font-semibold text-lagon-fonce underline" onClick=${props.onVoirSorties}>Voir les prochaines sorties</button>`}
        </${Carte}>

        <${Carte}>
          <h2 className="font-bold text-marine">Mes prochaines sorties (${donnees.aVenir.length})</h2>
          <${ListeSorties} sorties=${donnees.aVenir} onOuvrir=${props.onOuvrirSortie} siVide="Tu n'es inscrit·e à aucune sortie à venir." />
        </${Carte}>

        ${db.ajouterRamassagesDemo
          ? html`<p className="text-center"><button type="button" className="text-xs text-slate-500 underline" onClick=${ajouterDemo}>Démo · ajouter 5 ramassages passés</button></p>`
          : null}
      </section>`;
  }

  window.FantaProfil = { OngletProfil: OngletProfil };
})();
