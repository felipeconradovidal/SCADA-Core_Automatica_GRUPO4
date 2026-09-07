/**
 * SCADA-Core Automática - Módulo de Visão Computacional (vision.js)
 * Simula a aquisição de imagem da câmera industrial KSA-401, trigger ótico XS-401
 * e extração das proposições lógicas CV-101 a CV-109.
 */

export class VisionSystem {
  constructor() {
    this.lastInspectedGrain = null;
    this.totalInspected = 0;
    this.inspectionLog = [];
  }

  /**
   * Gera um novo grão aleatório com propriedades físicas realistas de arroz
   * @param {number} id Identificador sequencial
   * @param {string} forcedType Opcional para testes ('ideal', 'secondary', 'damaged', 'pest', 'impurity')
   */
  generateGrain(id, forcedType = null) {
    let length, width, colorType, hasDamage, hasPest, hasImpurity;

    const rand = Math.random();

    if (forcedType === 'ideal' || (!forcedType && rand < 0.60)) {
      // Categoria A típica (Aprovado)
      length = 6.0 + Math.random() * 1.4; // 6.0 a 7.4 mm
      width = 1.8 + Math.random() * 0.38; // 1.8 a 2.18 mm
      colorType = 'ideal'; // Branco a branco-perolado
      hasDamage = false;
      hasPest = false;
      hasImpurity = false;
    } else if (forcedType === 'secondary' || (!forcedType && rand < 0.82)) {
      // Categoria B típica (Secundário)
      length = 4.5 + Math.random() * 1.3; // 4.5 a 5.8 mm
      width = 1.35 + Math.random() * 0.33; // 1.35 a 1.68 mm
      colorType = Math.random() < 0.5 ? 'secondary' : 'ideal'; // Leve creme/amarelado
      hasDamage = false;
      hasPest = false;
      hasImpurity = false;
    } else {
      // Categoria C típica (Rejeitado)
      const defectRoll = Math.random();
      if (defectRoll < 0.25) {
        // Dano mecânico / quebrado
        length = 3.2 + Math.random() * 2.0;
        width = 1.5 + Math.random() * 0.5;
        colorType = 'ideal';
        hasDamage = true;
        hasPest = false;
        hasImpurity = false;
      } else if (defectRoll < 0.50) {
        // Presença de praga / ponto escuro
        length = 6.2 + Math.random() * 1.0;
        width = 1.9 + Math.random() * 0.2;
        colorType = 'secondary';
        hasDamage = false;
        hasPest = true;
        hasImpurity = false;
      } else if (defectRoll < 0.75) {
        // Impureza / pedrisco / casca estranha
        length = 4.0 + Math.random() * 3.5;
        width = 2.4 + Math.random() * 1.2;
        colorType = 'defect';
        hasDamage = false;
        hasPest = false;
        hasImpurity = true;
      } else {
        // Coloração imprópria (queimado/manchado)
        length = 6.1 + Math.random() * 1.2;
        width = 1.9 + Math.random() * 0.2;
        colorType = 'defect'; // Marrom / Preto
        hasDamage = false;
        hasPest = false;
        hasImpurity = false;
      }
    }

    // Massa aproximada do grão (em gramas): proporcional ao volume
    const mass = (length * width * width * 0.0018) + (hasImpurity ? 0.02 : 0.002);

    return {
      id: id,
      length: parseFloat(length.toFixed(2)),
      width: parseFloat(width.toFixed(2)),
      colorType: colorType,
      hasDamage: hasDamage,
      hasPest: hasPest,
      hasImpurity: hasImpurity,
      mass: parseFloat(mass.toFixed(4)),
      
      // Estado de tracking cinemático
      x: 0,              // Posição ao longo da esteira (pixels)
      y: 0,              // Posição transversal (pixels)
      speed: 0,
      inspected: false,
      ejected: false,
      collected: false,
      classifiedCategory: null,
      visionProps: null,
      triggerTime: 0
    };
  }

  /**
   * Processamento de Imagem: extrai as proposições binárias ISA 5.1 do grão
   * @param {Object} grain Objeto do grão
   */
  processImage(grain) {
    // 1. Análise de Cor (CV-101 e CV-102)
    const p_CV101 = grain.colorType === 'ideal';
    const p_CV102 = grain.colorType === 'secondary';

    // 2. Análise de Tamanho (Comprimento: Ideal 6.0-7.5, Secundário 4.4-5.9)
    const p_CV103 = grain.length >= 6.0 && grain.length <= 7.5;
    const p_CV104 = grain.length >= 4.4 && grain.length < 6.0;

    // 3. Análise de Formato (Largura: Ideal 1.8-2.2, Secundário 1.3-1.7)
    const p_CV105 = grain.width >= 1.8 && grain.width <= 2.2;
    const p_CV106 = grain.width >= 1.3 && grain.width < 1.8;

    // 4. Detecção de Anomalias
    const p_CV107 = grain.hasDamage;
    const p_CV108 = grain.hasPest;
    const p_CV109 = grain.hasImpurity;

    const visionProps = {
      p_CV101,
      p_CV102,
      p_CV103,
      p_CV104,
      p_CV105,
      p_CV106,
      p_CV107,
      p_CV108,
      p_CV109
    };

    grain.inspected = true;
    grain.visionProps = visionProps;
    this.lastInspectedGrain = grain;
    this.totalInspected++;

    return visionProps;
  }

  /**
   * Renderiza a visão detalhada (HUD da Câmera) em um canvas específico
   * @param {HTMLCanvasElement} canvas Canvas do HUD
   * @param {Object} grain Grão atual
   */
  renderCameraHUD(canvas, grain) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Fundo de sensor óptico industrial clássico
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Grid técnico milimétrico sutil (verde escuro de osciloscópio)
    ctx.strokeStyle = '#002200';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Retículo óptico central
    ctx.strokeStyle = '#005500';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 8); ctx.lineTo(w / 2, h - 8);
    ctx.moveTo(8, h / 2); ctx.lineTo(w - 8, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Moldura do sensor
    ctx.strokeStyle = '#404040';
    ctx.strokeRect(0, 0, w, h);

    if (!grain) {
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ AGUARDANDO TRIGGER XS-401 ]', w / 2, h / 2 - 6);
      ctx.font = '8px monospace';
      ctx.fillStyle = '#a0a0a0';
      ctx.fillText('CAM SENSOR KSA-401 READY', w / 2, h / 2 + 10);
      return;
    }

    const cx = w / 2;
    const cy = h / 2;
    const scale = 14; // pixels por mm

    const gW = grain.length * scale;
    const gH = grain.width * scale;

    // Cor realista do grão de arroz (orgânica)
    let grainColor = '#f8fafc'; // Branco perolado natural
    if (grain.colorType === 'secondary') grainColor = '#fef08a'; // Amarelado leve
    if (grain.colorType === 'defect') grainColor = '#78350f'; // Manchado escuro
    if (grain.hasImpurity) grainColor = '#64748b'; // Pedrisco / impureza cinza

    // Sombra suave do grão na esteira
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Forma elíptica do grão de arroz
    ctx.fillStyle = grainColor;
    ctx.beginPath();
    if (grain.hasDamage) {
      ctx.ellipse(cx - gW * 0.15, cy, gW * 0.35, gH * 0.45, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(cx, cy, gW * 0.48, gH * 0.48, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();

    // Dano de praga / ponto de perfuração
    if (grain.hasPest) {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(cx + 6, cy - 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();
    }

    // Região de Interesse (ROI / Bounding Box) Industrial
    let boxColor = '#22c55e'; // Cat A: Verde industrial sóbrio
    let statusText = 'PASS (CAT A)';
    if (grain.classifiedCategory === 'B') {
      boxColor = '#f59e0b'; // Cat B: Âmbar
      statusText = 'TOLERANCE (CAT B)';
    } else if (grain.classifiedCategory === 'C') {
      boxColor = '#ef4444'; // Cat C: Vermelho
      statusText = 'REJECT (CAT C)';
    }

    const boxPad = 6;
    const bx = cx - gW / 2 - boxPad;
    const by = cy - gH / 2 - boxPad;
    const bw = gW + boxPad * 2;
    const bh = gH + boxPad * 2;

    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, by, bw, bh);

    // Cantoneiras de alinhamento industrial
    const cl = 4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
    ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
    ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh);
    ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl);
    ctx.stroke();

    // Badge de Inspeção (Sóbrio)
    ctx.fillStyle = boxColor;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ID:#${grain.id} ${statusText}`, bx, by - 4);

    // Telemetria Dimensional
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px monospace';
    ctx.fillText(`L:${grain.length}mm  W:${grain.width}mm  M:${(grain.mass * 1000).toFixed(1)}mg`, bx, by + bh + 11);
  }
}
