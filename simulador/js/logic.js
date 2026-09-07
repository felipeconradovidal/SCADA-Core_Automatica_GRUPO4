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
      p_STANDBY: false,   // Linha purgada em modo Standby (aguardando refil)
      
      // Silo A (LIT-701)
      p_NA701: false,     // Silo A cheio / Alarme (> 90%)
      p_NC701: false,     // Silo A Nível Crítico / Bloqueio (≥ 95%)

      // Silo B (LIT-702)
      p_NA702: false,     // Silo B cheio / Alarme (> 90%)
      p_NC702: false,     // Silo B Nível Crítico / Bloqueio (≥ 95%)

      // Silo C (LIT-703)
      p_NA703: false,     // Silo C cheio / Alarme (> 90%)
      p_NC703: false,     // Silo C Nível Crítico / Bloqueio (≥ 95%)
      
      // Ejeção Pneumática Ejetor C (Rejeito)
      p_POS603: false,    // Grão C na posição física de disparo do ejetor C
      p_ZSH601: false,    // Sensor magnético de confirmação de avanço do pistão C
      
      // Ejeção Pneumática Ejetor B (Secundário)
      p_POS602: false,    // Grão B na posição física de disparo do ejetor B
      p_ZSH602: false,    // Sensor magnético de confirmação de avanço do pistão B
    };

    // Saídas de Controle do CLP
    this.outputs = {
      c_PERM: false,      // Permissão Geral de Operação
      c_EST: false,       // Comando da contatora do motor da esteira CV-201
      c_ALIM: false,      // Comando de acionamento do alimentador vibratório
      c_FY603: false,     // Comando de disparo da válvula solenoide do ejetor C (Rejeito)
      c_FY602: false,     // Comando de disparo da válvula solenoide do ejetor B (Secundário)
    };

    // Diagnóstico e Alarmes
    this.diagnostics = {
      p_FALHA_EJETOR: false,
      alarme_JI201: false,
      alarme_PAL601: false,
      alarme_LIT701: false,
      alarme_LIT702: false,
      alarme_LIT703: false,
      alarme_KSA401: false,
      alarme_EMERG: false,
      alarme_NB101: false,
      alarme_STANDBY: false,
    };

    // Temporizador para diagnóstico de falha de pistão
    this.ejectorTimerC = 0;
    this.ejectorTimerB = 0;
  }

  /**
   * Avalia a cadeia lógica completa do CLP
   */
  evaluate() {
    // 1. Permissão Geral de Operação:
    // c_PERM ↔ ( ¬p_EMERG ∧ ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 )
    this.outputs.c_PERM = 
      !this.inputs.p_EMERG && 
      !this.inputs.p_JI201 && 
      !this.inputs.p_PAL601 && 
      this.inputs.p_KSA401;

    // 2. Bloqueio por Silo Crítico (Transbordamento de qualquer silo A, B ou C):
    const p_SILO_CHEIO = this.inputs.p_NC701 || this.inputs.p_NC702 || this.inputs.p_NC703;

    // 3. Comando da Contatora da Esteira (M-201):
    // A esteira roda com c_PERM ativo E NÃO estando em p_STANDBY
    this.outputs.c_EST = this.outputs.c_PERM && !this.inputs.p_STANDBY;

    // 4. Velocidade da esteira
    this.inputs.p_VN201 = !this.inputs.p_VB201 && !this.inputs.p_VA201 && this.inputs.p_MOV201;

    // 5. Comando do Alimentador Vibratório:
    // c_ALIM ↔ ( c_PERM ∧ c_EST ∧ p_MOV201 ∧ ¬p_NB101 ∧ ¬p_SILO_CHEIO )
    this.outputs.c_ALIM = this.outputs.c_PERM && this.outputs.c_EST && this.inputs.p_MOV201 && !this.inputs.p_NB101 && !p_SILO_CHEIO;

    // 6. Comando de Disparo do Ejetor da Categoria C:
    // c_FY603 ↔ ( p_C ∧ p_POS603 ∧ ¬p_PAL601 )
    this.outputs.c_FY603 = this.inputs.p_POS603 && !this.inputs.p_PAL601;

    // 7. Comando de Disparo do Ejetor da Categoria B:
    // c_FY602 ↔ ( p_B ∧ p_POS602 ∧ ¬p_PAL601 )
    this.outputs.c_FY602 = this.inputs.p_POS602 && !this.inputs.p_PAL601;

    // 8. Diagnóstico de Falha dos Ejetores (Discrepância Temporal entre Comando e Sensor de Posição):
    // p_FALHA_EJETOR ↔ (c_FY603 ∧ ¬p_ZSH601 após T) ∨ (c_FY602 ∧ ¬p_ZSH602 após T)
    // Atualizado com temporizador no motor de simulação

    // 9. Alarmes do Processo
    this.diagnostics.alarme_EMERG = this.inputs.p_EMERG;
    this.diagnostics.alarme_JI201 = this.inputs.p_JI201;
    this.diagnostics.alarme_PAL601 = this.inputs.p_PAL601;
    this.diagnostics.alarme_LIT701 = this.inputs.p_NA701;
    this.diagnostics.alarme_LIT702 = this.inputs.p_NA702;
    this.diagnostics.alarme_LIT703 = this.inputs.p_NA703;
    this.diagnostics.alarme_KSA401 = !this.inputs.p_KSA401;
    this.diagnostics.alarme_NB101 = this.inputs.p_NB101;
    this.diagnostics.alarme_STANDBY = this.inputs.p_STANDBY;

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
