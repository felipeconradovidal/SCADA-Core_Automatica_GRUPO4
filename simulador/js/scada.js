/**
 * SCADA-Core Automática - Módulo Principal de IHM & Supervisão (scada.js)
 * Renderizador do Sinótico Industrial 2D com Zoom & Pan Interativo,
 * Presets de Câmera, Infográficos Visuais, Fila de Tracking e Alarmes ISA 18.2.
 */

import { PLCLogic } from './logic.js';
import { VisionSystem } from './vision.js';
import { PlantSimulation } from './engine.js';
import { SCADACharts } from './charts.js';

export class SCADASystem {
  constructor() {
    this.plc = new PLCLogic();
    this.vision = new VisionSystem();
    this.sim = new PlantSimulation(this.plc, this.vision);

    // Elementos de Canvas
    this.synopticCanvas = document.getElementById('synopticCanvas');
    this.cameraCanvas = document.getElementById('cameraCanvas');
    this.flowCanvas = document.getElementById('flowCanvas');
    this.distCanvas = document.getElementById('distCanvas');

    this.charts = new SCADACharts(this.flowCanvas, this.distCanvas);

    // Sistema de Câmera / Zoom & Pan Interativo do Sinótico
    this.viewport = {
      zoom: 1.0,
      targetZoom: 1.0,
      panX: 0,
      targetPanX: 0,
      panY: 0,
      targetPanY: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      minZoom: 0.75,
      maxZoom: 3.5
    };

    // Histórico de Alarmes
    this.alarmList = [];
    this.lastFaultEjector = false;

    this.lastTimestamp = performance.now();
    this.chartSampleAccumulator = 0;

    this.initUI();
    this.initControls();
    this.initZoomPanControls();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initUI() {
    if (this.synopticCanvas) {
      this.synopticCanvas.width = 960;
      this.synopticCanvas.height = 380;
    }
    if (this.cameraCanvas) {
      this.cameraCanvas.width = 240;
      this.cameraCanvas.height = 180;
    }
    if (this.flowCanvas) {
      this.flowCanvas.width = 340;
      this.flowCanvas.height = 100;
    }
    if (this.distCanvas) {
      this.distCanvas.width = 340;
      this.distCanvas.height = 65;
    }
  }

  initControls() {
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnEmerg = document.getElementById('btnEmerg');
    const btnAck = document.getElementById('btnAck');
    const btnRefill = document.getElementById('btnRefill');
    const btnEmptyC = document.getElementById('btnEmptyC');
    const btnEmptyB = document.getElementById('btnEmptyB');
    const sliderSpeed = document.getElementById('sliderSpeed');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        if (this.plc.outputs.c_PERM) {
          this.sim.conveyor.speedSetpoint = parseFloat(sliderSpeed.value);
          this.logAlarm('COMANDO', 'Comando de PARTIDA enviado pelo operador.', 'INFO');
        } else {
          this.logAlarm('INTERTRAVAMENTO', 'Comando de partida rejeitado: Permissivo Geral c_PERM ausente!', 'ALTO');
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        this.sim.conveyor.speedSetpoint = 0.0;
        this.logAlarm('COMANDO', 'Comando de PARADA enviado pelo operador.', 'INFO');
      });
    }

    if (btnEmerg) {
      btnEmerg.addEventListener('click', () => {
        this.plc.inputs.p_EMERG = !this.plc.inputs.p_EMERG;
        btnEmerg.classList.toggle('active', this.plc.inputs.p_EMERG);
        if (this.plc.inputs.p_EMERG) {
          this.sim.conveyor.speedSetpoint = 0.0;
          this.logAlarm('EMERGÊNCIA', 'Botoeira de Parada de Emergência XA-901 ATIVADA!', 'CRÍTICO');
        } else {
          this.logAlarm('EMERGÊNCIA', 'Botoeira de Emergência desarmada. Aguardando ACK.', 'INFO');
        }
      });
    }

    if (btnAck) {
      btnAck.addEventListener('click', () => {
        this.acknowledgeAlarms();
      });
    }

    if (btnRefill) {
      btnRefill.addEventListener('click', () => {
        this.sim.refillHopper();
        this.logAlarm('PROCESSO', 'Funil LIT-101 reabastecido pelo operador.', 'INFO');
      });
    }

    if (btnEmptyC) {
      btnEmptyC.addEventListener('click', () => {
        this.sim.emptySiloC();
        this.logAlarm('PROCESSO', 'Silo C (Rejeito) esvaziado pelo operador.', 'INFO');
      });
    }

    if (btnEmptyB) {
      btnEmptyB.addEventListener('click', () => {
        this.sim.emptySiloB();
        this.logAlarm('PROCESSO', 'Silo B (Secundário) esvaziado pelo operador.', 'INFO');
      });
    }

    if (sliderSpeed) {
      sliderSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('lblSpeedVal').innerText = val.toFixed(2) + ' m/s';
        if (this.sim.conveyor.actualSpeed > 0) {
          this.sim.conveyor.speedSetpoint = val;
        }
      });
    }

    // Injeção de Falhas
    this.setupFaultToggle('faultAirPressure', (active) => {
      this.sim.pneumatics.pressureBar = active ? 2.8 : 6.5;
      this.plc.inputs.p_PAL601 = active;
      if (active) this.logAlarm('PAL-601', 'Pressão pneumática BAIXA (2.8 bar) -> Bloqueia ejeção e c_PERM!', 'ALTO');
    });

    this.setupFaultToggle('faultMotorOverload', (active) => {
      this.sim.conveyor.isOverloaded = active;
      this.plc.inputs.p_JI201 = active;
      if (active) this.logAlarm('JI-201', 'Relé térmico atuado: SOBRECARGA no motor da esteira!', 'CRÍTICO');
    });

    this.setupFaultToggle('faultCameraFail', (active) => {
      this.plc.inputs.p_KSA401 = !active;
      this.plc.diagnostics.alarme_KSA401 = active;
      if (active) this.logAlarm('KSA-401', 'Falha de comunicação com Câmera de Visão!', 'ALTO');
    });

    this.setupFaultToggle('faultPistonJam', (active) => {
      this.sim.pneumatics.isJammedC = active;
      if (active) this.logAlarm('FY-603', 'Pistão C travado mecanicamente! Sensor ZSH-601 não fechará.', 'ALTO');
    });

    this.setupFaultToggle('faultSiloCFull', (active) => {
      this.sim.silos.siloC.levelPercent = active ? 100.0 : 20.0;
      this.sim.silos.siloC.count = active ? 200 : 40;
      if (active) this.logAlarm('LIT-703', 'Nível Crítico atingido no Silo C (100%) -> Bloqueio c_PERM!', 'CRÍTICO');
    });
  }

  initZoomPanControls() {
    const canvas = this.synopticCanvas;
    if (!canvas) return;

    // 1. Mouse Drag (Pan)
    canvas.addEventListener('mousedown', (e) => {
      this.viewport.isDragging = true;
      this.viewport.dragStartX = e.clientX - this.viewport.targetPanX;
      this.viewport.dragStartY = e.clientY - this.viewport.targetPanY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.viewport.isDragging) return;
      this.viewport.targetPanX = e.clientX - this.viewport.dragStartX;
      this.viewport.targetPanY = e.clientY - this.viewport.dragStartY;
      this.clampPan();
    });

    window.addEventListener('mouseup', () => {
      if (this.viewport.isDragging) {
        this.viewport.isDragging = false;
        canvas.style.cursor = 'grab';
      }
    });

    // 2. Wheel Zoom (centralizado no cursor do mouse)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, this.viewport.targetZoom * zoomFactor));

      // Ajusta o Pan para que o zoom ocorra onde o mouse está apontando
      const scaleChange = newZoom / this.viewport.targetZoom;
      this.viewport.targetPanX = mouseX - (mouseX - this.viewport.targetPanX) * scaleChange;
      this.viewport.targetPanY = mouseY - (mouseY - this.viewport.targetPanY) * scaleChange;
      this.viewport.targetZoom = newZoom;
      this.clampPan();
    }, { passive: false });

    // 3. Botões de Zoom no HUD
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnZoomReset = document.getElementById('btnZoomReset');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.setZoomAtCenter(this.viewport.targetZoom * 1.3);
      });
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.setZoomAtCenter(this.viewport.targetZoom / 1.3);
      });
    }
    if (btnZoomReset) {
      btnZoomReset.addEventListener('click', () => {
        this.resetCamera();
      });
    }

    // 4. Botões Rápidos de Preset de Câmera
    this.setupPresetBtn('btnPresetAll', () => this.resetCamera());
    this.setupPresetBtn('btnPresetHopper', () => this.focusComponent(80, 190, 1.85));
    this.setupPresetBtn('btnPresetScale', () => this.focusComponent(235, 230, 2.1));
    this.setupPresetBtn('btnPresetVision', () => this.focusComponent(400, 200, 2.2));
    this.setupPresetBtn('btnPresetEjectors', () => this.focusComponent(610, 210, 1.95));
    this.setupPresetBtn('btnPresetSilos', () => this.focusComponent(800, 230, 1.7));

    canvas.style.cursor = 'grab';
  }

  setupPresetBtn(id, callback) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      callback();
      // Feedback visual no botão ativo
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('bg-cyan-900', 'text-cyan-300', 'border-cyan-500'));
      btn.classList.add('bg-cyan-900', 'text-cyan-300', 'border-cyan-500');
    });
  }

  setZoomAtCenter(newZoom) {
    const canvas = this.synopticCanvas;
    if (!canvas) return;
    const clampedZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, newZoom));
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const scaleChange = clampedZoom / this.viewport.targetZoom;
    this.viewport.targetPanX = cx - (cx - this.viewport.targetPanX) * scaleChange;
    this.viewport.targetPanY = cy - (cy - this.viewport.targetPanY) * scaleChange;
    this.viewport.targetZoom = clampedZoom;
    this.clampPan();
  }

  focusComponent(worldX, worldY, zoom) {
    const canvas = this.synopticCanvas;
    if (!canvas) return;
    this.viewport.targetZoom = zoom;
    this.viewport.targetPanX = (canvas.width / 2) - (worldX * zoom);
    this.viewport.targetPanY = (canvas.height / 2) - (worldY * zoom);
    this.clampPan();
  }

  resetCamera() {
    this.viewport.targetZoom = 1.0;
    this.viewport.targetPanX = 0;
    this.viewport.targetPanY = 0;
  }

  clampPan() {
    const canvas = this.synopticCanvas;
    if (!canvas) return;
    const maxPanDist = 800 * this.viewport.targetZoom;
    this.viewport.targetPanX = Math.max(-maxPanDist, Math.min(maxPanDist, this.viewport.targetPanX));
    this.viewport.targetPanY = Math.max(-400 * this.viewport.targetZoom, Math.min(400 * this.viewport.targetZoom, this.viewport.targetPanY));
  }

  setupFaultToggle(elementId, callback) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener('change', (e) => {
      callback(e.target.checked);
    });
  }

  logAlarm(tag, message, severity) {
    const timeStr = new Date().toLocaleTimeString();
    this.alarmList.unshift({
      time: timeStr,
      tag: tag,
      message: message,
      severity: severity,
      acked: false
    });
    if (this.alarmList.length > 25) this.alarmList.pop();
    this.renderAlarmTable();
  }

  acknowledgeAlarms() {
    this.alarmList.forEach(a => a.acked = true);
    this.renderAlarmTable();
  }

  renderAlarmTable() {
    const tbody = document.getElementById('alarmTableBody');
    if (!tbody) return;

    if (this.alarmList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-3 text-xs">Nenhum alarme ativo. Sistema em condições normais.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.alarmList.map(a => `
      <tr class="border-b border-slate-800 text-xs ${a.acked ? 'opacity-50' : ''}">
        <td class="py-1 px-2 font-mono text-slate-400">${a.time}</td>
        <td class="py-1 px-2 font-mono font-bold ${
          a.severity === 'CRÍTICO' ? 'text-red-400' : a.severity === 'ALTO' ? 'text-amber-400' : 'text-cyan-400'
        }">${a.tag}</td>
        <td class="py-1 px-2 text-slate-200">${a.message}</td>
        <td class="py-1 px-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
            a.severity === 'CRÍTICO' ? 'bg-red-950 text-red-400 border border-red-800' :
            a.severity === 'ALTO' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
            'bg-cyan-950 text-cyan-400 border border-cyan-800'
          }">${a.severity}</span>
        </td>
      </tr>
    `).join('');
  }

  animate(now) {
    const dt = Math.min(0.1, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;

    // Interpolação suave do Zoom & Pan (Smooth Lerp)
    this.viewport.zoom += (this.viewport.targetZoom - this.viewport.zoom) * Math.min(1.0, dt * 10.0);
    this.viewport.panX += (this.viewport.targetPanX - this.viewport.panX) * Math.min(1.0, dt * 10.0);
    this.viewport.panY += (this.viewport.targetPanY - this.viewport.panY) * Math.min(1.0, dt * 10.0);

    // 1. Atualiza Física & Controle
    this.sim.update(dt);

    // 2. Alarme de discrepância no atuador
    if (this.plc.diagnostics.p_FALHA_EJETOR && !this.lastFaultEjector) {
      this.lastFaultEjector = true;
      this.logAlarm('ZSH-601/FY-603', 'FALHA DE EJEÇÃO: Comando FY-603 ativo sem confirmação de sensor magnético ZSH-601!', 'CRÍTICO');
    } else if (!this.plc.diagnostics.p_FALHA_EJETOR) {
      this.lastFaultEjector = false;
    }

    // 3. Renderiza Sinótico com Zoom/Pan
    this.renderSynoptic();

    // 4. Renderiza Câmera HUD
    this.vision.renderCameraHUD(this.cameraCanvas, this.vision.lastInspectedGrain);

    // 5. Gráficos Historiadores
    this.chartSampleAccumulator += dt;
    if (this.chartSampleAccumulator >= 0.5) {
      this.chartSampleAccumulator = 0;
      this.charts.addSample(this.sim.scale.massFlowKgPerHour);
      this.charts.renderFlowTrend();
      this.charts.renderDistribution(this.sim.stats.catACount, this.sim.stats.catBCount, this.sim.stats.catCCount);
    }

    // 6. Atualiza Dashboard
    this.updateDashboard();

    requestAnimationFrame(this.animate);
  }

  renderSynoptic() {
    if (!this.synopticCanvas) return;
    const ctx = this.synopticCanvas.getContext('2d');
    const w = this.synopticCanvas.width;
    const h = this.synopticCanvas.height;

    // Fundo fixo da Planta
    ctx.fillStyle = '#0b1320';
    ctx.fillRect(0, 0, w, h);

    // --- CAMADA FIXA SUPERIOR: INFOGRÁFICO DE PASSOS ---
    this.drawProcessStepsHeader(ctx, w);

    // --- CAMADA COM ZOOM E PAN INTERATIVO (MUNDO VIRTUAL DA PLANTA) ---
    ctx.save();
    
    // Área de clip para não vazar o cabeçalho fixo
    ctx.beginPath();
    ctx.rect(0, 38, w, h - 38);
    ctx.clip();

    // Aplica a matriz de transformação do Pan & Zoom
    ctx.translate(this.viewport.panX, this.viewport.panY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    // Grade de fundo que se move com o zoom/pan
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = -400; x < 1400; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, -200); ctx.lineTo(x, 600); ctx.stroke();
    }
    for (let y = -200; y < 600; y += 30) {
      ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(1400, y); ctx.stroke();
    }

    const { hopperX, scaleStartX, scaleEndX, cameraX, ejectorCX, ejectorBX, endConveyorX, conveyorY, conveyorHeight } = this.sim.layout;

    // 1. SILOS DE COLETA (Destinos A, B, C)
    this.drawSilo(ctx, ejectorCX - 28, conveyorY + 60, 56, 80, 'SILO C (Rejeito)', '#ff1744', this.sim.silos.siloC.levelPercent, `LIT-703: ${this.sim.silos.siloC.levelPercent.toFixed(0)}%`, 'Grãos defeituosos');
    this.drawSilo(ctx, ejectorBX - 28, conveyorY + 60, 56, 80, 'SILO B (Secundário)', '#ffb300', this.sim.silos.siloB.levelPercent, `${this.sim.silos.siloB.count} un`, 'Grãos toleráveis');
    this.drawSilo(ctx, endConveyorX + 5, conveyorY + 30, 62, 110, 'SILO A (Aprovado)', '#00e676', (this.sim.silos.siloA.count % 100), `${this.sim.silos.siloA.count} un`, 'Padrão Premium');

    // 2. FUNIL DE RECEPÇÃO & ALIMENTADOR VIBRATÓRIO
    this.drawHopper(ctx, hopperX, conveyorY - 145, 75, 115, this.sim.hopper.level, this.plc.outputs.c_ALIM);

    // 3. ESTEIRA TRANSPORTADORA
    this.drawConveyor(ctx, hopperX - 10, conveyorY, endConveyorX - hopperX + 20, conveyorHeight, this.sim.conveyor.actualSpeed, this.sim.conveyor.positionOffset);

    // 4. BALANÇA DE PESAGEM CONTÍNUA (WT-301 / FT-301)
    this.drawScale(ctx, scaleStartX, scaleEndX, conveyorY, this.sim.scale.currentMassOnBeltKg);

    // 5. ESTAÇÃO DE VISÃO COMPUTACIONAL (XS-401 / KSA-401)
    this.drawVisionStation(ctx, cameraX, conveyorY, this.plc.inputs.p_KSA401);

    // 6. RÉGUA DE TRACKING / SHIFT REGISTER ENTRE CÂMERA E EJETORES
    this.drawTrackingRuler(ctx, cameraX, ejectorCX, ejectorBX, conveyorY + conveyorHeight + 15);

    // 7. ESTAÇÃO 1: EJETOR PNEUMÁTICO C (FY-603 / ZSH-601)
    this.drawEjectorStation(ctx, ejectorCX, conveyorY, this.sim.pneumatics.pistonStrokeC, this.sim.pneumatics.blowEffectC, this.plc.outputs.c_FY603, 'FY-603 (Ejetor C)', 'ZSH-601', '#ff1744', this.sim.pneumatics.isJammedC);

    // 8. ESTAÇÃO 2: EJETOR PNEUMÁTICO B (FY-602 / ZSH-602)
    this.drawEjectorStation(ctx, ejectorBX, conveyorY, this.sim.pneumatics.pistonStrokeB, this.sim.pneumatics.blowEffectB, this.plc.outputs.c_FY602, 'FY-602 (Ejetor B)', 'ZSH-602', '#ffb300', this.sim.pneumatics.isJammedB);

    // 9. GRÃOS EM TRÂNSITO
    this.drawGrains(ctx);

    ctx.restore();

    // --- INDICADOR DE ZOOM ATUAL NO CANTO ---
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(10, h - 22, 115, 16);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(10, h - 22, 115, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '8.5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ZOOM: ${(this.viewport.zoom * 100).toFixed(0)}% (Scroll / Drag)`, 14, h - 11);
  }

  drawProcessStepsHeader(ctx, w) {
    const steps = [
      { num: '1', title: 'Recepção / Dosagem', tag: 'LIT-101 + c_ALIM', x: 80 },
      { num: '2', title: 'Pesagem Contínua', tag: 'WT-301 ➔ FT-301', x: 235 },
      { num: '3', title: 'Inspeção Óptica IA', tag: 'XS-401 ➔ KSA-401', x: 400 },
      { num: '4', title: 'Ejeção Pneumática', tag: 'FY-603 / FY-602', x: 615 },
      { num: '5', title: 'Coleta & Silos', tag: 'Destinos A / B / C', x: 830 },
    ];

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(10, 6, w - 20, 28);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(10, 6, w - 20, 28);

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(s.x - 38, 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.num, s.x - 38, 23);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(s.title, s.x - 26, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '8px monospace';
      ctx.fillText(s.tag, s.x - 26, 26);

      if (i < steps.length - 1) {
        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('➔', s.x + 85, 21);
      }
    }
  }

  drawHopper(ctx, x, y, w, h, levelPercent, isFeeding) {
    const hw = w / 2;
    const chuteW = 20;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x - hw, y + 25);
    ctx.lineTo(x + hw, y + 25);
    ctx.lineTo(x + chuteW / 2, y + h - 15);
    ctx.lineTo(x + chuteW / 2, y + h);
    ctx.lineTo(x - chuteW / 2, y + h);
    ctx.lineTo(x - chuteW / 2, y + h - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (levelPercent > 0) {
      const fillH = (h - 35) * (levelPercent / 100);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - hw, y + 25);
      ctx.lineTo(x + hw, y + 25);
      ctx.lineTo(x + chuteW / 2, y + h - 15);
      ctx.lineTo(x + chuteW / 2, y + h);
      ctx.lineTo(x - chuteW / 2, y + h);
      ctx.lineTo(x - chuteW / 2, y + h - 15);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#d97706';
      ctx.fillRect(x - hw, y + h - fillH, w, fillH);
      ctx.restore();
    }

    const vibOffset = isFeeding ? (Math.sin(performance.now() * 0.08) * 2.5) : 0;
    ctx.fillStyle = isFeeding ? '#38bdf8' : '#64748b';
    ctx.fillRect(x - 15 + vibOffset, y + h + 2, 35, 6);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LIT-101', x, y + 16);
    ctx.fillStyle = levelPercent < 15 ? '#ef4444' : '#94a3b8';
    ctx.fillText(`${levelPercent.toFixed(0)}% Nível`, x, y + 42);

    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText('c_ALIM', x, y + h + 18);
  }

  drawConveyor(ctx, x, y, len, h, speed, offset) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y + h, len, 8);

    ctx.fillStyle = '#334155';
    for (let px = x + 30; px < x + len; px += 180) {
      ctx.fillRect(px, y + h + 8, 8, 45);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, len, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, len, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let rx = x + (offset % 25); rx < x + len; rx += 25) {
      ctx.beginPath();
      ctx.moveTo(rx, y + 2);
      ctx.lineTo(rx, y + h - 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(x, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.arc(x + len, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.sim.conveyor.isOverloaded ? '#ef4444' : (speed > 0 ? '#10b981' : '#64748b');
    ctx.fillRect(x - 24, y + 2, 20, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR', x - 14, y + 14);
    ctx.fillText('ST-201', x - 14, y + 23);
  }

  drawScale(ctx, startX, endX, y, currentMassKg) {
    const len = endX - startX;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(startX, y - 4, len, 6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, y - 4, len, 6);

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(startX + len / 2 - 12, y + 30, 24, 8);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WT-301 (Balança)', startX + len / 2, y + 48);
    ctx.font = '8px monospace';
    ctx.fillText('➔ Gera FT-301 (kg/h)', startX + len / 2, y + 58);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`${(currentMassKg * 1000).toFixed(0)} g na esteira`, startX + len / 2, y - 10);
  }

  drawVisionStation(ctx, x, y, camOk) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 25, y);
    ctx.lineTo(x - 25, y - 65);
    ctx.lineTo(x + 25, y - 65);
    ctx.lineTo(x + 25, y);
    ctx.stroke();

    ctx.fillStyle = camOk ? '#0284c7' : '#ef4444';
    ctx.fillRect(x - 14, y - 62, 28, 20);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x - 7, y - 42, 14, 5);

    ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 37);
    ctx.lineTo(x + 7, y - 37);
    ctx.lineTo(x + 18, y - 2);
    ctx.lineTo(x - 18, y - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KSA-401 (Câmera)', x, y - 72);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Trigger XS-401', x, y - 24);
  }

  drawTrackingRuler(ctx, camX, ejCX, ejBX, y) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(camX, y);
    ctx.lineTo(ejBX + 10, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath(); ctx.arc(camX, y, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ff1744';
    ctx.beginPath(); ctx.arc(ejCX, y, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ffb300';
    ctx.beginPath(); ctx.arc(ejBX, y, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.font = '7.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◄── Shift Register: Tracking via Encoder ST-201 ──►', (camX + ejBX) / 2, y + 10);
  }

  drawEjectorStation(ctx, x, y, stroke, blowEffect, isFiring, title, sensorTag, color, isJammed) {
    ctx.fillStyle = isJammed ? '#7f1d1d' : '#334155';
    ctx.fillRect(x - 12, y - 75, 24, 35);

    ctx.strokeStyle = this.plc.inputs.p_PAL601 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 75);
    ctx.lineTo(x, y - 95);
    ctx.stroke();

    const rodLength = 8 + stroke * 22;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x - 3, y - 40, 6, rodLength);

    ctx.fillStyle = isFiring ? color : '#64748b';
    ctx.fillRect(x - 8, y - 40 + rodLength, 16, 5);

    const sensorActive = stroke > 0.85;
    ctx.fillStyle = sensorActive ? '#00e676' : '#475569';
    ctx.fillRect(x + 14, y - 55, 6, 9);

    if (blowEffect > 0) {
      ctx.fillStyle = `rgba(0, 240, 255, ${blowEffect * 0.75})`;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 35 + rodLength);
      ctx.lineTo(x + 6, y - 35 + rodLength);
      ctx.lineTo(x + 16, y + 38);
      ctx.lineTo(x - 16, y + 38);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x, y - 100);
    ctx.font = '7.5px monospace';
    ctx.fillStyle = sensorActive ? '#00e676' : '#94a3b8';
    ctx.fillText(sensorTag, x + 24, y - 48);
  }

  drawSilo(ctx, x, y, w, h, title, color, levelPercent, subtext, desc) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    if (levelPercent > 0) {
      const fillH = (h - 6) * Math.min(1.0, levelPercent / 100);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + 3, y + h - 3 - fillH, w - 6, fillH);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = color;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 14);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '8px monospace';
    ctx.fillText(subtext, x + w / 2, y + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '7px monospace';
    ctx.fillText(desc, x + w / 2, y + h - 6);
  }

  drawGrains(ctx) {
    for (const g of this.sim.grains) {
      let grainColor = '#f8fafc';
      if (g.colorType === 'secondary') grainColor = '#fde68a';
      if (g.colorType === 'defect') grainColor = '#78350f';
      if (g.hasImpurity) grainColor = '#64748b';

      ctx.fillStyle = grainColor;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, (g.length || 6) * 0.8, (g.width || 2) * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (g.classifiedCategory) {
        ctx.strokeStyle = g.classifiedCategory === 'A' ? '#00e676' : g.classifiedCategory === 'B' ? '#ffb300' : '#ff1744';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  updateDashboard() {
    const plantStatusBadge = document.getElementById('plantStatusBadge');
    if (plantStatusBadge) {
      if (this.plc.inputs.p_EMERG) {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-700 animate-pulse';
        plantStatusBadge.innerText = '● PARADA DE EMERGÊNCIA (XA-901 ATUADA)';
      } else if (!this.plc.outputs.c_PERM) {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-700';
        plantStatusBadge.innerText = '● INTERTRAVADO (VERIFIQUE FALHAS)';
      } else if (this.sim.conveyor.actualSpeed > 0) {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-700';
        plantStatusBadge.innerText = '● EM OPERAÇÃO NORMAL';
      } else {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-700';
        plantStatusBadge.innerText = '● PRONTO / AGUARDANDO START';
      }
    }

    this.updateElementText('dispSpeed', `${this.sim.conveyor.actualSpeed.toFixed(2)} m/s`);
    this.updateElementText('dispSpeedMin', `${(this.sim.conveyor.actualSpeed * 60).toFixed(1)} m/min`);
    this.updateElementText('dispMassFlow', `${this.sim.scale.massFlowKgPerHour.toFixed(1)} kg/h`);
    this.updateElementText('dispPressure', `${this.sim.pneumatics.pressureBar.toFixed(1)} bar`);
    this.updateElementText('dispCurrent', `${this.sim.conveyor.motorCurrent.toFixed(1)} A`);

    this.updateElementText('cntTotal', this.sim.stats.totalProcessed);
    this.updateElementText('cntCatA', this.sim.stats.catACount);
    this.updateElementText('cntCatB', this.sim.stats.catBCount);
    this.updateElementText('cntCatC', this.sim.stats.catCCount);

    this.updateLed('led_c_PERM', this.plc.outputs.c_PERM);
    this.updateLed('led_c_PERM_sub', this.plc.outputs.c_PERM);
    this.updateLed('led_c_ALIM', this.plc.outputs.c_ALIM);
    this.updateLed('led_c_FY603', this.plc.outputs.c_FY603);
    this.updateLed('led_c_FY602', this.plc.outputs.c_FY602);
    this.updateLed('led_p_EMERG', this.plc.inputs.p_EMERG, true);
    this.updateLed('led_p_JI201', this.plc.inputs.p_JI201, true);
    this.updateLed('led_p_PAL601', this.plc.inputs.p_PAL601, true);
    this.updateLed('led_p_KSA401', this.plc.inputs.p_KSA401);
    this.updateLed('led_p_NC703', this.plc.inputs.p_NC703, true);
    this.updateLed('led_p_MOV201', this.plc.inputs.p_MOV201);
    this.updateLed('led_p_NB101', this.plc.inputs.p_NB101, true);
    this.updateLed('led_p_POS603', this.plc.inputs.p_POS603);
    this.updateLed('led_p_POS602', this.plc.inputs.p_POS602);
    this.updateLed('led_p_ZSH601', this.plc.inputs.p_ZSH601);
    this.updateLed('led_p_ZSH602', this.plc.inputs.p_ZSH602);
    this.updateLed('led_falha_ejetor', this.plc.diagnostics.p_FALHA_EJETOR, true);

    this.renderTrackingQueue();
  }

  renderTrackingQueue() {
    const container = document.getElementById('trackingQueueList');
    if (!container) return;

    if (this.sim.trackingQueue.length === 0) {
      container.innerHTML = `<div class="text-[10px] text-slate-500 font-mono py-1">Memória livre. Nenhum grão em trânsito no buffer...</div>`;
      return;
    }

    container.innerHTML = this.sim.trackingQueue.slice(0, 6).map(item => `
      <div class="flex items-center justify-between text-[10px] font-mono py-0.5 px-1.5 rounded bg-slate-950 border border-slate-800">
        <span class="text-slate-400">#${item.id}</span>
        <span class="font-bold ${
          item.category === 'A' ? 'text-emerald-400' : item.category === 'B' ? 'text-amber-400' : 'text-red-400'
        }">Cat ${item.category}</span>
        <span class="text-cyan-400">${item.x}px</span>
        <span class="text-slate-300 font-bold">${item.category !== 'A' ? '⏱ ' + item.timeToTarget + 's p/ disparo' : '➔ Fim de linha'}</span>
      </div>
    `).join('');
  }

  updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  updateLed(id, state, isAlarmType = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isAlarmType) {
      el.className = `w-2.5 h-2.5 rounded-full ${state ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-700'}`;
    } else {
      el.className = `w-2.5 h-2.5 rounded-full ${state ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.scada = new SCADASystem();
});
