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
    var carte = L.map(element, { scrollWheelZoom: true }).setView(CENTRE_RADE, ZOOM_RADE);
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

  // ---------- formulaire de création : placer le point de rendez-vous ----------

  function ChoixPoint(props) {
    var conteneur = useRef(null);
    var carteRef = useRef(null);
    var pinRef = useRef(null);
    var changerRef = useRef(props.onChange);
    changerRef.current = props.onChange;

    function placer(latlng) {
      var carte = carteRef.current;
      if (!carte) return;
      if (!pinRef.current) {
        pinRef.current = L.marker(latlng, { icon: icone(COULEURS.choix), draggable: true, title: 'Point de rendez-vous' }).addTo(carte);
        pinRef.current.on('dragend', function () {
          var p = pinRef.current.getLatLng();
          changerRef.current({ lat: arrondi(p.lat), lng: arrondi(p.lng) });
        });
      } else {
        pinRef.current.setLatLng(latlng);
      }
      changerRef.current({ lat: arrondi(latlng.lat), lng: arrondi(latlng.lng) });
    }

    useEffect(function () {
      if (!leafletOk) return undefined;
      var carte = nouvelleCarte(conteneur.current);
      carte.on('click', function (e) { placer(e.latlng); });
      carteRef.current = carte;
      var t = setTimeout(function () { carte.invalidateSize(); }, 150);
      return function () { clearTimeout(t); carte.remove(); carteRef.current = null; pinRef.current = null; };
    }, []);

    if (!leafletOk) return html`<${CarteIndisponible} />`;

    return html`
      <div role="group" aria-labelledby="titre-point">
        <span id="titre-point" className="text-sm font-medium text-marine">Point de rendez-vous</span>
        <div className="isolate mt-1 overflow-hidden rounded-xl ring-1 ring-slate-300">
          <div ref=${conteneur} style=${{ height: '240px' }}></div>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-xs text-slate-500">
            ${props.value ? 'Point placé. Tu peux le faire glisser pour l’ajuster.' : 'Touche la carte à l’endroit du rendez-vous.'}
          </span>
          <button type="button" className="text-xs font-semibold text-lagon-fonce underline"
            onClick=${function () { if (carteRef.current) placer(carteRef.current.getCenter()); }}>
            Placer au centre de la carte
          </button>
        </div>
      </div>`;
  }

  window.FantaCarte = { CarteSorties: CarteSorties, ChoixPoint: ChoixPoint };
})();
