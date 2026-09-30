# Aula 12: Matrizes de Incidência, Adjacência e Balanço de Massa Matricial

**Projeto:** SCADA-Core Automática — GRUPO 4  
**Unidade Fabril:** Linha Automatizada de Seleção, Pesagem Dinâmica e Classificação Óptica de Grãos com Separação Pneumática Tripla  
**Referência Normativa:** ISA-5.1 & Formulação Algébrica de Balanços em Grafos Dirigidos  

---

## 1. Fundamentos Matemáticos: A Matriz de Incidência Vértice-Aresta ($B$)

Enquanto a **Matriz de Adjacência** descreve a relação direta nó-a-nó ($V \times V$), a **Matriz de Incidência Vértice-Aresta** expressa a conectividade estrutural fundamental entre os equipamentos e os canais de condução física ($V \times E$).

Seja o dígrafo da planta $G = (V, E)$ com $|V| = n = 14$ vértices e $|E| = m = 14$ trechos de condução física e reciclo. A matriz de incidência orientada $B \in \{-1, 0, +1\}^{n \times m}$ é formalmente definida por:

$$B[i, j] = \begin{cases} -1, & \text{se a aresta } e_j \text{ parte do nó } v_i \text{ (origem/saída)} \\ +1, & \text{se a aresta } e_j \text{ chega ao nó } v_i \text{ (destino/entrada)} \\ 0, & \text{se o nó } v_i \text{ não incide na aresta } e_j \end{cases}$$

### Propriedades Formais Fundamentais:

1. **Soma por Coluna Estritamente Nula:**  
   Para toda aresta dirigida $e_j \in E$:
   $$\sum_{i=1}^n B[i, j] = 0 \quad (\forall j \in \{1, 2, \dots, m\})$$
   *Justificativa analítica:* Cada segmento físico $e_j = (u, v)$ possui exatamente uma origem $u$ (gerando a entrada $-1$ na linha correspondente a $u$) e exatamente um destino $v$ (gerando $+1$ na linha de $v$). Como todas as outras $n-2$ linhas recebem $0$, a soma dos coeficientes da coluna é invariavelmente $(-1) + (+1) = 0$.

2. **Equação Matricial de Balanço e Conservação em Regime Permanente:**  
   $$B \cdot \vec{Q} = \vec{S}$$
   Onde:
   * $\vec{Q} = [Q_1, Q_2, \dots, Q_m]^T \in \mathbb{R}^m$ é o vetor que quantifica as **taxas de fluxo mássico** em cada trecho $e_k$ (expresso em $\text{kg/h}$ de grãos, obtido em tempo real através da integração entre a célula de carga `WT-301` e o encoder `ST-201`, gerando a tag `FT-301`);
   * $\vec{S} = [S_1, S_2, \dots, S_n]^T \in \mathbb{R}^n$ é o vetor de **injeções/extrações externas líquidas** nos nós da planta:
     * $S_i < 0$: Nó **fonte de matéria-prima** (descarregamento externo de grãos no funil `FN-101`);
     * $S_i = 0$: Nó de **trânsito ou separação em regime permanente** (sem acúmulo de massa interna);
     * $S_i > 0$: Nó **sumidouro de estocagem** (acúmulo líquido de produto nos silos coletores `SILO-701`, `SILO-702` e `SILO-703`).

---

## 2. Aprofundamento Teórico

### 2.1. Interpretação Física: Conservação de Massa e a 1ª Lei de Kirchhoff Generalizada

A equação $B \cdot \vec{Q} = \vec{S}$ representa a aplicação discreta do **Princípio de Conservação da Massa** (Teorema de Transporte de Reynolds em regime permanente para redes discretizadas).

Ao expandirmos a $i$-ésima linha do produto matricial:
$$(B \cdot \vec{Q})_i = \sum_{j=1}^m B[i, j] \cdot Q_j = \sum_{e_j \text{ entra em } v_i} Q_j - \sum_{e_j \text{ sai de } v_i} Q_j = S_i$$

Para qualquer equipamento intermediário que não seja um reservatório com acúmulo líquido (como a calha vibratória `ALIM-101`, a mesa de pesagem `BAL-301`, ou os blocos de desvio `EJE-602` e `EJE-603`):
$$S_i = 0 \iff \sum Q_{\text{entrada}} = \sum Q_{\text{saída}}$$

Essa relação é a versão para escoamento granular sólido da **Primeira Lei de Kirchhoff** (conservação de corrente em nós elétricos), demonstrando a universalidade dos métodos topológicos em sistemas de controle de processos.

---

### 2.2. Comparação Matricial Rigorosa: Incidência ($B$) versus Adjacência ($A$)

| Critério de Engenharia | Matriz de Incidência $B$ | Matriz de Adjacência $A$ (ou $W$) |
| :--- | :--- | :--- |
| **Dimensão Algébrica** | $n \times m$ (Vértices $\times$ Arestas) | $n \times n$ (Vértices $\times$ Vértices) |
| **Domínio dos Elementos** | $\{-1, 0, +1\}$ (Estrutural puro) | $\{0, 1\}$ (binária) ou $\mathbb{R}^+ \cup \{\infty\}$ (pesos) |
| **Espaço Vetorial Associado**| Mapeia o espaço de fluxos $\mathbb{R}^m$ no espaço de nós $\mathbb{R}^n$ | Operador linear sobre o próprio espaço de nós $\mathbb{R}^n$ |
| **Tratamento de Multigrafos** | Imediato: cada canal paralelo adiciona uma nova coluna | Complexo: requer estruturas aninhadas ou tensores |
| **Aplicação Típica no SCADA** | Balanço de massa, detecção de vazamentos/transbordos e ciclos | Algoritmos de busca (BFS/DFS) e menor caminho (Dijkstra) |
| **Operação Algébrica Fundamental** | $L = B B^T$ (Matriz Laplaciana da planta) | $A^k$ revela número de passeios de comprimento $k$ |

---

### 2.3. A Matriz Laplaciana ($L = B B^T$) e a Topologia Espectral da Malha

A conexão algébrica entre a matriz de incidência e a conectividade física da planta é dada pelo produto matricial:

$$L = B \cdot B^T \in \mathbb{Z}^{n \times n}$$

Considerando o grafo não-dirigido subjacente, o **Laplaciano** $L$ satisfaz:
$$L[i, j] = \begin{cases} \deg(v_i), & \text{se } i = j \\ -a_{ij}, & \text{se } i \neq j \text{ e } (v_i, v_j) \in E \\ 0, & \text{caso contrário} \end{cases}$$

Onde $\deg(v_i) = \deg^-(v_i) + \deg^+(v_i)$ e $a_{ij}$ é o número de conexões não-dirigidas entre $v_i$ e $v_j$.

#### Propriedades Espectrais Relevantes para Automação:
1. **Conservação Nula:** Todas as linhas e colunas de $L$ somam $0$, isto é, $L \cdot \vec{1} = \vec{0}$.
2. **Autovalores:** Os autovalores de $L$ são todos reais e não-negativos: $0 = \lambda_1 \leq \lambda_2 \leq \dots \leq \lambda_n$.
3. **Conectividade Algébrica (Autovalor de Fiedler $\lambda_2$):**  
   O segundo menor autovalor $\lambda_2$ é estritamente maior que zero ($\lambda_2 > 0$) se, e somente se, a planta é conexa. O valor de $\lambda_2$ quantifica a robustez da malha fabril contra gargalos operacionais e perda de sincronismo de transporte.

---

### 2.4. Posto da Matriz de Incidência e o Espaço de Ciclos de Kirchhoff

Para um grafo conexo de $n$ vértices e $m$ arestas:
1. **Posto da Matriz de Incidência ($\text{rank}(B)$):**  
   $$\text{rank}(B) = n - c$$
   Onde $c$ é o número de componentes conexas da rede. Para a planta com operação unificada ($c = 1$):
   $$\text{rank}(B) = 14 - 1 = 13$$

2. **Dimensão do Espaço de Ciclos (Núcleo / *Null Space* de $B$):**  
   Pelo Teorema do Núcleo e da Imagem (Rank-Nullity Theorem):
   $$\dim(\ker(B)) = m - \text{rank}(B) = m - (n - 1) = m - n + 1$$
   Para a nossa planta com o circuito de reciclo de grãos secundários ($n = 14, m = 14$):
   $$\dim(\ker(B)) = 14 - 14 + 1 = 1$$

Esse valor confirma teoricamente que a rede possui exatamente **1 ciclo independente fundamental**, correspondente à malha fechada de recirculação:
$$\text{Ciclo} = (\text{FN-101} \rightarrow \text{ALIM-101} \rightarrow \text{EST-201} \rightarrow \text{BAL-301} \rightarrow \text{VIS-401} \rightarrow \text{DIV-501} \rightarrow \text{EJE-602} \rightarrow \text{CALHA-602} \rightarrow \text{SILO-702} \rightarrow \text{FN-101})$$

Se a linha de reciclo $e_{14}$ for desativada, $m = 13$, resultando em $\dim(\ker(B)) = 13 - 14 + 1 = 0$, o que comprova analiticamente a transformação da planta em um **Grafo Acíclico Dirigido (DAG)**.

---

### 2.5. Equacionamento do Balanço de Massa Granular Operacional

Em regime permanente nominal, a planta recebe da moega de recepção uma vazão contínua $Q_{\text{in}} = 1200{,}0\text{ kg/h}$ de grãos brutos (arroz).

Os dados históricos de classificação estatística do módulo de visão computacional (`VIS-401` com `CV-101` a `CV-109`) apontam a seguinte distribuição mássica:
* **Categoria A (Grãos Nobres Aprovados - `KXA-501`):** $75\%$ da carga $\rightarrow Q_A = 0{,}75 \times 1200 = 900{,}0\text{ kg/h}$
* **Categoria B (Grãos Comerciais Secundários - `KXA-502`):** $15\%$ da carga $\rightarrow Q_B = 0{,}15 \times 1200 = 180{,}0\text{ kg/h}$
* **Categoria C (Rejeito / Impurezas / Pragas - `KXA-503`):** $10\%$ da carga $\rightarrow Q_C = 0{,}10 \times 1200 = 120{,}0\text{ kg/h}$

#### Vetor de Vazões por Trecho ($\vec{Q} \in \mathbb{R}^{14}$):
* $Q(e_1) = 1200{,}0\text{ kg/h}$ (Duto Funil $\rightarrow$ Calha vibratória)
* $Q(e_2) = 1200{,}0\text{ kg/h}$ (Calha vibratória $\rightarrow$ Cabeceira da esteira)
* $Q(e_3) = 1200{,}0\text{ kg/h}$ (Esteira entrada $\rightarrow$ Balança dinâmica `WT-301`)
* $Q(e_4) = 1200{,}0\text{ kg/h}$ (Balança dinâmica $\rightarrow$ Túnel de visão `VIS-401`)
* $Q(e_5) = 1200{,}0\text{ kg/h}$ (Túnel de visão $\rightarrow$ Bloco de decisão `DIV-501`)
* $Q(e_6) = 1200{,}0\text{ kg/h}$ (Bloco de decisão $\rightarrow$ Bocal de ejeção `EJE-602`)
* $Q(e_7) = 180{,}0\text{ kg/h}$ (Sopro de desvio pneumático da Categoria B `FY-602`)
* $Q(e_8) = Q(e_6) - Q(e_7) = 1200{,}0 - 180{,}0 = 1020{,}0\text{ kg/h}$ (Continuidade na esteira até `EJE-603`)
* $Q(e_9) = 120{,}0\text{ kg/h}$ (Sopro de desvio pneumático da Categoria C `FY-603`)
* $Q(e_{10}) = Q(e_8) - Q(e_9) = 1020{,}0 - 120{,}0 = 900{,}0\text{ kg/h}$ (Fluxo final de grãos nobres na esteira)
* $Q(e_{11}) = 900{,}0\text{ kg/h}$ (Duto gravitacional terminal $\rightarrow$ Silo A `SILO-701`)
* $Q(e_{12}) = 180{,}0\text{ kg/h}$ (Calha inclinada B $\rightarrow$ Silo B `SILO-702`)
* $Q(e_{13}) = 120{,}0\text{ kg/h}$ (Calha de descarte C $\rightarrow$ Caçamba de Rejeito C `SILO-703`)
* $Q(e_{14}) = 0{,}0\text{ kg/h}$ (Elevador de reciclo em repouso durante expedição normal)

#### Resolução do Sistema Linear $B \cdot \vec{Q} = \vec{S}$:
Multiplicando $B$ por $\vec{Q}$, obtemos o vetor de balanço líquido nos nós:
* $S_1$ (`FN-101`): $-Q(e_1) + Q(e_{14}) = -1200{,}0 + 0{,}0 = \mathbf{-1200{,}0\text{ kg/h}}$ (Alimentação externa líquida)
* $S_2$ (`ALIM-101`): $+Q(e_1) - Q(e_2) = 1200 - 1200 = \mathbf{0{,}0\text{ kg/h}}$
* $S_3$ (`EST-201`): $+Q(e_2) - Q(e_3) = 1200 - 1200 = \mathbf{0{,}0\text{ kg/h}}$
* $S_4$ (`BAL-301`): $+Q(e_3) - Q(e_4) = 1200 - 1200 = \mathbf{0{,}0\text{ kg/h}}$
* $S_5$ (`VIS-401`): $+Q(e_4) - Q(e_5) = 1200 - 1200 = \mathbf{0{,}0\text{ kg/h}}$
* $S_6$ (`DIV-501`): $+Q(e_5) - Q(e_6) = 1200 - 1200 = \mathbf{0{,}0\text{ kg/h}}$
* $S_7$ (`EJE-602`): $+Q(e_6) - Q(e_7) - Q(e_8) = 1200 - 180 - 1020 = \mathbf{0{,}0\text{ kg/h}}$ (Balanço exato no nó bifurcador B!)
* $S_8$ (`EJE-603`): $+Q(e_8) - Q(e_9) - Q(e_{10}) = 1020 - 120 - 900 = \mathbf{0{,}0\text{ kg/h}}$ (Balanço exato no nó bifurcador C!)
* $S_9$ (`CALHA-602`): $+Q(e_7) - Q(e_{12}) = 180 - 180 = \mathbf{0{,}0\text{ kg/h}}$
* $S_{10}$ (`CALHA-603`): $+Q(e_9) - Q(e_{13}) = 120 - 120 = \mathbf{0{,}0\text{ kg/h}}$
* $S_{11}$ (`CALHA-701`): $+Q(e_{10}) - Q(e_{11}) = 900 - 900 = \mathbf{0{,}0\text{ kg/h}}$
* $S_{12}$ (`SILO-701`): $+Q(e_{11}) = \mathbf{+900{,}0\text{ kg/h}}$ (Taxa líquida de enchimento do Silo A)
* $S_{13}$ (`SILO-702`): $+Q(e_{12}) - Q(e_{14}) = 180 - 0 = \mathbf{+180{,}0\text{ kg/h}}$ (Taxa líquida de enchimento do Silo B)
* $S_{14}$ (`SILO-703`): $+Q(e_{13}) = \mathbf{+120{,}0\text{ kg/h}}$ (Taxa líquida de enchimento da Caçamba C)

**Conservação Global do Sistema Fechado:**
$$\sum_{i=1}^{14} S_i = -1200{,}0 + 0 + \dots + 900{,}0 + 180{,}0 + 120{,}0 = 0{,}0\text{ kg/h}$$

A conservação global estrita atesta a consistência do modelo matemático frente à física do processo industrial.

---

## 3. Exemplo Resolvido Passo a Passo

### Verificação Manual das Colunas do Bocal Bifurcador `EJE-602`

**Enunciado:**  
Considere as arestas $e_6$ (alimentação da estação B), $e_7$ (jato de sopro pneumático para Calha B) e $e_8$ (continuidade do transporte na esteira em direção à estação C).  
1. Monte as colunas correspondentes na Matriz de Incidência $B \in \{-1, 0, +1\}^{14 \times 14}$.
2. Verifique a propriedade de soma nula por coluna.
3. Demonstre por que a linha do equipamento `EJE-602` apresenta balanço nulo sob o vetor de vazão operacional $\vec{Q}$.

**Resolução:**

1. **Montagem das Colunas:**
   * Aresta $e_6 = (\text{DIV-501}, \text{EJE-602})$:
     * Linha `DIV-501` ($i = 6$): $-1$
     * Linha `EJE-602` ($i = 7$): $+1$
     * Demais 12 linhas: $0$
   * Aresta $e_7 = (\text{EJE-602}, \text{CALHA-602})$:
     * Linha `EJE-602` ($i = 7$): $-1$
     * Linha `CALHA-602` ($i = 9$): $+1$
     * Demais 12 linhas: $0$
   * Aresta $e_8 = (\text{EJE-602}, \text{EJE-603})$:
     * Linha `EJE-602` ($i = 7$): $-1$
     * Linha `EJE-603` ($i = 8$): $+1$
     * Demais 12 linhas: $0$

2. **Verificação da Soma por Coluna:**
   * Para $e_6$: $\sum_{i=1}^{14} B[i, 6] = (-1) + (+1) = 0$ ✓
   * Para $e_7$: $\sum_{i=1}^{14} B[i, 7] = (-1) + (+1) = 0$ ✓
   * Para $e_8$: $\sum_{i=1}^{14} B[i, 8] = (-1) + (+1) = 0$ ✓

3. **Cálculo da Linha $i = 7$ (`EJE-602`) no Produto $B \cdot \vec{Q}$:**
   Avaliando todas as entradas não-nulas da linha 7:
   $$B[7, 6] = +1 \quad (\text{aresta } e_6 \text{ entra})$$
   $$B[7, 7] = -1 \quad (\text{aresta } e_7 \text{ sai})$$
   $$B[7, 8] = -1 \quad (\text{aresta } e_8 \text{ sai})$$
   Todas as demais entradas da linha 7 são zero.

   Calculando o produto interno com o vetor $\vec{Q}$:
   $$S_7 = \sum_{j=1}^{14} B[7, j] \cdot Q_j = B[7, 6] \cdot Q_6 + B[7, 7] \cdot Q_7 + B[7, 8] \cdot Q_8$$
   $$S_7 = (+1) \cdot (1200{,}0) + (-1) \cdot (180{,}0) + (-1) \cdot (1020{,}0)$$
   $$S_7 = 1200{,}0 - 180{,}0 - 1020{,}0 = 0{,}0\text{ kg/h}$$

O resultado $S_7 = 0{,}0\text{ kg/h}$ comprova formalmente que não há acúmulo nem perda mássica na zona do ejetor, satisfazendo plenamente a condição de regime permanente.

---

## 4. Atividades de Investigação e Desafios de Engenharia

1. **Simulação de Obstrução Mecânica na Calha B:**  
   Suponha que a calha gravitacional $e_{12}$ sofra entupimento por umidade excessiva nos grãos e a vazão medida caia subitamente para $Q(e_{12}) = 80{,}0\text{ kg/h}$, enquanto a válvula solenoide `FY-602` continua ejetando $Q(e_7) = 180{,}0\text{ kg/h}$.  
   * Calcule o novo valor de $S_9$ no nó `CALHA-602`.  
   * O que o sinal de $S_9 > 0$ expressa no SCADA? Como o algoritmo do CLP deve utilizar essa violação do sistema $B \cdot \vec{Q} = 0$ para disparar um alarme preditivo de transbordo antes que o grão invada a mecânica da esteira?

2. **Dedução Formal da Matriz Laplaciana:**  
   Mostre analiticamente que, para qualquer grafo orientado sem auto-laços, o produto $B B^T$ independe da orientação arbitrária escolhida para as arestas (isto é, trocar a direção de $e_k$ substituindo $+1$ por $-1$ e vice-versa mantém o produto $B B^T$ inalterado). Relacione essa invariância com a matriz Laplaciana clássica $L = D - A_u$.

3. **Cálculo de Ciclos Fundamentais sob Recirculação Dupla:**  
   Se além da linha de reciclo de grãos comerciais $e_{14}$ for instalada uma segunda linha de retorno $e_{15}$ ligando a caçamba de rejeito `SILO-703` de volta ao funil de entrada `FN-101` (para retalhar impurezas ou reprocessamento especial):  
   * Qual passa a ser a nova dimensão do espaço de ciclos $\dim(\ker(B))$?  
   * Enuncie uma base ortogonal para o espaço de ciclos resultante.

4. **Detecção de Vazamento de Grãos por Balanço Matricial:**  
   A balança dinâmica `WT-301` mede uma vazão instantânea de $1200{,}0\text{ kg/h}$ no nó `BAL-301`. Contudo, os transmissores de nível dos três silos reportam taxas de acúmulo equivalentes a: $S_{12} = 850\text{ kg/h}$ (Silo A), $S_{13} = 170\text{ kg/h}$ (Silo B) e $S_{14} = 110\text{ kg/h}$ (Silo C).  
   * Calcule o erro residual do balanço global $\Delta = \sum S_{\text{silos}} - Q_{\text{balança}}$.  
   * Como a matriz de incidência localiza o trecho em que ocorreu perda de material (por exemplo, derramamento na correia ou falha na comporta)?

5. **Comparação de Desempenho entre Dijkstra e Floyd-Warshall:**  
   Para uma malha industrial com $n = 14$ e $m = 14$, avalie o custo computacional de pré-computar a distância mínima entre todos os pares de equipamentos executando $n$ vezes o algoritmo de Dijkstra versus uma única execução da formulação matricial de Floyd-Warshall ($O(n^3)$). Em quais condições de expansão fabril (aumento de $n$) a abordagem por Dijkstra com fila de prioridade binária ($O(n \cdot m \log n)$) passa a ser estritamente superior?

---

## 5. Entregável da Aula 12

* **Motor Matricial de Balanço e Validação Topológica em Python:** Desenvolvido no Jupyter Notebook correspondente (`12 - Matrizes de Incidencia Adjacencia e Custos.ipynb`), implementando:
  1. A classe `CalculadorIncidencia` com o método estático `construir_matriz_incidencia` para geração automática de $B \in \{-1, 0, 1\}^{n \times m}$;
  2. Validação automática via asserções da soma de coeficientes por coluna nula ($\sum_i B[i, j] = 0$);
  3. Resolução do sistema linear $B \cdot \vec{Q} = \vec{S}$ e geração de relatório tabular do balanço líquido de massa em cada nó da planta;
  4. Cálculo do posto da matriz ($\text{rank}(B)$), dimensão do espaço de ciclos e matriz Laplaciana da planta.
