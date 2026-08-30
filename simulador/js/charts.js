/**
 * SCADA-Core Automática - Módulo de Gráficos e Historiador (charts.js)
 * Renderização em Canvas 2D de gráficos temporais de vazão mássica (FT-301)
 * e distribuição de categorias de produção (A, B, C).
 */

export class SCADACharts {
  constructor(flowCanvas, distCanvas) {
    this.flowCanvas = flowCanvas;
    this.distCanvas = distCanvas;

    this.flowHistory = [];
    this.maxDataPoints = 60; // 60 amostras (ex: 1 por segundo)
    this.sampleTimer = 0;
  }

  /**
   * Adiciona uma amostra de dados
   * @param {number} flowKgH Vazão mássica instantânea (FT-301)
   */
  addSample(flowKgH) {
    this.flowHistory.push(flowKgH);
    if (this.flowHistory.length > this.maxDataPoints) {
      this.flowHistory.shift();
    }
  }

  /**
   * Renderiza o gráfico de tendência temporal da vazão mássica (FT-301)
   */
  renderFlowTrend() {
    if (!this.flowCanvas) return;
    const ctx = this.flowCanvas.getContext('2d');
    const w = this.flowCanvas.width;
    const h = this.flowCanvas.height;

    // Fundo industrial
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid técnico
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
    }
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, h - 20);
      ctx.stroke();
    }

    // Escala Y
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const maxVal = 120; // kg/h máximo no display
    ctx.fillText('120', 30, 20);
    ctx.fillText('60', 30, (h - 20) / 2 + 10);
    ctx.fillText('0', 30, h - 22);

    // Linha do gráfico
    if (this.flowHistory.length > 1) {
      const stepX = (w - 55) / (this.maxDataPoints - 1);
      const graphH = h - 45;

      // Área sombreada sob a curva
      ctx.beginPath();
      const firstX = 40;
      const firstY = h - 22 - (Math.min(maxVal, this.flowHistory[0]) / maxVal) * graphH;
      ctx.moveTo(firstX, firstY);

      for (let i = 1; i < this.flowHistory.length; i++) {
        const val = Math.min(maxVal, this.flowHistory[i]);
        const x = 40 + i * stepX;
        const y = h - 22 - (val / maxVal) * graphH;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(40 + (this.flowHistory.length - 1) * stepX, h - 22);
      ctx.lineTo(40, h - 22);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Traçado da linha
      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      for (let i = 1; i < this.flowHistory.length; i++) {
        const val = Math.min(maxVal, this.flowHistory[i]);
        const x = 40 + i * stepX;
        const y = h - 22 - (val / maxVal) * graphH;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ponto atual
      const lastIdx = this.flowHistory.length - 1;
      const lastX = 40 + lastIdx * stepX;
      const lastY = h - 22 - (Math.min(maxVal, this.flowHistory[lastIdx]) / maxVal) * graphH;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Renderiza a distribuição de categorias em barra proporcional
   * @param {number} a Quantidade Categoria A
   * @param {number} b Quantidade Categoria B
   * @param {number} c Quantidade Categoria C
   */
  renderDistribution(a, b, c) {
    if (!this.distCanvas) return;
    const ctx = this.distCanvas.getContext('2d');
    const w = this.distCanvas.width;
    const h = this.distCanvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const total = a + b + c;
    if (total === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Aguardando processamento...', w / 2, h / 2 + 3);
      return;
    }

    const pA = a / total;
    const pB = b / total;
    const pC = c / total;

    const barY = 22;
    const barH = 20;
    const barW = w - 30;

    let curX = 15;
    const wA = barW * pA;
    const wB = barW * pB;
    const wC = barW * pC;

    // Segmento A
    if (wA > 0) {
      ctx.fillStyle = '#00e676';
      ctx.fillRect(curX, barY, wA, barH);
      curX += wA;
    }
    // Segmento B
    if (wB > 0) {
      ctx.fillStyle = '#ffb300';
      ctx.fillRect(curX, barY, wB, barH);
      curX += wB;
    }
    // Segmento C
    if (wC > 0) {
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(curX, barY, wC, barH);
    }

    // Legenda com %
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00e676';
    ctx.fillText(`A: ${(pA * 100).toFixed(1)}% (${a})`, 15, h - 10);

    ctx.fillStyle = '#ffb300';
    ctx.fillText(`B: ${(pB * 100).toFixed(1)}% (${b})`, 110, h - 10);

    ctx.fillStyle = '#ff1744';
    ctx.fillText(`C: ${(pC * 100).toFixed(1)}% (${c})`, 205, h - 10);
  }
}
