/*
 * fantaPLASTIC – écrans du MVP (sprint 1)
 * React sans étape de build : on écrit les composants avec htm (équivalent du JSX).
 */
(function () {
  'use strict';

  var useState = React.useState;
  var useEffect = React.useEffect;
  var html = htm.bind(React.createElement);
  var db = window.FantaDB;

  var formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  function majuscule(texte) {
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  function heure(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  }

  // ---------- petits éléments ----------

  function IconePin() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  }

  function IconeHorloge() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  }

  function BadgePlaces(props) {
    var r = props.restantes;
    if (r <= 0) {
      return html`<span className="whitespace-nowrap rounded-full bg-corail/15 px-3 py-1 text-xs font-semibold text-corail-fonce">Complet</span>`;
    }
    if (r <= 3) {
      return html`<span className="whitespace-nowrap rounded-full bg-soleil/30 px-3 py-1 text-xs font-semibold text-marine">Plus que ${r} place${r > 1 ? 's' : ''}</span>`;
    }
    return html`<span className="whitespace-nowrap rounded-full bg-lagon/15 px-3 py-1 text-xs font-semibold text-lagon-fonce">${r} places restantes</span>`;
  }

  // ---------- US3 : liste des prochaines sorties ----------

  function CarteSortie(props) {
    var s = props.sortie;
    var debut = new Date(s.date_debut);
    var fin = new Date(debut.getTime() + s.duree_min * 60000);
    return html`
      <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-marine/10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-lagon-fonce">${majuscule(formatJour.format(debut))}</p>
          <${BadgePlaces} restantes=${s.places_restantes} />
        </div>
        <h3 className="mt-1 text-lg font-bold leading-snug text-marine">${s.titre}</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><${IconeHorloge} /> ${heure(debut)} – ${heure(fin)}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><${IconePin} /> ${s.lieu}, ${s.commune}</p>
      </li>`;
  }

  function ListeSorties(props) {
    var sorties = props.sorties;
    if (sorties === null) {
      return html`<p className="py-8 text-center text-slate-500">Chargement des sorties…</p>`;
    }
    if (sorties.length === 0) {
      return html`<p className="rounded-2xl bg-white p-6 text-center text-slate-600 ring-1 ring-marine/10">Aucune sortie prévue pour l'instant. Reviens bientôt !</p>`;
    }
    return html`<ul className="space-y-3">${sorties.map(function (s) { return html`<${CarteSortie} key=${s.id} sortie=${s} />`; })}</ul>`;
  }

  // ---------- US15 : créer un compte / se connecter ----------

  function Champ(props) {
    return html`
      <label className="block">
        <span className="text-sm font-medium text-marine">${props.label}</span>
        <input
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-lagon focus:ring-2 focus:ring-lagon/30"
          type=${props.type || 'text'}
          value=${props.value}
          onChange=${function (e) { props.onChange(e.target.value); }}
          autoComplete=${props.autoComplete}
          required=${true}
          minLength=${props.minLength}
        />
        ${props.aide ? html`<span className="mt-1 block text-xs text-slate-500">${props.aide}</span>` : null}
      </label>`;
  }

  var ROLES = [
    { valeur: 'benevole', titre: 'Bénévole', detail: 'Je participe aux ramassages' },
    { valeur: 'organisateur', titre: 'Organisateur', detail: "J'organise des sorties pour l'asso" }
  ];

  function nomRole(role) {
    var r = ROLES.find(function (x) { return x.valeur === role; });
    return r ? r.titre : role;
  }

  function ChoixRole(props) {
    return html`
      <fieldset>
        <legend className="text-sm font-medium text-marine">Je suis</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          ${ROLES.map(function (o) {
            var actif = props.value === o.valeur;
            return html`
              <label key=${o.valeur} className=${'cursor-pointer rounded-xl border-2 p-3 transition focus-within:ring-2 focus-within:ring-lagon/40 ' + (actif ? 'border-lagon bg-lagon/10' : 'border-slate-200 bg-white hover:border-slate-300')}>
                <input type="radio" name="role" value=${o.valeur} checked=${actif} onChange=${function () { props.onChange(o.valeur); }} className="sr-only" />
                <span className="block font-semibold text-marine">${o.titre}</span>
                <span className="mt-0.5 block text-xs text-slate-600">${o.detail}</span>
              </label>`;
          })}
        </div>
      </fieldset>`;
  }

  function FormulaireCompte(props) {
    var inscription = props.mode === 'inscription';
    var _r = useState('benevole'), role = _r[0], setRole = _r[1];
    var _p = useState(''), prenom = _p[0], setPrenom = _p[1];
    var _e = useState(''), email = _e[0], setEmail = _e[1];
    var _m = useState(''), motDePasse = _m[0], setMotDePasse = _m[1];
    var _err = useState(''), erreur = _err[0], setErreur = _err[1];
    var _env = useState(false), envoi = _env[0], setEnvoi = _env[1];

    async function valider(e) {
      e.preventDefault();
      setErreur('');
      setEnvoi(true);
      try {
        var profil = inscription
          ? await db.inscrire({ role: role, prenom: prenom, email: email, motDePasse: motDePasse })
          : await db.connecter({ email: email, motDePasse: motDePasse });
        props.onConnecte(profil, inscription);
      } catch (err) {
        setErreur(err.message);
        setEnvoi(false);
      }
    }

    return html`
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-marine/10">
        <h2 className="text-xl font-bold text-marine">${inscription ? 'Créer mon compte' : 'Me connecter'}</h2>
        <p className="mt-1 text-sm text-slate-600">
          ${inscription ? "Ça prend moins d'une minute, promis." : 'Content de te revoir !'}
        </p>
        <form className="mt-5 space-y-4" onSubmit=${valider} noValidate=${true}>
          ${inscription ? html`<${ChoixRole} value=${role} onChange=${setRole} />` : null}
          ${inscription ? html`<${Champ} label="Prénom" value=${prenom} onChange=${setPrenom} autoComplete="given-name" />` : null}
          <${Champ} label="Email" type="email" value=${email} onChange=${setEmail} autoComplete="email" />
          <${Champ}
            label="Mot de passe" type="password" value=${motDePasse} onChange=${setMotDePasse}
            autoComplete=${inscription ? 'new-password' : 'current-password'}
            aide=${inscription ? '8 caractères minimum' : null}
          />
          ${erreur ? html`<p role="alert" className="rounded-xl bg-corail/10 px-3 py-2 text-sm text-corail-fonce">${erreur}</p>` : null}
          <button type="submit" disabled=${envoi}
            className="w-full rounded-xl bg-marine px-4 py-3 font-semibold text-white transition hover:bg-marine/90 disabled:opacity-60">
            ${envoi ? 'Un instant…' : inscription ? 'Créer mon compte' : 'Me connecter'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          ${inscription ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <button type="button" className="font-semibold text-lagon-fonce underline" onClick=${props.onBasculer}>
            ${inscription ? 'Me connecter' : 'Créer un compte'}
          </button>
        </p>
        <p className="mt-2 text-center">
          <button type="button" className="text-sm text-slate-500 underline" onClick=${props.onAnnuler}>Retour aux sorties</button>
        </p>
      </section>`;
  }

  // ---------- onglets ----------

  function Icone(props) {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">${props.children}</svg>`;
  }
  function IconeSorties() {
    return html`<${Icone}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/></${Icone}>`;
  }
  function IconeCarte() {
    return html`<${Icone}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></${Icone}>`;
  }
  function IconeSignaler() {
    return html`<${Icone}><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></${Icone}>`;
  }
  function IconeProfil() {
    return html`<${Icone}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></${Icone}>`;
  }

  var ONGLETS = [
    { id: 'sorties', label: 'Sorties', titre: 'Prochaines sorties', icone: IconeSorties },
    { id: 'carte', label: 'Carte', titre: 'Carte', icone: IconeCarte },
    { id: 'signaler', label: 'Signaler', titre: 'Signaler un endroit pollué', icone: IconeSignaler },
    { id: 'profil', label: 'Profil', titre: 'Mon profil', icone: IconeProfil }
  ];

  function BarreOnglets(props) {
    return html`
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-10 border-t border-marine/10 bg-white/95 backdrop-blur">
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          ${ONGLETS.map(function (o) {
            var actif = props.actif === o.id;
            return html`
              <li key=${o.id}>
                <button type="button" aria-current=${actif ? 'page' : undefined} onClick=${function () { props.onChoisir(o.id); }}
                  className=${'flex w-full flex-col items-center gap-0.5 pb-3 pt-2 text-xs font-medium transition ' + (actif ? 'text-lagon-fonce' : 'text-slate-500 hover:text-marine')}>
                  <${o.icone} />${o.label}
                </button>
              </li>`;
          })}
        </ul>
      </nav>`;
  }

  // Onglets préparés pour les prochains sprints : volontairement vides pour l'instant
  function OngletVide(props) {
    return html`
      <section>
        <h1 className="text-xl font-bold text-marine">${props.titre}</h1>
        <p className="mt-2 text-sm text-slate-500">Bientôt disponible.</p>
      </section>`;
  }

  // ---------- application ----------

  function EnTete(props) {
    var u = props.utilisateur;
    return html`
      <header className="sticky top-0 z-10 bg-marine text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" className="flex items-center gap-3" onClick=${props.onAccueil}>
            <img src="assets/logo.png" alt="" className="h-10 w-10 rounded-full" />
            <span className="text-lg font-extrabold tracking-wide">fanta<span className="text-lagon">PLASTIC</span></span>
          </button>
          ${u
            ? html`<div className="flex items-center gap-3 text-sm">
                <span className="hidden sm:inline">Bonjour <strong>${u.prenom}</strong></span>
                <button type="button" className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10" onClick=${props.onDeconnexion}>Déconnexion</button>
              </div>`
            : html`<button type="button" className="rounded-lg bg-lagon px-3 py-1.5 text-sm font-semibold text-marine hover:bg-lagon/90" onClick=${props.onConnexion}>Se connecter</button>`}
        </div>
      </header>`;
  }

  function App() {
    var _u = useState(null), utilisateur = _u[0], setUtilisateur = _u[1];
    var _v = useState('accueil'), vue = _v[0], setVue = _v[1];
    var _o = useState('sorties'), onglet = _o[0], setOnglet = _o[1];
    var _s = useState(null), sorties = _s[0], setSorties = _s[1];
    var _m = useState(''), message = _m[0], setMessage = _m[1];

    function chargerSorties() {
      db.listerSortiesAVenir().then(setSorties);
    }

    useEffect(function () {
      db.utilisateurCourant().then(setUtilisateur);
      chargerSorties();
    }, []);

    useEffect(function () {
      if (!message) return undefined;
      var t = setTimeout(function () { setMessage(''); }, 4000);
      return function () { clearTimeout(t); };
    }, [message]);

    function connecte(profil, nouveau) {
      setUtilisateur(profil);
      setVue('accueil');
      setMessage(nouveau
        ? 'Bienvenue ' + profil.prenom + ', ton compte ' + nomRole(profil.role).toLowerCase() + ' est créé !'
        : 'Bonjour ' + profil.prenom + ' !');
    }

    function deconnexion() {
      db.deconnecter().then(function () {
        setUtilisateur(null);
        setVue('accueil');
        setMessage('Tu es déconnecté·e. À bientôt sur la grève !');
      });
    }

    function choisirOnglet(id) {
      setOnglet(id);
      setVue('accueil');
      window.scrollTo(0, 0);
    }

    function reinitialiser() {
      db.reinitialiser().then(function () {
        setUtilisateur(null);
        setVue('accueil');
        chargerSorties();
        setMessage('Données de démo remises à zéro.');
      });
    }

    var contenu;
    if (vue === 'connexion' || vue === 'inscription') {
      contenu = html`<${FormulaireCompte}
        key=${vue}
        mode=${vue}
        onConnecte=${connecte}
        onBasculer=${function () { setVue(vue === 'connexion' ? 'inscription' : 'connexion'); }}
        onAnnuler=${function () { setVue('accueil'); }}
      />`;
    } else if (onglet === 'sorties') {
      contenu = html`
        <div>
          ${utilisateur
            ? html`<section className="rounded-2xl bg-lagon/15 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-marine">Bonjour ${utilisateur.prenom} 👋</p>
                  <span className="rounded-full bg-marine px-2.5 py-0.5 text-xs font-semibold text-white">${nomRole(utilisateur.role)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">Voici les prochaines sorties de ramassage dans la rade.</p>
              </section>`
            : html`<section className="rounded-2xl bg-marine p-6 text-white">
                <p className="text-sm font-semibold uppercase tracking-wider text-lagon">Zéro déchets en rade de Brest</p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight">Un océan sans plastique, c'est fantaplastic !</h1>
                <p className="mt-2 text-white/80">Trouve une sortie de ramassage près de chez toi, de Plouzané à Plougastel-Daoulas.</p>
                <button type="button" className="mt-4 rounded-xl bg-soleil px-4 py-2.5 font-semibold text-marine hover:bg-soleil/90" onClick=${function () { setVue('inscription'); }}>
                  Je crée mon compte
                </button>
              </section>`}
          <h2 className="mb-3 mt-6 text-lg font-bold text-marine">Prochaines sorties</h2>
          <${ListeSorties} sorties=${sorties} />
        </div>`;
    } else {
      var infos = ONGLETS.find(function (o) { return o.id === onglet; });
      contenu = html`<${OngletVide} titre=${infos.titre} />`;
    }

    return html`
      <div className="min-h-screen bg-sable">
        <${EnTete}
          utilisateur=${utilisateur}
          onAccueil=${function () { choisirOnglet('sorties'); }}
          onConnexion=${function () { setVue('connexion'); }}
          onDeconnexion=${deconnexion}
        />
        ${message ? html`<div role="status" className="mx-auto mt-3 max-w-3xl px-4"><p className="rounded-xl bg-marine px-4 py-2 text-sm text-white shadow">${message}</p></div>` : null}
        <main className="mx-auto max-w-3xl px-4 py-5">${contenu}</main>
        ${onglet === 'sorties' || vue !== 'accueil'
          ? html`<footer className="mx-auto max-w-3xl px-4 pt-2 text-center text-xs text-slate-500">
              <p>MVP · données de démonstration enregistrées dans ce navigateur</p>
              <button type="button" className="mt-1 underline" onClick=${reinitialiser}>Réinitialiser les données de démo</button>
            </footer>`
          : null}
        <div className="h-24" aria-hidden="true"></div>
        <${BarreOnglets} actif=${onglet} onChoisir=${choisirOnglet} />
      </div>`;
  }

  ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`);
})();
