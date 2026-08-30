/**
 * SCADA-Core Automática - Módulo Principal de IHM & Supervisão (scada.js)
 * Renderizador do Sinótico Industrial 2D em Canvas, Gerenciador de Alarmes ISA 18.2
 * e Controle Operacional.
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

    // Canvas elements
    this.synopticCanvas = document.getElementById('synopticCanvas');
    this.cameraCanvas = document.getElementById('cameraCanvas');
    this.flowCanvas = document.getElementById('flowCanvas');
    this.distCanvas = document.getElementById('distCanvas');

    this.charts = new SCADACharts(this.flowCanvas, this.distCanvas);

    // Histórico de Alarmes (ISA 18.2)
    this.alarmList = [];
    this.lastAlarmStates = {};

    this.lastTimestamp = performance.now();
    this.chartSampleAccumulator = 0;

    this.initUI();
    this.initControls();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initUI() {
    // Ajusta resolução do canvas sinótico para nitidez
    if (this.synopticCanvas) {
      this.synopticCanvas.width = 900;
      this.synopticCanvas.height = 360;
    }
    if (this.cameraCanvas) {
      this.cameraCanvas.width = 240;
      this.cameraCanvas.height = 180;
    }
    if (this.flowCanvas) {
      this.flowCanvas.width = 320;
      this.flowCanvas.height = 110;
    }
    if (this.distCanvas) {
      this.distCanvas.width = 320;
      this.distCanvas.height = 70;
    }
  }

  initControls() {
    // Mesa de Operação
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnEmerg = document.getElementById('btnEmerg');
    const btnAck = document.getElementById('btnAck');
    const btnRefill = document.getElementById('btnRefill');
    const btnEmptyC = document.getElementById('btnEmptyC');
    const sliderSpeed = document.getElementById('sliderSpeed');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        // Partida: se houver permissivo, liga
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

    if (sliderSpeed) {
      sliderSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('lblSpeedVal').innerText = val.toFixed(2) + ' m/s';
        if (this.sim.conveyor.actualSpeed > 0) {
          this.sim.conveyor.speedSetpoint = val;
        }
      });
    }

    // Painel de Injeção de Falhas
    this.setupFaultToggle('faultAirPressure', (active) => {
      this.sim.pneumatics.pressureBar = active ? 2.8 : 6.5;
      this.plc.inputs.p_PAL601 = active;
      if (active) this.logAlarm('PAL-601', 'Pressão da rede de ar comprimido BAIXA (2.8 bar)!', 'ALTO');
    });

    this.setupFaultToggle('faultMotorOverload', (active) => {
      this.sim.conveyor.isOverloaded = active;
      this.plc.inputs.p_JI201 = active;
      if (active) this.logAlarm('JI-201', 'Relé térmico atuado: SOBRECARGA no motor da esteira!', 'CRÍTICO');
    });

    this.setupFaultToggle('faultCameraFail', (active) => {
      this.plc.inputs.p_KSA401 = !active;
      this.plc.diagnostics.alarme_KSA401 = active;
      if (active) this.logAlarm('KSA-401', 'Falha de comunicação/operação da Câmera de Visão!', 'ALTO');
    });

    this.setupFaultToggle('faultPistonJam', (active) => {
      this.sim.pneumatics.isJammed = active;
      if (active) this.logAlarm('FY-603', 'Simulação de travamento mecânico do pistão ejetor!', 'MÉDIO');
    });

    this.setupFaultToggle('faultSiloCFull', (active) => {
      this.sim.silos.siloC.levelPercent = active ? 100.0 : 20.0;
      this.sim.silos.siloC.count = active ? 200 : 40;
      if (active) this.logAlarm('LIT-703', 'Nível Crítico atingido no Reservatório de Rejeito Silo C!', 'CRÍTICO');
    });
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
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-3">Nenhum alarme ativo. Sistema normal.</td></tr>`;
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

    // 1. Atualiza Física & Controle
    this.sim.update(dt);

    // 2. Renderiza Sinótico Principal
    this.renderSynoptic();

    // 3. Renderiza Câmera HUD
    this.vision.renderCameraHUD(this.cameraCanvas, this.vision.lastInspectedGrain);

    // 4. Atualiza Gráficos (1x por seg)
    this.chartSampleAccumulator += dt;
    if (this.chartSampleAccumulator >= 0.5) {
      this.chartSampleAccumulator = 0;
      this.charts.addSample(this.sim.scale.massFlowKgPerHour);
      this.charts.renderFlowTrend();
      this.charts.renderDistribution(this.sim.stats.catACount, this.sim.stats.catBCount, this.sim.stats.catCCount);
    }

    // 5. Atualiza Displays e LEDs do SCADA
    this.updateDashboard();

    requestAnimationFrame(this.animate);
  }

  renderSynoptic() {
    if (!this.synopticCanvas) return;
    const ctx = this.synopticCanvas.getContext('2d');
    const w = this.synopticCanvas.width;
    const h = this.synopticCanvas.height;

    // Fundo da Planta
    ctx.fillStyle = '#0b1320';
    ctx.fillRect(0, 0, w, h);

    // Grade de fundo sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const { hopperX, scaleStartX, scaleEndX, cameraX, ejectorX, deflectorBX, endConveyorX, conveyorY, conveyorHeight } = this.sim.layout;

    // 1. SILOS DE COLETA (Destinos A, B, C)
    // Silo C (Rejeito) - Sob o ejetor
    this.drawSilo(ctx, ejectorX - 25, conveyorY + 55, 50, 70, 'SILO C', '#ff1744', this.sim.silos.siloC.levelPercent, `LIT-703: ${this.sim.silos.siloC.levelPercent.toFixed(0)}%`);

    // Silo B (Secundário) - Intermediário
    this.drawSilo(ctx, deflectorBX - 20, conveyorY + 55, 50, 70, 'SILO B', '#ffb300', (this.sim.silos.siloB.count % 100), `${this.sim.silos.siloB.count} un`);

    // Silo A (Aprovado) - Fim de Linha
    this.drawSilo(ctx, endConveyorX + 5, conveyorY + 30, 55, 95, 'SILO A', '#00e676', (this.sim.silos.siloA.count % 100), `${this.sim.silos.siloA.count} un`);

    // 2. FUNIL DE RECEPÇÃO & ALIMENTADOR VIBRATÓRIO
    this.drawHopper(ctx, hopperX, conveyorY - 140, 70, 110, this.sim.hopper.level, this.plc.outputs.c_ALIM);

    // 3. ESTEIRA TRANSPORTADORA
    this.drawConveyor(ctx, hopperX - 10, conveyorY, endConveyorX - hopperX + 20, conveyorHeight, this.sim.conveyor.actualSpeed, this.sim.conveyor.positionOffset);

    // 4. BALANÇA DE PESAGEM CONTÍNUA (WT-301 / FT-301)
    this.drawScale(ctx, scaleStartX, scaleEndX, conveyorY, this.sim.scale.currentMassOnBeltKg);

    // 5. ESTAÇÃO DE VISÃO COMPUTACIONAL (XS-401 / KSA-401)
    this.drawVisionStation(ctx, cameraX, conveyorY, this.plc.inputs.p_KSA401);

    // 6. ESTAÇÃO DE EJEÇÃO PNEUMÁTICA (FY-603 / ZSH-601 / PT-601)
    this.drawEjectorStation(ctx, ejectorX, conveyorY, this.sim.pneumatics.pistonStroke, this.sim.pneumatics.blowEffect, this.plc.outputs.c_FY603);

    // 7. GRÃOS EM TRÂNSITO NA ESTEIRA E EM QUEDA
    this.drawGrains(ctx);
  }

  drawHopper(ctx, x, y, w, h, levelPercent, isFeeding) {
    const hw = w / 2;
    const chuteW = 20;

    // Estrutura do funil metálico
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + chuteW / 2, y + h - 25);
    ctx.lineTo(x + chuteW / 2, y + h);
    ctx.lineTo(x - chuteW / 2, y + h);
    ctx.lineTo(x - chuteW / 2, y + h - 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nível de Grãos no interior do funil
    if (levelPercent > 0) {
      const fillH = (h - 30) * (levelPercent / 100);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - hw, y);
      ctx.lineTo(x + hw, y);
      ctx.lineTo(x + chuteW / 2, y + h - 25);
      ctx.lineTo(x + chuteW / 2, y + h);
      ctx.lineTo(x - chuteW / 2, y + h);
      ctx.lineTo(x - chuteW / 2, y + h - 25);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#d97706';
      ctx.fillRect(x - hw, y + h - fillH, w, fillH);
      ctx.restore();
    }

    // Calha vibratória (Alimentador c_ALIM)
    const vibOffset = isFeeding ? (Math.sin(performance.now() * 0.08) * 2.5) : 0;
    ctx.fillStyle = isFeeding ? '#38bdf8' : '#64748b';
    ctx.fillRect(x - 15 + vibOffset, y + h + 2, 35, 6);

    // Tag ISA 5.1
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LIT-101', x, y - 8);
    ctx.fillStyle = levelPercent < 15 ? '#ef4444' : '#38bdf8';
    ctx.fillText(`${levelPercent.toFixed(0)}%`, x, y + 14);
  }

  drawConveyor(ctx, x, y, len, h, speed, offset) {
    // Suporte da estrutura metálica
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y + h, len, 8);

    // Pés de suporte
    ctx.fillStyle = '#334155';
    for (let px = x + 30; px < x + len; px += 180) {
      ctx.fillRect(px, y + h + 8, 8, 45);
    }

    // Lona da esteira
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, len, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, len, h);

    // Roletes em movimento
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let rx = x + (offset % 25); rx < x + len; rx += 25) {
      ctx.beginPath();
      ctx.moveTo(rx, y + 2);
      ctx.lineTo(rx, y + h - 2);
      ctx.stroke();
    }

    // Tambores de tração nas pontas
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(x, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.arc(x + len, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();

    // Motor da Esteira (JI-201 / ST-201)
    ctx.fillStyle = this.sim.conveyor.isOverloaded ? '#ef4444' : (speed > 0 ? '#10b981' : '#64748b');
    ctx.fillRect(x - 22, y + 2, 18, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('M1', x - 13, y + 18);
  }

  drawScale(ctx, startX, endX, y, currentMassKg) {
    const len = endX - startX;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(startX, y - 4, len, 6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, y - 4, len, 6);

    // Célula de carga abaixo da esteira
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(startX + len / 2 - 12, y + 32, 24, 8);

    // Tag WT-301
    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WT-301', startX + len / 2, y + 52);
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${(currentMassKg * 1000).toFixed(0)} g`, startX + len / 2, y - 10);
  }

  drawVisionStation(ctx, x, y, camOk) {
    // Pórtico da câmera
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 25, y);
    ctx.lineTo(x - 25, y - 75);
    ctx.lineTo(x + 25, y - 75);
    ctx.lineTo(x + 25, y);
    ctx.stroke();

    // Corpo da Câmera KSA-401
    ctx.fillStyle = camOk ? '#0284c7' : '#ef4444';
    ctx.fillRect(x - 14, y - 72, 28, 22);

    // Lente e Iluminador LED
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x - 7, y - 50, 14, 5);

    // Feixe Óptico / Laser de Trigger XS-401
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 45);
    ctx.lineTo(x + 7, y - 45);
    ctx.lineTo(x + 18, y - 2);
    ctx.lineTo(x - 18, y - 2);
    ctx.closePath();
    ctx.fill();

    // Tag KSA-401
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KSA-401', x, y - 82);
    ctx.font = '8px monospace';
    ctx.fillText('XS-401', x, y - 28);
  }

  drawEjectorStation(ctx, x, y, stroke, blowEffect, isFiring) {
    // Suporte do Atuador Pneumático
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 12, y - 85, 24, 40);

    // Linha de Pressão PT-601
    ctx.strokeStyle = this.plc.inputs.p_PAL601 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 85);
    ctx.lineTo(x, y - 105);
    ctx.stroke();

    // Haste do Pistão Pneumático (Avanço = stroke * 20px)
    const rodLength = 10 + stroke * 25;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x - 3, y - 45, 6, rodLength);

    // Bocal de Sopro / Ponteira
    ctx.fillStyle = isFiring ? '#ff1744' : '#64748b';
    ctx.fillRect(x - 8, y - 45 + rodLength, 16, 5);

    // Sensor Magnético ZSH-601
    const sensorActive = this.plc.inputs.p_ZSH601;
    ctx.fillStyle = sensorActive ? '#00e676' : '#475569';
    ctx.fillRect(x + 14, y - 60, 6, 10);

    // Jato de Ar Comprimido (Efeito Visual de Sopro)
    if (blowEffect > 0) {
      ctx.fillStyle = `rgba(0, 240, 255, ${blowEffect * 0.7})`;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 38 + rodLength);
      ctx.lineTo(x + 6, y - 38 + rodLength);
      ctx.lineTo(x + 16, y + 40);
      ctx.lineTo(x - 16, y + 40);
      ctx.closePath();
      ctx.fill();
    }

    // Tag FY-603
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FY-603', x, y - 110);
    ctx.font = '8px monospace';
    ctx.fillText('ZSH-601', x + 25, y - 52);
  }

  drawSilo(ctx, x, y, w, h, title, color, levelPercent, subtext) {
    // Corpo do Silo
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Nível interno
    if (levelPercent > 0) {
      const fillH = (h - 6) * Math.min(1.0, levelPercent / 100);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + 3, y + h - 3 - fillH, w - 6, fillH);
      ctx.globalAlpha = 1.0;
    }

    // Título e Rótulo
    ctx.fillStyle = color;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 14);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '8px monospace';
    ctx.fillText(subtext, x + w / 2, y + h - 6);
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

      // Destaque de classificação se já foi inspecionado
      if (g.classifiedCategory) {
        ctx.strokeStyle = g.classifiedCategory === 'A' ? '#00e676' : g.classifiedCategory === 'B' ? '#ffb300' : '#ff1744';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  updateDashboard() {
    // 1. Status Geral da Planta
    const plantStatusBadge = document.getElementById('plantStatusBadge');
    if (plantStatusBadge) {
      if (this.plc.inputs.p_EMERG) {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-700 animate-pulse';
        plantStatusBadge.innerText = '● PARADA DE EMERGÊNCIA';
      } else if (!this.plc.outputs.c_PERM) {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-700';
        plantStatusBadge.innerText = '● INTERTRAVADO (SEM PERMISSIVO)';
      } else if (this.sim.conveyor.actualSpeed > 0) {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-700';
        plantStatusBadge.innerText = '● EM OPERAÇÃO NORMAL';
      } else {
        plantStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-700';
        plantStatusBadge.innerText = '● PRONTO / AGUARDANDO PARTIDA';
      }
    }

    // 2. Instrumentos Analógicos / Digitais
    this.updateElementText('dispSpeed', `${this.sim.conveyor.actualSpeed.toFixed(2)} m/s`);
    this.updateElementText('dispSpeedMin', `${(this.sim.conveyor.actualSpeed * 60).toFixed(1)} m/min`);
    this.updateElementText('dispMassFlow', `${this.sim.scale.massFlowKgPerHour.toFixed(1)} kg/h`);
    this.updateElementText('dispPressure', `${this.sim.pneumatics.pressureBar.toFixed(1)} bar`);
    this.updateElementText('dispCurrent', `${this.sim.conveyor.motorCurrent.toFixed(1)} A`);

    // 3. Contadores de Produção
    this.updateElementText('cntTotal', this.sim.stats.totalProcessed);
    this.updateElementText('cntCatA', this.sim.stats.catACount);
    this.updateElementText('cntCatB', this.sim.stats.catBCount);
    this.updateElementText('cntCatC', this.sim.stats.catCCount);

    // 4. Lâmpadas / Indicadores Booleanos da Lógica Proposicional
    this.updateLed('led_c_PERM', this.plc.outputs.c_PERM);
    this.updateLed('led_c_PERM_sub', this.plc.outputs.c_PERM);
    this.updateLed('led_c_ALIM', this.plc.outputs.c_ALIM);
    this.updateLed('led_c_FY603', this.plc.outputs.c_FY603);
    this.updateLed('led_p_EMERG', this.plc.inputs.p_EMERG, true);
    this.updateLed('led_p_JI201', this.plc.inputs.p_JI201, true);
    this.updateLed('led_p_PAL601', this.plc.inputs.p_PAL601, true);
    this.updateLed('led_p_KSA401', this.plc.inputs.p_KSA401);
    this.updateLed('led_p_NC703', this.plc.inputs.p_NC703, true);
    this.updateLed('led_p_MOV201', this.plc.inputs.p_MOV201);
    this.updateLed('led_p_NB101', this.plc.inputs.p_NB101, true);
    this.updateLed('led_p_C', this.plc.inputs.p_POS603);
    this.updateLed('led_p_POS603', this.plc.inputs.p_POS603);
    this.updateLed('led_p_ZSH601', this.plc.inputs.p_ZSH601);
  }

  updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  updateLed(id, state, isAlarmType = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isAlarmType) {
      el.className = `w-3 h-3 rounded-full ${state ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-700'}`;
    } else {
      el.className = `w-3 h-3 rounded-full ${state ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`;
    }
  }
}

// Inicialização automática quando o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  window.scada = new SCADASystem();
});
