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

  // Dynamic Work Logs Merger for Real-time HQ Cloud Sync
  function getMergedWorkLogs(projectId, baseWorkLogs) {
    let merged = Array.isArray(baseWorkLogs) ? [...baseWorkLogs] : [];

    // 1. Check dynamic activities in localStorage ('wma_ecosystem_activities_v5')
    const localActivitiesStr = localStorage.getItem('wma_ecosystem_activities_v5');
    let centralActivities = [];
    if (localActivitiesStr) {
      try {
        centralActivities = JSON.parse(localActivitiesStr);
      } catch (e) {}
    }

    // Also check geumgang_work_logs for backward compatibility
    const geumgangLocal = localStorage.getItem('geumgang_work_logs');
    if (geumgangLocal) {
      try {
        const gLogs = JSON.parse(geumgangLocal);
        gLogs.forEach(gl => {
          if (!merged.some(m => m.work_date === gl.work_date)) {
            merged.push(gl);
          }
        });
      } catch (e) {}
    }

    // 2. Filter activities relevant to this project
    const isCheonnaeri = projectId === 'cheonnaeri';
    const isDoowoong = projectId === 'doowoong';

    const relevantActivities = centralActivities.filter(act => {
      if (isCheonnaeri) {
        return act.project_id === 'proj-dcs-geumgang-01' ||
               (act.project_title && act.project_title.includes('천내리')) ||
               (act.location && act.location.includes('천내리'));
      }
      if (isDoowoong) {
        return act.project_id === 'proj-dcs-doowoong-02' ||
               (act.project_title && act.project_title.includes('두웅')) ||
               (act.location && act.location.includes('두웅'));
      }
      return act.project_id === projectId;
    });

    console.log(`📡 [Sync] Found ${relevantActivities.length} dynamic activities from Central HQ for ${projectId}`);

    // 3. Map activities to work_logs format and merge
    relevantActivities.forEach((act, actIdx) => {
      const actDate = act.date || '2026-08-27';
      const actArea = Number(act.area_m2) || 0;
      const actKg = Number(act.harvest_kg) || 0;
      const actWorkers = Number(act.worker_count) || 0;

      // Check if this date/id already exists in completed logs
      const existingIdx = merged.findIndex(log => 
        (log.id && log.id === act.id) || 
        (log.work_date === actDate && log.is_completed)
      );

      const mappedLog = {
        id: act.id || (merged.length + 1),
        target_plant: isDoowoong ? '황소개구리, 미국수련' : '가시박, 환삼덩굴',
        location: act.location || (isDoowoong ? '두웅습지 람사르보호지역' : '천내리 습지 일대'),
        work_date: actDate,
        is_completed: true,
        method: act.work_type || (isDoowoong ? '포획통발 및 뿌리 굴취' : '낫으로 베기, 예초기 사용'),
        stages: ['영양생장'],
        width_m: 600,
        length_m: 60,
        area_sqm: actArea,
        hours: 6,
        amount_kg: actKg,
        workers: actWorkers,
        summary: act.summary || ''
      };

      if (existingIdx >= 0) {
        merged[existingIdx] = Object.assign({}, merged[existingIdx], mappedLog);
      } else {
        // Find if there is an uncompleted planned log for this month or append
        const plannedIdx = merged.findIndex(log => log.is_completed === false && log.work_date && log.work_date.startsWith(actDate.slice(0, 7)));
        if (plannedIdx >= 0 && actArea > 0) {
          merged[plannedIdx] = Object.assign({}, merged[plannedIdx], mappedLog);
        } else {
          // Insert right after last completed item
          let insertIdx = -1;
          for (let i = merged.length - 1; i >= 0; i--) {
            if (merged[i].is_completed) {
              insertIdx = i + 1;
              break;
            }
          }
          if (insertIdx >= 0) {
            merged.splice(insertIdx, 0, mappedLog);
          } else {
            merged.unshift(mappedLog);
          }
        }
      }
    });

    return merged;
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
        fetch(currentProject.zones_file + `?t=${Date.now()}`),
        fetch(currentProject.photos_file + `?t=${Date.now()}`),
        fetch(currentProject.work_logs_file + `?t=${Date.now()}`)
      ]);

      if (zRes && zRes.ok) zonesData = await zRes.json();
      if (pRes && pRes.ok) photosData = await pRes.json();
      if (wRes && wRes.ok) workLogsData = await wRes.json();
    } catch (err) {
      console.warn("Project data fetch fallback:", err);
    }

    // Safety fallback for photos if empty
    if (!photosData || photosData.length === 0) {
      try {
        const pFallback = await fetch('data/photos.json');
        if (pFallback.ok) photosData = await pFallback.json();
      } catch (e) {}
    }

    // 3. Merge Dynamic Real-time Activities from Central HQ
    workLogsData = getMergedWorkLogs(projectId, workLogsData);

    console.log(`Loaded ${photosData ? photosData.length : 0} photos and ${workLogsData.length} work logs for ${projectId}`);

    // 4. Update 3D Camera & Context
    mapCtrl.setProjectContext(currentProject);

    // 5. Update Sub-Managers
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

    // 5. Update Flight Mode Button Labels
    const labels = currentProject.button_labels;
    const bTour = document.querySelector('.mode-btn[data-mode="tour"]');
    const bOver = document.querySelector('.mode-btn[data-mode="overview"]');
    const bZ1 = document.querySelector('.mode-btn[data-mode="zone-1"]');
    const bZ2 = document.querySelector('.mode-btn[data-mode="zone-2"]');
    const bZ3 = document.querySelector('.mode-btn[data-mode="zone-3"]');

    if (labels) {
      if (bTour && labels["tour"]) bTour.querySelector('span').textContent = labels["tour"];
      if (bOver && labels["overview"]) bOver.querySelector('span').textContent = labels["overview"];
      if (bZ1 && labels["zone-1"]) {
        bZ1.querySelector('span').textContent = labels["zone-1"];
        bZ1.querySelector('small').textContent = labels["zone-1-sub"] || '';
      }
      if (bZ2 && labels["zone-2"]) {
        bZ2.querySelector('span').textContent = labels["zone-2"];
        bZ2.querySelector('small').textContent = labels["zone-2-sub"] || '';
      }
      if (bZ3 && labels["zone-3"]) {
        bZ3.querySelector('span').textContent = labels["zone-3"];
        bZ3.querySelector('small').textContent = labels["zone-3-sub"] || '';
      }
    } else {
      // Default Cheonnaeri Labels
      if (bTour) bTour.querySelector('span').textContent = "강줄기 순회 비행";
      if (bOver) bOver.querySelector('span').textContent = "전체 부감 뷰";
      if (bZ1) {
        bZ1.querySelector('span').textContent = "제원대교 상류";
        bZ1.querySelector('small').textContent = "상류 진입부 28,836㎡";
      }
      if (bZ2) {
        bZ2.querySelector('span').textContent = "습지 중심부";
        bZ2.querySelector('small').textContent = "가시박 대군락 72,803㎡";
      }
      if (bZ3) {
        bZ3.querySelector('span').textContent = "습지 하류부";
        bZ3.querySelector('small').textContent = "하류 차단구역 43,167㎡";
      }
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

  // 8. Initialize Nationwide Real-time Cloud Synchronization
  if (window.cloudSync) {
    window.cloudSync.init().then(() => {
      window.cloudSync.subscribeToCloudData((remoteData) => {
        console.log("☁️ [CloudSync] Nationwide data sync received in 3D Drone Monitor!");
        if (remoteData && remoteData.activities) {
          localStorage.setItem('wma_ecosystem_activities_v5', JSON.stringify(remoteData.activities));
        }
        if (currentProject) {
          loadProject(currentProject.id);
        }
      });
    });

    const syncPill = document.getElementById('header-live-sync-pill');
    window.cloudSync.onStatusChange((status) => {
      if (!syncPill) return;
      if (status === 'connected') {
        syncPill.className = 'live-status-pill connected';
        syncPill.innerHTML = '<span class="live-dot" style="width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span><span class="sync-text">중앙 전산망 실시간 연동</span>';
      } else {
        syncPill.className = 'live-status-pill offline';
        syncPill.innerHTML = '<span class="live-dot" style="width:7px; height:7px; border-radius:50%; background:#38bdf8; box-shadow:0 0 8px #38bdf8;"></span><span class="sync-text">전산망 동기화 가동 중</span>';
      }
    });
  }

  // 9. Inter-Tab & Window Live BroadcastChannel Listener
  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel('wma_ecosystem_national_channel');
    bc.onmessage = (e) => {
      const { type, payload, sender } = e.data || {};
      console.log(`📡 [BroadcastChannel] Received [${type}] from ${sender}`);
      if (type === 'ACTIVITY_ADDED' || type === 'SYNC_ALL') {
        if (payload && payload.newActivity) {
          const raw = localStorage.getItem('wma_ecosystem_activities_v5');
          let acts = raw ? JSON.parse(raw) : [];
          if (!acts.some(a => a.id === payload.newActivity.id)) {
            acts.push(payload.newActivity);
            localStorage.setItem('wma_ecosystem_activities_v5', JSON.stringify(acts));
          }
        }
        if (currentProject) {
          loadProject(currentProject.id);
        }
      }
    };
  }

  // Listen to custom local data sync events
  window.addEventListener('wma_data_synced', () => {
    if (currentProject) {
      loadProject(currentProject.id);
    }
  });

  console.log("✅ Universal Ecosystem Drone Monitoring Platform Ready with Nationwide Cloud Sync!");
});
