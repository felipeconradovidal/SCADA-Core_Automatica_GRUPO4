# Aula 11: Teoria dos Grafos — Modelagem Topológica de Tubulações, Calhas e Instrumentos da Planta de Classificação Óptica de Grãos

**Projeto:** SCADA-Core Automática — GRUPO 4  
**Unidade Fabril:** Linha Automatizada de Seleção, Pesagem Dinâmica e Classificação Óptica de Grãos com Separação Pneumática Tripla  
**Referência Normativa:** ISA-5.1 (Identification Letters and Symbols) & Teoria dos Grafos Aplicada à Engenharia de Controle  

---

## 1. Fundamentos Matemáticos: Definição Formal de Dígrafos Ponderados

Na engenharia de automação e controle de processos discretos e contínuos, a representação da planta industrial por meio de listas lineares de equipamentos ou tabelas estáticas de entradas e saídas (I/O) é insuficiente para capturar o comportamento dinâmico e o roteamento de material. Para superar essa limitação, adota-se a formulação rigorosa da **Teoria dos Grafos**.

A infraestrutura física composta por funis de recepção, calhas vibratórias, seções de esteira transportadora, estações de pesagem, túnel de visão computacional, estações de ejeção pneumática e silos coletores é formalmente definida como um **Grafo Dirigido e Ponderado (Dígrafo)**:

$$G = (V, E, W)$$

Onde:

1. **$V = \{v_1, v_2, \dots, v_n\}$** é o conjunto finito e não-vazio de **vértices (nós)** de ordem $|V| = n = 14$, representando os elementos físicos e lógicos da planta:
   * Funil de recepção e descarregamento (`FN-101`);
   * Calha vibratória de alimentação dosada (`ALIM-101`);
   * Seção de entrada e tração da esteira transportadora (`EST-201`);
   * Mesa de pesagem contínua dinâmica (`BAL-301`);
   * Túnel óptico de inspeção e visão computacional (`VIS-401`);
   * Nó de despacho e classificação lógica (`DIV-501`);
   * Primeira estação de desvio e ejeção pneumática — Categoria B (`EJE-602`);
   * Segunda estação de desvio e ejeção pneumática — Categoria C (`EJE-603`);
   * Duto/calha coletora inclinada de grãos secundários (`CALHA-602`);
   * Duto/calha coletora de descarte/rejeito (`CALHA-603`);
   * Duto de descarga terminal por gravidade da esteira — Categoria A (`CALHA-701`);
   * Silo receptor de produto nobre aprovado — Categoria A (`SILO-701`);
   * Silo receptor de produto secundário/comercial — Categoria B (`SILO-702`);
   * Silo/caçamba receptora de produto rejeitado/descarte — Categoria C (`SILO-703`).

2. **$E \subseteq V \times V$** é o conjunto de **arestas dirigidas (arcos)** de tamanho $|E| = m = 14$, onde cada par ordenado $e_k = (u, v)$ estabelece um trecho físico unidirecional de condução de material (esteira, calha, sopro de ar comprimido ou duto gravitacional) partindo obrigatoriamente do nó montante $u$ em direção ao nó jusante $v$.

3. **$W: E \rightarrow \mathbb{R}^+$** é a **função de ponderação (peso do arco)**, que associa a cada elemento $e_k = (u, v) \in E$ um custo físico escalar $w(u, v) > 0$. Na presente malha de classificação, a métrica primária é o **comprimento físico real $L\text{ [m]}$**, diretamente correlacionado com:
   * O **tempo de trânsito dinâmico:** $\tau_k = \frac{L_k}{v_{\text{esteira}}}$, monitorado pelo encoder incremental `ST-201`;
   * O **atraso de propagação** no registrador de deslocamento (*shift register* `ZC-602` e `ZC-603`) do CLP;
   * A **perda de carga pneumática e atrito mecânico** nas calhas e linhas de ar.

---

### Diagrama Topológico da Planta (Sintaxe Mermaid)

```mermaid
graph LR
    FN101["FN-101: Funil Recepção\n[LIT-101]"] -->|e1: 1.2m (XV-101)| ALIM101["ALIM-101: Calha Vibratória\n[c_ALIM]"]
    ALIM101 -->|e2: 1.8m (Calha Gravitacional)| EST201["EST-201: Início da Esteira\n[CV-201 / JI-201]"]
    EST201 -->|e3: 2.5m (Correia / ST-201)| BAL301["BAL-301: Mesa de Pesagem\n[WT-301 / FT-301]"]
    BAL301 -->|e4: 3.0m (Correia Monitorada)| VIS401["VIS-401: Túnel de Visão\n[XS-401 / KSA-401]"]
    VIS401 -->|e5: 1.0m (Trigger Óptico)| DIV501["DIV-501: Nó de Decisão Lógica\n[KXA-501 / 502 / 503]"]
    
    DIV501 -->|e6: 2.0m (Correia Sincronizada)| EJE602["EJE-602: Estação Ejeção B\n[FY-602 / ZSH-602 / p_POS602]"]
    
    EJE602 -->|e7: 0.8m (Sopro Pneumático B)| CALHA602["CALHA-602: Calha Grãos B\n[Duto Inclinado]"]
    EJE602 -->|e8: 1.5m (Continuidade da Esteira)| EJE603["EJE-603: Estação Ejeção C\n[FY-603 / ZSH-601 / p_POS603]"]
    
    EJE603 -->|e9: 0.8m (Sopro Pneumático C)| CALHA603["CALHA-603: Calha Rejeito C\n[Duto Inclinado]"]
    EJE603 -->|e10: 2.2m (Descarga Final Esteira)| CALHA701["CALHA-701: Calha Terminal A\n[Duto Gravitacional]"]
    
    CALHA701 -->|e11: 3.5m (XV-701)| SILO701["SILO-701: Silo A (Nobre)\n[LIT-701 / NA701 / NC701]"]
    CALHA602 -->|e12: 4.0m (XV-702)| SILO702["SILO-702: Silo B (Comercial)\n[LIT-702 / NA702 / NC702]"]
    CALHA603 -->|e13: 3.2m (XV-703)| SILO703["SILO-703: Silo C (Descarte)\n[LIT-703 / NA703 / NC703]"]
    
    SILO702 -.->|e14: 12.0m (Rosca/Elevador Reciclo)| FN101
```

> **Convenção Operacional de Leitura:**
> * **Arestas contínuas ($e_1$ a $e_{13}$):** Fluxo produtivo principal de grãos sólidos e atuação pneumática sob regime contínuo.
> * **Aresta tracejada ($e_{14}$):** Circuito de contingência/recirculação de grãos da Categoria B para reprocessamento e reclassificação quando o Silo B atinge nível elevado sem expedição externa.

---

## 2. Por que Modelar a Planta como um Grafo e não uma Lista de Equipamentos?

Projetos tradicionais de engenharia registram os instrumentos em listas planas de instrumentação (*Instrument Index*) e tabelas de fiação de painel. Embora necessárias para a montagem elétrica, tais matrizes unidimensionais omitem completamente as **propriedades topológicas e de conservação física**.

A adoção explícita de um dígrafo ponderado $G = (V, E, W)$ confere ao sistema SCADA e ao CLP as seguintes vantagens:

1. **Rastreabilidade Dinâmica Espacial e Temporal:**
   O processo de classificação opera a velocidades de correia entre $1{,}0\text{ m/s}$ e $2{,}0\text{ m/s}$. Cada grão detectado pela barreira fotoelétrica `XS-401` no nó `VIS-401` deve ter sua posição física mapeada com precisão de milissegundos. Conhecendo o comprimento dos arcos $w(e_5)$, $w(e_6)$ e $w(e_8)$, o CLP calcula exatamente os pulsos do encoder `ST-201` necessários para o disparo seguro das eletroválvulas ultrarrápidas `FY-602` e `FY-603` nas coordenadas exatas `p_POS602` e `p_POS603`.

2. **Detecção Formal de Conectividade e Isolamento de Falhas:**
   Se uma emergência local (`p_EMERG`), sobrecarga do motor (`p_JI201`) ou subpressão de ar (`p_PAL601`) ocorrer em um nó ou aresta, os algoritmos de grafos determinam instantaneamente todos os nós a jusante (*forward reachability*) que ficam desprovidos de fluxo, disparando a rotina de purga em cascata (*cascading cleanout* e auto-standby `p_STANDBY`).

3. **Verificação de Conservação de Massa e Balanço em Nós Bifurcadores:**
   Equipamentos como `EJE-602` e `EJE-603` são nós de ramificação estocástica. Em vez de assumir vazão constante, o modelo matricial de grafos garante que a soma das frações de grãos nobres, comerciais e rejeitados atenda rigidamente às leis de conservação de Kirchhoff generalizadas:
   $$Q_{\text{alimentação}} = Q_A + Q_B + Q_C$$

---

### 2.1. Definições Fundamentais da Teoria dos Grafos no Contexto Industrial

Para fundamentar as etapas de análise matricial e busca em malhas, estabelecemos os conceitos canônicos:

* **Ordem do Grafo ($|V| = n$):** Quantidade total de nós operacionais. Na planta de seleção de grãos, $n = 14$.
* **Tamanho do Grafo ($|E| = m$):** Quantidade total de segmentos físicos de transporte e arcos de decisão. Na malha padrão com recirculação de reteste, $m = 14$.
* **Passeio (*Walk*):** Sequência finita e alternada de vértices e arestas $v_0, e_1, v_1, e_2, \dots, e_k, v_k$, onde cada aresta $e_i = (v_{i-1}, v_i) \in E$. Representa fisicamente o percurso contínuo de um lote de grãos através da linha, permitindo repetições de nós ou arestas.
* **Caminho (*Path*):** Passeio no qual **nenhum vértice se repete**. É a rota canônica e irrefletida de um grão desde o funil `FN-101` até seu silo de estocagem final.
  * *Exemplo (Rota Categoria A):* $\mathcal{P}_A = (\text{FN-101} \rightarrow \text{ALIM-101} \rightarrow \text{EST-201} \rightarrow \text{BAL-301} \rightarrow \text{VIS-401} \rightarrow \text{DIV-501} \rightarrow \text{EJE-602} \rightarrow \text{EJE-603} \rightarrow \text{CALHA-701} \rightarrow \text{SILO-701})$.
* **Trilha (*Trail*):** Passeio no qual **nenhuma aresta se repete**, embora vértices possam se repetir. Relevante em procedimentos de inspeção autônoma e limpeza por operadores ou robôs AGV.
* **Ciclo Simples (*Cycle*):** Caminho fechado ($v_0 = v_k$, com $k \geq 1$) no qual nenhum vértice intermediário se repete. Na malha estudada, a presença do elevador de retorno de grãos comerciais cria o ciclo fechado:
  $$\mathcal{C}_{\text{reciclo}} = (\text{FN-101} \rightarrow \text{ALIM-101} \rightarrow \text{EST-201} \rightarrow \dots \rightarrow \text{EJE-602} \rightarrow \text{CALHA-602} \rightarrow \text{SILO-702} \rightarrow \text{FN-101})$$
* **Grau de Saída ($\deg^+(v)$):** Número de arestas orientadas que se originam no vértice $v$ (trechos de descarga que saem de $v$).
* **Grau de Entrada ($\deg^-(v)$):** Número de arestas orientadas que convergem para o vértice $v$ (trechos de alimentação que entram em $v$).

---

### 2.2. O Lema do Aperto de Mãos Dirigido (*Directed Handshaking Lemma*)

O teorema fundamental da conectividade em dígrafos estipula que a contagem total de arcos em qualquer rede orientada deve satisfazer à igualdade:

$$\sum_{v \in V} \deg^+(v) = \sum_{v \in V} \deg^-(v) = |E| = m$$

#### Demonstração Matemática:
Seja a matriz de incidência vértice-aresta $B \in \{-1, 0, +1\}^{n \times m}$ da rede $G=(V,E)$. Cada aresta $e_j = (u, v)$ conecta um nó de saída $u$ a um nó de entrada $v$. Portanto, para cada coluna $j \in \{1, \dots, m\}$:

$$\sum_{i=1}^n B[i, j] = (-1) + (+1) + \sum_{k \neq u, v} 0 = 0$$

Por definição, o grau de saída de um nó $v_i$ é o número de entradas $-1$ em sua respectiva linha na matriz $B$:
$$\deg^+(v_i) = \sum_{j=1}^m \mathbb{I}(B[i, j] == -1)$$

E o grau de entrada de $v_i$ é o número de entradas $+1$ em sua linha:
$$\deg^-(v_i) = \sum_{j=1}^m \mathbb{I}(B[i, j] == +1)$$

Ao somarmos sobre todos os $n$ vértices:
$$\sum_{i=1}^n \deg^+(v_i) = \sum_{i=1}^n \sum_{j=1}^m \mathbb{I}(B[i, j] == -1) = \sum_{j=1}^m 1 = |E|$$
$$\sum_{i=1}^n \deg^-(v_i) = \sum_{i=1}^n \sum_{j=1}^m \mathbb{I}(B[i, j] == +1) = \sum_{j=1}^m 1 = |E|$$

Essa igualdade é a base da **validação de integridade do P&ID digitalizado**. Se durante a compilação do grafo houver discrepância entre as somas de graus e o número total de trechos cadastrados, isso prova formalmente a ocorrência de erro topológico (como arestas desconexas, duplicadas ou direções invertidas de fluxo).

---

### 2.3. Tabela de Validação dos Graus Topológicos da Planta

Avaliando a rede da planta de seleção óptica de grãos (com a inclusão da linha de recirculação $e_{14}$):

| Vértice $v_i$ | Tag / Equipamento | Grau de Entrada $\deg^-(v_i)$ | Grau de Saída $\deg^+(v_i)$ | Comportamento Topológico |
| :--- | :--- | :---: | :---: | :--- |
| $v_1$ | `FN-101_Recepcao` | 1 | 1 | Nó de trânsito balanceado (com reciclo) |
| $v_2$ | `ALIM-101_Calha` | 1 | 1 | Nó de trânsito em linha |
| $v_3$ | `EST-201_Entrada` | 1 | 1 | Nó de trânsito em linha |
| $v_4$ | `BAL-301_Pesagem` | 1 | 1 | Nó de trânsito em linha |
| $v_5$ | `VIS-401_Inspecao` | 1 | 1 | Nó de trânsito em linha |
| $v_6$ | `DIV-501_Decisao` | 1 | 1 | Nó de decisão lógica |
| $v_7$ | `EJE-602_EstacaoB` | 1 | 2 | Nó bifurcador (Sopro B ou Continuidade) |
| $v_8$ | `EJE-603_EstacaoC` | 1 | 2 | Nó bifurcador (Sopro C ou Continuidade) |
| $v_9$ | `CALHA-602_Secundario` | 1 | 1 | Nó de condução gravitacional |
| $v_{10}$ | `CALHA-603_Rejeito` | 1 | 1 | Nó de condução gravitacional |
| $v_{11}$ | `CALHA-701_Terminal` | 1 | 1 | Nó de descarga terminal |
| $v_{12}$ | `SILO-701_Aprovados` | 1 | 0 | Sumidouro terminal puro (Categoria A) |
| $v_{13}$ | `SILO-702_Secundario` | 1 | 1 | Nó de transbordo / retorno (Categoria B) |
| $v_{14}$ | `SILO-703_Rejeito` | 1 | 0 | Sumidouro terminal puro (Categoria C) |
| **TOTAL** | **$\sum_{i=1}^{14} \deg(v_i)$** | **14** | **14** | **Identidade Verificada: $\sum \deg^+ = \sum \deg^- = 14 = |E|$** |

---

### 2.4. Representações Computacionais e Análise de Complexidade

| Estrutura de Dados | Tipo em Python | Complexidade Espacial | Custo de Busca $(u, v)$ | Inserção de Arco | Aplicação Recomendada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Matriz de Adjacência Binária** | `int[n][n]` | $O(n^2)$ | $O(1)$ | $O(1)$ | Consulta imediata de conectividade entre estações no SCADA. |
| **Matriz de Adjacência Ponderada** | `float[n][n]` | $O(n^2)$ | $O(1)$ | $O(1)$ | Algoritmos de caminho mínimo (Dijkstra, Floyd-Warshall). |
| **Lista de Adjacência** | `dict[str, list]` | $O(n + m)$ | $O(\deg^+(u))$ | $O(1)$ | Travessias em profundidade e largura (DFS e BFS em grafos esparsos). |
| **Matriz de Incidência** | `int[n][m]` | $O(n \cdot m)$ | $O(m)$ | $O(m)$ | Balanço estequiométrico de massa, conservação de fluxo e análise do espaço de ciclos. |

No sistema de supervisão do nosso projeto, a classe `GrafoTubulacao` adota a **matriz de adjacência dupla**:
1. `adj_binaria`: Armazena valores binários $\{0, 1\}$, permitindo que o intertravamento do CLP avalie em tempo $O(1)$ se dois atuadores estão diretamente interligados.
2. `adj_pesos`: Armazena os comprimentos físicos reais em metros ($L_{ij}$), utilizando a convenção analítica padronizada em teoria dos grafos:
   $$W[i, j] = \begin{cases} 0.0, & \text{se } i = j \text{ (mesmo nó)} \\ L_{ij}, & \text{se } (v_i, v_j) \in E \\ \infty, & \text{se } (v_i, v_j) \notin E \end{cases}$$
   Essa convenção é estritamente necessária para que algoritmos de caminho mínimo (como Dijkstra) não interpretem ausência de conexão direta como custo zero.

---

### 2.5. Grafos Simples versus Multigrafos na Linha de Processamento

Na engenharia de controle, sistemas que demandam segurança aumentada ou contingência frequentemente incorporam **linhas paralelas redundancy**.

Se a linha de sopro da Categoria C possuísse dois bocais independentes em paralelo acionados por duas solenoides distintas (`FY-603A` e `FY-603B`), existiriam duas arestas orientadas com mesma origem e mesmo destino:
$$e_{9A} = (\text{EJE-603}, \text{CALHA-603}) \quad \text{e} \quad e_{9B} = (\text{EJE-603}, \text{CALHA-603})$$

Nesse cenário, a rede passa formalmente a ser um **Multigrafo Dirigido**. Uma matriz de adjacência simples $n \times n$ é incapaz de representar multigrafos diretamente, pois cada célula $[i, j]$ armazena apenas um único escalar. Para acomodar multigrafos sem perda de informação, adota-se:
* Uma matriz de adjacência multivariada onde cada elemento $[i, j]$ é uma lista de tuplas contendo `(peso, tag_valvula, id_aresta)`;
* Ou a **Matriz de Incidência Vértice-Aresta** $B \in \mathbb{R}^{n \times m}$, que trata naturalmente arestas paralelas, alocando simplesmente uma nova coluna para cada duto adicional.

---

## 3. Catálogo Topológico Completo da Planta de Classificação

### 3.1. Tabela Detalhada de Vértices (Equipamentos e Instrumentação ISA-5.1)

| ID | Vértice | Função Física e Operacional | Instrumentos Associados (ISA-5.1) | Grandezas e Variáveis Lógicas |
| :---: | :--- | :--- | :--- | :--- |
| $v_1$ | `FN-101_Recepcao` | Funil receptor de descarga da matéria-prima | `LIT-101` (Nível Ultrassônico) | Nível contínuo (%), `p_NB101`, `p_NA101`, `p_NC101` |
| $v_2$ | `ALIM-101_Calha` | Calha vibratória dosadora de grãos | `c_ALIM` (Inversor/PWM de vibração) | Frequência de oscilação (Hz), comando ativo |
| $v_3$ | `EST-201_Entrada` | Cabeceira motora de tracionamento da esteira | `CV-201`, `c_EST`, `JI-201`, `ST-201` | Corrente (A), velocidade (m/s), status `p_JI201` |
| $v_4$ | `BAL-301_Pesagem` | Seção de pesagem dinâmica contínua | `WT-301`, `FT-301` | Célula de carga (kg), vazão calculada (kg/h) |
| $v_5$ | `VIS-401_Inspecao` | Câmara estroboscópica de inspeção óptica | `XS-401`, `KSA-401`, `CV-101`..`CV-109` | Pulso trigger óptico, status da câmera |
| $v_6$ | `DIV-501_Decisao` | Bloco decisional e shift register do CLP | `KXA-501`, `KXA-502`, `KXA-503` | Proposições `p_A`, `p_B`, `p_C`, temporização |
| $v_7$ | `EJE-602_EstacaoB` | Bocal eletropneumático de separação B | `FY-602`, `ZSH-602`, `PT-601`, `PAL-601` | Pulso solenoide, fim de curso indutivo |
| $v_8$ | `EJE-603_EstacaoC` | Bocal eletropneumático de rejeição C | `FY-603`, `ZSH-601`, `PT-601`, `PAL-601` | Pulso solenoide, fim de curso indutivo |
| $v_9$ | `CALHA-602_Secundario`| Calha inclinada de escoamento de grãos B | `Duto Gravitacional com Revestimento` | Condução sem acúmulo de produto secundário |
| $v_{10}$ | `CALHA-603_Rejeito` | Calha inclinada de escoamento de descarte C | `Duto Gravitacional Antiabrasivo` | Condução contínua de impurezas e grãos danificados |
| $v_{11}$ | `CALHA-701_Terminal` | Rampa de descarregamento terminal por gravidade| `Bocal Amortecedor de Queda` | Direcionamento suave de grãos nobres sem quebra |
| $v_{12}$ | `SILO-701_Aprovados` | Silo de estocagem final de grãos Categoria A | `LIT-701` (Radar/Ultrassônico) | Nível contínuo (%), alarmes `p_NA701`, `p_NC701` |
| $v_{13}$ | `SILO-702_Secundario`| Silo de estocagem de grãos Categoria B | `LIT-702` (Radar/Ultrassônico) | Nível contínuo (%), alarmes `p_NA702`, `p_NC702` |
| $v_{14}$ | `SILO-703_Rejeito` | Silo/caçamba de rejeito e impurezas Cat. C | `LIT-703` (Ultrassônico/Chave Nível) | Nível contínuo (%), alarmes `p_NA703`, `p_NC703` |

---

### 3.2. Tabela Detalhada de Arestas (Trechos de Transporte, Calhas e Sopro)

| Aresta | Origem ($u$) | Destino ($v$) | Meio Físico | Comprimento $L\text{ [m]}$ | Atuador / Válvula ISA | Instrumento / Monitoramento |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| $e_1$ | `FN-101_Recepcao` | `ALIM-101_Calha` | Duto vertical de carga | 1.2 | `XV-101` (Comporta Guilhotina) | `LIT-101` (Nível Funil) |
| $e_2$ | `ALIM-101_Calha` | `EST-201_Entrada` | Calha vibratória | 1.8 | `c_ALIM` (Driver Vibratório) | Vibração contínua |
| $e_3$ | `EST-201_Entrada` | `BAL-301_Pesagem` | Correia transportadora | 2.5 | `c_EST` (Inversor do Motor) | `ST-201` (Encoder Velocidade) |
| $e_4$ | `BAL-301_Pesagem` | `VIS-401_Inspecao` | Correia transportadora | 3.0 | `c_EST` (Tracionamento Motor) | `WT-301` / `FT-301` (Massa) |
| $e_5$ | `VIS-401_Inspecao` | `DIV-501_Decisao` | Correia transportadora | 1.0 | `Sincronismo de Varredura` | `XS-401` / `KSA-401` (Trigger) |
| $e_6$ | `DIV-501_Decisao` | `EJE-602_EstacaoB` | Correia sincronizada | 2.0 | `Shift Register de Posição` | `ZC-602` (`p_POS602`) |
| $e_7$ | `EJE-602_EstacaoB` | `CALHA-602_Secundario`| Jato pneumático rápido | 0.8 | `FY-602` (Solenoide Rápida) | `ZSH-602` (Sensor Magnético) |
| $e_8$ | `EJE-602_EstacaoB` | `EJE-603_EstacaoC` | Correia contínua | 1.5 | `Tracionamento Linear` | `ST-201` (Rastreamento Posição) |
| $e_9$ | `EJE-603_EstacaoC` | `CALHA-603_Rejeito` | Jato pneumático rápido | 0.8 | `FY-603` (Solenoide Rápida) | `ZSH-601` (Sensor Magnético) |
| $e_{10}$ | `EJE-603_EstacaoC` | `CALHA-701_Terminal` | Correia final livre | 2.2 | `Descarga por Inércia` | Deslocamento terminal |
| $e_{11}$ | `CALHA-701_Terminal` | `SILO-701_Aprovados` | Duto tubular inclinado | 3.5 | `XV-701` (Válvula de Bloqueio) | `LIT-701` (Nível Silo A) |
| $e_{12}$ | `CALHA-602_Secundario`| `SILO-702_Secundario`| Duto tubular inclinado | 4.0 | `XV-702` (Válvula de Bloqueio) | `LIT-702` (Nível Silo B) |
| $e_{13}$ | `CALHA-603_Rejeito` | `SILO-703_Rejeito` | Duto de descarte | 3.2 | `XV-703` (Válvula de Bloqueio) | `LIT-703` (Nível Silo C) |
| $e_{14}$ | `SILO-702_Secundario`| `FN-101_Recepcao` | Elevador de canecas/reciclo| 12.0 | `XV-104` (Comporta de Reteste) | Rosca dosadora de reciclo |

---

## 4. Exemplos Resolvidos Passo a Passo

### Exemplo 1: Verificação da Soma dos Graus e Balanço de Entradas e Saídas

**Enunciado:**  
Calcule o somatório dos graus de entrada $\sum \deg^-(v)$ e dos graus de saída $\sum \deg^+(v)$ para a malha da planta de classificação de grãos considerando a tabela topológica. Demonstre que a condição do Lema do Aperto de Mãos Dirigido é rigorosamente satisfeita e interprete fisicamente os nós cujo grau de saída excede o grau de entrada.

**Resolução:**

1. Somatório dos Graus de Saída ($\deg^+$):
   $$\sum_{i=1}^{14} \deg^+(v_i) = \deg^+(v_1) + \deg^+(v_2) + \dots + \deg^+(v_{14})$$
   $$\sum_{i=1}^{14} \deg^+(v_i) = 1 + 1 + 1 + 1 + 1 + 1 + 2 + 2 + 1 + 1 + 1 + 0 + 1 + 0 = 14$$

2. Somatório dos Graus de Entrada ($\deg^-$):
   $$\sum_{i=1}^{14} \deg^-(v_i) = \deg^-(v_1) + \deg^-(v_2) + \dots + \deg^-(v_{14})$$
   $$\sum_{i=1}^{14} \deg^-(v_i) = 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = 14$$

3. Como $\sum \deg^+(v_i) = \sum \deg^-(v_i) = 14 = |E|$, o lema está perfeitamente satisfeito.

4. **Interpretação Física:**
   Os nós $v_7$ (`EJE-602_EstacaoB`) e $v_8$ (`EJE-603_EstacaoC`) apresentam $\deg^+(v) = 2$ com $\deg^-(v) = 1$. Fisicamente, estes são os **pontos de decisão atuada da esteira**:
   * Em `EJE-602`, um grão que chega pode ser desviado lateralmente pelo jato da válvula `FY-602` para a calha do Silo B ($e_7$), ou prosseguir sobre a esteira em direção a `EJE-603` ($e_8$).
   * Em `EJE-603`, um grão não desviado em B pode ser ejetado pela válvula `FY-603` para a calha de rejeito ($e_9$), ou continuar na esteira até a calha terminal A ($e_{10}$).

---

### Exemplo 2: Cálculo da Distância Física e Atraso de Propagação do Grão Nobre

**Enunciado:**  
Calcule a distância física total percorrida por um grão classificado como **Categoria A (Nobre)** desde o instante em que é detectado no túnel de inspeção (`VIS-401`) até o depósito seguro no silo receptor `SILO-701`. Sabendo que a esteira opera a uma velocidade constante $v_{\text{esteira}} = 1{,}5\text{ m/s}$ e que a descida pela calha terminal $e_{11}$ tem velocidade média gravitacional de $2{,}0\text{ m/s}$, determine o tempo total de trânsito.

**Resolução:**

1. O caminho para o grão da Categoria A a partir de `VIS-401` é:
   $$\mathcal{P}_{\text{A, parcial}} = (\text{VIS-401} \xrightarrow{e_5} \text{DIV-501} \xrightarrow{e_6} \text{EJE-602} \xrightarrow{e_8} \text{EJE-603} \xrightarrow{e_{10}} \text{CALHA-701} \xrightarrow{e_{11}} \text{SILO-701})$$

2. Distância total ($D_{\text{total}}$):
   $$D_{\text{total}} = w(e_5) + w(e_6) + w(e_8) + w(e_{10}) + w(e_{11})$$
   $$D_{\text{total}} = 1{,}0\text{ m} + 2{,}0\text{ m} + 1{,}5\text{ m} + 2{,}2\text{ m} + 3{,}5\text{ m} = 10{,}2\text{ m}$$

3. Tempo de percurso sobre a esteira transportadora ($e_5, e_6, e_8, e_{10}$):
   $$D_{\text{esteira}} = 1{,}0 + 2{,}0 + 1{,}5 + 2{,}2 = 6{,}7\text{ m}$$
   $$\tau_{\text{esteira}} = \frac{6{,}7\text{ m}}{1{,}5\text{ m/s}} \approx 4{,}467\text{ s}$$

4. Tempo de descida no duto gravitacional terminal ($e_{11}$):
   $$\tau_{\text{calha}} = \frac{3{,}5\text{ m}}{2{,}0\text{ m/s}} = 1{,}750\text{ s}$$

5. Tempo de trânsito total:
   $$\tau_{\text{total}} = 4{,}467\text{ s} + 1{,}750\text{ s} = 6{,}217\text{ s}$$

Esse cálculo analítico é diretamente utilizado pelo CLP para estimar o atraso do sinóptico SCADA e calibrar a resposta dos alarmes de nível contínuo do silo `LIT-701`.

---

## 5. Atividades de Investigação e Desafios de Engenharia

1. **Investigação da Paridade no Dígrafo:**  
   Prove analiticamente que é matematicamente impossível construir uma malha física de transporte contínuo onde exista exatamente um vértice com grau de saída ímpar e todos os demais vértices possuam grau de saída par, se a soma de todos os graus de entrada for par.  
   *Discussão:* Aplique a equivalência do Lema do Aperto de Mãos Dirigido: $\sum_{v} \deg^+(v) = \sum_{v} \deg^-(v)$. Se o membro direito é par, o membro esquerdo deve ser estritamente par. A soma de $n-1$ números pares com exatamente um número ímpar resulta invariavelmente em um número ímpar, gerando uma contradição lógica formal.

2. **Impacto de Linha Dupla de Ejeção (Multigrafo):**  
   Considere que a equipe de mecânica instalou um segundo bocal de ar comprimido em paralelo na estação `EJE-602` para aumentar a confiabilidade de ejeção de grãos secundários volumosos. Explique por que a matriz de adjacência clássica $A \in \{0, 1\}^{n \times n}$ colapsa perante esse projeto e como o modelo orientado a objetos da classe `GrafoTubulacao` deve ser estendido para suportar múltiplos arcos paralelos.

3. **Análise de Caminhos Disjuntos de Descarte:**  
   Identifique se existem caminhos com arestas disjuntas entre o ponto de descarregamento `FN-101` e a caçamba de rejeitos `SILO-703`. Explique a importância dessa propriedade para garantir que grãos reprovados pela visão nunca contaminem os silos de produtos nobres por erro de comutação.

4. **Remoção da Linha de Reciclo e Ciclicidade:**  
   Se a linha de reciclo $e_{14}$ for desativada (comporta $XV-104$ fechada permanentemente), o grafo da planta passa a ser um **Grafo Acíclico Dirigido (DAG)**? Discuta as propriedades algorítmicas de um DAG (como a existência de ordenação topológica) e como isso viabiliza a execução linear sem risco de *deadlocks* no escalonador de tarefas do CLP.

5. **Falha de Pressão Pneumática no Ejetor B:**  
   Se a variável `p_PAL601` sinalizar baixa pressão na estação `EJE-602`, a válvula `FY-602` é bloqueada por intertravamento. Determine formalmente quais arcos do grafo devem ter seus pesos definidos como $\infty$ e qual é o novo destino forçado dos grãos da Categoria B caso o alimentador vibratório não seja interrompido imediatamente.

---

## 6. Entregável da Aula 11

* **Classe Python `GrafoTubulacao`:** Implementação estruturada orientada a objetos desenvolvida no Jupyter Notebook correspondente (`11 - Modelagem da Tubulacao e Instrumentos como Grafo.ipynb`), contendo:
  1. Suporte a metadados de tags ISA-5.1 para equipamentos e válvulas de bloqueio;
  2. Geração da matriz de adjacência binária e ponderada;
  3. Cálculo automatizado e tabulação dos graus de entrada ($\deg^-$) e saída ($\deg^+$);
  4. Teste de asserção do Lema do Aperto de Mãos Dirigido.
