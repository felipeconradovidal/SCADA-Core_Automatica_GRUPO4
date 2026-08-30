/**
 * SCADA-Core Automática - Motor de Simulação Física e Cinemática (engine.js)
 * Modela a esteira contínua, alimentador vibratório, balança, estação de visão,
 * tracking de posição, pistão pneumático e silos de coleta.
 */

export class PlantSimulation {
  constructor(plc, vision) {
    this.plc = plc;
    this.vision = vision;

    // Estado Físico dos Componentes
    this.hopper = {
      level: 75.0,        // LIT-101: % de preenchimento do funil (0 a 100%)
      capacityKg: 50.0,
      feedRateKgSec: 0.08,
      isObstructed: false,
    };

    this.conveyor = {
      speedSetpoint: 0.8, // m/s nominal
      actualSpeed: 0.0,   // ST-201: medição real do encoder
      motorCurrent: 3.2,  // Amperes (nominal ~3.2A, sobrecarga > 7.0A)
      isOverloaded: false,// JI-201
      lengthMeters: 4.0,  // 4 metros de esteira útil
      pixelsPerMeter: 200,// escala gráfica
      positionOffset: 0,  // Para animação contínua da lona
    };

    this.scale = {
      currentMassOnBeltKg: 0.0, // WT-301
      massFlowKgPerHour: 0.0,   // FT-301
      totalMassProcessedKg: 0.0,
      windowMassHistory: [],    // Buffer para cálculo de dM/dt
    };

    this.pneumatics = {
      pressureBar: 6.2,   // PT-601: Pressão da linha (nominal 6.0 a 7.0 bar, baixa < 4.5 bar)
      minPressureBar: 4.5,
      pistonStroke: 0.0,  // 0.0 = recuado, 1.0 = totalmente estendido
      pistonSpeed: 18.0,  // curso ultrarrápido
      isJammed: false,    // Falha mecânica simulada
      blowEffect: 0.0,    // Intensidade visual do jato de ar
    };

    this.silos = {
      siloA: { count: 0, massKg: 0.0, label: 'Categoria A (Aprovado)' },
      siloB: { count: 0, massKg: 0.0, label: 'Categoria B (Secundário)' },
      siloC: { count: 0, massKg: 0.0, levelPercent: 12.0, maxCount: 200, label: 'Categoria C (Rejeitado)' } // LIT-703
    };

    // Lista de grãos ativos no processo
    this.grains = [];
    this.grainIdCounter = 1000;
    this.spawnTimer = 0;

    // Posições geométricas chave (em pixels ao longo da esteira X: 0 a 800)
    this.layout = {
      hopperX: 70,
      scaleStartX: 180,
      scaleEndX: 290,
      cameraX: 420,       // Sensor XS-401 e Câmera KSA-401
      ejectorX: 580,      // Bocal ejetor FY-603 / Pistão
      deflectorBX: 710,   // Ponto de coleta B
      endConveyorX: 790,  // Ponto de coleta A
      conveyorY: 230,
      conveyorHeight: 30,
    };

    // Estatísticas globais
    this.stats = {
      totalProcessed: 0,
      catACount: 0,
      catBCount: 0,
      catCCount: 0,
      lastCycleTimeMs: 0
    };
  }

  /**
   * Ciclo de atualização física (Step de Simulação)
   * @param {number} dt Delta de tempo em segundos
   */
  update(dt) {
    // 1. Atualiza permissivos e lógica no PLC
    this.updateSensorsToPLC();
    const plcOutputs = this.plc.evaluate();

    // 2. Dinâmica do Motor da Esteira (ST-201 e JI-201)
    if (plcOutputs.c_PERM) {
      // Acelera gradualmente até o setpoint
      const targetSpeed = this.conveyor.speedSetpoint;
      this.conveyor.actualSpeed += (targetSpeed - this.conveyor.actualSpeed) * Math.min(1.0, dt * 3.0);
    } else {
      // Desacelera até parar
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
      // Consome nível do funil
      const consumption = (dt * 0.4); // taxa de esvaziamento %
      this.hopper.level = Math.max(0, this.hopper.level - consumption);

      // Spawna grãos na esteira
      this.spawnTimer += dt;
      const spawnInterval = 0.08 / Math.max(0.2, this.conveyor.actualSpeed); // mais rápido com esteira rápida
      if (this.spawnTimer >= spawnInterval) {
        this.spawnTimer = 0;
        this.spawnGrain();
      }
    }

    // 4. Dinâmica da Pressão Pneumática (PT-601)
    if (this.pneumatics.pressureBar < this.pneumatics.minPressureBar) {
      this.plc.inputs.p_PAL601 = true;
    } else {
      this.plc.inputs.p_PAL601 = false;
    }

    // 5. Deslocamento cinemático dos grãos na esteira
    const beltPixelSpeed = this.conveyor.actualSpeed * this.conveyor.pixelsPerMeter; // px/s
    let currentWeighZoneMass = 0;
    let grainInEjectorPosition = false;

    for (let i = this.grains.length - 1; i >= 0; i--) {
      const g = this.grains[i];

      if (!g.collected) {
        // Se ainda está na esteira e não foi ejetado em queda livre
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

          // Zona do Bocal Ejetor Pneumático (FY-603 / p_POS603)
          const ejectDist = Math.abs(g.x - this.layout.ejectorX);
          if (ejectDist < 12 && g.classifiedCategory === 'C' && !g.ejected) {
            grainInEjectorPosition = true;

            // Se PLC autorizou disparo do ejetor: c_FY603
            if (this.plc.outputs.c_FY603 && !this.pneumatics.isJammed) {
              g.ejected = true;
              g.vy = 280; // Impulso vertical para baixo em direção ao Silo C
              g.vx = 40;
              this.pneumatics.blowEffect = 1.0;
            }
          }

          // Chegada na rampa do Silo B (Secundários)
          if (g.x >= this.layout.deflectorBX && g.classifiedCategory === 'B') {
            g.collected = true;
            this.silos.siloB.count++;
            this.silos.siloB.massKg += g.mass / 1000;
            this.stats.catBCount++;
            this.stats.totalProcessed++;
          }

          // Chegada no fim da esteira -> Silo A (Aprovados)
          if (g.x >= this.layout.endConveyorX) {
            g.collected = true;
            if (g.classifiedCategory === 'A' || !g.classifiedCategory) {
              this.silos.siloA.count++;
              this.silos.siloA.massKg += g.mass / 1000;
              this.stats.catACount++;
            } else {
              // Se um C passou sem ejeção (por falha de pressão ou pistão), cai aqui como escape
              this.silos.siloA.count++;
            }
            this.stats.totalProcessed++;
          }

        } else {
          // Grão ejetado em trajetória de queda até o Silo C
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          g.vy += 600 * dt; // Gravidade

          if (g.y > this.layout.conveyorY + 120) {
            g.collected = true;
            this.silos.siloC.count++;
            this.silos.siloC.massKg += g.mass / 1000;
            this.stats.catCCount++;
            this.stats.totalProcessed++;

            // Atualiza nível do Silo C (LIT-703)
            this.silos.siloC.levelPercent = Math.min(100, (this.silos.siloC.count / this.silos.siloC.maxCount) * 100);
          }
        }
      }

      // Remove grãos já coletados da memória gráfica
      if (g.collected) {
        this.grains.splice(i, 1);
      }
    }

    // 6. Atualiza proposição p_POS603 no PLC
    this.plc.inputs.p_POS603 = grainInEjectorPosition;

    // 7. Dinâmica do Pistão Pneumático (Avanço / Recuo)
    if (this.plc.outputs.c_FY603 && !this.pneumatics.isJammed) {
      this.pneumatics.pistonStroke = Math.min(1.0, this.pneumatics.pistonStroke + this.pneumatics.pistonSpeed * dt);
    } else {
      this.pneumatics.pistonStroke = Math.max(0.0, this.pneumatics.pistonStroke - this.pneumatics.pistonSpeed * dt * 0.8);
    }

    // Sensor de avanço ZSH-601: ativo quando haste > 85%
    this.plc.inputs.p_ZSH601 = this.pneumatics.pistonStroke > 0.85;

    // Efeito de sopro diminui com o tempo
    if (this.pneumatics.blowEffect > 0) {
      this.pneumatics.blowEffect = Math.max(0, this.pneumatics.blowEffect - dt * 6.0);
    }

    // 8. Diagnóstico de Falha do Atuador Pneumático
    if (this.plc.outputs.c_FY603) {
      if (!this.plc.ejectorPendingCheck) {
        this.plc.ejectorPendingCheck = true;
        this.plc.ejectorTimer = 0;
      }
      this.plc.ejectorTimer += dt;
      if (this.plc.ejectorTimer > 0.12 && !this.plc.inputs.p_ZSH601) {
        this.plc.diagnostics.p_FALHA_EJETOR = true;
      }
    } else {
      this.plc.ejectorPendingCheck = false;
      this.plc.ejectorTimer = 0;
      if (!this.pneumatics.isJammed) {
        this.plc.diagnostics.p_FALHA_EJETOR = false;
      }
    }

    // 9. Cálculo Contínuo da Balança e Vazão Mássica (WT-301 / FT-301)
    this.scale.currentMassOnBeltKg = currentWeighZoneMass / 1000.0;
    // Vazão instantânea em kg/h: (Massa na esteira / tempo de trânsito na balança) * 3600
    const weighZoneLengthM = (this.layout.scaleEndX - this.layout.scaleStartX) / this.conveyor.pixelsPerMeter;
    if (this.conveyor.actualSpeed > 0.05) {
      const transitTimeSec = weighZoneLengthM / this.conveyor.actualSpeed;
      const flowKgSec = this.scale.currentMassOnBeltKg / transitTimeSec;
      const instantFlowKgH = flowKgSec * 3600;
      // Filtro passa-baixa para suavização realista de sinal analógico
      this.scale.massFlowKgPerHour += (instantFlowKgH - this.scale.massFlowKgPerHour) * Math.min(1.0, dt * 4.0);
    } else {
      this.scale.massFlowKgPerHour += (0 - this.scale.massFlowKgPerHour) * Math.min(1.0, dt * 5.0);
    }
  }

  /**
   * Gera um novo grão no alimentador
   */
  spawnGrain() {
    const grain = this.vision.generateGrain(this.grainIdCounter++);
    grain.x = this.layout.hopperX + (Math.random() * 20 - 10);
    grain.y = this.layout.conveyorY - 8 + (Math.random() * 6 - 3);
    this.grains.push(grain);
  }

  /**
   * Transfere leituras físicas para as proposições de entrada do PLC
   */
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

  /**
   * Reabastece o funil
   */
  refillHopper() {
    this.hopper.level = 90.0;
  }

  /**
   * Esvazia o silo C
   */
  emptySiloC() {
    this.silos.siloC.count = 0;
    this.silos.siloC.massKg = 0;
    this.silos.siloC.levelPercent = 0;
  }
}
