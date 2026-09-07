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

    // Fundo preto de registrador gráfico clássico
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Grid técnico verde escuro
    ctx.strokeStyle = '#003300';
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
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'right';
    const maxVal = 120; // kg/h máximo no display
    ctx.fillText('120', 30, 20);
    ctx.fillText('60', 30, (h - 20) / 2 + 10);
    ctx.fillText('0', 30, h - 22);

    // Linha de Limite de Processo (Linha tracejada de Alarme Alto LAH: 95 kg/h)
    const lahY = h - 22 - (95 / maxVal) * (h - 45);
    ctx.strokeStyle = '#ff3333';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(35, lahY);
    ctx.lineTo(w - 10, lahY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Linha do gráfico
    if (this.flowHistory.length > 1) {
      const stepX = (w - 55) / (this.maxDataPoints - 1);
      const graphH = h - 45;

      // Área sombreada sutil sob a curva
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

      ctx.fillStyle = 'rgba(0, 255, 0, 0.12)';
      ctx.fill();

      // Traçado da linha do processo (Amarelo brilhante / Verde sobre preto)
      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      for (let i = 1; i < this.flowHistory.length; i++) {
        const val = Math.min(maxVal, this.flowHistory[i]);
        const x = 40 + i * stepX;
        const y = h - 22 - (val / maxVal) * graphH;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Marcador da amostra mais recente
      const lastIdx = this.flowHistory.length - 1;
      const lastX = 40 + lastIdx * stepX;
      const lastY = h - 22 - (Math.min(maxVal, this.flowHistory[lastIdx]) / maxVal) * graphH;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
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

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const total = a + b + c;
    if (total === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Aguardando batelada...', w / 2, h / 2 + 3);
      return;
    }

    const pA = a / total;
    const pB = b / total;
    const pC = c / total;

    const barY = 18;
    const barH = 16;
    const barW = w - 30;

    let curX = 15;
    const wA = barW * pA;
    const wB = barW * pB;
    const wC = barW * pC;

    // Segmento A (Verde sóbrio)
    if (wA > 0) {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(curX, barY, wA, barH);
      curX += wA;
    }
    // Segmento B (Âmbar)
    if (wB > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(curX, barY, wB, barH);
      curX += wB;
    }
    // Segmento C (Vermelho)
    if (wC > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(curX, barY, wC, barH);
    }

    // Legenda industrial
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`A: ${(pA * 100).toFixed(1)}% (${a})`, 15, h - 8);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`B: ${(pB * 100).toFixed(1)}% (${b})`, 110, h - 8);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`C: ${(pC * 100).toFixed(1)}% (${c})`, 205, h - 8);
  }
}
