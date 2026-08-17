/**
 * Main Application Orchestrator
 * Bootstraps 3D Drone Map, Telemetry HUD, Photo Pinpoints, and Work Report Modules
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🛸 Initializing Geumgang Cheonnae-ri Drone Monitoring Platform...");

  // 1. Initialize Drone 3D Map Controller
  const mapCtrl = new DroneMapController('drone-map');
  const map = mapCtrl.init();

  // 2. Fetch Data from Local API or Static JSON (GitHub Pages fallback)
  let data = null;
  try {
    const resp = await fetch('/api/data');
    if (resp.ok) {
      data = await resp.json();
    }
  } catch (e) {
    console.log("API Fetch failed, using static JSON fallback for GitHub Pages");
  }

  // Fallback for static hosting (GitHub Pages)
  if (!data) {
    try {
      const [zonesRes, photosRes, logsRes] = await Promise.all([
        fetch('data/zones.geojson'),
        fetch('data/photos.json'),
        fetch('data/work_logs.json')
      ]);

      const zones = await zonesRes.json();
      const photos = await photosRes.json();
      let work_logs = await logsRes.json();

      // Check localStorage for any added logs
      const localLogs = localStorage.getItem('geumgang_work_logs');
      if (localLogs) {
        try {
          work_logs = JSON.parse(localLogs);
        } catch (e) {}
      }

      data = {
        zones: zones,
        photos: photos,
        work_logs: work_logs,
        kpis: {
          total_target_area: 144806,
          cum_removed_area: 66000,
          progress_pct: 45.6,
          cum_removed_kg: 880,
          target_kg: 18830,
          cum_workers: 10,
          target_workers: 45,
          total_budget: 15000000,
          spent_budget: 1294488,
          budget_pct: 8.6
        }
      };
    } catch (err) {
      console.error("Static data load error:", err);
    }
  }

  if (!data) {
    console.error("Critical: No data loaded.");
    return;
  }

  // 3. Initialize Sub-Managers
  const zoneMgr = new ZoneOverlayManager(mapCtrl);
  const photoMgr = new PhotoViewerManager(mapCtrl);
  const reportMgr = new WorkReportManager(mapCtrl);

  // Map load callback
  map.on('load', () => {
    if (data.zones) zoneMgr.init(data.zones);
    if (data.photos) photoMgr.init(data.photos);
    if (data.work_logs && data.kpis) reportMgr.init(data.work_logs, data.kpis);
  });

  // 4. Bind Left Sidebar Flight Mode Buttons
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      mapCtrl.flyToPreset(mode);
    });
  });

  // 5. Bind Camera Sliders (Altitude & Pitch)
  const sliderAlt = document.getElementById('slider-altitude');
  const sliderPitch = document.getElementById('slider-pitch');

  if (sliderAlt) {
    sliderAlt.addEventListener('input', (e) => {
      mapCtrl.setAltitude(e.target.value);
    });
  }

  if (sliderPitch) {
    sliderPitch.addEventListener('input', (e) => {
      mapCtrl.setPitch(e.target.value);
    });
  }

  // 6. Fullscreen Toggle
  const fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen().catch(err => console.log(err));
      }
    });
  }

  console.log("✅ Geumgang Cheonnae-ri Platform Ready!");
});
