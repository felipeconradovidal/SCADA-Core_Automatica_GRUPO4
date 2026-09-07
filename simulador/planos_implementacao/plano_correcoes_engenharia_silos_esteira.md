# Plano de Implementação: Correções de Engenharia de Processo (Purga da Esteira & Homogeneização dos Silos A, B e C)

Este plano estabelece as alterações de engenharia de automação para corrigir as inconsistências operacionais identificadas na linha de classificação óptica:
1. **Parada Inteligente por Purga / Esvaziamento da Esteira (*Cleanout Auto-Standby*)** quando o funil $TK\text{-}101$ esvazia.
2. **Homogeneização Completa dos Três Silos de Destino ($V\text{-}701$, $V\text{-}702$, $V\text{-}703$)**, eliminando artifícios visuais e dotando todos os silos de instrumentação de nível contínua ($LIT\text{-}701$, $LIT\text{-}702$, $LIT\text{-}703$), lógica de intertravamento contra transbordamento e comandos individuais de dreno.

---

## 🔍 Diagnóstico das Inconsistências Atuais

| Subsistema | Comportamento Atual | Inconsistência de Engenharia | Comportamento Correto Proposto |
| :--- | :--- | :--- | :--- |
| **Funil $TK\text{-}101$ & Esteira $CV\text{-}201$** | Funil atinge nível baixo ($< 15\%$), desliga o alimentador $c\_ALIM$, mas a esteira continua girando indefinidamente a vazio com 0 g e buffer zerado. | Desperdício de energia elétrica, desgaste prematuro de componentes mecânicos (lona/rolamentos) e contagem indevida de horas no horímetro. | Ao esvaziar o funil, fecha $c\_ALIM$, aguarda todos os grãos em trânsito saírem da esteira (buffer = 0) + delay de purga (2s), e executa a **parada suave em modo *Standby***, gerando alarme informativo no SCADA. |
| **Medição dos Silos** | Apenas o Silo C possui tag, transmissor e lógica de nível alto ($LIT\text{-}703$ / $p\_NC703$). Silos A e B não possuem instrumentação coerente. | Silo A recebe 70-80% do fluxo; se transbordar, o prejuízo é máximo. Se Silo B encher, os ejetores não conseguem desviar os grãos secundários, contaminando o lote A. | **Todos os três silos recebem medição analógica contínua**: $LIT\text{-}701$ (Silo A), $LIT\text{-}702$ (Silo B) e $LIT\text{-}703$ (Silo C), com leitura de 0 a 100%. |
| **Dinâmica de Dreno** | Silo A utilizava o artifício de protótipo `count % 100` (esvaziava sozinho a cada 100 grãos). Silo B enchia até travar no topo ($> 250$ un) sem dreno automático. Silo C bloqueava a linha. | Ausência de padrão operacional para esvaziamento e expedição; simulação visual de dreno sem comando físico. | **Comportamento homogêneo e realista**: remoção do `count % 100`; criação do comando `Dreno A` no painel; capacidades dimensionadas proporcionalmente ($A=1000$, $B=350$, $C=200$ grãos). |
| **Intertravamento de Transbordamento** | Apenas $p\_NC703$ bloqueava a linha. | Se Silo A ou Silo B atingir 100%, haveria transbordamento físico e contaminação de lotes sem resposta do CLP. | Se **qualquer** dos três silos atingir nível crítico ($\ge 99\%$), o CLP bloqueia a alimentação ($c\_ALIM$) e avisa o operador. |

---

## 🛠️ Arquitetura das Modificações por Módulo

### 1. Módulo de Lógica Proposicional do CLP (`simulador/js/logic.js`)

- **Novas Proposições de Entrada dos Silos**:
  - `p_NA701`: Nível Alto no Silo A ($> 90\%$)
  - `p_NC701`: Nível Crítico no Silo A ($\ge 99\%$)
  - `p_NA702`: Nível Alto no Silo B ($> 90\%$)
  - `p_NC702`: Nível Crítico no Silo B ($\ge 99\%$)
  - `p_NA703`: Nível Alto no Silo C ($> 90\%$)
  - `p_NC703`: Nível Crítico no Silo C ($\ge 99\%$)
- **Proposição Agregada de Bloqueio por Silo Cheio**:
  $$p\_SILO\_CHEIO \longleftrightarrow (p\_NC701 \lor p\_NC702 \lor p\_NC703)$$
- **Nova Equação do Alimentador Vibratório ($c\_ALIM$)**:
  $$c\_ALIM \longleftrightarrow (c\_PERM \land p\_MOV201 \land \neg p\_NB101 \land \neg p\_SILO\_CHEIO \land \neg p\_STANDBY)$$
- **Proposição de Standby de Linha Limpa**:
  - `p_STANDBY`: Ativa quando o funil está vazio e a esteira já concluiu o ciclo de purga.

---

### 2. Motor de Simulação e Cinemática (`simulador/js/engine.js`)

- **Redefinição das Capacidades Físicas dos Silos**:
  ```javascript
  this.silos = {
    siloA: { count: 0, massKg: 0.0, levelPercent: 0.0, maxCount: 1000, label: 'Categoria A (Aprovado Premium)' },
    siloB: { count: 0, massKg: 0.0, levelPercent: 0.0, maxCount: 350,  label: 'Categoria B (Secundário Tolerável)' },
    siloC: { count: 0, massKg: 0.0, levelPercent: 0.0, maxCount: 200,  label: 'Categoria C (Rejeitado / Defeitos)' }
  };
  ```
- **Cálculo Contínuo dos Níveis em `updateSensorsToPLC()`**:
  - $LIT\text{-}701 = \frac{\text{countA}}{\text{maxA}} \times 100\%$
  - $LIT\text{-}702 = \frac{\text{countB}}{\text{maxB}} \times 100\%$
  - $LIT\text{-}703 = \frac{\text{countC}}{\text{maxC}} \times 100\%$
- **Lógica de Purga Automática (*Cleanout / Auto-Standby*)**:
  - Monitorar: `if (this.hopper.level < 15.0 && this.grains.length === 0 && this.trackingQueue.length === 0)`:
    - Acumular temporizador de purga: `this.purgeTimer += dt;`
    - Quando `purgeTimer >= 2.0s`: ativa `p_STANDBY = true`, desacelera a esteira suavemente até 0.0 m/s.
    - Dispara alarme operacional no SCADA: `"ALR PROCESSO: Funil TK-101 Vazio - Purga Completa / Linha em Standby"`.
  - Ao reabastecer (`refillHopper()`):
    - `p_STANDBY = false`, zera `purgeTimer`.
    - Partida sequenciada: a esteira acelera primeiro; ao atingir velocidade nominal, reabre $c\_ALIM$.
- **Adição do Método `emptySiloA()`**:
  - Permite drenar o Silo A de forma operacional e registrar o lote expedido.

---

### 3. Interface e Console de Operação (`simulador/index.html`)

- **Mesa de Comando Operacional**:
  - Adicionar o botão `🗑 Dreno A` ao lado dos já existentes `🗑 Dreno B` e `🗑 Dreno C`:
    ```html
    <div class="grid grid-cols-4 gap-1 text-[10px]">
      <button id="btnRefill" class="btn-classic text-center py-1">⟳ Refil Funil</button>
      <button id="btnEmptyA" class="btn-classic text-center py-1">🗑 Dreno A</button>
      <button id="btnEmptyB" class="btn-classic text-center py-1">🗑 Dreno B</button>
      <button id="btnEmptyC" class="btn-classic text-center py-1">🗑 Dreno C</button>
    </div>
    ```
- **Tela de Engenharia (N4)**:
  - Adicionar checkboxes de injeção de falhas para Silo A Cheio (`LIT-701`) e Silo B Cheio (`LIT-702`), além do Silo C.

---

### 4. Renderização do P&ID e do Gêmeo Físico (`scada_industrial.js` & `scada.js`)

- **No Sinótico P&ID (`scada_industrial.js`)**:
  - Silo A ($V\text{-}701$): Exibir coluna analógica de nível real, display digital IO Field `[ XX% ]`, rótulo `LIT-701` e bolha de instrumentação ISA-5.1.
  - Silo B ($V\text{-}702$): Nível real de 0 a 100%, display digital e bolha `LIT-702`.
  - Silo C ($V\text{-}703$): Nível real de 0 a 100%, display digital e bolha `LIT-703`.
- **No Gêmeo Físico 2D (`scada.js`)**:
  - Remoção total de `count % 100` no Silo A. O preenchimento verde reflete o volume físico real do silo.
  - Padronização das legendas nos três silos: `LIT-701: XX% (N un)`, `LIT-702: YY% (N un)`, `LIT-703: ZZ% (N un)`.
- **Vinculação do Botão `btnEmptyA`** em `scada.js`.

---

## 🔬 Plano de Verificação

1. **Teste de Esvaziamento do Funil (Purga e Standby)**:
   - Deixar o funil esvaziar até atingir 15% (`LIT-101`).
   - Verificar se o dosador fecha imediatamente.
   - Confirmar que a esteira continua rodando até que o último grão caia nos silos (buffer = 0).
   - Confirmar que, após a esteira estar 100% limpa, o motor desliga suavemente e entra em Standby.
   - Clicar em `⟳ Refil Funil` e verificar se a esteira religa e retoma a dosagem automaticamente.
2. **Teste de Homogeneidade dos Silos**:
   - Deixar o sistema produzir e verificar se Silos A, B e C acumulam grãos de acordo com suas proporções reais ($A \approx 70\%$, $B \approx 20\%$, $C \approx 10\%$).
   - Testar os botões de dreno individual: `Dreno A`, `Dreno B`, `Dreno C`.
   - Simular enchimento de qualquer silo até 100% e verificar o bloqueio seguro da alimentação.
3. **Validação de Sintaxe**:
   - `node --check` em todos os arquivos JS e teste do parser HTML no `index.html`.
