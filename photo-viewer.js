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
    this.renderMarkers();
    this.renderThumbnails();
    this.bindModalEvents();
    this.bindMapRotationEvents();
  }

  updatePhotos(photosData) {
    this.photos = photosData || [];
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
        // Compensate for map rotation so the arrow maintains true physical orientation
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
      // Create tactical camera pin element with directional cone arrow
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
      
      const photoUrl = photo.rel_url || `assets/photos/${photo.filename}`;
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

  getFilteredPhotos() {
    if (this.activeFilter === 'all') return this.photos;
    return this.photos.filter(p => p.date_group === this.activeFilter);
  }

  applyFilter(filterKey) {
    this.activeFilter = filterKey;

    // Filter Map Markers
    this.markers.forEach(({ el, photo }) => {
      if (filterKey === 'all' || photo.date_group === filterKey) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
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

    const photoUrl = photo.rel_url || `assets/photos/${photo.filename}`;
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

    stageElem.textContent = photo.date_group === '2026-07-24' ? '1차 발아기 제거' : '2차 성장기 제거';

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

    // Filter pills event
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyFilter(btn.dataset.filter);
      });
    });
  }
}

window.PhotoViewerManager = PhotoViewerManager;
