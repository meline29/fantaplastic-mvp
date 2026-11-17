/*
 * fantaPLASTIC – signaler un endroit pollué (US1)
 *
 * On prend une photo des déchets, puis on l'envoie : la position GPS est demandée
 * UNE seule fois, au moment de l'envoi (jamais avant, jamais suivie ensuite).
 * Le signalement apparaît ensuite sur la carte (US16).
 * Réservé aux comptes connectés.
 */
(function () {
  'use strict';

  var useState = React.useState;
  var useEffect = React.useEffect;
  var html = htm.bind(React.createElement);

  // ---------- photo : on la réduit avant l'envoi ----------
  // Une photo de téléphone pèse souvent 3 à 8 Mo : on la redimensionne et on la réenregistre en JPEG.
  // Ce réenregistrement retire aussi les métadonnées cachées du fichier (modèle du téléphone,
  // parfois une position GPS) : seule la position prise à l'envoi est utilisée.

  function chargerImage(fichier) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Ce format de photo n'est pas pris en charge.")); };
      img.src = url;
    });
  }

  async function compresserPhoto(fichier, coteMax, qualite) {
    if (!fichier || !/^image\//.test(fichier.type || '')) throw new Error('Choisis une photo.');
    var image;
    try {
      image = await createImageBitmap(fichier); // tient compte de l'orientation de la photo
    } catch (e) {
      image = await chargerImage(fichier);
    }
    var ratio = Math.min(1, coteMax / Math.max(image.width, image.height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    var blob = await new Promise(function (ok) { canvas.toBlob(ok, 'image/jpeg', qualite); });
    if (!blob) throw new Error("La photo n'a pas pu être préparée.");
    return blob;
  }

  // ---------- position GPS : demandée seulement au moment de l'envoi ----------

  function obtenirPosition() {
    return new Promise(function (ok, ko) {
      if (!navigator.geolocation) {
        ko(new Error("Ton appareil ne permet pas de trouver ta position."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (p) { ok({ lat: p.coords.latitude, lng: p.coords.longitude, precision_m: p.coords.accuracy }); },
        function (e) {
          if (e.code === 1) ko(new Error("Autorise l'accès à ta position pour envoyer le signalement : elle sert uniquement à placer la photo sur la carte."));
          else if (e.code === 3) ko(new Error('Ta position met trop de temps à arriver. Réessaie, de préférence dehors.'));
          else ko(new Error("Ta position n'a pas pu être trouvée. Vérifie que la localisation est activée."));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 } // maximumAge 0 : une position fraîche, prise maintenant
      );
    });
  }

  // ---------- écran ----------

  function IconeAppareil() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10 text-lagon-fonce" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
  }

  function IconeGps() {
    return html`<svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-lagon-fonce" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  }

  function ChoixPhoto(props) {
    var champ = html`<input type="file" name="photo" accept="image/*" capture="environment" className="sr-only" onChange=${props.onChoisir} />`;
    if (props.apercu) {
      return html`
        <div>
          <img src=${props.apercu} alt="Photo des déchets à envoyer" className="max-h-80 w-full rounded-xl object-cover" />
          <label className="mt-2 inline-block cursor-pointer text-sm font-semibold text-lagon-fonce underline focus-within:ring-2 focus-within:ring-lagon">
            Reprendre la photo${champ}
          </label>
        </div>`;
    }
    return html`
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-lagon/60 bg-lagon/5 px-4 py-10 text-center transition hover:bg-lagon/10 focus-within:ring-2 focus-within:ring-lagon">
        <${IconeAppareil} />
        <span className="font-semibold text-marine">${props.enCours ? 'Préparation de la photo…' : 'Prendre une photo des déchets'}</span>
        ${champ}
      </label>`;
  }

  function OngletSignaler(props) {
    var _ph = useState(null), photo = _ph[0], setPhoto = _ph[1];
    var _ap = useState(''), apercu = _ap[0], setApercu = _ap[1];
    var _co = useState(''), commentaire = _co[0], setCommentaire = _co[1];
    var _et = useState(''), etape = _et[0], setEtape = _et[1]; // '', photo, position, envoi
    var _er = useState(''), erreur = _er[0], setErreur = _er[1];

    useEffect(function () {
      return function () { if (apercu) URL.revokeObjectURL(apercu); };
    }, [apercu]);

    if (!props.utilisateur) {
      return html`
        <section>
          <h1 className="text-xl font-bold text-marine">Signaler un endroit pollué</h1>
          <div className="mt-3 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-marine/10">
            <div className="flex justify-center"><${IconeAppareil} /></div>
            <p className="mt-2 font-semibold text-marine">Connecte-toi pour signaler des déchets</p>
            <p className="mt-1 text-sm text-slate-600">Tu pourras prendre une photo : elle sera placée sur la carte, à l'endroit où tu te trouves.</p>
            <button type="button" className="mt-4 w-full rounded-xl bg-marine px-4 py-3 font-semibold text-white transition hover:bg-marine/90" onClick=${props.onSeConnecter}>Me connecter</button>
            <button type="button" className="mt-2 text-sm font-semibold text-lagon-fonce underline" onClick=${props.onCreerCompte}>Créer un compte</button>
          </div>
        </section>`;
    }

    var mode = window.FantaDB.mode;

    function choisirPhoto(e) {
      var fichier = e.target.files && e.target.files[0];
      if (!fichier) return;
      setErreur('');
      setEtape('photo');
      // Démo locale : photo plus petite, car le navigateur a peu de place
      var cote = mode === 'supabase' ? 1600 : 800;
      compresserPhoto(fichier, cote, mode === 'supabase' ? 0.8 : 0.7).then(function (blob) {
        setPhoto(blob);
        setApercu(URL.createObjectURL(blob));
        setEtape('');
      }).catch(function (err) {
        setErreur(err.message);
        setEtape('');
      });
    }

    async function envoyer(e) {
      e.preventDefault();
      setErreur('');
      if (!photo) { setErreur('Prends une photo des déchets.'); return; }
      try {
        setEtape('position');
        var position = await window.FantaSignaler.obtenirPosition(); // la position n'est demandée qu'ici
        setEtape('envoi');
        var signalement = await window.FantaDB.creerSignalement({
          photo: photo, lat: position.lat, lng: position.lng, precision_m: position.precision_m, commentaire: commentaire
        });
        props.onEnvoye(signalement);
      } catch (err) {
        setErreur(err.message);
        setEtape('');
      }
    }

    var occupe = etape !== '';
    var libelle = etape === 'position' ? 'Localisation en cours…'
      : etape === 'envoi' ? 'Envoi de la photo…'
      : 'Envoyer le signalement';

    return html`
      <section>
        <h1 className="text-xl font-bold text-marine">Signaler un endroit pollué</h1>
        <p className="mt-1 text-sm text-slate-600">Tu as vu des déchets ? Prends-les en photo : le signalement apparaîtra sur la carte pour aider l'asso à organiser les prochaines sorties.</p>
        <form className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marine/10" onSubmit=${envoyer} noValidate=${true}>
          <${ChoixPhoto} apercu=${apercu} enCours=${etape === 'photo'} onChoisir=${choisirPhoto} />
          <label className="block">
            <span className="text-sm font-medium text-marine">Commentaire (facultatif)</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-lagon focus:ring-2 focus:ring-lagon/30"
              rows="3" maxLength=${280} value=${commentaire}
              placeholder="Ex. : beaucoup de plastique au pied de la cale"
              onChange=${function (ev) { setCommentaire(ev.target.value); }}></textarea>
          </label>
          <p className="flex gap-2 rounded-xl bg-sable p-3 text-xs text-slate-600">
            <${IconeGps} />
            <span>Ta position sera demandée une seule fois, au moment de l'envoi, pour placer la photo sur la carte. Elle n'est pas suivie ensuite.</span>
          </p>
          ${erreur ? html`<p role="alert" className="rounded-xl bg-corail/10 px-3 py-2 text-sm text-corail-fonce">${erreur}</p>` : null}
          <button type="submit" disabled=${occupe}
            className="w-full rounded-xl bg-marine px-4 py-3 font-semibold text-white transition hover:bg-marine/90 disabled:opacity-60">
            ${libelle}
          </button>
        </form>
      </section>`;
  }

  window.FantaSignaler = { OngletSignaler: OngletSignaler, compresserPhoto: compresserPhoto, obtenirPosition: obtenirPosition };
})();
