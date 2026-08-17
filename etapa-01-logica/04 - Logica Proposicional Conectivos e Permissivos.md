# Aula 04: Lógica Proposicional — Conectivos e Blocos de Permissivos

## 1. Fundamentos Matemáticos: Conectivos Lógicos

Na matemática discreta, uma **proposição** é uma sentença declarativa que assume um e apenas um valor-verdade: **Verdadeiro** ($1$) ou **Falso** ($0$).

As operações sobre variáveis proposicionais são definidas por operadores lógicos fundamentais:
1. **Negação ($\neg A$ ou $\bar{A}$):** Operação unária que complementa a proposição, invertendo seu estado lógico.
2. **Conjunção ($A \land B$):** Operação binária ativada unicamente quando ambos os operandos estão em nível alto ($1$). Em automação, modela condições em **série** (intertravamento e permissivos conjuntos).
3. **Disjunção ($A \lor B$):** Operação binária que resulta em valor verdadeiro se ao menos uma das entradas estiver ativa ($1$). Em automação, modela redundâncias ou condições em **paralelo** (múltiplas causas de falha).
4. **Disjunção Exclusiva ($A \oplus B$):** Operação que produz saída verdadeira quando as entradas possuem estados lógicos distintos.
5. **Implicação / Condicional ($A \rightarrow B$):** Operação que é falsa apenas quando o antecedente é verdadeiro e o consequente é falso. Modela regras operacionais "SE condição $A$, ENTÃO ação $B$".
6. **Bicondicional ($A \leftrightarrow B$):** Operação cuja saída é verdadeira somente quando ambos os operandos possuem o mesmo estado lógico. Modela equivalência de estados operacionais.

---

## 1.2. Tabelas-Verdade dos Operadores Lógicos

Abaixo estão as tabelas-verdade para cada um dos operadores lógicos apresentados em notação booleana/binária ($1$ / $0$).

### Negação ($\neg A$)

| $A$ | $\neg A$ |
| :---: | :---: |
| 1 | 0 |
| 0 | 1 |

---

### Conjunção ($A \land B$)

| $A$ | $B$ | $A \land B$ |
| :---: | :---: | :---: |
| 1 | 1 | 1 |
| 1 | 0 | 0 |
| 0 | 1 | 0 |
| 0 | 0 | 0 |

---

### Disjunção ($A \lor B$)

| $A$ | $B$ | $A \lor B$ |
| :---: | :---: | :---: |
| 1 | 1 | 1 |
| 1 | 0 | 1 |
| 0 | 1 | 1 |
| 0 | 0 | 0 |

---

### Disjunção Exclusiva ($A \oplus B$)

| $A$ | $B$ | $A \oplus B$ |
| :---: | :---: | :---: |
| 1 | 1 | 0 |
| 1 | 0 | 1 |
| 0 | 1 | 1 |
| 0 | 0 | 0 |

---

### Implicação / Condicional ($A \rightarrow B$)

> **Nota:** $A \rightarrow B \equiv \neg A \lor B$

| $A$ | $B$ | $A \rightarrow B$ |
| :---: | :---: | :---: |
| 1 | 1 | 1 |
| 1 | 0 | 0 |
| 0 | 1 | 1 |
| 0 | 0 | 1 |

---

### Bicondicional ($A \leftrightarrow B$)

> **Nota:** $A \leftrightarrow B \equiv (A \rightarrow B) \land (B \rightarrow A)$

| $A$ | $B$ | $A \leftrightarrow B$ |
| :---: | :---: | :---: |
| 1 | 1 | 1 |
| 1 | 0 | 0 |
| 0 | 1 | 0 |
| 0 | 0 | 1 |

## 2. Aplicação em Engenharia: Permissivos de Partida e Intertravamento do Alimentador Vibratório

Na Engenharia de Controle e Automação, o **permissivo de partida** é um conjunto de condições lógicas de segurança e de processo que devem ser integralmente satisfeitas para autorizar o acionamento inicial de um equipamento industrial. Uma vez em operação, essas e outras condições críticas continuam sendo monitoradas continuamente pelo CLP (Controlador Lógico Programável); caso alguma falhe, o **intertravamento de operação (*Run Interlock* / *Trip*)** é comutado, provocando a parada imediata e segura do sistema para evitar acidentes ou danos aos equipamentos.

---

### 2.1. Permissivo do Alimentador Vibratório ($P_{\text{ALIM}}$)

O Alimentador Vibratório é o equipamento responsável pela dosagem controlada e contínua dos grãos na esteira de transporte para posterior inspeção óptica. A partida segura do alimentador depende da liberação geral da planta, da confirmação de que a esteira transportadora está em movimento e da garantia de suprimento de grãos no funil de recepção (evitando a operação a seco).

Para permitir a partida do Alimentador Vibratório, as seguintes condições devem ser satisfeitas simultaneamente:
1. **Permissão Geral de Operação satisfeita** ($c_{\text{PERM}} = 1$): Sem botão de emergência acionado ($\neg p_{\text{EMERG}}$), sem sobrecarga no motor da esteira ($\neg p_{\text{JI201}}$), sem pressão pneumática baixa ($\neg p_{\text{PAL601}}$) e com a câmera de visão computacional pronta ($p_{\text{KSA401}}$).
2. **Esteira em movimento** ($p_{\text{MOV201}} = 1$): Confirmado pela medição de velocidade ($\text{ST-201} > 0$).
3. **Ausência de nível baixo no funil de recepção** ($\neg p_{\text{NB101}} = 1$): Garantido pelo comparador do transmissor de nível ($\text{LIT-101} \ge L_{\text{min}}$).

A expressão lógica formal que define o permissivo do Alimentador Vibratório é expressa por:

$$P_{\text{ALIM}} \equiv (\neg p_{\text{EMERG}} \land \neg p_{\text{JI201}} \land \neg p_{\text{PAL601}} \land p_{\text{KSA401}}) \land p_{\text{MOV201}} \land \neg p_{\text{NB101}}$$

```mermaid
graph TD
    %% Condições de Entrada (Segurança e Processo)
    EMERG[p_EMERG: Emergência Pressionada]
    JI201[p_JI201: Sobrecarga Motor Esteira]
    PAL601[p_PAL601: Pressão Pneumática Baixa]
    KSA401[p_KSA401: Câmera Pronta]
    MOV201[p_MOV201: Esteira em Movimento]
    NB101[p_NB101: Nível Baixo no Funil]

    %% Inversores NOT
    NOT_EMERG[NOT]
    NOT_JI201[NOT]
    NOT_PAL601[NOT]
    NOT_NB101[NOT]

    %% Blocos Lógicos AND
    AND_PERM[AND: c_PERM]
    AND_ALIM[AND]

    %% Saída
    P_ALIM[P_ALIM: Permissivo do Alimentador Vibratório]

    %% Conexões
    EMERG --> NOT_EMERG
    JI201 --> NOT_JI201
    PAL601 --> NOT_PAL601
    NB101 --> NOT_NB101

    NOT_EMERG --> AND_PERM
    NOT_JI201 --> AND_PERM
    NOT_PAL601 --> AND_PERM
    KSA401 --> AND_PERM

    AND_PERM --> AND_ALIM
    MOV201 --> AND_ALIM
    NOT_NB101 --> AND_ALIM

    AND_ALIM --> P_ALIM
