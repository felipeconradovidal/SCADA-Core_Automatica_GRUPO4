# Plano de Implementação: Modo SCADA Industrial (ISA-101 / ISA-5.1 / ISA-18.2) & Arquitetura Dual-View

Este documento detalha o planejamento técnico para implementação da interface de **SCADA Industrial Real**, mantendo a interface de **Protótipo Interativo / Gêmeo Digital Didático** totalmente acessível e funcional através de um seletor no cabeçalho.

---

## 1. Visão Geral e Objetivos

- **Objetivo Principal**: Prover ao sistema duas experiências complementares de supervisão sobre o mesmo núcleo de simulação:
  1. **Modo Protótipo / Gêmeo Didático (Atual)**: Visão física 2D animada com grãos em trânsito, visualizador booleano explícito, HUD de visão computacional e injeção direta de falhas.
  2. **Modo SCADA Industrial (Novo)**: Interface aderente aos padrões de mercado da Engenharia de Automação (**ISA-101 High-Performance HMI**, **ISA-5.1 P&ID**, **ISA-18.2 Gestão de Alarmes**), com estética de sala de controle, sinótico P&ID, faceplates clicáveis e segregação de telas por nível de acesso (N1 a N4).
- **Sem Perda de Funcionalidades**: O motor físico (`engine.js`), a lógica de intertravamento do CLP (`logic.js`) e a IA de visão (`vision.js`) continuam sendo a **única fonte da verdade** (*Single Source of Truth*), rodando continuamente em segundo plano e sincronizando as duas telas.

---

## 2. Decisões de Arquitetura

```
                         ┌──────────────────────────────────────────────┐
                         │   NÚCLEO DO SISTEMA (SHARED CORE ENGINE)    │
                         │   • engine.js (Cinemática, Balança, Atuador) │
                         │   • logic.js  (CLP Virtual & Intertravamento)│
                         │   • vision.js (Classificação Óptica de Grãos)│
                         └──────────────────────┬───────────────────────┘
                                                │
                          ┌─────────────────────┴─────────────────────┐
                          ▼                                           ▼
             ┌─────────────────────────┐                 ┌─────────────────────────┐
             │    MODO 1: PROTÓTIPO    │                 │   MODO 2: SCADA REAL    │
             │   (Gêmeo Didático 2D)   │                 │   (Padrão ISA-101/5.1)  │
             ├─────────────────────────┤                 ├─────────────────────────┤
             │ • Canvas 2D com Grãos   │                 │ • Sinótico P&ID ISA 5.1 │
             │ • Zoom/Pan Livre        │                 │ • Faceplates Clicáveis  │
             │ • Fórmulas Booleanas    │                 │ • Banner Alarmes ISA18.2│
             │ • Injeção Rápida Falhas │                 │ • Abas Níveis N1 a N4   │
             └─────────────────────────┘                 └─────────────────────────┘
                               ▲                               ▲
                               └───────── Seletor ─────────────┘
                                      (Header Toggle)
```

1. **Seletor de Modo (View Toggle)**:
   - Posicionado no topo (`header`), permitindo comutação instantânea sem recarregar a página e sem perder dados de produção acumulados.
2. **Filosofia Visual ISA-101 (High-Performance HMI)**:
   - Fundo cinza-ardósia industrial neutro (`#1a202c` / `#1e2530`), minimizando reflexos e fadiga visual.
   - Aplicação estrita da paleta de cores:
     - Normal / Em operação: tons discretos de cinza, contorno sutil ou verde neutro desaturado.
     - Anomalias / Alarmes: Vermelho saturado (Crítico), Âmbar (Alto), Amarelo (Médio), Ciano (Informativo).
3. **Representação P&ID (ISA 5.1)**:
   - Funil receptor `TK-101` com barra analógica de nível e alarmes de `LAL` (baixo) e `LAH` (alto).
   - Esteira `CV-201` acionada por motor `M-201` com indicação de corrente `JI-201` e velocidade `ST-201`.
   - Balança dosadora contínua `WT-301` gerando vazão `FT-301`.
   - Estação óptica `KSA-401` com sensor trigger `XS-401`.
   - Ejetores pneumáticos representados como válvulas solenoides de ação rápida (`XV-602` e `XV-603`) com sensores magnéticos de confirmação de avanço (`ZSH-601` e `ZSH-602`).
   - Silos de destino `V-701` (Aprovado A), `V-702` (Secundário B) e `V-703` (Rejeito C com transmissor `LIT-703`).
4. **Sistema de Faceplates Industriais (Pop-ups de Equipamentos)**:
   - Ao clicar em qualquer equipamento no P&ID (ex: Motor `M-201`, Válvula `XV-603`, Silo `V-703` ou Balança `WT-301`), abre-se um **Faceplate** modal padronizado contendo:
     - Modo de Operação: [ Automático ] / [ Manual ].
     - Status de Intertravamento (permissivos lógicos ativos/bloqueantes).
     - Comandos Manuais (partida/parada em modo manual, teste de pulso de ar).
     - Informações de Engenharia e Manutenção (horímetro, setpoints, limites de alarme).
5. **Hierarquia de Telas ISA-101 (Níveis 1 a 4)**:
   - **Nível 1 (Visão Geral da Planta / KPI)**: Eficiência global, rendimento percentual A/B/C, vazão acumulada, status geral do CLP.
   - **Nível 2 (Sinótico P&ID de Operação)**: Tela operacional principal com o diagrama P&ID e instrumentação.
   - **Nível 3 (Historiador & Tendências)**: Gráfico de tendência multi-pen estilo osciloscópio industrial com réguas de tempo.
   - **Nível 4 (Engenharia & Diagnóstico)**: Área protegida onde ficam a injeção de falhas e a visualização detalhada das variáveis proposicionais do CLP.

---

## 3. Arquivos Envolvidos e Mudanças Propostas

### 3.1. `simulador/index.html` [MODIFICAR]
- Inserir o **botão comutador de visualização** no cabeçalho:
  - `[ 🔬 Modo Gêmeo Didático ]` ⟷ `[ 🏭 Modo SCADA Industrial (ISA-101) ]`.
- Envolver a interface atual em um container `<section id="viewPrototype">`.
- Criar a nova estrutura `<section id="viewScadaIndustrial" class="hidden">` contendo:
  - Barra superior de alarmes ativos ISA-18.2 com botões `[ ACK ]` e `[ MUTE ]`.
  - Barra de navegação por níveis ISA-101 (`N1 Geral`, `N2 P&ID`, `N3 Trends`, `N4 Engenharia`).
  - Canvas / SVG para o Sinótico P&ID de alta performance.
  - Painel de KPIs e mini-resumo de produção.
  - Estrutura de **Faceplate Modal** reaproveitável para Motor, Válvulas, Silos e Instrumentos.

### 3.2. `simulador/css/style.css` [MODIFICAR]
- Adicionar a estilização de **High-Performance HMI (ISA-101)**:
  - Paleta neutra em cinza escuro industrial (`#1e2530`, `#151b24`, `#2d3748`) para evitar fadiga visual.
  - Padrão de cores para alarmes normatizados:
    - Vermelho: Alarme Crítico (emergência, desarme de motor, falha de ejetor)
    - Âmbar: Alarme de Alta Prioridade (pressão baixa, silo quase cheio)
    - Amarelo: Alarme de Média Prioridade
    - Ciano/Cinza: Status Normal / Informativo
  - Estilos de instrumentos analógicos (barras de nível com marcas de corte `HH`, `H`, `L`, `LL`).
  - Estilos para os **Faceplates**: painéis modais industriais com abas de comando (Manual/Automático), intertravamentos e manutenção.

### 3.3. `simulador/js/scada_industrial.js` [NOVO ARQUIVO]
- Criar a classe `IndustrialSCADAView`:
  - **Renderizador do Sinótico P&ID (ISA 5.1)**:
    - Funil `TK-101` com transmissor `LIT-101`.
    - Esteira `CV-201` com motor `M-201`, sensor de velocidade `ST-201` e corrente `JI-201`.
    - Balança integradora contínua `WT-301` e vazão calculada `FT-301`.
    - Sensor trigger `XS-401` e câmera inteligente `KSA-401`.
    - Válvulas solenoides ejetoras `XV-602` e `XV-603` com sensores de fim de curso `ZSH-601` e `ZSH-602`.
    - Silos de armazenamento `V-701` (Aprovado A), `V-702` (Secundário B) e `V-703` (Rejeito C com `LIT-703`).
  - **Mecanismo de Interatividade / Faceplates**:
    - Detecção de clique nos equipamentos do P&ID para abertura do Faceplate correspondente.
    - Suporte a comandos manuais pelo operador (ex: acionamento manual de pulso de ar para teste, ajuste fino de setpoint, comutação de modo Manual/Automático).
  - **Gerenciador de Alarmes ISA-18.2**:
    - Alimentação contínua do Banner Superior de Alarme.
    - Suporte a `ACK` individual ou em lote e silenciamento acústico (`MUTE`).
  - **Navegação de Telas N1 a N4**:
    - Alternância rápida entre Dashboard de KPIs, Sinótico P&ID, Historiador e Painel de Engenharia.

### 3.4. `simulador/js/scada.js` [MODIFICAR]
- Importar e instanciar `IndustrialSCADAView`.
- Implementar o ouvinte do comutador de modo:
  - Alterna a visibilidade entre `#viewPrototype` e `#viewScadaIndustrial`.
- Manter o loop de animação contínuo atualizando ambas as visualizações em tempo real com base no mesmo estado do CLP (`logic.js`) e motor físico (`engine.js`).

### 3.5. `simulador/README.md` [MODIFICAR]
- Atualizar a documentação do simulador explicando o funcionamento do modo duplo e as normas industriais atendidas (ISA-101, ISA-5.1 e ISA-18.2).

---

## 4. Plano de Verificação

### 4.1. Verificação Funcional
- [ ] O seletor de modo alterna perfeitamente entre o Modo Protótipo e o Modo SCADA sem erros de console ou flickering.
- [ ] No Modo SCADA Industrial, o diagrama P&ID reflete instantaneamente o estado da esteira, rotação do motor, nível do funil, vazão da balança e acionamento dos ejetores.
- [ ] Clicar no Motor `M-201` abre o Faceplate do motor com informações de corrente (`JI-201`), status de marcha, modo Auto/Manual e intertravamentos de segurança.
- [ ] Clicar nas válvulas `XV-602`/`XV-603` abre o Faceplate dos ejetores mostrando confirmação de avanço `ZSH-601`/`ZSH-602` e pressão de ar `PT-601`.
- [ ] Clicar nos Silos abre o Faceplate com níveis percentuais, contagem de grãos e alarme de nível alto.
- [ ] As falhas injetadas na aba N4 (Engenharia) geram alarmes imediatos no Banner Superior ISA-18.2 do SCADA.
- [ ] Retornar ao Modo Protótipo mantém o simulador rodando de forma fluida e sincronizada.

### 4.2. Compatibilidade e Responsividade
- [ ] Testar abertura direta no navegador (`simulador/index.html`) e via script Python (`simulador/run_simulador.py`).
- [ ] Garantir legibilidade dos textos técnicos e faceplates em diferentes resoluções.
