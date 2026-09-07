/**
 * SCADA-Core Automática - Módulo Principal de IHM & Supervisão (scada.js)
 * Renderizador do Sinótico Industrial 2D com Zoom & Pan Interativo,
 * Presets de Câmera, Infográficos Visuais, Fila de Tracking e Alarmes ISA 18.2.
 */

import { PLCLogic } from './logic.js';
import { VisionSystem } from './vision.js';
import { PlantSimulation } from './engine.js';
import { SCADACharts } from './charts.js';
import { IndustrialSCADAView } from './scada_industrial.js';

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

    // Módulo SCADA Industrial Real (ISA-101 / ISA-5.1 / ISA-18.2)
    this.industrialView = new IndustrialSCADAView(this.plc, this.sim, this.vision, this.charts, this);
    this.currentMode = 'prototype'; // 'prototype' | 'industrial'

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
    this.initModeSwitcher();
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
    const btnIndStart = document.getElementById('btnIndStart');
    const btnStop = document.getElementById('btnStop');
    const btnIndStop = document.getElementById('btnIndStop');
    const btnEmerg = document.getElementById('btnEmerg');
    const btnIndEmerg = document.getElementById('btnIndEmerg');
    const btnAck = document.getElementById('btnAck');
    const btnRefill = document.getElementById('btnRefill');
    const btnEmptyC = document.getElementById('btnEmptyC');
    const btnEmptyB = document.getElementById('btnEmptyB');
    const btnEmptyA = document.getElementById('btnEmptyA');
    const sliderSpeed = document.getElementById('sliderSpeed');

    const onStart = () => {
      if (this.plc.outputs.c_PERM) {
        this.sim.conveyor.speedSetpoint = parseFloat(sliderSpeed ? sliderSpeed.value : 0.8);
        this.logAlarm('COMANDO', 'Comando de PARTIDA enviado pelo operador.', 'INFO');
      } else {
        this.logAlarm('INTERTRAVAMENTO', 'Comando de partida rejeitado: Permissivo Geral c_PERM ausente!', 'ALTO');
      }
    };
    if (btnStart) btnStart.addEventListener('click', onStart);
    if (btnIndStart) btnIndStart.addEventListener('click', onStart);

    const onStop = () => {
      this.sim.conveyor.speedSetpoint = 0.0;
      this.logAlarm('COMANDO', 'Comando de PARADA enviado pelo operador.', 'INFO');
    };
    if (btnStop) btnStop.addEventListener('click', onStop);
    if (btnIndStop) btnIndStop.addEventListener('click', onStop);

    const onEmerg = () => {
      this.plc.inputs.p_EMERG = !this.plc.inputs.p_EMERG;
      if (btnEmerg) btnEmerg.classList.toggle('active', this.plc.inputs.p_EMERG);
      if (btnIndEmerg) btnIndEmerg.classList.toggle('active', this.plc.inputs.p_EMERG);
      if (this.plc.inputs.p_EMERG) {
        this.sim.conveyor.speedSetpoint = 0.0;
        this.logAlarm('EMERGÊNCIA', 'Botoeira de Parada de Emergência XA-901 ATIVADA!', 'CRÍTICO');
      } else {
        this.logAlarm('EMERGÊNCIA', 'Botoeira de Emergência desarmada. Aguardando ACK.', 'INFO');
      }
    };
    if (btnEmerg) btnEmerg.addEventListener('click', onEmerg);
    if (btnIndEmerg) btnIndEmerg.addEventListener('click', onEmerg);

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

    if (btnEmptyA) {
      btnEmptyA.addEventListener('click', () => {
        this.sim.emptySiloA();
        this.logAlarm('PROCESSO', 'Silo A (Aprovado) esvaziado pelo operador.', 'INFO');
      });
    }

    if (btnEmptyB) {
      btnEmptyB.addEventListener('click', () => {
        this.sim.emptySiloB();
        this.logAlarm('PROCESSO', 'Silo B (Secundário) esvaziado pelo operador.', 'INFO');
      });
    }

    if (btnEmptyC) {
      btnEmptyC.addEventListener('click', () => {
        this.sim.emptySiloC();
        this.logAlarm('PROCESSO', 'Silo C (Rejeito) esvaziado pelo operador.', 'INFO');
      });
    }

    if (sliderSpeed) {
      sliderSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const lbl = document.getElementById('lblSpeedVal');
        if (lbl) lbl.innerText = val.toFixed(2) + ' m/s';
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

    this.setupFaultToggle('faultSiloAFull', (active) => {
      this.sim.silos.siloA.levelPercent = active ? 100.0 : 20.0;
      this.sim.silos.siloA.count = active ? 1000 : 200;
      this.sim.updateSensorsToPLC();
      if (!active && this.sim.hopper.level >= 15.0 && !this.plc.inputs.p_NC702 && !this.plc.inputs.p_NC703) {
        this.plc.inputs.p_STANDBY = false;
        this.sim.purgeTimer = 0.0;
      }
      if (active) this.logAlarm('LIT-701', 'Nível Crítico atingido no Silo A (100%) -> Bloqueio de alimentação!', 'CRÍTICO');
    });

    this.setupFaultToggle('faultSiloBFull', (active) => {
      this.sim.silos.siloB.levelPercent = active ? 100.0 : 20.0;
      this.sim.silos.siloB.count = active ? 350 : 70;
      this.sim.updateSensorsToPLC();
      if (!active && this.sim.hopper.level >= 15.0 && !this.plc.inputs.p_NC701 && !this.plc.inputs.p_NC703) {
        this.plc.inputs.p_STANDBY = false;
        this.sim.purgeTimer = 0.0;
      }
      if (active) this.logAlarm('LIT-702', 'Nível Crítico atingido no Silo B (100%) -> Bloqueio de alimentação!', 'CRÍTICO');
    });

    this.setupFaultToggle('faultSiloCFull', (active) => {
      this.sim.silos.siloC.levelPercent = active ? 100.0 : 20.0;
      this.sim.silos.siloC.count = active ? 200 : 40;
      this.sim.updateSensorsToPLC();
      if (!active && this.sim.hopper.level >= 15.0 && !this.plc.inputs.p_NC701 && !this.plc.inputs.p_NC702) {
        this.plc.inputs.p_STANDBY = false;
        this.sim.purgeTimer = 0.0;
      }
      if (active) this.logAlarm('LIT-703', 'Nível Crítico atingido no Silo C (100%) -> Bloqueio de alimentação!', 'CRÍTICO');
    });
  }

  initModeSwitcher() {
    const btnSwitchPrototype = document.getElementById('btnSwitchPrototype');
    const btnSwitchIndustrial = document.getElementById('btnSwitchIndustrial');
    const viewPrototype = document.getElementById('viewPrototype');
    const viewScadaIndustrial = document.getElementById('viewScadaIndustrial');

    if (btnSwitchPrototype && btnSwitchIndustrial && viewPrototype && viewScadaIndustrial) {
      btnSwitchPrototype.addEventListener('click', () => {
        this.currentMode = 'prototype';
        viewPrototype.classList.remove('hidden');
        viewScadaIndustrial.classList.add('hidden');

        btnSwitchPrototype.className = 'mode-switch-btn px-3 py-1 rounded text-xs font-mono font-bold transition-all bg-cyan-950 text-cyan-300 border border-cyan-500/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]';
        btnSwitchIndustrial.className = 'mode-switch-btn px-3 py-1 rounded text-xs font-mono font-bold transition-all text-slate-400 hover:text-slate-200 border border-transparent';
      });

      btnSwitchIndustrial.addEventListener('click', () => {
        this.currentMode = 'industrial';
        viewPrototype.classList.add('hidden');
        viewScadaIndustrial.classList.remove('hidden');

        btnSwitchIndustrial.className = 'mode-switch-btn px-3 py-1 rounded text-xs font-mono font-bold transition-all bg-cyan-950 text-cyan-300 border border-cyan-500/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]';
        btnSwitchPrototype.className = 'mode-switch-btn px-3 py-1 rounded text-xs font-mono font-bold transition-all text-slate-400 hover:text-slate-200 border border-transparent';

        // Atualização imediata do P&ID
        if (this.industrialView) {
          this.industrialView.renderPID();
          this.industrialView.updateAlarmBanner();
        }
      });
    }
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

    // 4. Botões Rápidos de Foco de Estação (Visualização 100% estável sem saltos bruscos)
    this.focusedStation = null;
    this.setupPresetBtn('btnPresetAll', () => {
      this.resetCamera();
      this.focusedStation = null;
    });
    this.setupPresetBtn('btnPresetHopper', () => {
      this.resetCamera();
      this.focusedStation = 'hopper';
    });
    this.setupPresetBtn('btnPresetScale', () => {
      this.resetCamera();
      this.focusedStation = 'scale';
    });
    this.setupPresetBtn('btnPresetVision', () => {
      this.resetCamera();
      this.focusedStation = 'vision';
    });
    this.setupPresetBtn('btnPresetEjectors', () => {
      this.resetCamera();
      this.focusedStation = 'ejectors';
    });
    this.setupPresetBtn('btnPresetSilos', () => {
      this.resetCamera();
      this.focusedStation = 'silos';
    });

    canvas.style.cursor = 'grab';
  }

  setupPresetBtn(id, callback) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      callback();
      this.setActivePresetBtn(id);
    });
  }

  setActivePresetBtn(id) {
    const ids = ['btnPresetAll', 'btnPresetHopper', 'btnPresetScale', 'btnPresetVision', 'btnPresetEjectors', 'btnPresetSilos'];
    ids.forEach(bId => {
      const b = document.getElementById(bId);
      if (b) {
        b.classList.remove('active', 'bg-cyan-900', 'text-cyan-300', 'border-cyan-500');
      }
    });
    const active = document.getElementById(id);
    if (active) {
      active.classList.add('active');
    }
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

  resetCamera() {
    this.viewport.targetZoom = 1.0;
    this.viewport.targetPanX = 0;
    this.viewport.targetPanY = 0;
    this.focusedStation = null;
    this.setActivePresetBtn('btnPresetAll');
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
    if (this.industrialView) this.industrialView.updateAlarmBanner();
  }

  acknowledgeAlarms() {
    this.alarmList.forEach(a => a.acked = true);
    this.renderAlarmTable();
    if (this.industrialView) this.industrialView.updateAlarmBanner();
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

    // 1. Atualiza Física & Controle (Núcleo Compartilhado)
    this.sim.update(dt);

    // 2. Alarme de discrepância no atuador
    if (this.plc.diagnostics.p_FALHA_EJETOR && !this.lastFaultEjector) {
      this.lastFaultEjector = true;
      this.logAlarm('ZSH-601/FY-603', 'FALHA DE EJEÇÃO: Comando FY-603 ativo sem confirmação de sensor magnético ZSH-601!', 'CRÍTICO');
    } else if (!this.plc.diagnostics.p_FALHA_EJETOR) {
      this.lastFaultEjector = false;
    }

    // 3. Atualiza Camada SCADA Industrial (P&ID, Alarmes ISA-18.2, Faceplates)
    if (this.industrialView) {
      this.industrialView.update(dt);
    }

    // 4. Renderiza Sinótico com Zoom/Pan
    this.renderSynoptic();

    // 5. Renderiza Câmera HUD
    this.vision.renderCameraHUD(this.cameraCanvas, this.vision.lastInspectedGrain);

    // 6. Gráficos Historiadores
    this.chartSampleAccumulator += dt;
    if (this.chartSampleAccumulator >= 0.5) {
      this.chartSampleAccumulator = 0;
      this.charts.addSample(this.sim.scale.massFlowKgPerHour);
      this.charts.renderFlowTrend();
      this.charts.renderDistribution(this.sim.stats.catACount, this.sim.stats.catBCount, this.sim.stats.catCCount);
    }

    // 7. Atualiza Dashboard Didático
    this.updateDashboard();

    requestAnimationFrame(this.animate);
  }

  renderSynoptic() {
    if (!this.synopticCanvas) return;
    const ctx = this.synopticCanvas.getContext('2d');
    const w = this.synopticCanvas.width;
    const h = this.synopticCanvas.height;

    // Fundo clássico da Planta (Verde-Ardósia / Teal Industrial #4d7373 da Imagem 2)
    ctx.fillStyle = '#4d7373';
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

    // Grade matricial técnica de pontos (Dotted Grid) CONECTADA AO MUNDO VIRTUAL
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let x = -600; x < 1600; x += 16) {
      for (let y = -300; y < 700; y += 16) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    const { hopperX, scaleStartX, scaleEndX, cameraX, ejectorCX, ejectorBX, endConveyorX, conveyorY, conveyorHeight } = this.sim.layout;

    // 1. SILOS DE COLETA (Destinos A, B, C)
    this.drawSilo(ctx, ejectorCX - 28, conveyorY + 60, 56, 80, 'SILO C (Rejeito)', '#ff2222', this.sim.silos.siloC.levelPercent, `LIT-703: ${this.sim.silos.siloC.levelPercent.toFixed(0)}%`, `${this.sim.silos.siloC.count} un`);
    this.drawSilo(ctx, ejectorBX - 28, conveyorY + 60, 56, 80, 'SILO B (Secundário)', '#ffaa00', this.sim.silos.siloB.levelPercent, `LIT-702: ${this.sim.silos.siloB.levelPercent.toFixed(0)}%`, `${this.sim.silos.siloB.count} un`);
    this.drawSilo(ctx, endConveyorX + 5, conveyorY + 30, 62, 110, 'SILO A (Aprovado)', '#00c000', this.sim.silos.siloA.levelPercent, `LIT-701: ${this.sim.silos.siloA.levelPercent.toFixed(0)}%`, `${this.sim.silos.siloA.count} un`);

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
    this.drawEjectorStation(ctx, ejectorCX, conveyorY, this.sim.pneumatics.pistonStrokeC, this.sim.pneumatics.blowEffectC, this.plc.outputs.c_FY603, 'FY-603 (Ejetor C)', 'ZSH-601', '#ff2222', false);

    // 8. ESTAÇÃO 2: EJETOR PNEUMÁTICO B (FY-602 / ZSH-602)
    this.drawEjectorStation(ctx, ejectorBX, conveyorY, this.sim.pneumatics.pistonStrokeB, this.sim.pneumatics.blowEffectB, this.plc.outputs.c_FY602, 'FY-602 (Ejetor B)', 'ZSH-602', '#ffaa00', false);

    // 9. GRÃOS EM TRÂNSITO
    this.drawGrains(ctx);

    // 10. DESTAQUE VISUAL DA ESTAÇÃO FOCADA (SEM DESLOCAR A TELA)
    this.drawStationHighlight(ctx);

    ctx.restore();

    // --- INDICADOR DE ZOOM ATUAL NO CANTO ---
    ctx.fillStyle = '#000000';
    ctx.fillRect(10, h - 22, 130, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(10, h - 22, 130, 16);
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ZOOM: ${(this.viewport.zoom * 100).toFixed(0)}% (Scroll / Drag)`, 14, h - 11);
  }

  drawStationHighlight(ctx) {
    if (!this.focusedStation) return;
    const { hopperX, scaleStartX, scaleEndX, cameraX, ejectorCX, ejectorBX, endConveyorX, conveyorY } = this.sim.layout;

    let targetBox = null;
    let label = '';
    if (this.focusedStation === 'hopper') {
      targetBox = { x: hopperX - 45, y: conveyorY - 155, w: 90, h: 140 };
      label = 'FOCO: 1. FUNIL RECEPTOR TK-101';
    } else if (this.focusedStation === 'scale') {
      targetBox = { x: scaleStartX - 15, y: conveyorY - 20, w: (scaleEndX - scaleStartX) + 30, h: 55 };
      label = 'FOCO: 2. BALANÇA WT-301 / FT-301';
    } else if (this.focusedStation === 'vision') {
      targetBox = { x: cameraX - 45, y: conveyorY - 105, w: 90, h: 110 };
      label = 'FOCO: 3. INSPEÇÃO ÓPTICA KSA-401';
    } else if (this.focusedStation === 'ejectors') {
      targetBox = { x: ejectorCX - 35, y: conveyorY - 100, w: (ejectorBX - ejectorCX) + 70, h: 105 };
      label = 'FOCO: 4. EJETORES PNEUMÁTICOS FY-603 / FY-602';
    } else if (this.focusedStation === 'silos') {
      targetBox = { x: ejectorCX - 35, y: conveyorY + 25, w: (endConveyorX - ejectorCX) + 110, h: 130 };
      label = 'FOCO: 5. SILOS DE DESTINO A / B / C';
    }

    if (targetBox) {
      ctx.save();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(targetBox.x, targetBox.y, targetBox.w, targetBox.h);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(11, 47, 74, 0.88)';
      const textW = 195;
      ctx.fillRect(targetBox.x, targetBox.y - 18, textW, 16);
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(targetBox.x, targetBox.y - 18, textW, 16);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px "Segoe UI", Tahoma, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, targetBox.x + 6, targetBox.y - 10);
      ctx.restore();
    }
  }

  drawProcessStepsHeader(ctx, w) {
    const steps = [
      { num: '1', title: 'Recepção / Dosagem', tag: 'LIT-101 + c_ALIM', x: 80 },
      { num: '2', title: 'Pesagem Contínua', tag: 'WT-301 ➔ FT-301', x: 235 },
      { num: '3', title: 'Inspeção Óptica IA', tag: 'XS-401 ➔ KSA-401', x: 400 },
      { num: '4', title: 'Ejeção Pneumática', tag: 'FY-603 / FY-602', x: 615 },
      { num: '5', title: 'Coleta & Silos', tag: 'Destinos A / B / C', x: 830 },
    ];

    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(10, 6, w - 20, 28);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 6, w - 20, 28);

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      ctx.fillStyle = '#000080';
      ctx.beginPath();
      ctx.arc(s.x - 38, 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.num, s.x - 38, 23);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px Tahoma, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.title, s.x - 26, 16);
      ctx.fillStyle = '#404040';
      ctx.font = '8px monospace';
      ctx.fillText(s.tag, s.x - 26, 26);

      if (i < steps.length - 1) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('➔', s.x + 85, 21);
      }
    }
  }

  drawHopper(ctx, x, y, w, h, levelPercent, isFeeding) {
    const hw = w / 2;
    const chuteW = 20;

    ctx.fillStyle = '#b0b8c0';
    ctx.strokeStyle = '#000000';
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

      ctx.fillStyle = '#c88020';
      ctx.fillRect(x - hw, y + h - fillH, w, fillH);
      ctx.restore();
    }

    const vibOffset = isFeeding ? (Math.sin(performance.now() * 0.08) * 2.5) : 0;
    ctx.fillStyle = isFeeding ? '#00c000' : '#808080';
    ctx.fillRect(x - 15 + vibOffset, y + h + 2, 35, 6);
    ctx.strokeRect(x - 15 + vibOffset, y + h + 2, 35, 6);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIT-101', x, y + 16);
    ctx.fillStyle = levelPercent < 15 ? '#c00000' : '#000000';
    ctx.fillText(`${levelPercent.toFixed(0)}% Nível`, x, y + 42);

    ctx.fillStyle = '#000000';
    ctx.font = '8px monospace';
    ctx.fillText('c_ALIM', x, y + h + 18);
  }

  drawConveyor(ctx, x, y, len, h, speed, offset) {
    ctx.fillStyle = '#808890';
    ctx.fillRect(x, y + h, len, 8);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x, y + h, len, 8);

    ctx.fillStyle = '#606870';
    for (let px = x + 30; px < x + len; px += 180) {
      ctx.fillRect(px, y + h + 8, 8, 45);
      ctx.strokeRect(px, y + h + 8, 8, 45);
    }

    ctx.fillStyle = '#303030';
    ctx.fillRect(x, y, len, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, len, h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let rx = x + (offset % 25); rx < x + len; rx += 25) {
      ctx.beginPath();
      ctx.moveTo(rx, y + 2);
      ctx.lineTo(rx, y + h - 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#a0a8b0';
    ctx.beginPath();
    ctx.arc(x, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.arc(x + len, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.sim.conveyor.isOverloaded ? '#c00000' : (speed > 0 ? '#00c000' : '#808080');
    ctx.fillRect(x - 24, y + 2, 20, 26);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x - 24, y + 2, 20, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR', x - 14, y + 14);
    ctx.fillText('ST-201', x - 14, y + 23);
  }

  drawScale(ctx, startX, endX, y, currentMassKg) {
    const len = endX - startX;
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(startX, y - 4, len, 6);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, y - 4, len, 6);

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(startX + 10, y + 2); ctx.lineTo(startX + 18, y + 12); ctx.lineTo(startX + 2, y + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(endX - 10, y + 2); ctx.lineTo(endX - 2, y + 12); ctx.lineTo(endX - 18, y + 12); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WT-301 (Balança)', startX + len / 2, y + 48);
    ctx.font = '8px monospace';
    ctx.fillText('FT-301 (kg/h)', startX + len / 2, y + 58);
    const massMg = Math.round(currentMassKg * 1000000);
    ctx.fillText(`${massMg} mg na esteira`, startX + len / 2, y - 10);
  }

  drawVisionStation(ctx, x, y, camOk) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 25, y);
    ctx.lineTo(x - 25, y - 65);
    ctx.lineTo(x + 25, y - 65);
    ctx.lineTo(x + 25, y);
    ctx.stroke();

    ctx.fillStyle = camOk ? '#c0c8c0' : '#e08080';
    ctx.fillRect(x - 14, y - 62, 28, 20);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x - 14, y - 62, 28, 20);

    ctx.fillStyle = '#101010';
    ctx.fillRect(x - 7, y - 42, 14, 5);

    // Iluminação estroboscópica
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 37);
    ctx.lineTo(x + 7, y - 37);
    ctx.lineTo(x + 18, y - 2);
    ctx.lineTo(x - 18, y - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KSA-401', x, y - 72);
    ctx.font = '8px Tahoma, sans-serif';
    ctx.fillText('Trigger XS-401', x, y - 24);
  }

  drawTrackingRuler(ctx, camX, ejCX, ejBX, y) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(camX, y);
    ctx.lineTo(ejBX + 10, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#0000c0';
    ctx.beginPath(); ctx.arc(camX, y, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#c00000';
    ctx.beginPath(); ctx.arc(ejCX, y, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#d08000';
    ctx.beginPath(); ctx.arc(ejBX, y, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◄── Shift Register: Tracking via Encoder ST-201 ──►', (camX + ejBX) / 2, y + 10);
  }

  drawEjectorStation(ctx, x, y, stroke, blowEffect, isFiring, title, sensorTag, color, isJammed) {
    ctx.fillStyle = isJammed ? '#e07070' : '#b0b8c0';
    ctx.fillRect(x - 12, y - 75, 24, 35);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 12, y - 75, 24, 35);

    ctx.beginPath();
    ctx.moveTo(x, y - 75);
    ctx.lineTo(x, y - 95);
    ctx.stroke();

    const rodLength = 8 + stroke * 22;
    ctx.fillStyle = '#404040';
    ctx.fillRect(x - 3, y - 40, 6, rodLength);

    if (blowEffect > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y - 40 + rodLength + 5, 8 + blowEffect * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x, y - 82);

    ctx.fillStyle = isFiring ? '#00c000' : '#808080';
    ctx.fillText(sensorTag, x, y - 100);
  }

  drawSilo(ctx, x, y, w, h, title, color, levelPercent, subtext, desc) {
    ctx.fillStyle = '#b0b8c0';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    if (levelPercent > 0) {
      const fillH = (h - 6) * Math.min(1.0, levelPercent / 100);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 3, y + h - 3 - fillH, w - 6, fillH);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 14);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(subtext, x + w / 2, y + 26);

    ctx.fillStyle = '#404040';
    ctx.font = '7px Tahoma, sans-serif';
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
        ctx.strokeStyle = g.classifiedCategory === 'A' ? '#00c000' : g.classifiedCategory === 'B' ? '#ffaa00' : '#c00000';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }

  updateDashboard() {
    const plantStatusBadge = document.getElementById('plantStatusBadge');
    if (plantStatusBadge) {
      if (this.plc.inputs.p_EMERG) {
        plantStatusBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-sans bg-[#d32f2f] text-white border-2 border-[#800000]';
        plantStatusBadge.innerText = '● PARADA DE EMERGÊNCIA (XA-901 ATUADA)';
      } else if (!this.plc.outputs.c_PERM) {
        plantStatusBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-sans bg-[#ffaa00] text-black border-2 border-[#805000]';
        plantStatusBadge.innerText = '● INTERTRAVADO (VERIFIQUE FALHAS)';
      } else if (this.plc.inputs.p_STANDBY) {
        const isSilo = this.plc.inputs.p_NC701 || this.plc.inputs.p_NC702 || this.plc.inputs.p_NC703;
        plantStatusBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-sans bg-[#204060] text-white border-2 border-[#102030]';
        plantStatusBadge.innerText = isSilo ? '● STANDBY (SILO CHEIO / PURGA CONCLUÍDA)' : '● STANDBY (FUNIL VAZIO / PURGA CONCLUÍDA)';
      } else if (!this.plc.outputs.c_ALIM && (this.plc.inputs.p_NC701 || this.plc.inputs.p_NC702 || this.plc.inputs.p_NC703) && this.sim.conveyor.actualSpeed > 0) {
        plantStatusBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-sans bg-[#ffaa00] text-black border-2 border-[#805000]';
        plantStatusBadge.innerText = '● PURGANDO ESTEIRA (SILO CHEIO)';
      } else if (this.sim.conveyor.actualSpeed > 0) {
        plantStatusBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-sans bg-[#00c000] text-white border-2 border-[#005000]';
        plantStatusBadge.innerText = '● EM OPERAÇÃO NORMAL';
      } else {
        plantStatusBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-sans bg-[#e2dfd7] text-[#006400] border-2 border-[#808080]';
        plantStatusBadge.innerText = '● PRONTO / AGUARDANDO COMANDO';
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
      <div class="flex items-center justify-between text-[10px] font-mono py-0.5 px-1.5 rounded bg-[#111722] border border-[#283344]">
        <span class="text-slate-400">#${item.id}</span>
        <span class="font-bold ${
          item.category === 'A' ? 'text-emerald-400' : item.category === 'B' ? 'text-amber-400' : 'text-red-400'
        }">Cat ${item.category}</span>
        <span class="text-slate-300">${item.x}px</span>
        <span class="text-slate-400 font-bold">${item.category !== 'A' ? '⏱ ' + item.timeToTarget + 's p/ disparo' : '➔ Silo A'}</span>
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
      el.className = `pilot-lamp ${state ? 'on-red' : 'off'}`;
    } else {
      el.className = `pilot-lamp ${state ? 'on-green' : 'off'}`;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.scada = new SCADASystem();
});
