/**
 * Zone Overlay Module
 * Manages 1, 2, 3 Cheonnae-ri Zones & Removal Progression Status
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

  updateZones(zonesData) {
    this.zonesGeoJson = zonesData;
    const source = this.map.getSource('cheonnaeri-zones');
    if (source) {
      source.setData(this.zonesGeoJson);
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

    // 3. Zone Center Label Layer (Always visible up to high zooms)
    this.map.addLayer({
      id: 'zones-labels',
      type: 'symbol',
      source: 'cheonnaeri-zones',
      minzoom: 12,
      maxzoom: 24,
      layout: {
        'text-field': ['concat', ['get', 'name'], '\n(', ['to-string', ['get', 'area_sqm']], '㎡)'],
        'text-size': 13,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold', 'sans-serif'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2.5
      }
    });

    // 4. Interactive Click Events on Zones
    this.map.on('click', 'zones-fill', (e) => {
      if (!e.features.length) return;
      const props = e.features[0].properties;
      const coordinates = e.lngLat;

      const hasWork = props.completed_area > 0;

      const popupHtml = `
        <div class="drone-popup">
          <div class="popup-header" style="border-left: 3px solid ${props.color}">
            <h4>${props.name}</h4>
            <span class="popup-sub">${props.subname}</span>
          </div>
          <div class="popup-body">
            <p><b>구간 면적:</b> ${Number(props.area_sqm).toLocaleString()} ㎡</p>
            <p><b>교란 생물:</b> ${props.target_species}</p>
            <p><b>식생 밀도:</b> <span class="badge-density">${props.density}</span></p>
            <p><b>작업 현황:</b> <b style="color: ${hasWork ? '#38bdf8' : '#94a3b8'};">${props.status_label || (hasWork ? '작업 완료 (지속관리)' : '작업 대기')}</b></p>
            ${hasWork ? `<p><b>누적 실적:</b> 1차·2차 누적 ${Number(props.completed_area).toLocaleString()}㎡ (수거 ${props.removed_kg || 880}kg)</p>` : '<p><b>작업 계획:</b> 향후 회차 투입 예정</p>'}
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

      const hasWork = p.completed_area > 0;
      const statusText = p.status_label || (hasWork ? '1·2차 작업 (지속관리)' : '작업 대기 (미착수)');
      const summaryText = p.work_summary || (hasWork ? `누적 ${Number(p.completed_area).toLocaleString()}㎡ 작업 (880kg)` : '향후 회차 투입 예정');

      card.innerHTML = `
        <div class="zone-card-header">
          <span class="zone-card-title">${p.name}</span>
          <span class="zone-badge" style="color: ${hasWork ? '#38bdf8' : '#94a3b8'}; border: 1px solid ${hasWork ? '#38bdf840' : '#ffffff20'}; background: ${hasWork ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)'}">
            ${statusText}
          </span>
        </div>
        <div class="zone-card-meta">
          <span>${p.subname}</span>
          <span><b>${Number(p.area_sqm).toLocaleString()}</b> ㎡</span>
        </div>
        <div class="zone-card-meta" style="margin-top: 4px; font-size: 0.72rem; color: ${hasWork ? '#38bdf8' : 'var(--text-muted)'};">
          <span><i class="fa-solid fa-clipboard-check"></i> ${summaryText}</span>
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
