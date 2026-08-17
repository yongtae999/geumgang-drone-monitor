/**
 * Zone Overlay Module
 * Manages 1, 2, 3 Cheonnae-ri Zones & Removal Progression Heatmaps
 */

class ZoneOverlayManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.map = mapController.map;
    this.zonesGeoJson = null;
  }

  init(zonesData) {
    this.zonesGeoJson = zonesData;
    if (!this.map.isStyleLoaded()) {
      this.map.once('load', () => this.addZoneLayers());
    } else {
      this.addZoneLayers();
    }
    this.renderZoneCards();
  }

  addZoneLayers() {
    if (this.map.getSource('cheonnaeri-zones')) return;

    // Add GeoJSON Source
    this.map.addSource('cheonnaeri-zones', {
      type: 'geojson',
      data: this.zonesGeoJson
    });

    // 1. Polygon Fill Layer with semi-transparent tint
    this.map.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'cheonnaeri-zones',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.35
      }
    });

    // 2. Glowing Boundary Line Layer
    this.map.addLayer({
      id: 'zones-outline',
      type: 'line',
      source: 'cheonnaeri-zones',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-blur': 1,
        'line-opacity': 0.9
      }
    });

    // 3. Zone Center Label Layer
    this.map.addLayer({
      id: 'zones-labels',
      type: 'symbol',
      source: 'cheonnaeri-zones',
      layout: {
        'text-field': ['concat', ['get', 'name'], '\n(', ['to-string', ['get', 'area_sqm']], '㎡)'],
        'text-size': 13,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2
      }
    });

    // 4. Interactive Click Events on Zones
    this.map.on('click', 'zones-fill', (e) => {
      if (!e.features.length) return;
      const props = e.features[0].properties;
      const coordinates = e.lngLat;

      const popupHtml = `
        <div class="drone-popup">
          <div class="popup-header" style="border-left: 3px solid ${props.color}">
            <h4>${props.name}</h4>
            <span class="popup-sub">${props.subname}</span>
          </div>
          <div class="popup-body">
            <p><b>총 면적:</b> ${Number(props.area_sqm).toLocaleString()} ㎡</p>
            <p><b>교란식물:</b> ${props.target_species}</p>
            <p><b>식생 밀도:</b> <span class="badge-density">${props.density}</span></p>
            <p><b>제거 진척률:</b> <b>${props.progress_pct}%</b> (${Number(props.completed_area).toLocaleString()}㎡ 완료)</p>
          </div>
        </div>
      `;

      new maplibregl.Popup({ closeButton: true, className: 'dark-popup' })
        .setLngLat(coordinates)
        .setHTML(popupHtml)
        .addTo(this.map);
    });

    // Cursor pointer on hover
    this.map.on('mouseenter', 'zones-fill', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'zones-fill', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  renderZoneCards() {
    const container = document.getElementById('zone-cards-container');
    if (!container || !this.zonesGeoJson) return;

    container.innerHTML = '';

    this.zonesGeoJson.features.forEach((f) => {
      const p = f.properties;
      const card = document.createElement('div');
      card.className = `zone-card`;
      card.style.borderLeftColor = p.color;
      card.dataset.zoneId = p.id;

      card.innerHTML = `
        <div class="zone-card-header">
          <span class="zone-card-title">${p.name}</span>
          <span class="zone-badge" style="color: ${p.color}; border: 1px solid ${p.color}40">${p.priority}</span>
        </div>
        <div class="zone-card-meta">
          <span>${p.subname}</span>
          <span><b>${Number(p.area_sqm).toLocaleString()}</b> ㎡</span>
        </div>
        <div class="zone-card-meta">
          <span>식생: ${p.target_species[0]}</span>
          <span class="text-cyan"><b>${p.progress_pct}%</b> 완료</span>
        </div>
        <div class="zone-progress-wrap">
          <div class="zone-progress-fill" style="width: ${p.progress_pct}%; background: ${p.color}"></div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.mapCtrl.flyToPreset(p.id);
      });

      container.appendChild(card);
    });
  }
}

window.ZoneOverlayManager = ZoneOverlayManager;
