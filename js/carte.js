/*
 * fantaPLASTIC – cartes interactives (US6), avec Leaflet et les fonds OpenStreetMap
 *
 *  - CarteSorties : l'onglet « Carte », avec un point par sortie à venir
 *  - ChoixPoint   : la petite carte du formulaire de création, pour placer le rendez-vous
 */
(function () {
  'use strict';

  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var html = htm.bind(React.createElement);
  var leafletOk = typeof window.L !== 'undefined';

  var CENTRE_RADE = [48.345, -4.45];
  var ZOOM_RADE = 11;
  var COULEURS = { libre: '#0E7C74', presque: '#E0A100', complet: '#B3261E', choix: '#0B2A4A' };
  var formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  function majuscule(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function heure(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'); }
  function arrondi(x) { return Math.round(x * 100000) / 100000; } // ~1 m de précision
  function aUnPoint(s) { return typeof s.lat === 'number' && typeof s.lng === 'number'; }

  function couleurPlaces(restantes) {
    if (restantes <= 0) return COULEURS.complet;
    if (restantes <= 3) return COULEURS.presque;
    return COULEURS.libre;
  }

  function textePlaces(r) {
    if (r <= 0) return 'Complet';
    if (r <= 3) return 'Plus que ' + r + ' place' + (r > 1 ? 's' : '');
    return r + ' places restantes';
  }

  // Épingle aux couleurs de l'appli (pas d'image à charger)
  function icone(couleur) {
    return L.divIcon({
      className: 'pin-fanta',
      html: '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true">' +
        '<path d="M16 1C8 1 1.5 7.3 1.5 15.2 1.5 26 16 41 16 41s14.5-15 14.5-25.8C30.5 7.3 24 1 16 1z" fill="' + couleur + '" stroke="#fff" stroke-width="2"/>' +
        '<circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>',
      iconSize: [32, 42],
      iconAnchor: [16, 41],
      popupAnchor: [0, -36]
    });
  }

  function nouvelleCarte(element) {
    // Pas de zoom à la molette : sinon, sur ordinateur, la carte « avale » le défilement de la page.
    // On zoome avec les boutons + / −, un double-clic, ou deux doigts sur téléphone.
    var carte = L.map(element, { scrollWheelZoom: false }).setView(CENTRE_RADE, ZOOM_RADE);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">les contributeurs OpenStreetMap</a>'
    }).addTo(carte);
    return carte;
  }

  // Bulle d'une sortie. Construite avec textContent : les titres viennent des organisateurs,
  // on ne les injecte jamais comme du HTML.
  function contenuBulle(s, onOuvrir) {
    var debut = new Date(s.date_debut);
    var bloc = document.createElement('div');
    bloc.className = 'bulle-sortie';
    function ligne(classe, texte) {
      var p = document.createElement('p');
      p.className = classe;
      p.textContent = texte;
      bloc.appendChild(p);
    }
    ligne('bulle-date', majuscule(formatJour.format(debut)) + ' · ' + heure(debut));
    ligne('bulle-titre', s.titre);
    ligne('bulle-lieu', s.lieu + ', ' + s.commune);
    ligne('bulle-places', textePlaces(s.places_restantes));
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bulle-bouton';
    bouton.textContent = 'Voir la sortie';
    bouton.addEventListener('click', function () { onOuvrir(s.id); });
    bloc.appendChild(bouton);
    return bloc;
  }

  function CarteIndisponible() {
    return html`<p className="rounded-2xl bg-corail/10 p-4 text-sm text-corail-fonce">La carte n'a pas pu se charger. Vérifie ta connexion internet et recharge la page.</p>`;
  }

  // ---------- onglet « Carte » ----------

  function CarteSorties(props) {
    var conteneur = useRef(null);
    var carteRef = useRef(null);
    var coucheRef = useRef(null);
    var ouvrirRef = useRef(props.onOuvrir);
    ouvrirRef.current = props.onOuvrir;

    var sorties = props.sorties || [];
    var placees = sorties.filter(aUnPoint);
    var sansPoint = sorties.filter(function (s) { return !aUnPoint(s); });

    useEffect(function () {
      if (!leafletOk) return undefined;
      var carte = nouvelleCarte(conteneur.current);
      coucheRef.current = L.layerGroup().addTo(carte);
      carteRef.current = carte;
      var t = setTimeout(function () { carte.invalidateSize(); }, 150);
      return function () { clearTimeout(t); carte.remove(); carteRef.current = null; };
    }, []);

    useEffect(function () {
      var carte = carteRef.current;
      if (!carte) return;
      coucheRef.current.clearLayers();
      var points = placees.map(function (s) {
        L.marker([s.lat, s.lng], { icon: icone(couleurPlaces(s.places_restantes)), title: s.titre, riseOnHover: true })
          .bindPopup(function () { return contenuBulle(s, function (id) { ouvrirRef.current(id); }); })
          .addTo(coucheRef.current);
        return [s.lat, s.lng];
      });
      if (points.length > 1) carte.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
      else if (points.length === 1) carte.setView(points[0], 13);
    }, [props.sorties]);

    var resume = props.sorties === null
      ? 'Chargement des sorties…'
      : placees.length === 0
        ? 'Aucune sortie à venir sur la carte pour le moment.'
        : placees.length + ' sortie' + (placees.length > 1 ? 's' : '') + ' à venir. Touche un point pour voir la sortie.';

    return html`
      <section>
        <h1 className="text-xl font-bold text-marine">Carte des sorties</h1>
        <p className="mt-1 text-sm text-slate-600">${resume}</p>
        ${props.erreur ? html`<p role="alert" className="mt-3 rounded-xl bg-corail/10 px-3 py-2 text-sm text-corail-fonce">${props.erreur}</p>` : null}
        ${leafletOk
          ? html`<div className="isolate mt-3 overflow-hidden rounded-2xl shadow-sm ring-1 ring-marine/10">
              <div ref=${conteneur} role="region" aria-label="Carte des prochaines sorties" style=${{ height: '60vh', minHeight: '320px' }}></div>
            </div>`
          : html`<div className="mt-3"><${CarteIndisponible} /></div>`}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Légende">
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style=${{ background: COULEURS.libre }}></span>Places libres</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style=${{ background: COULEURS.presque }}></span>3 places ou moins</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style=${{ background: COULEURS.complet }}></span>Complet</li>
        </ul>
        ${sansPoint.length
          ? html`<div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-marine/10">
              <h2 className="font-semibold text-marine">Pas encore sur la carte</h2>
              <p className="text-sm text-slate-500">Ces sorties n'ont pas de point de rendez-vous.</p>
              <ul className="mt-2 space-y-1">
                ${sansPoint.map(function (s) {
                  return html`<li key=${s.id}>
                    <button type="button" className="text-left text-sm font-semibold text-lagon-fonce underline" onClick=${function () { props.onOuvrir(s.id); }}>${s.titre}</button>
                  </li>`;
                })}
              </ul>
            </div>`
          : null}
      </section>`;
  }

  // ---------- localiser automatiquement un lieu (géocodage) ----------
  // On essaie, dans l'ordre, jusqu'à trouver :
  //   1) OpenStreetMap (Nominatim) avec « lieu, commune »  → trouve les plages, ports, phares…
  //   2) OpenStreetMap avec le lieu seul, autour de la rade (la commune doit apparaître dans le résultat)
  //   3) la Base Adresse Nationale (Géoplateforme de l'IGN) → trouve les vraies adresses (rue, numéro)
  // Sinon, on renvoie seulement le centre de la commune pour y amener la carte.
  // Règles de Nominatim : 1 requête par seconde au plus, et pas de recherche à chaque frappe.
  // On ne cherche donc que quand l'organisateur quitte le champ, avec une pause entre deux appels.

  var ZONE = { sud: 47.9, nord: 48.75, ouest: -5.2, est: -3.9 }; // même zone que regles.js
  var dejaCherche = {};
  var dernierAppelOsm = 0;

  function dansLaZone(lat, lng) {
    return lat >= ZONE.sud && lat <= ZONE.nord && lng >= ZONE.ouest && lng <= ZONE.est;
  }

  function simplifier(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-']/g, ' ').trim();
  }

  async function chercherOsm(q, communeAttendue) {
    var attente = dernierAppelOsm + 1100 - Date.now();
    if (attente > 0) await new Promise(function (r) { setTimeout(r, attente); });
    dernierAppelOsm = Date.now();
    var reponse = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
      q: q, format: 'jsonv2', countrycodes: 'fr', limit: '1', 'accept-language': 'fr',
      viewbox: [ZONE.ouest, ZONE.nord, ZONE.est, ZONE.sud].join(','), bounded: '1'
    }));
    if (!reponse.ok) throw new Error('OpenStreetMap ' + reponse.status);
    var r = (await reponse.json())[0];
    if (!r) return null;
    if (communeAttendue && simplifier(r.display_name).indexOf(simplifier(communeAttendue)) === -1) return null;
    var lat = Number(r.lat), lng = Number(r.lon);
    if (!dansLaZone(lat, lng)) return null;
    return { lat: arrondi(lat), lng: arrondi(lng), nom: r.display_name.split(',').slice(0, 2).join(',').trim() };
  }

  async function chercherAdresse(q, type) {
    var parametres = { q: q, limit: '1', lat: '48.35', lon: '-4.45' };
    if (type) parametres.type = type;
    var reponse = await fetch('https://data.geopf.fr/geocodage/search?' + new URLSearchParams(parametres));
    if (!reponse.ok) throw new Error('Base Adresse Nationale ' + reponse.status);
    var f = ((await reponse.json()).features || [])[0];
    if (!f || f.properties.score < 0.5) return null;
    var lng = f.geometry.coordinates[0], lat = f.geometry.coordinates[1];
    if (!dansLaZone(lat, lng)) return null;
    return { lat: arrondi(lat), lng: arrondi(lng), nom: f.properties.label };
  }

  // Renvoie { point: {lat, lng, nom} }, ou { commune: {lat, lng} }, ou {} si rien trouvé.
  async function chercherLieu(lieu, commune) {
    lieu = String(lieu || '').trim();
    commune = String(commune || '').trim();
    var cle = simplifier(lieu + '|' + commune);
    if (dejaCherche[cle]) return dejaCherche[cle];
    var essais = [
      function () { return chercherOsm(lieu + ', ' + commune); },
      function () { return chercherOsm(lieu, commune); },
      function () { return chercherAdresse(lieu + ' ' + commune); }
    ];
    var pannes = 0;
    for (var i = 0; i < essais.length; i++) {
      try {
        var point = await essais[i]();
        if (point) return (dejaCherche[cle] = { point: point });
      } catch (e) { pannes++; }
    }
    var centre = null;
    try { centre = await chercherAdresse(commune, 'municipality'); } catch (e) { pannes++; }
    if (pannes === essais.length + 1) throw new Error('La recherche automatique ne répond pas.');
    return (dejaCherche[cle] = centre ? { commune: centre } : {});
  }

  // ---------- formulaire de création : placer le point de rendez-vous ----------
  // props.value  : { lat, lng, source: 'auto' | 'manuel' } ou null
  // props.centre : { lat, lng } où amener la carte (commune trouvée, sans point précis)
  // props.message, props.onLocaliser : texte d'aide et bouton « Localiser le lieu »

  function ChoixPoint(props) {
    var conteneur = useRef(null);
    var carteRef = useRef(null);
    var pinRef = useRef(null);
    var changerRef = useRef(props.onChange);
    changerRef.current = props.onChange;

    function poserAlaMain(latlng) {
      changerRef.current({ lat: arrondi(latlng.lat), lng: arrondi(latlng.lng), source: 'manuel' });
    }

    useEffect(function () {
      if (!leafletOk) return undefined;
      var carte = nouvelleCarte(conteneur.current);
      carte.on('click', function (e) { poserAlaMain(e.latlng); });
      carteRef.current = carte;
      var t = setTimeout(function () { carte.invalidateSize(); }, 150);
      return function () { clearTimeout(t); carte.remove(); carteRef.current = null; pinRef.current = null; };
    }, []);

    // L'épingle suit le point choisi (à la main ou trouvé automatiquement)
    useEffect(function () {
      var carte = carteRef.current, v = props.value;
      if (!carte) return;
      if (!v) {
        if (pinRef.current) { pinRef.current.remove(); pinRef.current = null; }
        return;
      }
      if (!pinRef.current) {
        pinRef.current = L.marker([v.lat, v.lng], { icon: icone(COULEURS.choix), draggable: true, title: 'Point de rendez-vous' }).addTo(carte);
        pinRef.current.on('dragend', function () { poserAlaMain(pinRef.current.getLatLng()); });
      } else {
        pinRef.current.setLatLng([v.lat, v.lng]);
      }
      if (v.source === 'auto') carte.setView([v.lat, v.lng], 15);
    }, [props.value]);

    useEffect(function () {
      if (carteRef.current && props.centre) carteRef.current.setView([props.centre.lat, props.centre.lng], 13);
    }, [props.centre]);

    if (!leafletOk) return html`<${CarteIndisponible} />`;

    return html`
      <div role="group" aria-labelledby="titre-point">
        <span id="titre-point" className="text-sm font-medium text-marine">Point de rendez-vous</span>
        <div className="isolate mt-1 overflow-hidden rounded-xl ring-1 ring-slate-300">
          <div ref=${conteneur} style=${{ height: '240px' }}></div>
        </div>
        <p className="mt-1 text-xs text-slate-500" aria-live="polite">${props.message}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          ${props.onLocaliser
            ? html`<button type="button" className="text-xs font-semibold text-lagon-fonce underline" onClick=${props.onLocaliser}>Localiser le lieu</button>`
            : null}
          <button type="button" className="text-xs font-semibold text-lagon-fonce underline"
            onClick=${function () { if (carteRef.current) poserAlaMain(carteRef.current.getCenter()); }}>
            Placer au centre de la carte
          </button>
        </div>
      </div>`;
  }

  window.FantaCarte = { CarteSorties: CarteSorties, ChoixPoint: ChoixPoint, chercherLieu: chercherLieu };
})();
