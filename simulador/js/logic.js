/**
 * SCADA-Core Automática - Módulo PLC / Lógica Proposicional (logic.js)
 * Implementação das regras formais segundo ISA 5.1 e etapas de Lógica Proposicional.
 */

export class PLCLogic {
  constructor() {
    // Entradas do Sistema (Sensores e Proposições Físicas)
    this.inputs = {
      p_EMERG: false,     // XA-901: Botoeira de Emergência pressionada (1 = emergência)
      p_JI201: false,     // JI-201: Sobrecarga no motor da esteira (1 = sobrecarga)
      p_PAL601: false,    // PAL-601: Pressão de ar comprimido baixa (1 = pressão baixa)
      p_KSA401: true,     // KSA-401: Status da câmera (1 = Pronta/OK)
      
      // Funil (LIT-101)
      p_NB101: false,     // Nível Baixo no funil (< 15%)
      p_NA101: false,     // Nível Alto no funil (> 85%)
      p_NC101: false,     // Nível Crítico no funil (≥ 98%)
      
      // Esteira (ST-201)
      p_MOV201: false,    // Esteira em movimento (ST-201 > 0)
      p_VB201: false,     // Velocidade abaixo da faixa nominal
      p_VA201: false,     // Velocidade acima da faixa nominal
      p_VN201: false,     // Velocidade normal
      
      // Silo de Rejeito (LIT-703)
      p_NA703: false,     // Silo C cheio / Alarme (> 90%)
      p_NC703: false,     // Silo C Nível Crítico / Bloqueio (≥ 100%)
      
      // Ejeção Pneumática
      p_POS603: false,    // Grão C na posição de disparo do ejetor
      p_ZSH601: false,    // Sensor magnético de confirmação de avanço do pistão
    };

    // Saídas de Controle do CLP
    this.outputs = {
      c_PERM: false,      // Permissão Geral de Operação
      c_ALIM: false,      // Comando de acionamento do alimentador vibratório
      c_FY603: false,     // Comando de disparo da válvula solenoide do ejetor C
    };

    // Diagnóstico e Alarmes
    this.diagnostics = {
      p_FALHA_EJETOR: false,
      alarme_JI201: false,
      alarme_PAL601: false,
      alarme_LIT703: false,
      alarme_KSA401: false,
      alarme_EMERG: false,
      alarme_NB101: false,
    };

    // Temporizador para diagnóstico de falha de pistão
    this.ejectorTimer = 0;
    this.ejectorPendingCheck = false;
  }

  /**
   * Avalia a cadeia lógica completa do CLP
   * @param {Object} currentGrain Grão atualmente posicionado na estação de visão (opcional)
   */
  evaluate(currentGrain = null) {
    // 1. Permissão Geral de Operação:
    // c_PERM ↔ ( ¬p_EMERG ∧ ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 ∧ ¬p_NC703 )
    this.outputs.c_PERM = 
      !this.inputs.p_EMERG && 
      !this.inputs.p_JI201 && 
      !this.inputs.p_PAL601 && 
      this.inputs.p_KSA401 && 
      !this.inputs.p_NC703;

    // 2. Velocidade da esteira
    this.inputs.p_VN201 = !this.inputs.p_VB201 && !this.inputs.p_VA201 && this.inputs.p_MOV201;

    // 3. Comando do Alimentador Vibratório:
    // c_ALIM ↔ ( c_PERM ∧ p_MOV201 ∧ ¬p_NB101 )
    this.outputs.c_ALIM = this.outputs.c_PERM && this.inputs.p_MOV201 && !this.inputs.p_NB101;

    // 4. Comando de Disparo do Ejetor da Categoria C:
    // c_FY603 ↔ ( p_C ∧ p_POS603 ∧ ¬p_PAL601 )
    this.outputs.c_FY603 = this.inputs.p_POS603 && !this.inputs.p_PAL601;

    // 5. Diagnóstico e Alarmes
    this.diagnostics.alarme_EMERG = this.inputs.p_EMERG;
    this.diagnostics.alarme_JI201 = this.inputs.p_JI201;
    this.diagnostics.alarme_PAL601 = this.inputs.p_PAL601;
    this.diagnostics.alarme_LIT703 = this.inputs.p_NA703;
    this.diagnostics.alarme_KSA401 = !this.inputs.p_KSA401;
    this.diagnostics.alarme_NB101 = this.inputs.p_NB101;

    return this.outputs;
  }

  /**
   * Classificação Booleana de Grão conforme a Visão Computacional (CV-101 a CV-109)
   * @param {Object} visionProps Proposições binárias extraídas da imagem
   * @returns {Object} { p_A, p_B, p_C, category: 'A'|'B'|'C' }
   */
  classifyGrain(visionProps) {
    const {
      p_CV101, // Cor Ideal
      p_CV102, // Cor Secundária
      p_CV103, // Tamanho Ideal
      p_CV104, // Tamanho Secundário
      p_CV105, // Formato Ideal
      p_CV106, // Formato Secundário
      p_CV107, // Dano
      p_CV108, // Praga
      p_CV109  // Impureza
    } = visionProps;

    // Categoria A:
    // p_A ↔ ( p_CV101 ∧ p_CV103 ∧ p_CV105 ∧ ¬p_CV107 ∧ ¬p_CV108 ∧ ¬p_CV109 )
    const p_A = p_CV101 && p_CV103 && p_CV105 && !p_CV107 && !p_CV108 && !p_CV109;

    // Categoria C:
    // p_C ↔ ( p_CV107 ∨ p_CV108 ∨ p_CV109 ∨ (¬p_CV101 ∧ ¬p_CV102) ∨ (¬p_CV103 ∧ ¬p_CV104) ∨ (¬p_CV105 ∧ ¬p_CV106) )
    const p_C = p_CV107 || p_CV108 || p_CV109 || 
                (!p_CV101 && !p_CV102) || 
                (!p_CV103 && !p_CV104) || 
                (!p_CV105 && !p_CV106);

    // Categoria B:
    // p_B ↔ ( ¬p_A ∧ ¬p_C )
    const p_B = !p_A && !p_C;

    let category = 'B';
    if (p_A) category = 'A';
    else if (p_C) category = 'C';

    return { p_A, p_B, p_C, category };
  }
}
