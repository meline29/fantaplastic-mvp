/*
 * fantaPLASTIC – écrans du MVP (sprints 1 et 2)
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

  // 90 -> "1 h 30", 120 -> "2 h", 45 -> "45 min"
  function duree(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    if (!h) return m + ' min';
    return h + ' h' + (m ? ' ' + (m < 10 ? '0' + m : m) : '');
  }

  // ---------- petits éléments ----------

  function IconePin() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  }

  function IconeHorloge() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  }

  // Date du jour au format des champs <input type="date"> : "2026-11-17"
  function dateLocale(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function IconePlus() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  }

  function IconeChevron() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>`;
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

  // Toute la carte est cliquable et ouvre le détail de la sortie (US4)
  function CarteSortie(props) {
    var s = props.sortie;
    var debut = new Date(s.date_debut);
    var fin = new Date(debut.getTime() + s.duree_min * 60000);
    return html`
      <li>
        <button type="button" onClick=${function () { props.onOuvrir(s.id); }}
          className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-marine/10 transition hover:ring-2 hover:ring-lagon focus:outline-none focus-visible:ring-2 focus-visible:ring-lagon">
          <span className="flex items-start justify-between gap-3">
            <span className="text-sm font-semibold text-lagon-fonce">${majuscule(formatJour.format(debut))}</span>
            <${BadgePlaces} restantes=${s.places_restantes} />
          </span>
          <span className="mt-1 block text-lg font-bold leading-snug text-marine">${s.titre}</span>
          <span className="mt-2 flex items-center gap-2 text-sm text-slate-600"><${IconeHorloge} /> ${heure(debut)} – ${heure(fin)}</span>
          <span className="mt-1 flex items-center gap-2 text-sm text-slate-600"><${IconePin} /> ${s.lieu}, ${s.commune}</span>
          <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-lagon-fonce">Voir le matériel <${IconeChevron} /></span>
        </button>
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
    return html`<ul className="space-y-3">${sorties.map(function (s) { return html`<${CarteSortie} key=${s.id} sortie=${s} onOuvrir=${props.onOuvrir} />`; })}</ul>`;
  }

  // ---------- US4 : détail d'une sortie avec le matériel ----------

  function ListeMateriel(props) {
    if (!props.objets.length) {
      return html`<p className="mt-3 text-sm text-slate-500">${props.siVide}</p>`;
    }
    return html`
      <ul className="mt-3 space-y-2">
        ${props.objets.map(function (objet, i) {
          return html`<li key=${i} className="flex items-start gap-2.5 text-slate-800">
            <span aria-hidden="true" className=${'mt-2 h-2 w-2 shrink-0 rounded-full ' + props.puce}></span>${objet}
          </li>`;
        })}
      </ul>`;
  }

  function DetailSortie(props) {
    var _s = useState(undefined), s = _s[0], setS = _s[1];

    useEffect(function () {
      db.obtenirSortie(props.id).then(setS);
    }, [props.id]);

    var retour = html`
      <button type="button" className="flex items-center gap-1 text-sm font-semibold text-lagon-fonce hover:underline" onClick=${props.onRetour}>
        <span aria-hidden="true">‹</span> Toutes les sorties
      </button>`;

    if (s === undefined) {
      return html`<div>${retour}<p className="py-8 text-center text-slate-500">Chargement…</p></div>`;
    }
    if (s === null) {
      return html`<div>${retour}<p className="mt-4 rounded-2xl bg-white p-6 text-center text-slate-600 ring-1 ring-marine/10">Cette sortie n'existe plus.</p></div>`;
    }

    var debut = new Date(s.date_debut);
    var fin = new Date(debut.getTime() + s.duree_min * 60000);
    return html`
      <article>
        ${retour}
        <section className="mt-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marine/10">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-lagon-fonce">${majuscule(formatJour.format(debut))}</p>
            <${BadgePlaces} restantes=${s.places_restantes} />
          </div>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-marine">${s.titre}</h1>
          <p className="mt-3 flex items-center gap-2 text-slate-700"><${IconeHorloge} /> ${heure(debut)} – ${heure(fin)} (${duree(s.duree_min)})</p>
          <p className="mt-1 flex items-center gap-2 text-slate-700"><${IconePin} /> ${s.lieu}, ${s.commune}</p>
          <p className="mt-3 text-sm text-slate-500">
            ${s.nb_inscrits} inscrit${s.nb_inscrits > 1 ? 's' : ''} sur ${s.places} places${s.organisateur_prenom ? ' · organisée par ' + s.organisateur_prenom : ''}
          </p>
        </section>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marine/10">
            <h2 className="text-lg font-bold text-marine">Ce que tu apportes</h2>
            <p className="text-sm text-slate-500">À prévoir par chaque bénévole</p>
            <${ListeMateriel} objets=${s.materiel_a_apporter} puce="bg-soleil" siVide="Rien de spécial à prévoir." />
          </section>
          <section className="rounded-2xl bg-lagon/15 p-5">
            <h2 className="text-lg font-bold text-marine">Ce que l'asso apporte</h2>
            <p className="text-sm text-slate-600">Prêté ou fourni sur place</p>
            <${ListeMateriel} objets=${s.materiel_fourni} puce="bg-lagon-fonce" siVide="L'asso n'apporte rien de particulier pour cette sortie." />
          </section>
        </div>
      </article>`;
  }

  // ---------- US15 : créer un compte / se connecter ----------

  var CLASSE_CHAMP = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-lagon focus:ring-2 focus:ring-lagon/30';

  function Champ(props) {
    return html`
      <label className="block">
        <span className="text-sm font-medium text-marine">${props.label}</span>
        <input
          className=${CLASSE_CHAMP}
          type=${props.type || 'text'}
          value=${props.value}
          onChange=${function (e) { props.onChange(e.target.value); }}
          autoComplete=${props.autoComplete}
          required=${props.requis !== false}
          minLength=${props.minLength}
          maxLength=${props.maxLength}
          min=${props.min}
          max=${props.max}
          placeholder=${props.placeholder}
          inputMode=${props.inputMode}
          list=${props.list}
        />
        ${props.aide ? html`<span className="mt-1 block text-xs text-slate-500">${props.aide}</span>` : null}
      </label>`;
  }

  function ChampListe(props) {
    return html`
      <label className="block">
        <span className="text-sm font-medium text-marine">${props.label}</span>
        <select className=${CLASSE_CHAMP} value=${props.value} onChange=${function (e) { props.onChange(e.target.value); }}>
          ${props.options.map(function (o) { return html`<option key=${o.valeur} value=${o.valeur}>${o.titre}</option>`; })}
        </select>
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

  // Démo : passer de bénévole à organisateur sans recréer de compte (pratique pour les revues croisées)
  function BasculeRole(props) {
    return html`
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-marine/70">Démo · rôle</span>
        <div role="group" aria-label="Changer de rôle (démo)" className="inline-flex rounded-full bg-white p-1 ring-1 ring-marine/10">
          ${ROLES.map(function (o) {
            var actif = props.role === o.valeur;
            return html`
              <button key=${o.valeur} type="button" aria-pressed=${actif} onClick=${function () { if (!actif) props.onChanger(o.valeur); }}
                className=${'rounded-full px-3 py-1 text-sm font-semibold transition ' + (actif ? 'bg-marine text-white' : 'text-marine hover:bg-marine/5')}>
                ${o.titre}
              </button>`;
          })}
        </div>
      </div>`;
  }

  // ---------- US2 : un organisateur crée une sortie ----------

  var DUREES = [
    { valeur: '60', titre: '1 h' }, { valeur: '90', titre: '1 h 30' }, { valeur: '120', titre: '2 h' },
    { valeur: '150', titre: '2 h 30' }, { valeur: '180', titre: '3 h' }, { valeur: '240', titre: '4 h' }
  ];

  // Communes autour de la rade, proposées pendant la saisie (on peut quand même en taper une autre)
  var COMMUNES = ['Brest', 'Plouzané', 'Guipavas', 'Le Relecq-Kerhuon', 'Plougastel-Daoulas', 'Logonna-Daoulas',
    'Daoulas', "L'Hôpital-Camfrout", 'Landévennec', 'Crozon', 'Roscanvel', 'Lanvéoc', 'Landerneau'];

  function FormulaireSortie(props) {
    var _t = useState(''), titre = _t[0], setTitre = _t[1];
    var _l = useState(''), lieu = _l[0], setLieu = _l[1];
    var _c = useState(''), commune = _c[0], setCommune = _c[1];
    var _j = useState(''), jour = _j[0], setJour = _j[1];
    var _h = useState('10:00'), heureDebut = _h[0], setHeureDebut = _h[1];
    var _d = useState('120'), dureeMin = _d[0], setDureeMin = _d[1];
    var _p = useState('20'), places = _p[0], setPlaces = _p[1];
    var _a = useState(''), apporter = _a[0], setApporter = _a[1];
    var _f = useState(''), fourni = _f[0], setFourni = _f[1];
    var _err = useState(''), erreur = _err[0], setErreur = _err[1];
    var _env = useState(false), envoi = _env[0], setEnvoi = _env[1];

    async function valider(e) {
      e.preventDefault();
      setErreur('');
      setEnvoi(true);
      try {
        var debut = jour && heureDebut ? new Date(jour + 'T' + heureDebut) : null;
        var sortie = await db.creerSortie({
          titre: titre, lieu: lieu, commune: commune,
          date_debut: debut && !isNaN(debut.getTime()) ? debut.toISOString() : null,
          duree_min: Number(dureeMin), places: Number(places),
          materiel_a_apporter: apporter, materiel_fourni: fourni
        });
        props.onCreee(sortie);
      } catch (err) {
        setErreur(err.message);
        setEnvoi(false);
      }
    }

    return html`
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-marine/10">
        <h2 className="text-xl font-bold text-marine">Nouvelle sortie</h2>
        <p className="mt-1 text-sm text-slate-600">Elle apparaîtra tout de suite dans la liste des bénévoles.</p>
        <form className="mt-5 space-y-4" onSubmit=${valider} noValidate=${true}>
          <${Champ} label="Titre de la sortie" value=${titre} onChange=${setTitre} maxLength=${80} placeholder="Ex. : Ramassage au Moulin Blanc" />
          <${Champ} label="Lieu de rendez-vous" value=${lieu} onChange=${setLieu} placeholder="Ex. : Parking du Moulin Blanc" />
          <${Champ} label="Commune" value=${commune} onChange=${setCommune} list="communes-rade" placeholder="Ex. : Brest" />
          <datalist id="communes-rade">${COMMUNES.map(function (c) { return html`<option key=${c} value=${c} />`; })}</datalist>
          <div className="grid grid-cols-2 gap-3">
            <${Champ} label="Date" type="date" value=${jour} onChange=${setJour} min=${dateLocale(new Date())} />
            <${Champ} label="Heure" type="time" value=${heureDebut} onChange=${setHeureDebut} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <${ChampListe} label="Durée" value=${dureeMin} onChange=${setDureeMin} options=${DUREES} />
            <${Champ} label="Places" type="number" value=${places} onChange=${setPlaces} min=${1} max=${500} inputMode="numeric" />
          </div>
          <${Champ} label="Ce que les bénévoles apportent" value=${apporter} onChange=${setApporter} requis=${false}
            placeholder="Ex. : gants, bottes, une gourde" aide="Sépare les objets par des virgules" />
          <${Champ} label="Ce que l'asso apporte" value=${fourni} onChange=${setFourni} requis=${false}
            placeholder="Ex. : sacs poubelle, pinces" aide="Sépare les objets par des virgules" />
          ${erreur ? html`<p role="alert" className="rounded-xl bg-corail/10 px-3 py-2 text-sm text-corail-fonce">${erreur}</p>` : null}
          <button type="submit" disabled=${envoi}
            className="w-full rounded-xl bg-marine px-4 py-3 font-semibold text-white transition hover:bg-marine/90 disabled:opacity-60">
            ${envoi ? 'Un instant…' : 'Publier la sortie'}
          </button>
        </form>
        <p className="mt-4 text-center">
          <button type="button" className="text-sm text-slate-500 underline" onClick=${props.onAnnuler}>Annuler</button>
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
    var _d = useState(null), sortieOuverte = _d[0], setSortieOuverte = _d[1];
    var estOrganisateur = !!utilisateur && (utilisateur.role === 'organisateur' || utilisateur.role === 'admin');

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

    function ouvrirSortie(id) {
      setSortieOuverte(id);
      setVue('detail');
      window.scrollTo(0, 0);
    }

    function retourAuxSorties() {
      setVue('accueil');
      window.scrollTo(0, 0);
    }

    function sortieCreee(sortie) {
      chargerSorties();
      ouvrirSortie(sortie.id);
      setMessage('Ta sortie est publiée !');
    }

    function changerRole(role) {
      db.changerRoleDemo(role).then(function (profil) {
        setUtilisateur(profil);
        setMessage('Tu es maintenant en mode ' + nomRole(role).toLowerCase() + ' (démo).');
      });
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
    } else if (vue === 'creation' && estOrganisateur) {
      contenu = html`<${FormulaireSortie} onCreee=${sortieCreee} onAnnuler=${retourAuxSorties} />`;
    } else if (vue === 'detail') {
      contenu = html`<${DetailSortie} key=${sortieOuverte} id=${sortieOuverte} onRetour=${retourAuxSorties} />`;
    } else if (onglet === 'sorties') {
      contenu = html`
        <div>
          ${utilisateur
            ? html`<section className="rounded-2xl bg-lagon/15 p-5">
                <p className="text-lg font-bold text-marine">Bonjour ${utilisateur.prenom} 👋</p>
                <p className="mt-1 text-sm text-slate-700">Voici les prochaines sorties de ramassage dans la rade.</p>
                <${BasculeRole} role=${utilisateur.role} onChanger=${changerRole} />
              </section>`
            : html`<section className="rounded-2xl bg-marine p-6 text-white">
                <p className="text-sm font-semibold uppercase tracking-wider text-lagon">Zéro déchets en rade de Brest</p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight">Un océan sans plastique, c'est fantaplastic !</h1>
                <p className="mt-2 text-white/80">Trouve une sortie de ramassage près de chez toi, de Plouzané à Plougastel-Daoulas.</p>
                <button type="button" className="mt-4 rounded-xl bg-soleil px-4 py-2.5 font-semibold text-marine hover:bg-soleil/90" onClick=${function () { setVue('inscription'); }}>
                  Je crée mon compte
                </button>
              </section>`}
          <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marine">Prochaines sorties</h2>
            ${estOrganisateur
              ? html`<button type="button" onClick=${function () { setVue('creation'); window.scrollTo(0, 0); }}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-marine px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-marine/90">
                  <${IconePlus} />Créer une sortie
                </button>`
              : null}
          </div>
          <${ListeSorties} sorties=${sorties} onOuvrir=${ouvrirSortie} />
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
