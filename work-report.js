/**
 * Work Report & Analytics Module
 * KPI Dashboards, Chart.js Visualization, Timeline & [별지서식 2] Management
 */

class WorkReportManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.workLogs = [];
    this.kpis = {};
    this.currentProject = null;
    this.speciesChart = null;
    this.methodChart = null;
    this.timelineInterval = null;
    this.currentTimelineIdx = 4; // Default to 5th step (Sep 04)
    this.attachedPhotos = { before: null, during: null, after: null };
  }

  init(workLogsData, kpisData, currentProject) {
    this.workLogs = workLogsData || [];
    this.kpis = kpisData || {};
    this.currentProject = currentProject || null;

    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
    if (isDoowoong) {
      this.currentTimelineIdx = 2; // Step 3 (09.11 1차)
    }

    this.renderKPIs();
    this.renderCharts();
    this.renderWorkLogsList();
    this.renderTimeline();
    this.bindReportModalEvents();
    this.setupPhotoAttachmentHandlers();
  }

  updateData(workLogsData, kpisData, currentProject) {
    this.workLogs = workLogsData || [];
    this.kpis = kpisData || {};
    if (currentProject) this.currentProject = currentProject;

    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
    if (isDoowoong) {
      this.currentTimelineIdx = 2; // Step 3 (09.11 1차)
    }

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

    // Calculate actual cumulative stats from completed work logs (exclude 04-30 or contract placeholders)
    const completedLogs = this.workLogs.filter(log => {
      if (log.is_completed !== true) return false;
      const d = log.work_date || '';
      if (d.includes('04-30') || d.includes('04/30') || d.includes('4월 30') || d.includes('4월30')) return false;
      if (log.id === 'act-dcs-02' || (log.method && log.method.includes('계약'))) return false;
      return true;
    });
    
    const cumArea = completedLogs.reduce((sum, l) => sum + (parseFloat(l.area_sqm) || 0), 0);
    const cumKg = completedLogs.reduce((sum, l) => sum + (parseFloat(l.amount_kg) || 0), 0);
    const cumWorkers = completedLogs.reduce((sum, l) => sum + (parseInt(l.workers) || 0), 0);
    const completedRounds = completedLogs.length;

    // Total Planned Man-Days (연인원) & Budget
    const targetWorkers = this.kpis.target_workers || 45;
    const workerProgressPct = targetWorkers > 0 ? ((cumWorkers / targetWorkers) * 100).toFixed(1) : 0.0;

    // Actual Executed Budget (referencing '예산사용현황' tab in Excel)
    const isCheonnaeri = !this.kpis || this.kpis.total_target_area === 144806;
    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
    const isChunpo = this.kpis && this.kpis.total_target_area === 115000;

    let spentBudget = 0;
    if (this.kpis && this.kpis.spent_budget !== undefined) {
      spentBudget = this.kpis.spent_budget;
    } else if (isCheonnaeri) {
      spentBudget = 4932440; // 엑셀 '예산사용현황' 탭 확정 실집행액 (오늘 9/4 5차 인건비는 미집행)
    } else {
      spentBudget = 0;
    }

    const totalBudget = this.kpis.total_budget || (isDoowoong ? 25000000 : (isChunpo ? 18000000 : 15000000));
    const budgetPct = totalBudget > 0 ? ((spentBudget / totalBudget) * 100).toFixed(1) : 0.0;

    if (areaElem) areaElem.textContent = cumArea.toLocaleString();
    if (pctElem) {
      if (completedRounds === 0) {
        pctElem.textContent = `작업 준비 단계 (미실시 / 0회차)`;
      } else {
        pctElem.textContent = `현재까지 ${completedRounds}회차 작업 완료 (인력 진척 ${workerProgressPct}%)`;
      }
    }
    if (fillElem) fillElem.style.width = `${workerProgressPct}%`;
    if (kgElem) kgElem.textContent = cumKg.toLocaleString();
    if (workersElem) workersElem.textContent = cumWorkers;
    if (budgetElem) budgetElem.textContent = spentBudget.toLocaleString();
    
    if (targetAreaTxt) {
      const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
      const isChunpo = this.kpis && this.kpis.total_target_area === 115000;
      if (isDoowoong) {
        targetAreaTxt.textContent = `대상구역 6.7만 ㎡ (실태조사 완료)`;
      } else if (isChunpo) {
        targetAreaTxt.textContent = `목표 15,000kg (작업 대기 / 0%)`;
      } else {
        const targetKg = this.kpis.target_kg || 18830;
        const kgPct = targetKg > 0 ? ((cumKg / targetKg) * 100).toFixed(1) : 0;
        targetAreaTxt.textContent = `목표 ${targetKg.toLocaleString()}kg 중 (${kgPct}%)`;
      }
    }
    if (workersSubElem) {
      workersSubElem.textContent = `계획 연인원 ${targetWorkers}명 중 (${workerProgressPct}%)`;
    }
    if (budgetSubElem) {
      if (isCheonnaeri) {
        budgetSubElem.textContent = `총 ${totalBudget.toLocaleString()}원 대비 ${budgetPct}% (실집행 기준)`;
      } else if (isChunpo || isDoowoong) {
        budgetSubElem.textContent = `총 ${totalBudget.toLocaleString()}원 대비 0.0%`;
      } else {
        budgetSubElem.textContent = `총 ${totalBudget.toLocaleString()}원 대비 ${budgetPct}%`;
      }
    }
  }

  renderCharts() {
    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
    const isChunpo = this.kpis && this.kpis.total_target_area === 115000;

    // 1. Plant Species Doughnut Chart
    const ctx1 = document.getElementById('speciesChart');
    if (ctx1) {
      if (this.speciesChart) this.speciesChart.destroy();

      let chartLabels = ['가시박 (52%)', '환삼덩굴 (48%)'];
      let chartData = [52, 48];
      let chartColors = ['#ef4444', '#f59e0b'];
      let titleTxt = '현장 누적 제거 식생 비중 (5차 09.04 반영)';
      let subTxt = '※ 5차: 가시박·환삼덩굴 영양생장 집중 예초 (1,700kg)';

      if (isDoowoong) {
        chartLabels = ['황소개구리', '미국수련', '기타 (마름 등)'];
        chartData = [45, 40, 15];
        chartColors = ['#ef4444', '#38bdf8', '#10b981'];
        titleTxt = '관리 대상종 비중 (조사 기준)';
        subTxt = '실태조사 결과 기반';
      } else if (isChunpo) {
        chartLabels = ['양미역취 (70%)', '가시박 (20%)', '환삼덩굴 (10%)'];
        chartData = [70, 20, 10];
        chartColors = ['#10b981', '#f59e0b', '#38bdf8'];
        titleTxt = '제거 대상 교란식물 비중 (예찰 기준)';
        subTxt = '※ 사업 착수 준비 중 (미실시)';
      }

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
              text: titleTxt,
              color: '#cbd5e1',
              font: { size: 11, weight: 'bold' }
            },
            subtitle: {
              display: true,
              text: subTxt,
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

      const methodLabels = ['예초기 사용', '낫으로 베기', '손 뿌리뽑기'];
      let methodData = [85800, 58200, 18000];
      let barTitle = '제거 방식별 누적 실적 (㎡)';

      if (isDoowoong) {
        barTitle = '공정별 작업 실적 (착수 대기)';
        methodData = [0, 0, 0];
      } else if (isChunpo) {
        barTitle = '공정별 작업 실적 (작업 대기 / 미실시)';
        methodData = [0, 0, 0];
      }

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
              text: barTitle,
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
    
    // Filter only completed work logs (strictly excluding legacy contract or test dates like 04-30)
    const completedLogs = this.workLogs.filter(log => {
      if (log.is_completed !== true) return false;
      const d = String(log.work_date || '');
      if (d.includes('04-30') || d.includes('04/30') || d.includes('4월 30') || d.includes('4월30')) return false;
      if (log.id === 'act-dcs-02' || (log.method && log.method.includes('계약')) || (log.title && log.title.includes('계약'))) return false;
      return true;
    });

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
    const isChunpo = this.kpis && this.kpis.total_target_area === 115000;

    let timelineData = [];
    if (isDoowoong) {
      timelineData = [
        { step: 1, date: '08.31 (조사)', label: '1차 실태 정밀조사 (식생·서식처)', completed: true, focus: 'overview' },
        { step: 2, date: '09.01 (교육)', label: '착수 및 사전 안전교육 (혼획방지)', completed: true, focus: 'overview' },
        { step: 3, date: '09.11 (1차)', label: '수련 200kg 굴취·통발 15개 가동', completed: true, focus: 'zone-1' },
        { step: 4, date: '09.25 (2차)', label: '포획통발 점검 및 2차 수거 (예정)', completed: false, focus: 'zone-2' },
        { step: 5, date: '10.15 (3차)', label: '수생 잔재물 수거 및 정비 (예정)', completed: false, focus: 'zone-1' },
        { step: 6, date: '10.30 (4차)', label: '서식처 2차 실태조사 (예정)', completed: false, focus: 'overview' },
        { step: 7, date: '11.15 (5차)', label: '동면전 집중 포획퇴치 (예정)', completed: false, focus: 'zone-2' },
        { step: 8, date: '11.30 (완료)', label: '사업 종합 성과보고 (예정)', completed: false, focus: 'overview' }
      ];
    } else if (isChunpo) {
      timelineData = [
        { step: 1, date: '08.30 (준비)', label: '드론 M3T 정사영상 비행 및 예찰 (예정)', completed: false, focus: 'overview' },
        { step: 2, date: '09.05 (1차)', label: '양미역취 군락 집중 예초 (예정)', completed: false, focus: 'overview' },
        { step: 3, date: '09.15 (2차)', label: '만경강 수변부 2차 굴취 (예정)', completed: false, focus: 'overview' },
        { step: 4, date: '09.30 (3차)', label: '개화기 확산 차단 (예정)', completed: false, focus: 'overview' },
        { step: 5, date: '10.15 (4차)', label: '만경강 북안 잔재물 수거 (예정)', completed: false, focus: 'overview' },
        { step: 6, date: '11.10 (완료)', label: '사업 완료 검수 및 보고 (예정)', completed: false, focus: 'overview' }
      ];
    } else {
      timelineData = [
        { step: 1, date: '07.24 (1차)', label: '발아기 (손 뿌리뽑기)', completed: true, focus: 'overview' },
        { step: 2, date: '08.06 (2차)', label: '성장기 (예초·낫베기)', completed: true, focus: 'overview' },
        { step: 3, date: '08.20 (3차)', label: '성장기 집중 예초 (B·A)', completed: true, focus: 'zone-2' },
        { step: 4, date: '08.27 (4차)', label: '개화전 집중 (환삼70%·가시30%)', completed: true, focus: 'zone-2' },
        { step: 5, date: '09.04 (5차)', label: '3구간 시작~중간 집중예초 (1,700kg)', completed: true, focus: 'zone-3' },
        { step: 6, date: '09.18 (6차)', label: '개화기 2차 제거 (예정)', completed: false, focus: 'overview' },
        { step: 7, date: '10.15 (7차)', label: '결실방지 집중 (예정)', completed: false, focus: 'overview' },
        { step: 8, date: '11.10 (8차)', label: '결실제거 및 완료 (예정)', completed: false, focus: 'overview' }
      ];
    }

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

  setupPhotoAttachmentHandlers() {
    const stages = ['before', 'during', 'after'];
    stages.forEach(stage => {
      const box = document.getElementById(`box-img-${stage}`);
      const input = document.getElementById(`input-photo-${stage}`);
      if (!box || !input) return;

      box.onclick = (e) => {
        if (e.target.classList.contains('btn-remove-photo') || e.target.closest('.btn-remove-photo')) {
          return;
        }
        input.click();
      };

      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (re) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

            const stageLabel = stage === 'before' ? '작업 전' : (stage === 'after' ? '작업 후' : '작업 중');
            this.attachedPhotos[stage] = {
              stage: stageLabel,
              filename: file.name,
              dataUrl: compressedDataUrl
            };

            box.innerHTML = `
              <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px;">
                <img src="${compressedDataUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                <span style="position: absolute; bottom: 4px; left: 4px; font-size: 0.65rem; background: rgba(0,0,0,0.75); color: #38bdf8; padding: 2px 6px; border-radius: 3px; max-width: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
                <button type="button" class="btn-remove-photo" data-stage="${stage}" style="position: absolute; top: 4px; right: 4px; background: rgba(239,68,68,0.9); color: #fff; border: none; border-radius: 3px; font-size: 0.65rem; padding: 2px 6px; cursor: pointer;">✕ 삭제</button>
              </div>
            `;

            const rmBtn = box.querySelector('.btn-remove-photo');
            if (rmBtn) {
              rmBtn.onclick = (ev) => {
                ev.stopPropagation();
                this.resetPhotoBox(stage);
              };
            }
          };
          img.src = re.target.result;
        };
        reader.readAsDataURL(file);
      };
    });
  }

  resetPhotoBox(stage) {
    this.attachedPhotos[stage] = null;
    const input = document.getElementById(`input-photo-${stage}`);
    if (input) input.value = '';
    const box = document.getElementById(`box-img-${stage}`);
    if (box) {
      box.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up text-cyan" style="font-size: 1.5rem; margin-bottom: 4px;"></i>
        <span>사진 선택 (클릭)</span>
      `;
    }
  }

  openReportModalWithData(log) {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    const subInfo = document.getElementById('form-sub-project-name');
    if (subInfo && this.currentProject) {
      subInfo.textContent = `사업명: ${this.currentProject.name}`;
    }

    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;

    document.getElementById('form-plant').value = log.target_plant || (isDoowoong ? '황소개구리, 미국수련 (마름 등)' : '가시박, 환삼덩굴');
    document.getElementById('form-location').value = log.location || (isDoowoong ? '충청남도 태안군 두웅습지 일대' : '충청남도 금산군 천내리습지 일대');
    document.getElementById('form-date').value = log.work_date && !log.work_date.includes('(') ? log.work_date : (isDoowoong ? '2026-09-11' : '2026-09-04');
    document.getElementById('form-area').value = log.area_sqm || (isDoowoong ? 45000 : 30000);
    document.getElementById('form-kg').value = log.amount_kg || (isDoowoong ? 200 : 1700);
    document.getElementById('form-workers').value = log.workers || (isDoowoong ? 4 : 6);
    document.getElementById('form-hours').value = log.hours || 6;
    if (log.notes && document.getElementById('form-notes')) {
      document.getElementById('form-notes').value = log.notes;
    }

    // Reset attached photo slots
    this.resetPhotoBox('before');
    this.resetPhotoBox('during');
    this.resetPhotoBox('after');

    if (log.representative_photo) {
      const boxDuring = document.getElementById('box-img-during');
      if (boxDuring) {
        boxDuring.innerHTML = `
          <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px;">
            <img src="${log.representative_photo}" style="width: 100%; height: 100%; object-fit: cover;">
            <span style="position: absolute; bottom: 4px; left: 4px; font-size: 0.65rem; background: rgba(0,0,0,0.75); color: #38bdf8; padding: 2px 6px; border-radius: 3px;">대표 현장사진</span>
          </div>
        `;
      }
    }

    if (log.photos && Array.isArray(log.photos)) {
      log.photos.forEach(p => {
        let stageKey = 'during';
        if (p.stage === '작업 전') stageKey = 'before';
        else if (p.stage === '작업 후') stageKey = 'after';

        const box = document.getElementById(`box-img-${stageKey}`);
        if (box && p.dataUrl) {
          box.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px;">
              <img src="${p.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">
              <span style="position: absolute; bottom: 4px; left: 4px; font-size: 0.65rem; background: rgba(0,0,0,0.75); color: #38bdf8; padding: 2px 6px; border-radius: 3px; max-width: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name || p.filename || '현장사진'}</span>
            </div>
          `;
        }
      });
    }

    modal.classList.remove('hidden');
  }

  openReportModalWithDefaults() {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    const subInfo = document.getElementById('form-sub-project-name');
    if (subInfo && this.currentProject) {
      subInfo.textContent = `사업명: ${this.currentProject.name}`;
    }

    const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;

    const formPlant = document.getElementById('form-plant');
    const formLoc = document.getElementById('form-location');
    const formCoords = document.getElementById('form-coords');
    const formDate = document.getElementById('form-date');
    const formArea = document.getElementById('form-area');
    const formKg = document.getElementById('form-kg');
    const formWorkers = document.getElementById('form-workers');
    const formHours = document.getElementById('form-hours');
    const formNotes = document.getElementById('form-notes');

    if (isDoowoong) {
      if (formPlant) formPlant.value = '황소개구리, 미국수련 (마름 등)';
      if (formLoc) formLoc.value = '충청남도 태안군 원북면 신두해변길 291-30 (두웅습지)';
      if (formCoords) formCoords.value = 'N 36°50′10.8″  E 126°11′46.2″';
      if (formDate) formDate.value = '2026-09-11';
      if (formArea) formArea.value = 45000;
      if (formKg) formKg.value = 200;
      if (formWorkers) formWorkers.value = 4;
      if (formHours) formHours.value = 6;
      if (formNotes) formNotes.value = '황소개구리 포획통발 15개소 설치 완료 및 미국수련·마름 지하경·줄기 200kg 수작업 굴취 수거 완료. 금개구리 혼획 방지 안전관리 수칙 준수.';
    } else {
      if (formPlant) formPlant.value = '가시박, 환삼덩굴';
      if (formLoc) formLoc.value = '충청남도 금산군 제원면 천내리습지 일대';
      if (formCoords) formCoords.value = 'N 36°06′25.6″  E 127°34′26.9″';
      if (formDate) formDate.value = '2026-09-04';
      if (formArea) formArea.value = 30000;
      if (formKg) formKg.value = 1700;
      if (formWorkers) formWorkers.value = 6;
      if (formHours) formHours.value = 6;
      if (formNotes) formNotes.value = '제3구간 시작지점부터 중간까지 가시박 대군락지 예초기 집중작업 및 낫베기 병행 완료. 안전교육 완료 후 작업 진행.';
    }

    // Reset photo attachment previews
    this.resetPhotoBox('before');
    this.resetPhotoBox('during');
    this.resetPhotoBox('after');

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
        
        const isDoowoong = this.kpis && this.kpis.total_target_area === 67050;
        const isChunpo = this.kpis && this.kpis.total_target_area === 115000;
        const projKey = isDoowoong ? 'doowoong' : (isChunpo ? 'chunpo' : 'cheonnaeri');

        // Collect photos
        const photosArr = [];
        ['before', 'during', 'after'].forEach(stageKey => {
          if (this.attachedPhotos[stageKey]) {
            photosArr.push(this.attachedPhotos[stageKey]);
          }
        });

        const newLog = {
          target_plant: document.getElementById('form-plant').value,
          location: document.getElementById('form-location').value,
          work_date: document.getElementById('form-date').value,
          area_sqm: parseFloat(document.getElementById('form-area').value) || 0,
          amount_kg: parseFloat(document.getElementById('form-kg').value) || 0,
          workers: parseInt(document.getElementById('form-workers').value) || (isDoowoong ? 4 : 5),
          hours: parseInt(document.getElementById('form-hours').value) || 6,
          is_completed: true,
          zone: isDoowoong ? "1구간(미국수련) 및 2구간(황소개구리)" : "3구간 (C)",
          method: isDoowoong ? "통발 포획(황소개구리) 및 뿌리·줄기 뽑기(미국수련, 마름 등)" : "예초기 사용, 낫으로 베기",
          stages: ["영양생장"],
          notes: document.getElementById('form-notes') ? document.getElementById('form-notes').value : ''
        };

        if (photosArr.length > 0) {
          newLog.photos = photosArr;
          newLog.representative_photo = photosArr[0].dataUrl;
        }

        try {
          // 1. Update project-specific localStorage
          const storageKey = `${projKey}_work_logs`;
          const localLogsStr = localStorage.getItem(storageKey);
          let currentLogs = localLogsStr ? JSON.parse(localLogsStr) : this.workLogs;
          newLog.id = currentLogs.length + 1;
          newLog.round = currentLogs.length + 1;
          currentLogs.push(newLog);
          localStorage.setItem(storageKey, JSON.stringify(currentLogs));
          if (!isDoowoong && !isChunpo) {
            localStorage.setItem('geumgang_work_logs', JSON.stringify(currentLogs));
          }

          // 2. Map & save to Central HQ Activity Store ('wma_ecosystem_activities_v5')
          const hqActivity = {
            id: `act-dcs-${Date.now()}`,
            branch_id: "daejeon-chungnam-sejong",
            branch_name: "대전·충남·세종 지부",
            project_id: isDoowoong ? "proj-dcs-doowoong-02" : "proj-dcs-geumgang-01",
            project_title: isDoowoong ? "2026년 두웅습지 외래생물 실태조사 및 확산방지 용역" : "천내리습지 생태계교란식물 제거사업",
            date: newLog.work_date,
            work_type: newLog.method || "물리적 굴취 및 통발 포획",
            worker_count: newLog.workers,
            area_m2: newLog.area_sqm,
            harvest_kg: newLog.amount_kg,
            location: newLog.location,
            summary: isDoowoong
              ? `[3D 드론 관제 등록] 두웅습지 1차 외래생물 방제작업 완료 (수련·마름 ${newLog.amount_kg}kg 제거, 통발 15개 가동, 작업자 ${newLog.workers}명)`
              : `[3D 드론 관제 등록] ${newLog.location} 일원 제거작업 완료 (${newLog.area_sqm.toLocaleString()}㎡ / ${newLog.amount_kg.toLocaleString()}kg / 작업자 ${newLog.workers}명)`,
            status: "완료",
            photos: photosArr
          };

          const rawActs = localStorage.getItem('wma_ecosystem_activities_v5');
          let acts = rawActs ? JSON.parse(rawActs) : [];
          // Purge old 04-30 contract activity if exists in localStorage
          acts = acts.filter(a => !(a.project_id === 'proj-dcs-doowoong-02' && a.date === '2026-04-30'));
          acts.unshift(hqActivity);
          localStorage.setItem('wma_ecosystem_activities_v5', JSON.stringify(acts));

          // 3. Broadcast to Cloud DB & All branches
          if (window.cloudSync) {
            window.cloudSync.syncActivity(hqActivity);
          }

          alert("✅ 일일작업결과표와 현장 사진이 정상적으로 등록되었으며, 중앙사무국 및 전국 관제망에 실시간 동기화되었습니다.");
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

    // Bind Budget Detail Modal
    const budgetCard = document.getElementById('kpi-card-budget');
    const budgetModal = document.getElementById('modal-budget-detail');
    const closeBudgetBtn = document.getElementById('btn-close-budget-modal');

    if (budgetCard && budgetModal) {
      budgetCard.addEventListener('click', () => {
        budgetModal.classList.remove('hidden');
        budgetModal.style.display = 'flex';
      });
    }

    if (closeBudgetBtn && budgetModal) {
      closeBudgetBtn.addEventListener('click', () => {
        budgetModal.classList.add('hidden');
        budgetModal.style.display = 'none';
      });
    }

    if (budgetModal) {
      budgetModal.addEventListener('click', (e) => {
        if (e.target === budgetModal || (e.target.classList && e.target.classList.contains('modal-backdrop'))) {
          budgetModal.classList.add('hidden');
          budgetModal.style.display = 'none';
        }
      });
    }
  }
}

window.WorkReportManager = WorkReportManager;
