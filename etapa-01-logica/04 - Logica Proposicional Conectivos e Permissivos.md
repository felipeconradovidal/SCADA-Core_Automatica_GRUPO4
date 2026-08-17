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
