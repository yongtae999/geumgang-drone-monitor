/**
 * Drone Map Module
 * MapLibre GL JS 3D Satellite Viewer & Flight Tour Simulator
 */

class DroneMapController {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.isTouring = false;
    this.tourAnimationFrame = null;
    this.tourStartTime = null;
    
    // Cheonnae-ri wetland center & waypoints
    this.centerCoords = [127.5755, 36.1065];
    
    // Flight Tour Waypoints along Geum River (upstream -> downstream)
    this.tourWaypoints = [
      { lng: 127.5676, lat: 36.1118, alt: 220, pitch: 65, bearing: 135, speed: 12.0, name: "1구간 (A) 제원대교 상류" },
      { lng: 127.5710, lat: 36.1090, alt: 180, pitch: 60, bearing: 125, speed: 14.5, name: "1구간 (A) 완충 구역" },
      { lng: 127.5741, lat: 36.1071, alt: 150, pitch: 70, bearing: 110, speed: 10.0, name: "2구간 (B) 천내리습지 진입부" },
      { lng: 127.5765, lat: 36.1055, alt: 130, pitch: 68, bearing: 105, speed: 8.5,  name: "2구간 (B) 가시박 대군락지 중심" },
      { lng: 127.5785, lat: 36.1050, alt: 140, pitch: 65, bearing: 95,  speed: 9.0,  name: "2-3구간 경계부" },
      { lng: 127.5815, lat: 36.1038, alt: 160, pitch: 62, bearing: 90,  speed: 11.0, name: "3구간 (C) 습지 하류부" },
      { lng: 127.5830, lat: 36.1030, alt: 240, pitch: 55, bearing: 70,  speed: 15.0, name: "천내리 하류 회항점" }
    ];
    
    this.currentWaypointIdx = 0;
  }

  init() {
    // MapLibre Style with Esri High-Resolution World Imagery
    const style = {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Esri, Maxar, Earthstar Geographics'
        },
        'terrain-dem': {
          type: 'raster-dem',
          tiles: [
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
          ],
          encoding: 'terrarium',
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 20
        }
      ],
      sky: {
        'sky-color': '#060c17',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#1a263b',
        'horizon-fog-blend': 0.8
      }
    };

    this.map = new maplibregl.Map({
      container: this.containerId,
      style: style,
      center: this.centerCoords,
      zoom: 15.2,
      pitch: 65,
      bearing: 115,
      antialias: true,
      maxPitch: 82
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    this.map.on('load', () => {
      // Set 3D Terrain mesh for realistic mountain/river banks
      try {
        this.map.setTerrain({ source: 'terrain-dem', exaggeration: 1.4 });
      } catch (e) {
        console.warn("3D terrain fallback:", e);
      }

      this.updateHudTelemetry();
    });

    // Sync Telemetry HUD on Move
    this.map.on('move', () => {
      this.updateHudTelemetry();
    });

    return this.map;
  }

  updateHudTelemetry() {
    if (!this.map) return;
    
    const center = this.map.getCenter();
    const pitch = Math.round(this.map.getPitch());
    const bearing = Math.round(this.map.getBearing());
    const zoom = this.map.getZoom();
    
    // Altitude estimation from zoom & pitch
    const altMeters = Math.round((21 - zoom) * 35 + (pitch * 0.8));
    
    // Format coordinates
    const latElem = document.getElementById('hud-lat');
    const lonElem = document.getElementById('hud-lon');
    const altElem = document.getElementById('hud-alt-txt');
    const speedElem = document.getElementById('hud-speed');
    const compassElem = document.getElementById('hud-compass-display');
    const valAlt = document.getElementById('val-altitude');
    const valPitch = document.getElementById('val-pitch');
    
    if (latElem) latElem.textContent = `${center.lat.toFixed(6)}° N`;
    if (lonElem) lonElem.textContent = `${center.lng.toFixed(6)}° E`;
    if (altElem) altElem.textContent = `${altMeters} m`;
    if (valAlt) valAlt.textContent = `${altMeters}m`;
    if (valPitch) valPitch.textContent = `${pitch}°`;
    
    // Normalize bearing (0 ~ 360)
    let normBearing = (bearing % 360 + 360) % 360;
    if (compassElem) {
      const centerIndicator = compassElem.querySelector('.center-indicator');
      if (centerIndicator) {
        centerIndicator.textContent = `HDG ${normBearing.toString().padStart(3, '0')}°`;
      }
    }
  }

  flyToPreset(presetId) {
    this.stopFlightTour();

    switch (presetId) {
      case 'overview':
        this.map.flyTo({
          center: [127.5755, 36.1065],
          zoom: 14.6,
          pitch: 55,
          bearing: 110,
          duration: 2500,
          essential: true
        });
        break;

      case 'zone-1':
        // Zone A: Jewon Bridge
        this.map.flyTo({
          center: [127.5705, 36.1095],
          zoom: 16.2,
          pitch: 68,
          bearing: 130,
          duration: 2500,
          essential: true
        });
        break;

      case 'zone-2':
        // Zone B: Central Wetland (Highest infestation)
        this.map.flyTo({
          center: [127.5760, 36.1055],
          zoom: 16.4,
          pitch: 70,
          bearing: 110,
          duration: 2500,
          essential: true
        });
        break;

      case 'zone-3':
        // Zone C: Downstream Wetland
        this.map.flyTo({
          center: [127.5805, 36.1040],
          zoom: 16.0,
          pitch: 65,
          bearing: 90,
          duration: 2500,
          essential: true
        });
        break;

      case 'tour':
        this.startFlightTour();
        break;
    }
  }

  startFlightTour() {
    if (this.isTouring) return;
    this.isTouring = true;
    this.currentWaypointIdx = 0;
    
    const flyNext = () => {
      if (!this.isTouring) return;
      
      const wp = this.tourWaypoints[this.currentWaypointIdx];
      
      // Update HUD speed readout
      const speedElem = document.getElementById('hud-speed');
      if (speedElem) speedElem.textContent = `${wp.speed.toFixed(1)} m/s`;
      
      this.map.flyTo({
        center: [wp.lng, wp.lat],
        zoom: 16.2 - (wp.alt - 130) / 100,
        pitch: wp.pitch,
        bearing: wp.bearing,
        duration: 5500,
        curve: 1.2,
        speed: 0.6,
        essential: true
      });

      this.map.once('moveend', () => {
        if (!this.isTouring) return;
        this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.tourWaypoints.length;
        // Pause 1.2s at each waypoint
        setTimeout(flyNext, 1200);
      });
    };

    flyNext();
  }

  stopFlightTour() {
    this.isTouring = false;
    if (this.map) {
      this.map.stop();
    }
    const speedElem = document.getElementById('hud-speed');
    if (speedElem) speedElem.textContent = `0.0 m/s`;
  }

  setAltitude(alt) {
    if (!this.map) return;
    // Map altitude 60m ~ 600m to zoom level
    const zoom = 21 - (alt / 35);
    this.map.easeTo({ zoom: zoom, duration: 300 });
  }

  setPitch(pitch) {
    if (!this.map) return;
    this.map.easeTo({ pitch: parseInt(pitch), duration: 300 });
  }
}

window.DroneMapController = DroneMapController;
