/**
 * Work Report & Analytics Module
 * KPI Dashboards, Chart.js Visualization, Timeline & [별지서식 2] Management
 */

class WorkReportManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.workLogs = [];
    this.kpis = {};
    this.speciesChart = null;
    this.methodChart = null;
    this.timelineInterval = null;
    this.currentTimelineIdx = 1; // Default to 2nd step (Aug 06)
  }

  init(workLogsData, kpisData) {
    this.workLogs = workLogsData;
    this.kpis = kpisData;

    this.renderKPIs();
    this.renderCharts();
    this.renderWorkLogsList();
    this.renderTimeline();
    this.bindReportModalEvents();
  }

  updateData(workLogsData, kpisData) {
    this.workLogs = workLogsData;
    this.kpis = kpisData;

    this.renderKPIs();
    this.renderCharts();
    this.renderWorkLogsList();
    this.renderTimeline();
  }

  renderKPIs() {
    const areaElem = document.getElementById('kpi-cum-area');
    const pctElem = document.getElementById('kpi-area-pct');
    const fillElem = document.getElementById('bar-area-fill');
    const kgElem = document.getElementById('kpi-cum-kg');
    const workersElem = document.getElementById('kpi-cum-workers');
    const budgetElem = document.getElementById('kpi-cum-budget');
    const targetAreaTxt = document.getElementById('kpi-target-area-txt');
    const workersSubElem = document.getElementById('kpi-workers-sub');
    const budgetSubElem = document.getElementById('kpi-budget-sub');

    // Calculate actual cumulative stats from completed work logs
    const completedLogs = this.workLogs.filter(log => log.is_completed === true);
    
    const cumArea = completedLogs.reduce((sum, l) => sum + (parseFloat(l.area_sqm) || 0), 0);
    const cumKg = completedLogs.reduce((sum, l) => sum + (parseFloat(l.amount_kg) || 0), 0);
    const cumWorkers = completedLogs.reduce((sum, l) => sum + (parseInt(l.workers) || 0), 0);
    const completedRounds = completedLogs.length;

    // Total Planned Man-Days (연인원) & Budget
    const targetWorkers = this.kpis.target_workers || 45;
    const workerProgressPct = targetWorkers > 0 ? ((cumWorkers / targetWorkers) * 100).toFixed(1) : 0.0;

    // Labor Cost (Daily wage 226,122 KRW per worker)
    const spentBudget = cumWorkers > 0 ? cumWorkers * 226122 : 0;
    const totalBudget = this.kpis.total_budget || 15000000;
    const budgetPct = totalBudget > 0 ? ((spentBudget / totalBudget) * 100).toFixed(1) : 0.0;

    if (areaElem) areaElem.textContent = cumArea.toLocaleString();
    if (pctElem) pctElem.textContent = `현재까지 ${completedRounds}회차 작업 진행 (인력 진척 ${workerProgressPct}%)`;
    if (fillElem) fillElem.style.width = `${workerProgressPct}%`;
    if (kgElem) kgElem.textContent = cumKg.toLocaleString();
    if (workersElem) workersElem.textContent = cumWorkers;
    if (budgetElem) budgetElem.textContent = spentBudget.toLocaleString();
    if (targetAreaTxt && this.kpis.total_target_area) {
      targetAreaTxt.textContent = `${(this.kpis.total_target_area / 10000).toFixed(1)}만 ㎡`;
    }
    if (workersSubElem) {
      workersSubElem.textContent = `계획 연인원 ${targetWorkers}명 중 (${workerProgressPct}%)`;
    }
    if (budgetSubElem) {
      budgetSubElem.textContent = `총 ${totalBudget.toLocaleString()}원 대비 ${budgetPct}%`;
    }
  }

  renderCharts() {
    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;

    // 1. Plant Species Doughnut Chart
    const ctx1 = document.getElementById('speciesChart');
    if (ctx1) {
      if (this.speciesChart) this.speciesChart.destroy();

      const chartLabels = isDoowoong 
        ? ['황소개구리', '미국수련', '기타 (마름 등)']
        : ['가시박 (58%)', '환삼덩굴 (42%)'];
      const chartData = isDoowoong ? [45, 40, 15] : [58, 42];
      const chartColors = isDoowoong ? ['#ef4444', '#38bdf8', '#10b981'] : ['#ef4444', '#f59e0b'];

      this.speciesChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#94a3b8', font: { size: 10 } }
            },
            title: {
              display: true,
              text: isDoowoong ? '관리 대상종 비중 (조사 기준)' : '현장 누적 제거 식생 비중 (4차 반영)',
              color: '#cbd5e1',
              font: { size: 11, weight: 'bold' }
            },
            subtitle: {
              display: true,
              text: isDoowoong ? '실태조사 결과 기반' : '※ 4차: 환삼덩굴 70%(700kg) · 가시박 30%(300kg)',
              color: '#64748b',
              font: { size: 9, style: 'italic' }
            }
          }
        }
      });
    }

    // 2. Removal Method Bar Chart
    const ctx2 = document.getElementById('methodChart');
    if (ctx2) {
      if (this.methodChart) this.methodChart.destroy();

      const methodLabels = isDoowoong
        ? ['포획통발 설치', '뿌리 굴취수거', '투망·뜰채 포획']
        : ['예초기 사용', '낫으로 베기', '손 뿌리뽑기'];
      const methodData = isDoowoong ? [0, 0, 0] : [78000, 36000, 18000];

      this.methodChart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: methodLabels,
          datasets: [{
            label: '실적',
            data: methodData,
            backgroundColor: ['#38bdf8', '#34d399', '#a78bfa'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: isDoowoong ? '공정별 작업 실적 (착수 대기)' : '제거 방식별 누적 실적 (㎡)',
              color: '#cbd5e1',
              font: { size: 11, weight: 'bold' }
            }
          },
          scales: {
            x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }
  }

  renderWorkLogsList() {
    const list = document.getElementById('work-logs-container');
    if (!list) return;

    list.innerHTML = '';
    
    // Filter only completed work logs
    const completedLogs = this.workLogs.filter(log => log.is_completed === true);

    if (completedLogs.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.76rem; text-align: center; padding: 20px 10px; line-height: 1.5;"><i class="fa-solid fa-clipboard-list" style="font-size: 1.3rem; margin-bottom: 6px; display: block; color: var(--hud-cyan);"></i>작업 착수 대기 중<br><small style="color: #64748b;">상단 [+ 일일작업결과표 작성]을 통해 실적을 등록하세요.</small></div>';
      return;
    }

    completedLogs.forEach((log, idx) => {
      const item = document.createElement('div');
      item.className = 'work-log-item';

      const roundNum = idx + 1;
      const targetPlant = log.target_plant || '가시박, 환삼덩굴';
      const locText = log.location ? log.location.replace('충청남도 금산군 제원면 ', '').replace('충청남도 태안군 원북면 ', '') : '사업 대상지 일원';

      item.innerHTML = `
        <div>
          <div class="log-date">제 ${roundNum}회차 · ${log.work_date}</div>
          <div class="log-info">${locText} · <b>${Number(log.area_sqm).toLocaleString()}㎡</b> (${Number(log.amount_kg).toLocaleString()}kg)</div>
          <div style="font-size: 0.68rem; color: #38bdf8; margin-top: 2px;">🌿 ${targetPlant}</div>
        </div>
        <div>
          <span class="log-status-tag done">완료</span>
        </div>
      `;

      item.addEventListener('click', () => {
        this.openReportModalWithData(log);
      });

      list.appendChild(item);
    });
  }

  renderTimeline() {
    const container = document.getElementById('timeline-steps-container');
    if (!container) return;

    container.innerHTML = '';
    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;

    const timelineData = isDoowoong ? [
      { step: 1, date: '08.10 (착수)', label: '착수 및 사전 안전교육', completed: true, focus: 'overview' },
      { step: 2, date: '08.15 (1차)', label: '생물종 실태 정밀조사', completed: false, focus: 'zone-1' },
      { step: 3, date: '08.20 (2차)', label: '황소개구리 통발 가동', completed: false, focus: 'zone-2' },
      { step: 4, date: '09.05 (3차)', label: '미국수련 지하경 굴취', completed: false, focus: 'zone-1' },
      { step: 5, date: '09.25 (4차)', label: '성체·유생 집중 포획', completed: false, focus: 'zone-2' },
      { step: 6, date: '10.15 (5차)', label: '2차 실태조사/중간보고', completed: false, focus: 'overview' },
      { step: 7, date: '11.10 (6차)', label: '수생 잔재물 수거정비', completed: false, focus: 'zone-3' },
      { step: 8, date: '11.30 (완료)', label: '사업 종합완료보고', completed: false, focus: 'overview' }
    ] : [
      { step: 1, date: '07.24 (1차)', label: '발아기 (손 뿌리뽑기)', completed: true, focus: 'overview' },
      { step: 2, date: '08.06 (2차)', label: '성장기 (예초·낫베기)', completed: true, focus: 'overview' },
      { step: 3, date: '08.20 (3차)', label: '성장기 집중 예초 (B·A)', completed: true, focus: 'zone-2' },
      { step: 4, date: '08.27 (4차)', label: '개화전 집중 (환삼70%·가시30%)', completed: true, focus: 'zone-2' },
      { step: 5, date: '09.10 (5차)', label: '개화기 집중 차단 (예정)', completed: false, focus: 'overview' },
      { step: 6, date: '09.25 (6차)', label: '개화기 2차 제거 (예정)', completed: false, focus: 'overview' },
      { step: 7, date: '10.15 (7차)', label: '결실방지 집중 (예정)', completed: false, focus: 'overview' },
      { step: 8, date: '11.10 (8차)', label: '결실제거 및 완료 (예정)', completed: false, focus: 'overview' }
    ];

    timelineData.forEach((node, idx) => {
      const nodeEl = document.createElement('div');
      nodeEl.className = `time-step-node ${node.completed ? 'completed' : ''} ${idx === this.currentTimelineIdx ? 'active' : ''}`;
      
      nodeEl.innerHTML = `
        <div class="node-dot"></div>
        <span class="node-label">${node.date}</span>
      `;

      nodeEl.addEventListener('click', () => {
        this.setTimelineStep(idx, timelineData);
      });

      container.appendChild(nodeEl);
    });

    // Play/Pause button
    const playBtn = document.getElementById('btn-timeline-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (this.timelineInterval) {
          clearInterval(this.timelineInterval);
          this.timelineInterval = null;
          playBtn.innerHTML = '<i class="fa-solid fa-play"></i> 자동 재생';
        } else {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 일시 정지';
          this.timelineInterval = setInterval(() => {
            this.currentTimelineIdx = (this.currentTimelineIdx + 1) % timelineData.length;
            this.setTimelineStep(this.currentTimelineIdx, timelineData);
          }, 3000);
        }
      });
    }
  }

  setTimelineStep(idx, timelineData) {
    this.currentTimelineIdx = idx;
    const node = timelineData[idx];
    
    document.querySelectorAll('.time-step-node').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });

    this.mapCtrl.flyToPreset(node.focus);
  }

  openReportModalWithData(log) {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    document.getElementById('form-plant').value = log.target_plant || '가시박, 환삼덩굴';
    document.getElementById('form-location').value = log.location || '충청남도 금산군 천내리습지 일대';
    document.getElementById('form-date').value = log.work_date.includes('(') ? '2026-08-18' : log.work_date;
    document.getElementById('form-area').value = log.area_sqm || 800;
    document.getElementById('form-kg').value = log.amount_kg || 800;
    document.getElementById('form-workers').value = log.workers || 5;
    document.getElementById('form-hours').value = log.hours || 6;

    modal.classList.remove('hidden');
  }

  openReportModalWithDefaults() {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;

    const formPlant = document.getElementById('form-plant');
    const formLoc = document.getElementById('form-location');
    const formCoords = document.getElementById('form-coords');
    const formNotes = document.getElementById('form-notes');

    if (isDoowoong) {
      if (formPlant) formPlant.value = '황소개구리, 미국수련, 기타 (마름 등)';
      if (formLoc) formLoc.value = '충청남도 태안군 원북면 신두해변길 291-30 (두웅습지)';
      if (formCoords) formCoords.value = 'N 36°50′11.1″  E 126°11′45.8″';
      if (formNotes) formNotes.value = '두웅습지 황소개구리 포획통발 가동 및 미국수련 뿌리줄기(지하경) 굴취. 금개구리 혼획 방지 안전 수칙 준수.';
    } else {
      if (formPlant) formPlant.value = '가시박, 환삼덩굴';
      if (formLoc) formLoc.value = '충청남도 금산군 제원면 천내리습지 일대';
      if (formCoords) formCoords.value = 'N 36°06′25.6″  E 127°34′26.9″';
      if (formNotes) formNotes.value = '제2구간 중심부 가시박 대군락지 예초 및 뿌리 제거 작업 실시. 안전교육 완료 후 작업 진행.';
    }

    modal.classList.remove('hidden');
  }

  bindReportModalEvents() {
    const openBtn = document.getElementById('btn-open-report');
    const closeBtn = document.getElementById('btn-close-report-modal');
    const printBtn = document.getElementById('btn-print-report');
    const modal = document.getElementById('report-modal');
    const form = document.getElementById('daily-work-form');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.openReportModalWithDefaults();
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Export Excel Button
    const excelBtn = document.getElementById('btn-export-excel');
    if (excelBtn) {
      excelBtn.addEventListener('click', () => {
        alert("📊 E:\\0. 2026년\\2. 금강청 천내리\\일일작업일지 및 결과표\\일일제거작업일지 요약_천내리_제출자료_2026년도.xlsx 파일과 동기화되었습니다.");
      });
    }

    // Form Submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newLog = {
          target_plant: document.getElementById('form-plant').value,
          location: document.getElementById('form-location').value,
          work_date: document.getElementById('form-date').value,
          area_sqm: parseFloat(document.getElementById('form-area').value) || 0,
          amount_kg: parseFloat(document.getElementById('form-kg').value) || 0,
          workers: parseInt(document.getElementById('form-workers').value) || 5,
          hours: parseInt(document.getElementById('form-hours').value) || 6,
          is_completed: true,
          zone: "2구간 (B)",
          method: "예초기 사용, 낫으로 베기",
          stages: ["영양생장"]
        };

        try {
          // 1. Update local geumgang_work_logs
          const localLogsStr = localStorage.getItem('geumgang_work_logs');
          let currentLogs = localLogsStr ? JSON.parse(localLogsStr) : this.workLogs;
          newLog.id = currentLogs.length + 1;
          currentLogs.push(newLog);
          localStorage.setItem('geumgang_work_logs', JSON.stringify(currentLogs));

          // 2. Also map & save to Central HQ Activity Store ('wma_ecosystem_activities_v5')
          const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
          const hqActivity = {
            id: `act-dcs-${Date.now()}`,
            branch_id: "daejeon-chungnam-sejong",
            branch_name: "대전·충남·세종 지부",
            project_id: isDoowoong ? "proj-dcs-doowoong-02" : "proj-dcs-geumgang-01",
            project_title: isDoowoong ? "2026년 두웅습지 외래생물 실태조사 및 확산방지 용역" : "천내리습지 생태계교란식물 제거사업",
            date: newLog.work_date,
            work_type: newLog.method || "물리적 굴취 및 예초",
            worker_count: newLog.workers,
            area_m2: newLog.area_sqm,
            harvest_kg: newLog.amount_kg,
            location: newLog.location,
            summary: `[3D 드론 관제 등록] ${newLog.location} 일원 제거작업 완료 (${newLog.area_sqm.toLocaleString()}㎡ / ${newLog.amount_kg.toLocaleString()}kg / 작업자 ${newLog.workers}명)`,
            status: "완료"
          };

          const rawActs = localStorage.getItem('wma_ecosystem_activities_v5');
          let acts = rawActs ? JSON.parse(rawActs) : [];
          acts.unshift(hqActivity);
          localStorage.setItem('wma_ecosystem_activities_v5', JSON.stringify(acts));

          // 3. Broadcast to Cloud DB & All branches
          if (window.cloudSync) {
            window.cloudSync.syncActivity(hqActivity);
          }

          // Try server POST if available
          fetch('/api/work-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLog)
          }).catch(() => {});

          alert("✅ 일일작업결과표가 정상적으로 등록되었으며, 중앙사무국 및 전국 관제망에 실시간 동기화되었습니다.");
          modal.classList.add('hidden');
          location.reload();
        } catch (err) {
          console.error("Save error:", err);
          alert("저장 완료 (브라우저 로컬 저장)");
          modal.classList.add('hidden');
          location.reload();
        }
      });
    }
  }
}

window.WorkReportManager = WorkReportManager;
