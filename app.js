/**
 * Main Application Orchestrator
 * Supports Multi-Project Switching, 3D Drone Map, Telemetry HUD, and Project Onboarding Wizard
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🛸 Initializing Universal Ecosystem Monitoring Platform...");

  // 1. Initialize Drone 3D Map Controller
  const mapCtrl = new DroneMapController('drone-map');
  const map = mapCtrl.init();

  // 2. State & Managers
  let projects = [];
  let currentProject = null;
  let zoneMgr = null;
  let photoMgr = null;
  let reportMgr = null;

  // Load Projects Registry
  try {
    const pResp = await fetch('data/projects.json');
    if (pResp.ok) {
      projects = await pResp.json();
    }
  } catch (e) {
    console.warn("Projects load fallback:", e);
  }

  // Load custom user projects from localStorage
  const savedCustom = localStorage.getItem('custom_drone_projects');
  if (savedCustom) {
    try {
      const customList = JSON.parse(savedCustom);
      projects = [...projects, ...customList];
    } catch (e) {}
  }

  // Populate Project Dropdown
  const selector = document.getElementById('project-selector');
  if (selector && projects.length) {
    selector.innerHTML = '';
    projects.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `🛸 ${p.short_name || p.name}`;
      selector.appendChild(opt);
    });
  }

  // Project Switcher Engine
  async function loadProject(projectId) {
    console.log(`🔄 Switching to project: ${projectId}`);
    currentProject = projects.find(p => p.id === projectId) || projects[0];
    if (!currentProject) return;

    // 1. Update Header Info
    const agencyTag = document.getElementById('header-agency-tag');
    const projTitle = document.getElementById('header-project-title');
    if (agencyTag) agencyTag.innerHTML = `<i class="fa-solid fa-seedling"></i> ${currentProject.agency} · ${currentProject.contractor}`;
    if (projTitle) projTitle.textContent = currentProject.name;

    // 2. Fetch Project Specific Data
    let zonesData = null;
    let photosData = [];
    let workLogsData = [];
    let kpisData = currentProject.kpis;

    try {
      const [zRes, pRes, wRes] = await Promise.all([
        fetch(currentProject.zones_file),
        fetch(currentProject.photos_file),
        fetch(currentProject.work_logs_file)
      ]);

      if (zRes.ok) zonesData = await zRes.json();
      if (pRes.ok) photosData = await pRes.json();
      if (wRes.ok) workLogsData = await wRes.json();
    } catch (err) {
      console.warn("Project data fetch fallback:", err);
    }

    // 3. Update 3D Camera & Context
    mapCtrl.setProjectContext(currentProject);

    // 4. Update Sub-Managers
    if (!zoneMgr) {
      zoneMgr = new ZoneOverlayManager(mapCtrl);
      photoMgr = new PhotoViewerManager(mapCtrl);
      reportMgr = new WorkReportManager(mapCtrl);

      zoneMgr.init(zonesData);
      photoMgr.init(photosData);
      reportMgr.init(workLogsData, kpisData);
    } else {
      zoneMgr.updateZones(zonesData);
      photoMgr.updatePhotos(photosData);
      reportMgr.updateData(workLogsData, kpisData);
    }
  }

  // Map Loaded Event
  map.on('load', () => {
    loadProject(selector ? selector.value : 'cheonnaeri');
  });

  // Selector Change Listener
  if (selector) {
    selector.addEventListener('change', (e) => {
      loadProject(e.target.value);
    });
  }

  // 3. Bind Left Sidebar Flight Mode Buttons
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      mapCtrl.flyToPreset(mode);
    });
  });

  // 4. Bind Camera Sliders (Altitude & Pitch)
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

  // 5. Fullscreen Toggle
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

  // 6. Mobile Bottom Nav Tab Switching
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  const leftSidebar = document.querySelector('.left-sidebar');
  const rightSidebar = document.querySelector('.right-sidebar');

  mobileTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      mobileTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (tab === 'map') {
        if (leftSidebar) leftSidebar.classList.remove('mobile-active');
        if (rightSidebar) rightSidebar.classList.remove('mobile-active');
        setTimeout(() => map.resize(), 100);
      } else if (tab === 'zones') {
        if (rightSidebar) rightSidebar.classList.remove('mobile-active');
        if (leftSidebar) leftSidebar.classList.add('mobile-active');
      } else if (tab === 'stats') {
        if (leftSidebar) leftSidebar.classList.remove('mobile-active');
        if (rightSidebar) rightSidebar.classList.add('mobile-active');
      } else if (tab === 'report') {
        const reportModal = document.getElementById('report-modal');
        if (reportModal) reportModal.classList.remove('hidden');
      }
    });
  });

  // Auto-close sidebar on mobile when selecting an action
  if (window.innerWidth <= 1024) {
    document.querySelectorAll('.mode-btn, .zone-card, .thumb-item').forEach(el => {
      el.addEventListener('click', () => {
        if (leftSidebar) leftSidebar.classList.remove('mobile-active');
        const mapTab = document.querySelector('.mobile-tab-btn[data-tab="map"]');
        if (mapTab) {
          mobileTabBtns.forEach(b => b.classList.remove('active'));
          mapTab.classList.add('active');
        }
        setTimeout(() => map.resize(), 100);
      });
    });
  }

  // 7. Project Onboarding Wizard Modal Handlers
  const newProjModal = document.getElementById('new-project-modal');
  const openNewProjBtn = document.getElementById('btn-open-new-project');
  const closeNewProjBtn = document.getElementById('btn-close-new-project');
  const newProjForm = document.getElementById('new-project-form');

  if (openNewProjBtn && newProjModal) {
    openNewProjBtn.addEventListener('click', () => {
      newProjModal.classList.remove('hidden');
    });
  }

  if (closeNewProjBtn && newProjModal) {
    closeNewProjBtn.addEventListener('click', () => {
      newProjModal.classList.add('hidden');
    });
  }

  // Handle Photo & Excel Upload Status in Wizard
  const photoInput = document.getElementById('np-photos-file');
  const photoStatus = document.getElementById('np-photos-status');
  if (photoInput && photoStatus) {
    photoInput.addEventListener('change', (e) => {
      const count = e.target.files ? e.target.files.length : 0;
      photoStatus.textContent = `${count}개 사진 파일 선택됨 (GPS 자동 추출 대기)`;
    });
  }

  const excelInput = document.getElementById('np-excel-file');
  const excelStatus = document.getElementById('np-excel-status');
  if (excelInput && excelStatus) {
    excelInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        excelStatus.textContent = `선택됨: ${e.target.files[0].name}`;
      }
    });
  }

  // Wizard Form Submit (Create New Project)
  if (newProjForm) {
    newProjForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('np-name').value;
      const shortName = document.getElementById('np-short-name').value;
      const agency = document.getElementById('np-agency').value;
      const contractor = document.getElementById('np-contractor').value;
      const location = document.getElementById('np-location').value;
      const lat = parseFloat(document.getElementById('np-lat').value) || 36.5;
      const lng = parseFloat(document.getElementById('np-lng').value) || 127.0;
      const area = parseFloat(document.getElementById('np-area').value) || 50000;
      const kg = parseFloat(document.getElementById('np-kg').value) || 10000;
      const budget = parseFloat(document.getElementById('np-budget').value) || 15000000;
      const species = document.getElementById('np-species').value;

      const newId = `proj_${Date.now()}`;

      // Create Custom Project Record
      const newProj = {
        id: newId,
        name: name,
        short_name: shortName,
        agency: agency,
        contractor: contractor,
        location_name: location,
        center_coords: [lng, lat],
        zoom: 16.0,
        pitch: 65,
        bearing: 45,
        target_species: species,
        total_area_sqm: area,
        total_budget: budget,
        target_kg: kg,
        target_workers: 30,
        zones_file: "data/zones.geojson", // Fallback / linked
        work_logs_file: "data/work_logs.json",
        photos_file: "data/photos.json",
        kpis: {
          total_target_area: area,
          cum_removed_area: Math.round(area * 0.3),
          progress_pct: 30.0,
          cum_removed_kg: Math.round(kg * 0.25),
          target_kg: kg,
          cum_workers: 8,
          target_workers: 30,
          total_budget: budget,
          spent_budget: Math.round(budget * 0.2),
          budget_pct: 20.0
        },
        flight_tour: [
          { lng: lng, lat: lat, alt: 180, pitch: 65, bearing: 45, speed: 10.0, name: `${shortName} 상공 순회 비행` }
        ]
      };

      // Save to localStorage
      const existingCustom = localStorage.getItem('custom_drone_projects');
      let customList = existingCustom ? JSON.parse(existingCustom) : [];
      customList.push(newProj);
      localStorage.setItem('custom_drone_projects', JSON.stringify(customList));

      // Add to UI Selector & Switch
      projects.push(newProj);
      if (selector) {
        const opt = document.createElement('option');
        opt.value = newProj.id;
        opt.textContent = `🛸 ${newProj.short_name}`;
        selector.appendChild(opt);
        selector.value = newProj.id;
      }

      alert(`🎉 [${name}] 신규 사업 프로젝트가 등록되었습니다!\n즉시 3D 드론 관제 화면으로 전환합니다.`);
      newProjModal.classList.add('hidden');
      loadProject(newProj.id);
    });
  }

  console.log("✅ Universal Ecosystem Drone Monitoring Platform Ready!");
});
