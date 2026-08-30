/**
 * SCADA-Core Automática - Motor de Simulação Física e Cinemática (engine.js)
 * Modela a esteira contínua, alimentador vibratório, balança, estação de visão,
 * tracking via Shift Register / FIFO, pistões pneumáticos independentes (FY-603 e FY-602)
 * e silos de coleta.
 */

export class PlantSimulation {
  constructor(plc, vision) {
    this.plc = plc;
    this.vision = vision;

    // Estado Físico dos Componentes
    this.hopper = {
      level: 75.0,        // LIT-101: % de preenchimento do funil (0 a 100%)
      capacityKg: 50.0,
      isObstructed: false,
    };

    this.conveyor = {
      speedSetpoint: 0.8, // m/s nominal
      actualSpeed: 0.0,   // ST-201: medição real do encoder
      motorCurrent: 3.2,  // Amperes
      isOverloaded: false,// JI-201
      lengthMeters: 4.0,  // 4 metros de esteira útil
      pixelsPerMeter: 200,// escala gráfica
      positionOffset: 0,  // Para animação contínua da lona
    };

    this.scale = {
      currentMassOnBeltKg: 0.0, // WT-301
      massFlowKgPerHour: 0.0,   // FT-301
      totalMassProcessedKg: 0.0,
    };

    this.pneumatics = {
      pressureBar: 6.2,   // PT-601: Pressão da linha (nominal 6.0 a 7.0 bar)
      minPressureBar: 4.5,
      // Pistão C (FY-603 - Rejeitos)
      pistonStrokeC: 0.0, // 0.0 = recuado, 1.0 = totalmente estendido
      isJammedC: false,   // Falha mecânica simulada
      blowEffectC: 0.0,   // Efeito visual do jato de ar
      // Pistão B (FY-602 - Secundários)
      pistonStrokeB: 0.0,
      isJammedB: false,
      blowEffectB: 0.0,
      pistonSpeed: 20.0,  // Resposta ultrarrápida (50ms)
    };

    this.silos = {
      siloA: { count: 0, massKg: 0.0, label: 'Categoria A (Aprovado)' },
      siloB: { count: 0, massKg: 0.0, levelPercent: 8.0, maxCount: 250, label: 'Categoria B (Secundário)' },
      siloC: { count: 0, massKg: 0.0, levelPercent: 12.0, maxCount: 200, label: 'Categoria C (Rejeitado)' } // LIT-703
    };

    // Tracking / Shift Register do CLP
    this.trackingQueue = []; // Grãos atualmente em trânsito entre a câmera e os ejetores

    // Lista de grãos ativos no motor de física
    this.grains = [];
    this.grainIdCounter = 1000;
    this.spawnTimer = 0;

    // Posições geométricas chave (em pixels X ao longo da esteira)
    this.layout = {
      hopperX: 65,
      scaleStartX: 170,
      scaleEndX: 280,
      cameraX: 390,       // Sensor XS-401 e Câmera KSA-401
      ejectorCX: 540,     // Bocal ejetor FY-603 (Rejeito C)
      ejectorBX: 680,     // Bocal ejetor FY-602 (Secundário B)
      endConveyorX: 790,  // Ponto de coleta Silo A (Aprovados)
      conveyorY: 220,
      conveyorHeight: 28,
    };

    // Estatísticas globais
    this.stats = {
      totalProcessed: 0,
      catACount: 0,
      catBCount: 0,
      catCCount: 0,
      missedRejects: 0,
    };
  }

  /**
   * Ciclo de atualização física (Step de Simulação)
   * @param {number} dt Delta de tempo em segundos
   */
  update(dt) {
    // 1. Atualiza sensores para o CLP e avalia lógica
    this.updateSensorsToPLC();
    const plcOutputs = this.plc.evaluate();

    // 2. Dinâmica do Motor da Esteira (ST-201 e JI-201)
    if (plcOutputs.c_PERM) {
      const targetSpeed = this.conveyor.speedSetpoint;
      this.conveyor.actualSpeed += (targetSpeed - this.conveyor.actualSpeed) * Math.min(1.0, dt * 3.0);
    } else {
      this.conveyor.actualSpeed += (0 - this.conveyor.actualSpeed) * Math.min(1.0, dt * 5.0);
    }
    if (this.conveyor.actualSpeed < 0.005) this.conveyor.actualSpeed = 0;

    this.conveyor.positionOffset = (this.conveyor.positionOffset + this.conveyor.actualSpeed * 200 * dt) % 20;

    // Corrente do motor
    if (this.conveyor.isOverloaded) {
      this.conveyor.motorCurrent = 8.5; // Sobrecarga!
    } else {
      this.conveyor.motorCurrent = this.conveyor.actualSpeed > 0 ? (2.8 + this.conveyor.actualSpeed * 0.7) : 0.4;
    }

    // 3. Dinâmica do Funil e Alimentador Vibratório (c_ALIM)
    if (plcOutputs.c_ALIM && !this.hopper.isObstructed && this.hopper.level > 0) {
      const consumption = (dt * 0.35);
      this.hopper.level = Math.max(0, this.hopper.level - consumption);

      this.spawnTimer += dt;
      const spawnInterval = 0.09 / Math.max(0.2, this.conveyor.actualSpeed);
      if (this.spawnTimer >= spawnInterval) {
        this.spawnTimer = 0;
        this.spawnGrain();
      }
    }

    // 4. Dinâmica da Pressão Pneumática (PT-601)
    this.plc.inputs.p_PAL601 = this.pneumatics.pressureBar < this.pneumatics.minPressureBar;

    // 5. Deslocamento dos grãos e Tracking FIFO / Shift Register
    const beltPixelSpeed = this.conveyor.actualSpeed * this.conveyor.pixelsPerMeter; // px/s
    let currentWeighZoneMass = 0;
    let grainInEjectorCPos = false;
    let grainInEjectorBPos = false;

    // Limpa fila de tracking e reconstrói estado em trânsito
    this.trackingQueue = [];

    for (let i = this.grains.length - 1; i >= 0; i--) {
      const g = this.grains[i];

      if (!g.collected) {
        if (!g.ejected) {
          g.x += beltPixelSpeed * dt;

          // Zona de pesagem contínua (WT-301)
          if (g.x >= this.layout.scaleStartX && g.x <= this.layout.scaleEndX) {
            currentWeighZoneMass += g.mass;
          }

          // Zona de Inspeção da Câmera (Trigger XS-401)
          if (g.x >= this.layout.cameraX - 10 && g.x <= this.layout.cameraX + 10 && !g.inspected) {
            this.plc.inputs.p_KSA401 = !this.plc.diagnostics.alarme_KSA401;
            if (this.plc.inputs.p_KSA401) {
              const visionProps = this.vision.processImage(g);
              const classification = this.plc.classifyGrain(visionProps);
              g.classifiedCategory = classification.category;
            }
          }

          // Registra no buffer de tracking do CLP se estiver entre a câmera e os ejetores
          if (g.inspected && g.x < this.layout.ejectorBX + 30) {
            const distToEjectorC = Math.max(0, this.layout.ejectorCX - g.x);
            const distToEjectorB = Math.max(0, this.layout.ejectorBX - g.x);
            const timeToTarget = this.conveyor.actualSpeed > 0 ? (
              g.classifiedCategory === 'C' ? distToEjectorC / beltPixelSpeed :
              g.classifiedCategory === 'B' ? distToEjectorB / beltPixelSpeed : 0
            ) : 0;

            this.trackingQueue.push({
              id: g.id,
              category: g.classifiedCategory,
              x: Math.round(g.x),
              timeToTarget: timeToTarget.toFixed(2),
            });
          }

          // --- ESTAÇÃO 1: EJETOR C (FY-603) ---
          const distC = Math.abs(g.x - this.layout.ejectorCX);
          if (distC < 14 && g.classifiedCategory === 'C') {
            grainInEjectorCPos = true;

            if (this.plc.outputs.c_FY603 && !this.pneumatics.isJammedC) {
              g.ejected = true;
              g.targetSilo = 'C';
              g.vy = 260; // Impulso vertical em direção ao Silo C
              g.vx = 35;
              this.pneumatics.blowEffectC = 1.0;
            } else if (this.pneumatics.isJammedC) {
              // Se travado mecanicamente, o grão escapa!
              this.stats.missedRejects++;
            }
          }

          // --- ESTAÇÃO 2: EJETOR B (FY-602) ---
          const distB = Math.abs(g.x - this.layout.ejectorBX);
          if (distB < 14 && g.classifiedCategory === 'B') {
            grainInEjectorBPos = true;

            if (this.plc.outputs.c_FY602 && !this.pneumatics.isJammedB) {
              g.ejected = true;
              g.targetSilo = 'B';
              g.vy = 260; // Impulso vertical em direção ao Silo B
              g.vx = 35;
              this.pneumatics.blowEffectB = 1.0;
            }
          }

          // --- FIM DE LINHA: SILO A (Aprovados) ---
          if (g.x >= this.layout.endConveyorX) {
            g.collected = true;
            if (g.classifiedCategory === 'A' || !g.classifiedCategory) {
              this.silos.siloA.count++;
              this.silos.siloA.massKg += g.mass / 1000;
              this.stats.catACount++;
            } else {
              // Grão B ou C que não foi ejetado por falha ou bloqueio cai aqui como escape
              this.silos.siloA.count++;
            }
            this.stats.totalProcessed++;
          }

        } else {
          // Grão ejetado em trajetória balística de queda
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          g.vy += 650 * dt; // Gravidade

          if (g.y > this.layout.conveyorY + 110) {
            g.collected = true;
            if (g.targetSilo === 'C') {
              this.silos.siloC.count++;
              this.silos.siloC.massKg += g.mass / 1000;
              this.stats.catCCount++;
              this.silos.siloC.levelPercent = Math.min(100, (this.silos.siloC.count / this.silos.siloC.maxCount) * 100);
            } else if (g.targetSilo === 'B') {
              this.silos.siloB.count++;
              this.silos.siloB.massKg += g.mass / 1000;
              this.stats.catBCount++;
              this.silos.siloB.levelPercent = Math.min(100, (this.silos.siloB.count / this.silos.siloB.maxCount) * 100);
            }
            this.stats.totalProcessed++;
          }
        }
      }

      if (g.collected) {
        this.grains.splice(i, 1);
      }
    }

    // 6. Atualiza posições físicas de disparo no PLC
    this.plc.inputs.p_POS603 = grainInEjectorCPos;
    this.plc.inputs.p_POS602 = grainInEjectorBPos;

    // 7. Dinâmica dos Pistões Pneumáticos (C e B)
    // Pistão C (Rejeito)
    if (this.plc.outputs.c_FY603 && !this.pneumatics.isJammedC) {
      this.pneumatics.pistonStrokeC = Math.min(1.0, this.pneumatics.pistonStrokeC + this.pneumatics.pistonSpeed * dt);
    } else {
      this.pneumatics.pistonStrokeC = Math.max(0.0, this.pneumatics.pistonStrokeC - this.pneumatics.pistonSpeed * dt * 0.8);
    }
    // Sensor magnético ZSH-601: ativo quando haste C > 85%
    this.plc.inputs.p_ZSH601 = this.pneumatics.pistonStrokeC > 0.85;

    // Pistão B (Secundário)
    if (this.plc.outputs.c_FY602 && !this.pneumatics.isJammedB) {
      this.pneumatics.pistonStrokeB = Math.min(1.0, this.pneumatics.pistonStrokeB + this.pneumatics.pistonSpeed * dt);
    } else {
      this.pneumatics.pistonStrokeB = Math.max(0.0, this.pneumatics.pistonStrokeB - this.pneumatics.pistonSpeed * dt * 0.8);
    }
    // Sensor magnético ZSH-602: ativo quando haste B > 85%
    this.plc.inputs.p_ZSH602 = this.pneumatics.pistonStrokeB > 0.85;

    // Efeitos visuais de sopro
    if (this.pneumatics.blowEffectC > 0) {
      this.pneumatics.blowEffectC = Math.max(0, this.pneumatics.blowEffectC - dt * 6.0);
    }
    if (this.pneumatics.blowEffectB > 0) {
      this.pneumatics.blowEffectB = Math.max(0, this.pneumatics.blowEffectB - dt * 6.0);
    }

    // 8. Diagnóstico Formal de Falha do Atuador Pneumático (Discrepância Temporal)
    // Avalia se o comando foi disparado mas o sensor de confirmação não atuou dentro de 70ms
    if (this.plc.outputs.c_FY603) {
      this.plc.ejectorTimerC += dt;
      if (this.plc.ejectorTimerC > 0.07 && !this.plc.inputs.p_ZSH601) {
        this.plc.diagnostics.p_FALHA_EJETOR = true;
      }
    } else {
      this.plc.ejectorTimerC = 0;
      if (!this.pneumatics.isJammedC && !this.pneumatics.isJammedB) {
        this.plc.diagnostics.p_FALHA_EJETOR = false;
      }
    }

    // 9. Cálculo Contínuo da Balança e Vazão Mássica (WT-301 / FT-301)
    this.scale.currentMassOnBeltKg = currentWeighZoneMass / 1000.0;
    const weighZoneLengthM = (this.layout.scaleEndX - this.layout.scaleStartX) / this.conveyor.pixelsPerMeter;
    if (this.conveyor.actualSpeed > 0.05) {
      const transitTimeSec = weighZoneLengthM / this.conveyor.actualSpeed;
      const flowKgSec = this.scale.currentMassOnBeltKg / transitTimeSec;
      const instantFlowKgH = flowKgSec * 3600;
      this.scale.massFlowKgPerHour += (instantFlowKgH - this.scale.massFlowKgPerHour) * Math.min(1.0, dt * 4.0);
    } else {
      this.scale.massFlowKgPerHour += (0 - this.scale.massFlowKgPerHour) * Math.min(1.0, dt * 5.0);
    }
  }

  spawnGrain() {
    const grain = this.vision.generateGrain(this.grainIdCounter++);
    grain.x = this.layout.hopperX + (Math.random() * 20 - 10);
    grain.y = this.layout.conveyorY - 8 + (Math.random() * 6 - 3);
    this.grains.push(grain);
  }

  updateSensorsToPLC() {
    // Funil LIT-101
    this.plc.inputs.p_NB101 = this.hopper.level < 15.0;
    this.plc.inputs.p_NA101 = this.hopper.level > 85.0;
    this.plc.inputs.p_NC101 = this.hopper.level >= 98.0;

    // Velocidade ST-201
    this.plc.inputs.p_MOV201 = this.conveyor.actualSpeed > 0.05;
    this.plc.inputs.p_VB201 = this.conveyor.actualSpeed > 0 && this.conveyor.actualSpeed < 0.4;
    this.plc.inputs.p_VA201 = this.conveyor.actualSpeed > 1.3;

    // Motor JI-201
    this.plc.inputs.p_JI201 = this.conveyor.isOverloaded;

    // Silo C LIT-703
    this.plc.inputs.p_NA703 = this.silos.siloC.levelPercent >= 90.0;
    this.plc.inputs.p_NC703 = this.silos.siloC.levelPercent >= 99.5;
  }

  refillHopper() {
    this.hopper.level = 90.0;
  }

  emptySiloC() {
    this.silos.siloC.count = 0;
    this.silos.siloC.massKg = 0;
    this.silos.siloC.levelPercent = 0;
  }

  emptySiloB() {
    this.silos.siloB.count = 0;
    this.silos.siloB.massKg = 0;
    this.silos.siloB.levelPercent = 0;
  }
}
