/**
 * Photo Viewer Module
 * GPS-based Photo Pinpoints & High-Resolution Modal Gallery
 */

class PhotoViewerManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.map = mapController.map;
    this.photos = [];
    this.markers = [];
    this.activeFilter = 'all';
  }

  init(photosData) {
    this.photos = photosData || [];
    this.renderFilterPills();
    this.renderMarkers();
    this.renderThumbnails();
    this.bindModalEvents();
    this.bindMapRotationEvents();
  }

  updatePhotos(photosData) {
    this.photos = photosData || [];
    this.renderFilterPills();
    this.renderMarkers();
    this.renderThumbnails();
  }

  bindMapRotationEvents() {
    if (!this.map) return;
    this.map.on('rotate', () => this.updateMarkerOrientations());
    this.map.on('move', () => this.updateMarkerOrientations());
  }

  updateMarkerOrientations() {
    if (!this.map || !this.markers) return;
    const mapBearing = this.map.getBearing();

    this.markers.forEach(({ el, photo }) => {
      const arrow = el.querySelector('.pin-cone-arrow');
      if (arrow) {
        const photoBearing = typeof photo.bearing === 'number' ? photo.bearing : 110;
        arrow.style.transform = `rotate(${photoBearing - mapBearing}deg)`;
      }
    });
  }

  renderMarkers() {
    // Clear existing markers
    if (this.markers && this.markers.length) {
      this.markers.forEach(m => {
        if (m && m.marker) {
          m.marker.remove();
        }
      });
    }
    this.markers = [];

    const validPhotos = this.photos.filter(p => p.lat && p.lng);
    const countElem = document.getElementById('photo-count');
    if (countElem) countElem.textContent = validPhotos.length;

    const currentMapBearing = this.map ? this.map.getBearing() : 0;

    validPhotos.forEach((photo) => {
      const el = document.createElement('div');
      el.className = 'photo-marker-pin';
      el.dataset.date = photo.date_group;
      
      const photoBearing = typeof photo.bearing === 'number' ? photo.bearing : 110;
      const initialRot = photoBearing - currentMapBearing;

      el.innerHTML = `
        <div class="pin-pulse"></div>
        <div class="pin-cone-arrow" style="transform: rotate(${initialRot}deg);"></div>
        <div class="pin-icon" title="${photo.filename} (${photoBearing}°)">
          <i class="fa-solid fa-camera"></i>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPhotoModal(photo);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([photo.lng, photo.lat])
        .addTo(this.map);

      this.markers.push({ marker, el, photo });
    });

    this.applyFilter(this.activeFilter);
    this.updateMarkerOrientations();
  }

  renderThumbnails() {
    const strip = document.getElementById('photos-thumbnail-strip');
    if (!strip) return;

    strip.innerHTML = '';
    const displayPhotos = this.getFilteredPhotos();

    displayPhotos.forEach((photo) => {
      const item = document.createElement('div');
      item.className = 'thumb-item';
      
      const photoUrl = photo.dataUrl || photo.rel_url || (photo.filename && photo.filename.startsWith('data:') ? photo.filename : `assets/photos/${photo.filename}`);
      item.innerHTML = `<img src="${photoUrl}" alt="${photo.filename}" loading="lazy">`;

      item.addEventListener('click', () => {
        this.openPhotoModal(photo);
        if (photo.lat && photo.lng) {
          this.map.flyTo({
            center: [photo.lng, photo.lat],
            zoom: 17.5,
            pitch: 65,
            duration: 1800
          });
        }
      });

      strip.appendChild(item);
    });
  }

  renderFilterPills() {
    const container = document.getElementById('photo-filter-pills') || document.querySelector('.filter-pills');
    if (!container) return;

    // Collect all unique date_groups
    const dates = Array.from(new Set(this.photos.map(p => p.date_group).filter(Boolean))).sort();

    const roundLabels = {
      '2026-07-24': '7월 24일 (1차)',
      '2026-08-06': '8월 6일 (2차)',
      '2026-08-20': '8월 20일 (3차)',
      '2026-08-27': '8월 27일 (4차)'
    };

    let html = `<button class="filter-pill ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">전체</button>`;

    dates.forEach(d => {
      let label = roundLabels[d];
      if (!label) {
        const parts = d.split('-');
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        label = `${month}월 ${day}일`;
      }
      const isActive = this.activeFilter === d;
      html += `<button class="filter-pill ${isActive ? 'active' : ''}" data-filter="${d}">${label}</button>`;
    });

    html += `
      <button class="filter-pill ${this.activeFilter === 'before' ? 'active' : ''}" data-filter="before">작업 전</button>
      <button class="filter-pill ${this.activeFilter === 'during' ? 'active' : ''}" data-filter="during">작업 중</button>
      <button class="filter-pill ${this.activeFilter === 'after' ? 'active' : ''}" data-filter="after">작업 후</button>
    `;

    container.innerHTML = html;

    // Bind click events
    container.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyFilter(btn.dataset.filter);
      });
    });
  }

  getFilteredPhotos() {
    if (this.activeFilter === 'all') return this.photos;
    if (this.activeFilter === 'before') return this.photos.filter(p => p.stage === '작업 전');
    if (this.activeFilter === 'during') return this.photos.filter(p => p.stage === '작업 중');
    if (this.activeFilter === 'after') return this.photos.filter(p => p.stage === '작업 후');
    return this.photos.filter(p => p.date_group === this.activeFilter);
  }

  applyFilter(filterKey) {
    this.activeFilter = filterKey;

    // Filter Map Markers
    this.markers.forEach(({ el, photo }) => {
      let match = false;
      if (filterKey === 'all') {
        match = true;
      } else if (filterKey === 'before') {
        match = (photo.stage === '작업 전');
      } else if (filterKey === 'during') {
        match = (photo.stage === '작업 중');
      } else if (filterKey === 'after') {
        match = (photo.stage === '작업 후');
      } else {
        match = (photo.date_group === filterKey);
      }

      el.style.display = match ? 'block' : 'none';
    });

    this.renderThumbnails();
  }

  openPhotoModal(photo) {
    const modal = document.getElementById('photo-modal');
    if (!modal) return;

    const img = document.getElementById('modal-photo-img');
    const filenameElem = document.getElementById('modal-meta-filename');
    const timeElem = document.getElementById('modal-meta-time');
    const gpsElem = document.getElementById('modal-meta-gps');
    const altBearingElem = document.getElementById('modal-meta-alt-bearing');
    const zoneElem = document.getElementById('modal-meta-zone');
    const stageElem = document.getElementById('modal-photo-stage');

    const photoUrl = photo.dataUrl || photo.rel_url || (photo.filename && photo.filename.startsWith('data:') ? photo.filename : `assets/photos/${photo.filename}`);
    img.src = photoUrl;

    filenameElem.textContent = photo.filename;
    timeElem.textContent = photo.timestamp || photo.date_group;
    
    if (photo.lat && photo.lng) {
      gpsElem.textContent = `${photo.lat.toFixed(6)}° N, ${photo.lng.toFixed(6)}° E`;
    } else {
      gpsElem.textContent = 'GPS 미기록 (천내리 일대)';
    }

    const altStr = photo.altitude ? `${photo.altitude}m` : '131.5m (해발고도)';
    const bearingStr = photo.bearing ? `${photo.bearing}°` : '180° (남향)';
    altBearingElem.textContent = `${altStr} / ${bearingStr}`;

    // Determine Zone by Lat/Lng
    let zoneName = "2구간 (B) 천내리습지 중심부";
    if (photo.lat > 36.1080) zoneName = "1구간 (A) 제원대교 일원";
    else if (photo.lng > 127.5790) zoneName = "3구간 (C) 습지 하류부";
    zoneElem.textContent = zoneName;

    if (photo.date_group === '2026-07-24') {
      stageElem.textContent = '1차 발아기 제거 (손 뿌리뽑기)';
    } else if (photo.date_group === '2026-08-06') {
      stageElem.textContent = '2차 성장기 제거 (예초·낫베기)';
    } else if (photo.date_group === '2026-08-20') {
      stageElem.textContent = '3차 성장기 집중 예초 (B·A구간)';
    } else if (photo.date_group === '2026-08-27') {
      stageElem.textContent = '4차 개화전 집중 차단 (환삼70%·가시30%)';
    } else {
      stageElem.textContent = photo.stage || '현장 작업 모니터링';
    }

    // Locate button action
    const locateBtn = document.getElementById('btn-locate-on-map');
    locateBtn.onclick = () => {
      modal.classList.add('hidden');
      if (photo.lat && photo.lng) {
        this.map.flyTo({
          center: [photo.lng, photo.lat],
          zoom: 18.0,
          pitch: 70,
          bearing: photo.bearing || 120,
          duration: 2200
        });
      }
    };

    modal.classList.remove('hidden');
  }

  bindModalEvents() {
    const closeBtn = document.getElementById('btn-close-photo-modal');
    const modal = document.getElementById('photo-modal');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
  }
}

window.PhotoViewerManager = PhotoViewerManager;
