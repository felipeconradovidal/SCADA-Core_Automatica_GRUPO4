# Plano de Implementação: Adoção do Padrão SCADA Industrial Clássico (Estética WinCC / InTouch - Imagem de Referência 2)

Este plano estabelece a reformulação visual e estrutural completa do SCADA para alinhar rigorosamente a interface à **Imagem de Referência (2)** fornecida pelo usuário (`Complex geotermal computerizat` / Padrão Siemens WinCC / Wonderware InTouch), eliminando de vez qualquer resquício de "dark-mode / modern gamer web app" de alto contraste e aplicando a verdadeira paleta e ergonomia dos sistemas de supervisão consagrados da indústria.

---

## 🔍 Análise Comparativa da Imagem de Referência (2)

| Elemento | Interface Atual (Imagem 1) | Padrão Industrial Real da Referência (Imagem 2) |
| :--- | :--- | :--- |
| **Fundo da Aplicação** | Cinza-ardósia escuro / azul marinho (`#0e131b`) | Cinza industrial clássico de painel (`#c0c0c0` / `#d4d0c8` - Windows 95/NT / WinCC) com relevo 3D chanfrado (beveled). |
| **Fundo do Sinótico P&ID** | Fundo escuro azulado com linhas ciano/azul | **Verde-ardósia / Teal Industrial clássico (`#4b7070` a `#527878`)** com malha matricial de pontos de alinhamento (dotted grid). |
| **Tubulações e Linhas** | Linhas finas azuladas semi-transparentes | **Tubulações espessas cinza-claro/prata (`#d8d8d8`) com contorno preto nítido (`#000000`)** de 2px e setas direcionais de fluxo (`►`, `▲`). |
| **Displays de Variáveis (IO Fields)** | Textos soltos em fonte azul clara | **Caixas pretas rebaixadas (sunken 3D)** com valores em **verde fluorescente (`#00ff00`) ou amarelo (`#ffff00`)** (ex: `[ 0.80 m/s ]`, `[ 1.1 kg/h ]`, `[ 6.2 bar ]`). |
| **Motores e Bombas** | Círculo escuro com letra M | Símbolo clássico com voluta/tangente, **Verde vivo (`#00c000`)** quando em marcha, **Vermelho (`#c00000`)** quando parado, com bloquinhos indicadores 3D `[ON]` e `[OFF]`. |
| **Válvulas** | Triângulos escuros estilizados | Triângulos opostos ANSI/ISA preenchidos em verde (aberta) / vermelho (fechada), com atuador solenoide retangular `[S]`. |
| **Barra de Alarmes** | Faixa superior moderna escura | **Faixa preta de rodapé (ou topo)** com mensagens de alarme em **vermelho vivo (`#ff2020`)**, acompanhada de botões chanfrados de comando (`Confirma alarme`, `Histórico`, etc.). |
| **Painel de Controle e Abas** | Abas horizontais arredondadas modernas | **Botoeiras e barras de navegação chanfradas em relevo 3D clássico** (cinza/verde industrial) com tipografia técnica legível sem anti-aliasing borrado. |

---

## 📋 Mudanças Propostas

### 1. Folha de Estilos (`simulador/css/style.css`)

- **Paleta de Cores Clássica WinCC / InTouch**:
  - `--scada-chassis: #d4d0c8`: Cinza neutro de painel de controle.
  - `--scada-canvas-bg: #4e7373`: Teal/verde-ardósia clássico para o sinótico do processo.
  - `--scada-pipe-fill: #e0e0e0`: Tubulação em aço/cinza claro com borda preta sólida.
  - `--scada-display-bg: #000000`: Fundo de display digital rebaixado.
  - `--scada-display-green: #00ff00`: Texto de processo normal (estilo display de 7 segmentos/matriz).
  - `--scada-display-yellow: #ffff00`: Texto de atenção / secundário.
  - `--scada-display-red: #ff3333`: Texto de alarme.
- **Bordas Chanfradas em Relevo 3D (Bevels Autênticos)**:
  - `.scada-bevel-raised`: Borda 3D saliente (`border: 2px solid; border-color: #ffffff #404040 #404040 #ffffff`).
  - `.scada-bevel-sunken`: Borda 3D rebaixada (`border: 2px solid; border-color: #404040 #ffffff #ffffff #404040`).
  - `.scada-btn-classic`: Botão clássico industrial com resposta tátil de clique (`active: border-color: #404040 #ffffff #ffffff #404040`).
- **Eliminação de Todos os Efeitos Web Modernos**:
  - Sem cantos arredondados excessivos (`rounded-lg` / `rounded-xl`).
  - Sem gradientes translúcidos ou sombras difusas (`blur`, `shadow-cyan`).
  - Tipografia nítida (Segoe UI, Tahoma, Arial, Courier New / JetBrains Mono para números).

---

### 2. Estrutura da Estação (`simulador/index.html`)

- **Cabeçalho Clássico de Sala de Controle**:
  - Barra cinza com moldura 3D, identificação da instituição/planta, data/hora em display digital e status do PLC (`COMUNICAÇÃO PLC: [DA] em verde`).
- **Navegação no Padrão da Imagem de Referência**:
  - Barra de seleção de telas e comandos no padrão de botões beveled salientes.
- **Layout Geral de Sala de Controle**:
  - Painel principal central com o sinótico sobre o fundo teal-ardósia `#4e7373`.
  - Painel lateral direito de comando com botoeiras de operação, chaves seletoras rotativas e blocos de indicação de estado.
  - Faixa inferior de alarmes: caixa preta rebaixada com texto em vermelho vivo e botoeiras de reconhecimento e histórico (`ACK ALARME`, `SILENCIAR`, `RESET`).

---

### 3. Renderização do P&ID (`simulador/js/scada_industrial.js`)

- **Fundo do Canvas**:
  - Preenchimento em `#4e7373` com malha de pontos de alinhamento técnicos em intervalos regulares.
- **Tubulações Industriais**:
  - Tubos espessos em cinza prata (`#d8d8d8`) com contorno preto nítido (`#000000`, 2px de espessura) interligando o funil, esteira, balança, estação de visão e silos.
  - Setas direcionais de fluxo em cinza/preto ao longo da linha.
- **Caixas Digitais de Leitura de Variáveis (IO Fields Clássicos)**:
  - Cada variável física (`ST-201` velocidade, `FT-301` vazão, `PT-601` pressão, `JI-201` corrente, níveis dos silos) é desenhada como uma caixa preta chanfrada com texto em verde (`#00ff00`) ou amarelo (`#ffff00`).
- **Equipamentos e Instrumentação**:
  - **Funil `TK-101`**: Corpo em chapa de aço cinza com borda preta e coluna de nível integrada.
  - **Motor `M-201`**: Símbolo circular clássico verde quando em operação e vermelho quando parado, com bloquinhos `[ON]` / `[OFF]` beveled.
  - **Válvulas Ejetoras `XV-602` / `XV-603`**: Símbolo de válvula borboleta/esfera ANSI com atuador solenoide `[S]` e sinalização verde/vermelho.
  - **Silos `V-701`, `V-702`, `V-703`**: Silos em cinza neutro com indicadores de nível e caixas de percentual digital.

---

### 4. Gêmeo Físico 2D, Visão e Gráficos (`scada.js`, `vision.js`, `charts.js`)

- **Gêmeo Físico 2D (`scada.js`)**:
  - Fundo do processo físico também alinhado à paleta industrial sóbria (chassi metálico de máquina em cinza neutro, sem fundos pretos espaciais).
- **Monitor de Visão (`vision.js`)**:
  - Moldura de monitor de inspeção industrial (estilo monitor de bancada cinza com botões chanfrados de calibração).
- **Registrador Gráfico (`charts.js`)**:
  - Fundo preto rebaixado com grade verde/cinza suave (estilo registrador gráfico Yokogawa / Eurotherm clássico).

---

## 🔬 Plano de Verificação

### Testes Automatizados & Sintáticos
- Verificação de sintaxe de todos os arquivos JavaScript via `node --check`.
- Verificação da integridade da árvore HTML do arquivo `simulador/index.html`.

### Verificação Visual & Operacional
- Confirmar visualmente a transição das cores escuras/neon para a paleta teal/cinza da **Imagem de Referência (2)**.
- Verificar funcionamento de todas as interatividades: partida, parada, emergência, troca de telas, abertura de faceplates e disparo de alarmes.
- Confirmar que a leitura de dados digitais em verde/amarelo nas caixas pretas rebaixadas reflete os dados em tempo real da esteira, funil, balança e câmera.
