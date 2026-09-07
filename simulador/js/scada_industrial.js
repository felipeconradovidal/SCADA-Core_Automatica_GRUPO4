/**
 * SCADA-Core Automática - Módulo SCADA Industrial Clássico (scada_industrial.js)
 * Estética autêntica baseada no padrão de referência industrial (Siemens WinCC / Wonderware InTouch / Citect)
 * - Fundo do Sinótico em Verde-Ardósia / Teal Industrial (#4d7373) com Dotted Matrix Grid
 * - Tubulações em aço espesso cinza (#dcdcdc) com contorno preto sólido 2px e setas direcionais
 * - Símbolos ISA clássicos para bombas/motores e válvulas com blocos [ON] / [OFF]
 * - Displays Digitais (IO Fields) em caixa preta rebaixada com texto fosforescente verde/amarelo
 * - Banner de alarmes e controle de faceplates em conformidade com ISA-18.2 e ISA-101
 */

export class IndustrialSCADAView {
  constructor(plc, sim, vision, charts, scadaMain) {
    this.plc = plc;
    this.sim = sim;
    this.vision = vision;
    this.charts = charts;
    this.scadaMain = scadaMain;

    this.activeScreen = 'N2'; // Default: N2 (Sinótico P&ID)
    this.isMuted = false;
    this.activeFaceplate = null; // Tag do equipamento selecionado
    this.hoveredEquipment = null;

    // Equipamentos interativos no P&ID (Hitboxes coordenadas do Canvas P&ID)
    this.equipmentHitboxes = [
      { tag: 'TK-101', name: 'Funil Receptor & Dosador', type: 'hopper', x: 45, y: 70, w: 100, h: 140 },
      { tag: 'M-201', name: 'Motor de Tração da Esteira CV-201', type: 'motor', x: 810, y: 155, w: 90, h: 70 },
      { tag: 'WT-301', name: 'Balança Dinâmica Contínua', type: 'scale', x: 270, y: 195, w: 110, h: 60 },
      { tag: 'KSA-401', name: 'Estação de Visão Inteligente IA', type: 'vision', x: 440, y: 120, w: 95, h: 100 },
      { tag: 'XV-603', name: 'Válvula Ejetora C (Rejeito)', type: 'ejectorC', x: 590, y: 220, w: 85, h: 80 },
      { tag: 'XV-602', name: 'Válvula Ejetora B (Secundário)', type: 'ejectorB', x: 730, y: 220, w: 85, h: 80 },
      { tag: 'V-703', name: 'Silo C (Rejeito / Impróprio)', type: 'siloC', x: 575, y: 310, w: 115, h: 100 },
      { tag: 'V-702', name: 'Silo B (Secundário / Tolerável)', type: 'siloB', x: 715, y: 310, w: 115, h: 100 },
      { tag: 'V-701', name: 'Silo A (Aprovado Premium)', type: 'siloA', x: 880, y: 280, w: 120, h: 130 },
    ];

    // Histórico de Tendência Dedicado (N3)
    this.trendHistory = {
      timestamps: [],
      flowRate: [],
      speed: [],
      pressure: []
    };
    this.maxTrendSamples = 60;

    this.initElements();
    this.initEventListeners();
  }

  initElements() {
    this.pidCanvas = document.getElementById('pidCanvas');
    if (this.pidCanvas) {
      this.pidCanvas.width = 1040;
      this.pidCanvas.height = 430;
    }

    this.trendCanvasN3 = document.getElementById('trendCanvasN3');
    if (this.trendCanvasN3) {
      this.trendCanvasN3.width = 1000;
      this.trendCanvasN3.height = 260;
    }
  }

  initEventListeners() {
    // 1. Navegação de Telas ISA-101 (N1 a N4 e Processo)
    const navButtons = document.querySelectorAll('.isa-tab-btn, .scada-tab-btn, .isa-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const screen = e.currentTarget.dataset.screen;
        if (screen) this.setScreen(screen);
      });
    });

    // 2. Banner de Alarmes (ISA 18.2) - ACK e MUTE
    const btnBannerAck = document.getElementById('btnBannerAck');
    if (btnBannerAck) {
      btnBannerAck.addEventListener('click', () => {
        this.scadaMain.acknowledgeAlarms();
        this.updateAlarmBanner();
      });
    }

    const btnBannerMute = document.getElementById('btnBannerMute');
    if (btnBannerMute) {
      btnBannerMute.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        btnBannerMute.classList.toggle('active', this.isMuted);
        btnBannerMute.innerHTML = this.isMuted ? '🔇 MUTED' : '🔔 MUTE';
      });
    }

    // 3. Interação do P&ID (Hover e Clique nos Equipamentos)
    if (this.pidCanvas) {
      this.pidCanvas.addEventListener('mousemove', (e) => {
        const rect = this.pidCanvas.getBoundingClientRect();
        const scaleX = this.pidCanvas.width / rect.width;
        const scaleY = this.pidCanvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let found = null;
        for (const eq of this.equipmentHitboxes) {
          if (mouseX >= eq.x && mouseX <= eq.x + eq.w && mouseY >= eq.y && mouseY <= eq.y + eq.h) {
            found = eq;
            break;
          }
        }
        this.hoveredEquipment = found;
        this.pidCanvas.style.cursor = found ? 'pointer' : 'default';
      });

      this.pidCanvas.addEventListener('click', () => {
        if (this.hoveredEquipment) {
          this.openFaceplate(this.hoveredEquipment.tag);
        }
      });
    }

    // 4. Fechamento do Faceplate Modal
    const btnCloseFaceplate = document.getElementById('btnCloseFaceplate');
    const faceplateModal = document.getElementById('faceplateModal');
    if (btnCloseFaceplate && faceplateModal) {
      btnCloseFaceplate.addEventListener('click', () => {
        this.closeFaceplate();
      });
    }

    if (faceplateModal) {
      faceplateModal.addEventListener('click', (e) => {
        if (e.target === faceplateModal) {
          this.closeFaceplate();
        }
      });
    }

    // 5. Abas do Faceplate
    const fpTabButtons = document.querySelectorAll('.fp-tab-btn');
    fpTabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.fptab;
        fpTabButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        document.querySelectorAll('.fp-tab-content').forEach(tc => tc.classList.add('hidden'));
        const targetContent = document.getElementById(`fpTab_${tab}`);
        if (targetContent) targetContent.classList.remove('hidden');
      });
    });

    // 6. Vinculação das Botoeiras Industriais da Mesa de Comando
    const btnIndStart = document.getElementById('btnIndStart');
    const btnIndStop = document.getElementById('btnIndStop');
    const btnIndEmerg = document.getElementById('btnIndEmerg');

    if (btnIndStart) {
      btnIndStart.addEventListener('click', () => {
        const btnProtoStart = document.getElementById('btnStart');
        if (btnProtoStart) btnProtoStart.click();
      });
    }

    if (btnIndStop) {
      btnIndStop.addEventListener('click', () => {
        const btnProtoStop = document.getElementById('btnStop');
        if (btnProtoStop) btnProtoStop.click();
      });
    }

    if (btnIndEmerg) {
      btnIndEmerg.addEventListener('click', () => {
        const btnProtoEmerg = document.getElementById('btnEmerg');
        if (btnProtoEmerg) btnProtoEmerg.click();
      });
    }
  }

  setScreen(screen) {
    this.activeScreen = screen;
    document.querySelectorAll('.isa-tab-btn, .scada-tab-btn, .isa-nav-btn').forEach(btn => {
      if (btn.dataset.screen === screen) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.isa-screen-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`screen_${screen}`);
    if (target) target.classList.remove('hidden');

    if (screen === 'N2') {
      this.renderPID();
    }
  }

  update(dt) {
    // 1. Atualizar Banner Superior ISA-18.2
    this.updateAlarmBanner();

    // 2. Atualizar a Tela Ativa
    if (this.activeScreen === 'N1') {
      this.updateScreenN1();
    } else if (this.activeScreen === 'N2') {
      this.renderPID();
    } else if (this.activeScreen === 'N3') {
      this.updateScreenN3(dt);
    } else if (this.activeScreen === 'N4') {
      this.updateScreenN4();
    }

    // 3. Atualizar Faceplate se aberto
    if (this.activeFaceplate) {
      this.updateActiveFaceplateContent();
    }
  }

  updateAlarmBanner() {
    const banner = document.getElementById('alarmBanner');
    const badge = document.getElementById('alarmBannerBadge');
    const text = document.getElementById('alarmBannerText');
    const countEl = document.getElementById('alarmBannerCount');
    if (!banner || !badge || !text) return;

    const unacked = this.scadaMain.alarmList.filter(a => !a.acked);
    const highest = unacked[0] || this.scadaMain.alarmList[0];

    if (countEl) countEl.innerText = `${unacked.length} Ativo(s)`;

    if (unacked.length > 0 && highest) {
      const isCritical = highest.severity === 'CRÍTICO';
      const isHigh = highest.severity === 'ALTO';

      banner.className = `scada-alarm-ribbon ${isCritical ? 'critical' : isHigh ? 'high' : 'normal'}`;

      badge.className = `px-1.5 py-0.2 font-bold text-[10px] ${
        isCritical ? 'bg-[#d32f2f] text-white border border-[#800000]' :
        isHigh ? 'bg-[#ff9900] text-black border border-[#b36b00]' :
        'bg-[#00aa00] text-white border border-[#005500]'
      }`;
      badge.innerText = `● ${highest.severity} [${highest.tag}]`;

      text.className = `truncate font-mono text-[11px] ${isCritical ? 'text-[#ff3333]' : isHigh ? 'text-[#ffaa00]' : 'text-[#00ff00]'}`;
      text.innerHTML = `<span>${highest.time}</span> — <strong>ALR ${highest.tag}: ${highest.message}</strong>`;
    } else {
      banner.className = 'scada-alarm-ribbon normal';
      badge.className = 'px-1.5 py-0.2 font-bold text-[10px] bg-[#00aa00] text-white border border-[#005500]';
      badge.innerText = '✓ NORMAL';
      text.className = 'truncate font-mono text-[11px] text-[#00ff00]';
      text.innerText = 'Planta em condições operacionais nominais. Nenhum alarme de processo ativo.';
    }
  }

  // =========================================================================
  // TELA N1: VISÃO GERAL & KPIS DA PLANTA (ISA-101 LEVEL 1)
  // =========================================================================
  updateScreenN1() {
    const total = this.sim.stats.totalProcessed;
    const catA = this.sim.stats.catACount;
    const catB = this.sim.stats.catBCount;
    const catC = this.sim.stats.catCCount;

    const pctA = total > 0 ? ((catA / total) * 100).toFixed(1) : '0.0';
    const pctB = total > 0 ? ((catB / total) * 100).toFixed(1) : '0.0';
    const pctC = total > 0 ? ((catC / total) * 100).toFixed(1) : '0.0';

    const elN1Flow = document.getElementById('n1_flow');
    const elN1Total = document.getElementById('n1_total');
    const elN1Press = document.getElementById('n1_press');
    const elN1PctA = document.getElementById('n1_pctA');
    const elN1PctB = document.getElementById('n1_pctB');
    const elN1PctC = document.getElementById('n1_pctC');
    const elN1OEE = document.getElementById('n1_oee');

    if (elN1Flow) elN1Flow.innerText = `${this.sim.scale.massFlowKgPerHour.toFixed(1)} kg/h`;
    if (elN1Total) elN1Total.innerText = `${total}`;
    if (elN1Press) elN1Press.innerText = `${this.sim.pneumatics.pressureBar.toFixed(1)} bar`;

    if (elN1PctA) elN1PctA.innerText = `${pctA}% (${catA})`;
    if (elN1PctB) elN1PctB.innerText = `${pctB}% (${catB})`;
    if (elN1PctC) elN1PctC.innerText = `${pctC}% (${catC})`;

    if (elN1OEE) {
      const avail = this.plc.outputs.c_PERM ? 0.98 : 0.40;
      const perf = Math.min(1.0, this.sim.conveyor.actualSpeed / 1.0);
      const qual = total > 0 ? (catA / total) : 1.0;
      const oee = (avail * perf * qual * 100).toFixed(1);
      elN1OEE.innerText = (this.sim.conveyor.actualSpeed > 0 ? oee : '0.0') + '%';
    }
  }

  // =========================================================================
  // TELA N2: SINÓTICO P&ID INDUSTRIAL CLÁSSICO (IMAGEM DE REFERÊNCIA 2)
  // =========================================================================
  renderPID() {
    if (!this.pidCanvas) return;
    const ctx = this.pidCanvas.getContext('2d');
    const w = this.pidCanvas.width;
    const h = this.pidCanvas.height;

    // 1. Fundo Verde-Ardósia / Teal Clássico do Sinótico (Imagem de Referência 2: #4d7373)
    ctx.fillStyle = '#4d7373';
    ctx.fillRect(0, 0, w, h);

    // 2. Malha Matricial de Pontos de Alinhamento Técnico (Dotted Grid da Referência)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let x = 12; x < w; x += 16) {
      for (let y = 12; y < h; y += 16) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 3. TUBULAÇÕES ESPESSAS EM CINZA-AÇO COM CONTORNO PRETO DE 2PX
    this.drawProcessPiping(ctx);

    // 4. FUNIL DE RECEPÇÃO TK-101
    this.drawPidHopper(ctx, 50, 75, 90, 130);

    // 5. ESTEIRA TRANSPORTADORA CV-201 E MOTOR M-201
    this.drawPidConveyor(ctx, 160, 175, 700, 35);

    // 6. BALANÇA DINÂMICA WT-301 / FT-301
    this.drawPidScale(ctx, 280, 205, 90, 30);

    // 7. ESTAÇÃO DE VISÃO KSA-401 / TRIGGER XS-401
    this.drawPidVision(ctx, 450, 125, 75, 80);

    // 8. LINHA PNEUMÁTICA E VÁLVULAS SOLENOIDES XV-603 / XV-602
    this.drawPidPneumatics(ctx, 600, 220, 740, 220);

    // 9. SILOS DE DESTINO V-701, V-702, V-703
    this.drawPidSilos(ctx);

    // 10. ATUALIZA TELEMETRIA NA BARRA INFERIOR DO P&ID (IO Fields)
    const dispSpeed = document.getElementById('pid_dispSpeed');
    const dispFlow = document.getElementById('pid_dispFlow');
    const dispPress = document.getElementById('pid_dispPress');
    const dispCurrent = document.getElementById('pid_dispCurrent');
    const dispTotal = document.getElementById('pid_dispTotal');

    if (dispSpeed) dispSpeed.innerText = `${this.sim.conveyor.actualSpeed.toFixed(2)} m/s`;
    if (dispFlow) dispFlow.innerText = `${this.sim.scale.massFlowKgPerHour.toFixed(1)} kg/h`;
    if (dispPress) dispPress.innerText = `${this.sim.pneumatics.pressureBar.toFixed(1)} bar`;
    if (dispCurrent) dispCurrent.innerText = `${this.sim.conveyor.motorCurrent.toFixed(1)} A`;
    if (dispTotal) dispTotal.innerText = `${this.sim.stats.totalProcessed} un`;

    // 11. DESTAQUE DO EQUIPAMENTO HOVERED (SELEÇÃO TÉCNICA COM CAIXA AMARELA)
    if (this.hoveredEquipment) {
      const eq = this.hoveredEquipment;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(eq.x - 3, eq.y - 3, eq.w + 6, eq.h + 6);
      ctx.setLineDash([]);

      // Tooltip clássico cinza/preto
      ctx.fillStyle = '#ffffd0';
      ctx.fillRect(eq.x, eq.y - 22, 175, 18);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(eq.x, eq.y - 22, 175, 18);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px Tahoma, sans-serif';
      ctx.fillText(`🔍 ${eq.tag}: Clique p/ Faceplate`, eq.x + 6, eq.y - 10);
    }
  }

  // --- TUBULAÇÃO ESPESSA CLÁSSICA COM SETAS DIRECIONAIS ---
  drawProcessPiping(ctx) {
    // Linha Pneumática de Ar Comprimido (Tubo cinza com contorno preto)
    this.drawThickPipe(ctx, [
      { x: 560, y: 45 },
      { x: 760, y: 45 },
      { x: 760, y: 215 }
    ], 10);

    this.drawThickPipe(ctx, [
      { x: 630, y: 45 },
      { x: 630, y: 215 }
    ], 10);

    // Setas direcionais na linha pneumática
    this.drawPipeArrow(ctx, 600, 45, 'right');
    this.drawPipeArrow(ctx, 700, 45, 'right');
    this.drawPipeArrow(ctx, 630, 110, 'down');
    this.drawPipeArrow(ctx, 760, 110, 'down');

    // Identificador da Linha Pneumática PT-601 com Display IO Field
    this.drawInstrumentBubble(ctx, 560, 45, 'PT', '601');
    this.drawCanvasIOField(ctx, 580, 36, `${this.sim.pneumatics.pressureBar.toFixed(1)} bar`, this.sim.pneumatics.pressureBar < 4.5 ? '#ff2222' : '#00ff00');

    // Calhas de gravidade dos ejetores para os silos
    this.drawThickPipe(ctx, [{ x: 632, y: 250 }, { x: 632, y: 315 }], 12);
    this.drawThickPipe(ctx, [{ x: 772, y: 250 }, { x: 772, y: 315 }], 12);
    this.drawThickPipe(ctx, [{ x: 860, y: 200 }, { x: 920, y: 285 }], 12);

    this.drawPipeArrow(ctx, 632, 280, 'down');
    this.drawPipeArrow(ctx, 772, 280, 'down');
    this.drawPipeArrow(ctx, 890, 240, 'right-down');
  }

  drawThickPipe(ctx, points, diameter = 10) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    // 1. Contorno preto externo
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = diameter + 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 2. Preenchimento aço cinza-prata claro
    ctx.strokeStyle = '#dcdcdc';
    ctx.lineWidth = diameter - 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }

  drawPipeArrow(ctx, x, y, dir = 'right') {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();

    if (dir === 'right') {
      ctx.moveTo(x - 5, y - 4); ctx.lineTo(x + 5, y); ctx.lineTo(x - 5, y + 4);
    } else if (dir === 'down') {
      ctx.moveTo(x - 4, y - 5); ctx.lineTo(x, y + 5); ctx.lineTo(x + 4, y - 5);
    } else if (dir === 'right-down') {
      ctx.moveTo(x - 6, y - 1); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 1, y + 7);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- FUNIL DE ALIMENTAÇÃO TK-101 ---
  drawPidHopper(ctx, x, y, w, h) {
    const isSelected = this.activeFaceplate === 'TK-101';
    
    // Corpo do tanque/funil com acabamento em aço cinza
    ctx.fillStyle = isSelected ? '#c0c0c0' : '#b0b8c0';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h * 0.65);
    ctx.lineTo(x + w * 0.65, y + h);
    ctx.lineTo(x + w * 0.35, y + h);
    ctx.lineTo(x, y + h * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Barra de nível analógica interna
    const level = this.sim.hopper.level; // 0..100
    const barX = x + 10;
    const barY = y + 15;
    const barW = 12;
    const barH = h * 0.55;

    ctx.fillStyle = '#000000';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    const fillH = (level / 100) * barH;
    ctx.fillStyle = level < 15 ? '#ff2222' : '#00e000';
    ctx.fillRect(barX + 1, barY + barH - fillH, barW - 2, fillH);

    // Rótulo clássico do vaso
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px Tahoma, sans-serif';
    ctx.fillText('TK-101', x + 30, y + 25);
    ctx.font = '9px Tahoma, sans-serif';
    ctx.fillText('Funil Grãos', x + 30, y + 38);

    // Display Digital de Nível (IO Field em Caixa Preta)
    this.drawCanvasIOField(ctx, x + 26, y + 45, `${level.toFixed(0)}%`, level < 15 ? '#ff2222' : '#00ff00');

    // Válvula dosadora de saída (Alimentador c_ALIM) com bloquinhos ON/OFF
    const feederActive = this.plc.outputs.c_ALIM;
    this.drawValveSymbol(ctx, x + w * 0.5, y + h + 10, feederActive ? '#00c000' : '#808080', 'XV-101');
    this.drawCanvasStateBlocks(ctx, x + w * 0.5 + 16, y + h, feederActive);

    // Bolha de Instrumentação ISA 5.1: LIT-101
    this.drawInstrumentBubble(ctx, x + w + 16, y + 35, 'LIT', '101');
  }

  // --- ESTEIRA CV-201 E MOTOR M-201 ---
  drawPidConveyor(ctx, x, y, w, h) {
    const isRunning = this.sim.conveyor.actualSpeed > 0;
    const isOverloaded = this.sim.conveyor.isOverloaded;

    // Chassi estrutural da esteira (cinza mecânico com contorno preto)
    ctx.fillStyle = '#a0a8b0';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Polias / Roletes terminais redondos (separados para não traçar linha reta conectando os centros)
    ctx.fillStyle = '#707880';
    ctx.beginPath();
    ctx.arc(x, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + w, y + h / 2, h / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rótulo da Esteira (desenha com nitidez no centro da esteira)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px Tahoma, sans-serif';
    ctx.fillText('CV-201 (Esteira Transportadora)', x + 35, y + 22);

    // Setas direcionais de movimento da correia
    if (isRunning) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('►   ►   ►   ►   ►   ►   ►   ►', x + 250, y + 22);
    }

    // Motor de Tração M-201
    const motorX = x + w + 45;
    const motorY = y + 17;
    this.drawMotorSymbol(ctx, motorX, motorY, isRunning, isOverloaded);

    // Bolha ST-201 (Velocidade) com Display IO Field
    this.drawInstrumentBubble(ctx, x + 70, y - 35, 'ST', '201');
    this.drawCanvasIOField(ctx, x + 90, y - 43, `${this.sim.conveyor.actualSpeed.toFixed(2)} m/s`, isRunning ? '#00ff00' : '#ffff00');

    // Bolha JI-201 (Corrente) com Display IO Field
    this.drawInstrumentBubble(ctx, motorX - 10, motorY - 50, 'JI', '201');
    this.drawCanvasIOField(ctx, motorX + 10, motorY - 58, `${this.sim.conveyor.actualSpeed > 0 ? (isOverloaded ? '5.4 A' : '2.1 A') : '0.0 A'}`, isOverloaded ? '#ff2222' : '#ffff00');
  }

  // --- SÍMBOLO CLÁSSICO DE MOTOR/BOMBA (IMAGEM 2) ---
  drawMotorSymbol(ctx, x, y, isRunning, isOverloaded) {
    const isSelected = this.activeFaceplate === 'M-201';

    // Círculo com saída tangencial (Símbolo clássico de bomba/motor de processo)
    ctx.fillStyle = isOverloaded ? '#c00000' : isRunning ? '#00c000' : '#c00000';
    ctx.strokeStyle = isSelected ? '#ffff00' : '#000000';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Letra M no centro
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', x, y + 5);
    ctx.textAlign = 'left';

    // Tag
    ctx.font = 'bold 10px Tahoma, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('M-201', x - 15, y - 24);

    // Bloquinhos [ON] e [OFF] da Imagem 2!
    this.drawCanvasStateBlocks(ctx, x + 24, y - 12, isRunning && !isOverloaded);
  }

  // --- BALANÇA WT-301 / FT-301 ---
  drawPidScale(ctx, x, y, w, h) {
    const isSelected = this.activeFaceplate === 'WT-301';
    ctx.fillStyle = isSelected ? '#d0d8e0' : '#b0b8c0';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Apoios de célula de carga (Triângulos pretos sólidos)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x + 15, y + h); ctx.lineTo(x + 25, y + h + 10); ctx.lineTo(x + 5, y + h + 10); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w - 15, y + h); ctx.lineTo(x + w - 5, y + h + 10); ctx.lineTo(x + w - 25, y + h + 10); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Tahoma, sans-serif';
    ctx.fillText('WT-301', x + 8, y + 18);

    // Bolha de Vazão FT-301 com Display IO Field
    this.drawInstrumentBubble(ctx, x + w / 2 - 25, y + 45, 'FT', '301');
    this.drawCanvasIOField(ctx, x + w / 2 - 5, y + 36, `${this.sim.scale.massFlowKgPerHour.toFixed(1)} kg/h`, '#ffff00');
  }

  // --- ESTAÇÃO DE VISÃO KSA-401 ---
  drawPidVision(ctx, x, y, w, h) {
    const isSelected = this.activeFaceplate === 'KSA-401';
    const isOk = this.plc.inputs.p_KSA401;

    ctx.fillStyle = isSelected ? '#d8ded8' : '#c0c8c0';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Lente escura da câmera
    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h - 15, 12, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px Tahoma, sans-serif';
    ctx.fillText('KSA-401', x + 15, y + 20);

    // Display de status da visão
    this.drawCanvasIOField(ctx, x + 6, y + 28, isOk ? 'ONLINE' : 'COMM FAIL', isOk ? '#00ff00' : '#ff2222');

    // Bolha XS-401 (Trigger)
    this.drawInstrumentBubble(ctx, x + w / 2, y - 28, 'XS', '401');
  }

  // --- PNEUMÁTICA E EJETORES XV-603 / XV-602 ---
  drawPidPneumatics(ctx, xC, yC, xB, yB) {
    // Ejetor C (Rejeito)
    const isFiringC = this.plc.outputs.c_FY603;
    this.drawValveSymbol(ctx, xC + 32, yC, isFiringC ? '#00c000' : '#808080', 'XV-603');
    this.drawCanvasStateBlocks(ctx, xC + 50, yC - 10, isFiringC);

    // Sensor de Curso ZSH-601
    this.drawInstrumentBubble(ctx, xC + 32, yC + 45, 'ZSH', '601');

    // Ejetor B (Secundário)
    const isFiringB = this.plc.outputs.c_FY602;
    this.drawValveSymbol(ctx, xB + 32, yB, isFiringB ? '#00c000' : '#808080', 'XV-602');
    this.drawCanvasStateBlocks(ctx, xB + 50, yB - 10, isFiringB);

    // Sensor de Curso ZSH-602
    this.drawInstrumentBubble(ctx, xB + 32, yB + 45, 'ZSH', '602');
  }

  // --- SILOS V-701, V-702, V-703 ---
  drawPidSilos(ctx) {
    // Silo C (Rejeito)
    this.drawPidSingleSilo(ctx, 580, 315, 100, 95, 'V-703', 'Silo C (Rejeito)', this.sim.silos.siloC.levelPercent, '#ff2222', 'LIT-703');

    // Silo B (Secundário)
    this.drawPidSingleSilo(ctx, 720, 315, 100, 95, 'V-702', 'Silo B (Secundário)', this.sim.silos.siloB.levelPercent, '#ffaa00', 'LIT-702');

    // Silo A (Aprovado)
    this.drawPidSingleSilo(ctx, 880, 285, 110, 125, 'V-701', 'Silo A (Premium)', this.sim.silos.siloA.levelPercent, '#00c000', 'LIT-701');
  }

  drawPidSingleSilo(ctx, x, y, w, h, tag, name, level, color, litTag) {
    const isSelected = this.activeFaceplate === tag;
    ctx.fillStyle = isSelected ? '#d0d8e0' : '#b0b8c0';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    // Vaso cilíndrico com fundo cônico
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h * 0.75);
    ctx.lineTo(x + w * 0.6, y + h);
    ctx.lineTo(x + w * 0.4, y + h);
    ctx.lineTo(x, y + h * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Barra de Nível Analógica
    const barX = x + 10;
    const barY = y + 15;
    const barW = 10;
    const barH = h * 0.6;

    ctx.fillStyle = '#000000';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    const fillH = Math.min(barH, (level / 100) * barH);
    ctx.fillStyle = level > 90 ? '#ff2222' : color;
    ctx.fillRect(barX + 1, barY + barH - fillH, barW - 2, fillH);

    // Textos
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px Tahoma, sans-serif';
    ctx.fillText(tag, x + 26, y + 22);

    // Display Digital de Nível
    this.drawCanvasIOField(ctx, x + 24, y + 30, `${level.toFixed(0)}%`, level > 90 ? '#ff2222' : '#00ff00');

    // Bolha LIT
    this.drawInstrumentBubble(ctx, x + w - 16, y + 25, 'LIT', tag.split('-')[1]);
  }

  // --- SÍMBOLO DE VÁLVULA DE DUAS VIAS COM ATUADOR SOLENOIDE [S] ---
  drawValveSymbol(ctx, x, y, color, tag) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    // Triângulos opostos clássicos ANSI/ISA
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 6);
    ctx.lineTo(x + 10, y + 6);
    ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x - 10, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Atuador solenoide no topo (Caixa retangular com 'S')
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(x - 6, y - 18, 12, 10);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x - 6, y - 18, 12, 10);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Tahoma, sans-serif';
    ctx.fillText('S', x - 3, y - 10);

    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x, y);
    ctx.stroke();

    ctx.font = 'bold 9px Tahoma, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(tag, x - 14, y + 18);
  }

  // --- BOLHA DE INSTRUMENTAÇÃO CLÁSSICA ISA 5.1 ---
  drawInstrumentBubble(ctx, x, y, letters, number) {
    const r = 13;
    ctx.fillStyle = '#f4f2ee';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Linha divisória horizontal
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 8px Tahoma, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(letters, x, y - 2);
    ctx.fillText(number, x, y + 10);
    ctx.textAlign = 'left';
  }

  // --- HELPER: DISPLAY DIGITAL (IO FIELD) EM CAIXA PRETA NO CANVAS ---
  drawCanvasIOField(ctx, x, y, val, colorOrExtra = '#00ff00', extraColor = '') {
    let color = '#00ff00';
    if (extraColor && extraColor !== '') {
      color = extraColor;
    } else if (colorOrExtra && colorOrExtra !== '') {
      color = colorOrExtra;
    }

    const text = `${val}`;
    ctx.font = 'bold 10px monospace';
    const textW = ctx.measureText(text).width;
    const boxW = Math.max(48, textW + 8);
    const boxH = 16;

    // Fundo preto com borda 3D rebaixada (Sunken)
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, boxW, boxH);

    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + boxW, y); ctx.lineTo(x, y); ctx.lineTo(x, y + boxH);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + boxW, y); ctx.lineTo(x + boxW, y + boxH); ctx.lineTo(x, y + boxH);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(text, x + boxW - 4, y + 12);
    ctx.textAlign = 'left';
  }

  // --- HELPER: BLOCOS ON/OFF CHANFRADOS (EXATAMENTE COMO NA IMAGEM 2) ---
  drawCanvasStateBlocks(ctx, x, y, isOn) {
    // Bloco ON
    ctx.fillStyle = isOn ? '#00c000' : '#a8b8a8';
    ctx.fillRect(x, y, 22, 11);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 22, 11);
    ctx.fillStyle = isOn ? '#ffffff' : '#405040';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ON', x + 11, y + 9);

    // Bloco OFF
    ctx.fillStyle = !isOn ? '#c00000' : '#b8a8a8';
    ctx.fillRect(x, y + 12, 22, 11);
    ctx.strokeRect(x, y + 12, 22, 11);
    ctx.fillStyle = !isOn ? '#ffffff' : '#504040';
    ctx.fillText('OFF', x + 11, y + 21);
    ctx.textAlign = 'left';
  }

  // =========================================================================
  // TELA N3: HISTORIADOR E TENDÊNCIAS (ISA-101 LEVEL 3)
  // =========================================================================
  updateScreenN3(dt) {
    if (!this.trendCanvasN3) return;
    const ctx = this.trendCanvasN3.getContext('2d');
    const w = this.trendCanvasN3.width;
    const h = this.trendCanvasN3.height;

    // Fundo preto de registrador gráfico clássico
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Amostragem
    this.trendHistory.timestamps.push(new Date().toLocaleTimeString());
    this.trendHistory.flowRate.push(this.sim.scale.massFlowKgPerHour);
    this.trendHistory.speed.push(this.sim.conveyor.actualSpeed * 100);
    this.trendHistory.pressure.push(this.sim.pneumatics.pressureBar * 20);

    if (this.trendHistory.flowRate.length > this.maxTrendSamples) {
      this.trendHistory.timestamps.shift();
      this.trendHistory.flowRate.shift();
      this.trendHistory.speed.shift();
      this.trendHistory.pressure.shift();
    }

    // Grade técnica verde/cinza suave de osciloscópio/registrador
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    for (let y = 30; y < h - 30; y += 35) {
      ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(w - 20, y); ctx.stroke();
    }
    for (let x = 50; x < w - 20; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 30); ctx.stroke();
    }

    // Curvas
    this.drawTrendLine(ctx, this.trendHistory.flowRate, '#00ff00', 0, 300, 50, h - 30, w - 70, h - 60);
    this.drawTrendLine(ctx, this.trendHistory.speed, '#ffff00', 0, 150, 50, h - 30, w - 70, h - 60);
    this.drawTrendLine(ctx, this.trendHistory.pressure, '#ff9900', 0, 160, 50, h - 30, w - 70, h - 60);

    // Legendas industriais no topo
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.fillText('■ FT-301: Vazão Mássica (kg/h)', 60, 20);
    ctx.fillStyle = '#ffff00';
    ctx.fillText('■ ST-201: Velocidade Esteira (m/s x100)', 320, 20);
    ctx.fillStyle = '#ff9900';
    ctx.fillText('■ PT-601: Pressão Ar (bar x20)', 620, 20);
  }

  drawTrendLine(ctx, data, color, minVal, maxVal, startX, baseY, plotW, plotH) {
    if (data.length < 2) return;
    const stepX = plotW / (this.maxTrendSamples - 1);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      const x = startX + i * stepX;
      const y = baseY - norm * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // =========================================================================
  // TELA N4: ENGENHARIA E DIAGNÓSTICO DO CLP
  // =========================================================================
  updateScreenN4() {
    const ioBits = [
      { name: 'b_LIGA', desc: 'Botoeira de Partida (Painel)', val: this.plc.inputs.b_LIGA, isFault: false },
      { name: 'b_DESL', desc: 'Botoeira de Parada Normal', val: this.plc.inputs.b_DESL, isFault: false },
      { name: 'p_EMERG', desc: 'Botão de Emergência (Cogumelo)', val: this.plc.inputs.p_EMERG, isFault: this.plc.inputs.p_EMERG },
      { name: 'p_JI201', desc: 'Relé Térmico Motor CV-201 (Sobrecarga)', val: this.plc.inputs.p_JI201, isFault: this.plc.inputs.p_JI201 },
      { name: 'p_PAL601', desc: 'Pressostato Linha Pneumática (< 4.5 bar)', val: this.plc.inputs.p_PAL601, isFault: this.plc.inputs.p_PAL601 },
      { name: 'p_KSA401', desc: 'Comunicação Estação de Visão Inteligente', val: this.plc.inputs.p_KSA401, isFault: !this.plc.inputs.p_KSA401 },
      { name: 'p_NB101', desc: 'Sensor de Nível Baixo Funil (< 15%)', val: this.plc.inputs.p_NB101, isFault: this.plc.inputs.p_NB101 },
      { name: 'p_STANDBY', desc: 'Modo Standby Esteira (Purga Grãos Concluída)', val: this.plc.inputs.p_STANDBY, isFault: false },
      { name: 'p_NA701', desc: 'Alarme Nível Alto Silo A (> 90%)', val: this.plc.inputs.p_NA701, isFault: this.plc.inputs.p_NA701 },
      { name: 'p_NC701', desc: 'Nível Crítico Silo A (≥ 95% Bloqueia Dosador)', val: this.plc.inputs.p_NC701, isFault: this.plc.inputs.p_NC701 },
      { name: 'p_NA702', desc: 'Alarme Nível Alto Silo B (> 90%)', val: this.plc.inputs.p_NA702, isFault: this.plc.inputs.p_NA702 },
      { name: 'p_NC702', desc: 'Nível Crítico Silo B (≥ 95% Bloqueia Dosador)', val: this.plc.inputs.p_NC702, isFault: this.plc.inputs.p_NC702 },
      { name: 'p_NA703', desc: 'Alarme Nível Alto Silo C (> 90%)', val: this.plc.inputs.p_NA703, isFault: this.plc.inputs.p_NA703 },
      { name: 'p_NC703', desc: 'Nível Crítico Silo C (≥ 95% Bloqueia Dosador)', val: this.plc.inputs.p_NC703, isFault: this.plc.inputs.p_NC703 },
      { name: 'p_ZSH601', desc: 'Sensor Fim de Curso Pistão C (Avançado)', val: this.plc.inputs.p_ZSH601, isFault: false },
      { name: 'p_ZSH602', desc: 'Sensor Fim de Curso Pistão B (Avançado)', val: this.plc.inputs.p_ZSH602, isFault: false },
      { name: 'c_PERM', desc: 'Permissivo Geral de Marcha da Linha', val: this.plc.outputs.c_PERM, isFault: !this.plc.outputs.c_PERM },
      { name: 'c_EST', desc: 'Comando Contatora Motor da Esteira', val: this.plc.outputs.c_EST, isFault: false },
      { name: 'c_ALIM', desc: 'Comando Alimentador Vibratório do Funil', val: this.plc.outputs.c_ALIM, isFault: false },
      { name: 'c_FY603', desc: 'Comando Válvula Solenoide Ejetor C', val: this.plc.outputs.c_FY603, isFault: false },
      { name: 'c_FY602', desc: 'Comando Válvula Solenoide Ejetor B', val: this.plc.outputs.c_FY602, isFault: false },
      { name: 'p_FALHA_EJETOR', desc: 'Discrepância Atuador C vs Sensor ZSH-601', val: this.plc.diagnostics.p_FALHA_EJETOR, isFault: this.plc.diagnostics.p_FALHA_EJETOR }
    ];

    const tbody = document.getElementById('ioTableBody');
    if (!tbody) return;

    tbody.innerHTML = ioBits.map(b => `
      <tr>
        <td class="font-bold ${b.isFault ? 'text-red-700' : 'text-blue-900'}">${b.name}</td>
        <td>${b.desc}</td>
        <td class="text-center">
          <span class="px-2 py-0.5 font-bold ${b.val ? 'bg-[#00c000] text-white' : 'bg-[#d0d0d0] text-gray-700'} border border-black">
            ${b.val ? '1 (HIGH)' : '0 (LOW)'}
          </span>
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // SISTEMA DE FACEPLATES (POP-UPS DE EQUIPAMENTO PADRÃO WINCC / INTOUCH)
  // =========================================================================
  openFaceplate(tag) {
    this.activeFaceplate = tag;
    const modal = document.getElementById('faceplateModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.updateActiveFaceplateContent();
  }

  closeFaceplate() {
    this.activeFaceplate = null;
    const modal = document.getElementById('faceplateModal');
    if (modal) modal.classList.add('hidden');
  }

  updateActiveFaceplateContent() {
    const tag = this.activeFaceplate;
    if (!tag) return;

    const titleEl = document.getElementById('fpTitle');
    const tagEl = document.getElementById('fpTag');
    const statusBadge = document.getElementById('fpStatusBadge');
    const opContent = document.getElementById('fpTab_operacao');
    const ilContent = document.getElementById('fpTab_intertravamentos');
    const mtContent = document.getElementById('fpTab_manutencao');

    if (tagEl) tagEl.innerText = tag;

    if (tag === 'M-201') {
      if (titleEl) titleEl.innerText = 'Motor de Tração da Esteira CV-201';
      const isRun = this.sim.conveyor.actualSpeed > 0;
      if (statusBadge) {
        statusBadge.className = isRun ? 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]' : 'px-2 py-0.5 text-[10px] font-bold bg-[#c00000] text-white border border-[#500000]';
        statusBadge.innerText = isRun ? '● EM MARCHA (RUN)' : '⏹ PARADO (STOP)';
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="text-black font-bold">Modo de Operação:</span>
              <span class="font-bold text-blue-900">[ AUTOMÁTICO - CLP ]</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="text-black font-bold">Velocidade Atual:</span>
              <span class="scada-io-field py-0.5 text-xs">${this.sim.conveyor.actualSpeed.toFixed(2)} m/s (${(this.sim.conveyor.actualSpeed * 60).toFixed(1)} m/min)</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="text-black font-bold">Corrente Consumida (JI-201):</span>
              <span class="scada-io-field ${this.sim.conveyor.isOverloaded ? 'red' : 'yellow'} py-0.5 text-xs">${this.sim.conveyor.actualSpeed > 0 ? (this.sim.conveyor.isOverloaded ? '5.4 A' : '2.1 A') : '0.0 A'}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2">
              <button onclick="document.getElementById('btnStart').click()" class="btn-classic btn-classic-green py-2 font-bold text-xs">COMANDO LIGAR</button>
              <button onclick="document.getElementById('btnStop').click()" class="btn-classic btn-classic-red py-2 font-bold text-xs">COMANDO PARAR</button>
            </div>
          </div>
        `;
      }

      if (ilContent) {
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 uppercase font-bold mb-1">Cadeia de Permissivos de Segurança do Motor:</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>c_PERM (Permissivo Geral):</span>
              <span class="${this.plc.outputs.c_PERM ? 'text-green-700' : 'text-red-700'} font-bold">${this.plc.outputs.c_PERM ? 'LIBERADO' : 'BLOQUEADO'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>¬p_EMERG (Parada de Emergência):</span>
              <span class="${!this.plc.inputs.p_EMERG ? 'text-green-700' : 'text-red-700'} font-bold">${!this.plc.inputs.p_EMERG ? 'OK' : 'ATIVADA'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>¬p_JI201 (Relé Térmico Motor):</span>
              <span class="${!this.plc.inputs.p_JI201 ? 'text-green-700' : 'text-red-700'} font-bold">${!this.plc.inputs.p_JI201 ? 'OK' : 'TRIP (SOBRECARGA)'}</span>
            </div>
          </div>
        `;
      }

      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Horímetro de Operação:</span>
              <span class="font-bold">1.482,4 horas</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Número de Partidas:</span>
              <span class="font-bold">342 ciclos</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Próxima Lubrificação:</span>
              <span class="text-green-700 font-bold">Em 518 horas</span>
            </div>
          </div>
        `;
      }
    } else if (tag === 'XV-603') {
      if (titleEl) titleEl.innerText = 'Válvula Ejetora Categoria C (Rejeito)';
      const isFiringC = this.plc.outputs.c_FY603;
      if (statusBadge) {
        statusBadge.className = isFiringC
          ? 'px-2 py-0.5 text-[10px] font-bold bg-[#ffaa00] text-black border border-[#b36b00]'
          : 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]';
        statusBadge.innerText = isFiringC ? '● ATUANDO' : '● PRONTO';
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Pressão de Suprimento (PT-601):</span>
              <span class="scada-io-field py-0.5 text-xs">${this.sim.pneumatics.pressureBar.toFixed(1)} bar</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Confirmação de Curso (ZSH-601):</span>
              <span class="${this.plc.inputs.p_ZSH601 ? 'text-green-700 font-bold' : 'text-gray-700'}">${this.plc.inputs.p_ZSH601 ? 'AVANÇADO' : 'RECUADO'}</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Total de Ejeções Realizadas:</span>
              <span class="font-bold">${this.sim.stats.catCCount} grãos</span>
            </div>
          </div>
        `;
      }
      if (ilContent) {
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 font-bold mb-1">Equação Lógica de Disparo: c_FY603 ↔ p_C ∧ p_POS603 ∧ ¬p_PAL601</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>¬p_PAL601 (Pressão Pneumática):</span>
              <span class="${!this.plc.inputs.p_PAL601 ? 'text-green-700' : 'text-red-700'} font-bold">${!this.plc.inputs.p_PAL601 ? 'OK' : 'BLOQUEADO (BAIXA)'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>c_PERM (Permissivo Geral):</span>
              <span class="${this.plc.outputs.c_PERM ? 'text-green-700' : 'text-red-700'} font-bold">${this.plc.outputs.c_PERM ? 'LIBERADO' : 'BLOQUEADO'}</span>
            </div>
          </div>
        `;
      }
      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Ciclos de Disparo Acumulados:</span>
              <span class="font-bold">${this.sim.stats.catCCount} ciclos</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Tipo de Atuador:</span>
              <span class="font-bold">Cilindro Pneumático ISO 15552 c/ Sensor Magnético</span>
            </div>
          </div>
        `;
      }
    } else if (tag === 'XV-602') {
      if (titleEl) titleEl.innerText = 'Válvula Ejetora Categoria B (Secundário / Tolerável)';
      const isFiringB = this.plc.outputs.c_FY602;
      if (statusBadge) {
        statusBadge.className = isFiringB
          ? 'px-2 py-0.5 text-[10px] font-bold bg-[#ffaa00] text-black border border-[#b36b00]'
          : 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]';
        statusBadge.innerText = isFiringB ? '● ATUANDO' : '● PRONTO';
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Pressão de Suprimento (PT-601):</span>
              <span class="scada-io-field py-0.5 text-xs">${this.sim.pneumatics.pressureBar.toFixed(1)} bar</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Confirmação de Curso (ZSH-602):</span>
              <span class="${this.plc.inputs.p_ZSH602 ? 'text-green-700 font-bold' : 'text-gray-700'}">${this.plc.inputs.p_ZSH602 ? 'AVANÇADO' : 'RECUADO'}</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Total de Ejeções Realizadas:</span>
              <span class="font-bold">${this.sim.stats.catBCount} grãos</span>
            </div>
          </div>
        `;
      }
      if (ilContent) {
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 font-bold mb-1">Equação Lógica de Disparo: c_FY602 ↔ p_B ∧ p_POS602 ∧ ¬p_PAL601</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>¬p_PAL601 (Pressão Pneumática):</span>
              <span class="${!this.plc.inputs.p_PAL601 ? 'text-green-700' : 'text-red-700'} font-bold">${!this.plc.inputs.p_PAL601 ? 'OK' : 'BLOQUEADO (BAIXA)'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>c_PERM (Permissivo Geral):</span>
              <span class="${this.plc.outputs.c_PERM ? 'text-green-700' : 'text-red-700'} font-bold">${this.plc.outputs.c_PERM ? 'LIBERADO' : 'BLOQUEADO'}</span>
            </div>
          </div>
        `;
      }
      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Ciclos de Disparo Acumulados:</span>
              <span class="font-bold">${this.sim.stats.catBCount} ciclos</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Tipo de Atuador:</span>
              <span class="font-bold">Cilindro Pneumático ISO 15552 c/ Sensor Magnético</span>
            </div>
          </div>
        `;
      }
    } else if (tag === 'V-701' || tag === 'V-702' || tag === 'V-703') {
      const isA = tag === 'V-701';
      const isB = tag === 'V-702';
      const silo = isA ? this.sim.silos.siloA : (isB ? this.sim.silos.siloB : this.sim.silos.siloC);
      const litTag = isA ? 'LIT-701' : (isB ? 'LIT-702' : 'LIT-703');
      const drainBtnId = isA ? 'btnEmptyA' : (isB ? 'btnEmptyB' : 'btnEmptyC');
      const siloName = isA ? 'Silo A (Aprovado Premium)' : (isB ? 'Silo B (Secundário Tolerável)' : 'Silo C (Rejeitado / Defeituoso)');
      const isCritical = silo.levelPercent >= 95.0;
      const isHigh = silo.levelPercent >= 90.0;

      if (titleEl) titleEl.innerText = `${siloName} — ${litTag}`;
      if (statusBadge) {
        statusBadge.className = isCritical
          ? 'px-2 py-0.5 text-[10px] font-bold bg-[#c00000] text-white border border-[#500000]'
          : isHigh
            ? 'px-2 py-0.5 text-[10px] font-bold bg-[#ff9900] text-black border border-[#b36b00]'
            : 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]';
        statusBadge.innerText = isCritical ? '⚠️ NÍVEL CRÍTICO (≥95%)' : (isHigh ? '⚠️ ALERTA NÍVEL ALTO (>90%)' : '● OPERAÇÃO NORMAL');
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="font-bold">Nível Medido (${litTag}):</span>
              <span class="scada-io-field ${isCritical ? 'red' : isHigh ? 'yellow' : ''} py-0.5 text-xs font-bold">${silo.levelPercent.toFixed(1)}%</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Estoque de Grãos:</span>
              <span class="font-bold">${silo.count} / ${silo.maxCount} un (${((silo.count / silo.maxCount) * 100).toFixed(0)}%)</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Massa Acumulada no Silo:</span>
              <span class="scada-io-field white py-0.5 text-xs font-mono">${silo.massKg.toFixed(2)} kg</span>
            </div>
            <button onclick="document.getElementById('${drainBtnId}').click()" class="btn-classic py-1.5 w-full font-bold text-xs mt-2">
              🗑 DRENAR / ESVAZIAR ${tag}
            </button>
          </div>
        `;
      }

      if (ilContent) {
        const ncSignal = isA ? this.plc.inputs.p_NC701 : (isB ? this.plc.inputs.p_NC702 : this.plc.inputs.p_NC703);
        const naSignal = isA ? this.plc.inputs.p_NA701 : (isB ? this.plc.inputs.p_NA702 : this.plc.inputs.p_NA703);
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 font-bold mb-1">Intertravamentos de Proteção de Nível:</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>Alarme Nível Alto (> 90%):</span>
              <span class="${naSignal ? 'text-amber-700 font-bold' : 'text-green-700'}">${naSignal ? 'ALERTA ATIVO' : 'NORMAL'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>Intertravamento Crítico (≥ 95%):</span>
              <span class="${ncSignal ? 'text-red-700 font-bold' : 'text-green-700'}">${ncSignal ? 'BLOQUEANDO DOSADOR c_ALIM' : 'PERMISSIVO LIBERADO'}</span>
            </div>
            <p class="text-[9px] text-gray-600">Ao atingir 95%, o CLP corta o dosador vibratório c_ALIM e aguarda a purga da esteira para evitar transbordamento e entrar em Standby seguro.</p>
          </div>
        `;
      }

      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Capacidade de Projeto:</span>
              <span class="font-bold">${silo.maxCount} grãos</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Tipo de Transmissor:</span>
              <span class="font-bold">Radar / Ultrassônico Industrial</span>
            </div>
          </div>
        `;
      }
    } else if (tag === 'TK-101') {
      const hopper = this.sim.hopper;
      const isLow = hopper.level < 15.0;
      const isHigh = hopper.level > 85.0;
      const feederActive = this.plc.outputs.c_ALIM;

      if (titleEl) titleEl.innerText = 'Funil de Recepção TK-101 — LIT-101';
      if (statusBadge) {
        statusBadge.className = isLow
          ? 'px-2 py-0.5 text-[10px] font-bold bg-[#c00000] text-white border border-[#500000]'
          : isHigh
            ? 'px-2 py-0.5 text-[10px] font-bold bg-[#ff9900] text-black border border-[#b36b00]'
            : 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]';
        statusBadge.innerText = isLow ? '⚠️ NÍVEL BAIXO (< 15%)' : (isHigh ? '⚠️ ALERTA NÍVEL ALTO (> 85%)' : '● OPERAÇÃO NORMAL');
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="font-bold">Nível Medido (LIT-101):</span>
              <span class="scada-io-field ${isLow ? 'red' : ''} py-0.5 text-xs font-bold">${hopper.level.toFixed(1)}%</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Massa de Grãos no Funil:</span>
              <span class="font-bold">${((hopper.level / 100) * hopper.capacityKg).toFixed(1)} / ${hopper.capacityKg.toFixed(1)} kg (${hopper.level.toFixed(0)}%)</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Alimentador Dosador (c_ALIM):</span>
              <span class="${feederActive ? 'text-green-700 font-bold' : 'text-gray-700'}">${feederActive ? 'ALIMENTANDO ESTEIRA' : 'DESLIGADO'}</span>
            </div>
            <button onclick="document.getElementById('btnRefill').click()" class="btn-classic btn-classic-green py-1.5 w-full font-bold text-xs mt-2">
              ⟳ REABASTECER FUNIL (REFILL 90%)
            </button>
          </div>
        `;
      }

      if (ilContent) {
        const p_NB101 = this.plc.inputs.p_NB101;
        const p_STANDBY = this.plc.inputs.p_STANDBY;
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 font-bold mb-1">Intertravamentos de Alimentação & Nível:</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>p_NB101 (Sensor Nível Mínimo < 15%):</span>
              <span class="${p_NB101 ? 'text-red-700 font-bold' : 'text-green-700'}">${p_NB101 ? 'NÍVEL BAIXO ATIVO (STANDBY)' : 'NORMAL'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>p_STANDBY (Purga / Aguardo):</span>
              <span class="${p_STANDBY ? 'text-amber-700 font-bold' : 'text-green-700'}">${p_STANDBY ? 'AGUARDANDO REABASTECIMENTO' : 'PROCESSO HABILITADO'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>c_ALIM (Comando Dosador):</span>
              <span class="${feederActive ? 'text-green-700 font-bold' : 'text-gray-700'}">${feederActive ? 'HABILITADO' : 'BLOQUEADO'}</span>
            </div>
            <p class="text-[9px] text-gray-600">Ao atingir nível baixo (< 15%), o dosador c_ALIM é bloqueado para proteger a integridade do fluxo e a esteira é purgada antes da parada.</p>
          </div>
        `;
      }

      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Capacidade Nominal do Funil:</span>
              <span class="font-bold">${hopper.capacityKg.toFixed(1)} kg</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Tipo de Transmissor:</span>
              <span class="font-bold">LIT-101 (Ultrassônico de Topo)</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Atuador de Descarga:</span>
              <span class="font-bold">XV-101 (Calha Vibratória / Eletroímã)</span>
            </div>
          </div>
        `;
      }
    } else if (tag === 'WT-301') {
      const massMg = Math.round(this.sim.scale.currentMassOnBeltKg * 1000000);
      const flow = this.sim.scale.massFlowKgPerHour;

      if (titleEl) titleEl.innerText = 'Balança Dinâmica Contínua WT-301 / FT-301';
      if (statusBadge) {
        statusBadge.className = 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]';
        statusBadge.innerText = '● CALIBRADA & OPERACIONAL';
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="font-bold">Vazão Mássica (FT-301):</span>
              <span class="scada-io-field py-0.5 text-xs font-bold">${flow.toFixed(1)} kg/h</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Massa Instantânea na Célula:</span>
              <span class="scada-io-field white py-0.5 text-xs font-mono">${massMg} mg (${(this.sim.scale.currentMassOnBeltKg * 1000).toFixed(2)} g)</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Comprimento de Pesagem Efetivo:</span>
              <span class="font-bold">110 mm</span>
            </div>
          </div>
        `;
      }

      if (ilContent) {
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 font-bold mb-1">Diagnósticos & Intertravamentos da Balança:</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>Sinal Analógico Célula de Carga:</span>
              <span class="text-green-700 font-bold">4-20 mA NORMAL</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>Intertravamento c/ Velocidade ST-201:</span>
              <span class="${this.sim.conveyor.actualSpeed > 0 ? 'text-green-700 font-bold' : 'text-amber-700'}">${this.sim.conveyor.actualSpeed > 0 ? 'INTEGRAÇÃO ATIVA' : 'VELOCIDADE ZERO'}</span>
            </div>
          </div>
        `;
      }

      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Tecnologia de Medição:</span>
              <span class="font-bold">Célula Strain Gauge Piezorresistiva Dupla</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Faixa de Medição:</span>
              <span class="font-bold">0 a 5000 mg (Resolução 1 mg)</span>
            </div>
          </div>
        `;
      }
    } else if (tag === 'KSA-401') {
      const isOk = this.plc.inputs.p_KSA401;

      if (titleEl) titleEl.innerText = 'Estação de Visão Computacional KSA-401 / XS-401';
      if (statusBadge) {
        statusBadge.className = isOk
          ? 'px-2 py-0.5 text-[10px] font-bold bg-[#00c000] text-white border border-[#005000]'
          : 'px-2 py-0.5 text-[10px] font-bold bg-[#c00000] text-white border border-[#500000]';
        statusBadge.innerText = isOk ? '● CÂMERA ONLINE' : '⚠️ COMM FAIL';
      }

      if (opContent) {
        opContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span class="font-bold">Status de Comunicação (p_KSA401):</span>
              <span class="${isOk ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}">${isOk ? 'CONECTADO / ONLINE' : 'FALHA DE COMUNICAÇÃO'}</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Sensor Gatilho Óptico (XS-401):</span>
              <span class="text-green-700 font-bold">OPERACIONAL</span>
            </div>
            <div class="scada-card-inset flex justify-between items-center p-2">
              <span>Total de Grãos Classificados:</span>
              <span class="font-bold">${this.sim.stats.totalProcessed} inspeções</span>
            </div>
          </div>
        `;
      }

      if (ilContent) {
        ilContent.innerHTML = `
          <div class="space-y-1.5 font-sans text-xs">
            <div class="text-[10px] text-gray-700 font-bold mb-1">Intertravamentos do Sistema de Visão:</div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>¬alarme_KSA401 (Falha Câmera):</span>
              <span class="${isOk ? 'text-green-700' : 'text-red-700'} font-bold">${isOk ? 'OK' : 'ALARME ATIVO'}</span>
            </div>
            <div class="scada-card-inset flex items-center justify-between p-1.5">
              <span>Bloqueio de Ejeção por Falha:</span>
              <span class="${isOk ? 'text-green-700' : 'text-red-700 font-bold'}">${isOk ? 'DESATIVADO' : 'ATIVO (DESVIA P/ SILO A)'}</span>
            </div>
          </div>
        `;
      }

      if (mtContent) {
        mtContent.innerHTML = `
          <div class="space-y-2 font-sans text-xs">
            <div class="scada-card-inset flex justify-between p-2">
              <span>Modelo do Sensor:</span>
              <span class="font-bold">Câmera Linear Industrial CMOS RGB 4K</span>
            </div>
            <div class="scada-card-inset flex justify-between p-2">
              <span>Interface de Rede:</span>
              <span class="font-bold">GigE Vision / PROFINET</span>
            </div>
          </div>
        `;
      }
    } else {
      // Fallback genérico para outros tags
      if (titleEl) titleEl.innerText = `Equipamento ${tag}`;
      if (opContent) {
        opContent.innerHTML = `
          <div class="scada-card-inset p-3 font-sans text-xs">
            Instrumento/Vaso <strong class="text-blue-900">${tag}</strong> conectado e transmitindo telemetria em tempo real via rede de campo CLP.
          </div>
        `;
      }
    }
  }
}
