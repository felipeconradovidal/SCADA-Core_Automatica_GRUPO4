# Aula 05: Formas Normais (FND/FNC) e Otimização Booleana

## Lógica Proposicional do Processo — SCADA-Core Automática

## Objetivo

Esta aula apresenta as principais **simplificações da álgebra booleana** e mostra como elas podem ser utilizadas para otimizar as expressões lógicas definidas para o processo de classificação de grãos.

O objetivo é reduzir condições redundantes e tornar as regras mais simples para sua implementação, mantendo exatamente o mesmo comportamento lógico.

---

# Simplificações Lógicas

## Convenção de Notação

| **Símbolo** | **Significado** |
| :--- | :--- |
| `¬A` | Negação de `A` (NÃO) |
| `A ∧ B` | Conjunção (E) |
| `A ∨ B` | Disjunção (OU) |
| `0` | Falso |
| `1` | Verdadeiro |

---

## Leis Básicas da Álgebra Booleana

### Identidade

```text
A ∨ 0 ≡ A
A ∧ 1 ≡ A
```

Remove constantes que não alteram o resultado.

### Dominação

```text
A ∨ 1 ≡ 1
A ∧ 0 ≡ 0
```

Uma condição dominante determina o resultado.

### Idempotência

```text
A ∨ A ≡ A
A ∧ A ≡ A
```

Remove condições repetidas.

### Complemento

```text
A ∨ ¬A ≡ 1
A ∧ ¬A ≡ 0
```

Permite identificar condições sempre verdadeiras ou sempre falsas.

### Dupla Negação

```text
¬(¬A) ≡ A
```

Duas negações se anulam.

### Absorção

```text
A ∨ (A ∧ B) ≡ A
A ∧ (A ∨ B) ≡ A
```

Remove condições que já estão contidas em outra condição.

### Distributividade

```text
A ∧ (B ∨ C) ≡ (A ∧ B) ∨ (A ∧ C)
A ∨ (B ∧ C) ≡ (A ∨ B) ∧ (A ∨ C)
```

Permite reorganizar a expressão e auxiliar na conversão entre FND e FNC.

### De Morgan

```text
¬(A ∧ B) ≡ ¬A ∨ ¬B
¬(A ∨ B) ≡ ¬A ∧ ¬B
```

Permite transformar condições negadas em condições individuais.

---

# Formas Normais

## Forma Normal Disjuntiva — FND

A FND é uma **disjunção de conjunções**:

```text
(A ∧ B) ∨ (C ∧ D)
```

Também é chamada de **Soma de Produtos (SOP)**.

É adequada para representar diferentes combinações que podem ativar uma saída.

## Forma Normal Conjuntiva — FNC

A FNC é uma **conjunção de disjunções**:

```text
(A ∨ B) ∧ (C ∨ D)
```

Também é chamada de **Produto de Somas (POS)**.

É adequada para representar várias restrições que devem ser satisfeitas simultaneamente, especialmente em intertravamentos e condições de segurança.

---

# Aplicação ao Processo

## Permissão Geral de Operação (`c_PERM`)

A regra definida anteriormente é:

```text
c_PERM ↔ (
    ¬p_EMERG
    ∧ ¬p_JI201
    ∧ ¬p_PAL601
    ∧ p_KSA401
    ∧ ¬p_NC703
)
```

Não existem condições repetidas, contraditórias ou constantes.

Portanto, a expressão já está simplificada:

```text
c_PERM ↔ ¬p_EMERG ∧ ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 ∧ ¬p_NC703
```

### Aplicação da FNC

A regra pode ser interpretada como um conjunto de restrições:

```text
(¬p_EMERG)
∧ (¬p_JI201)
∧ (¬p_PAL601)
∧ (p_KSA401)
∧ (¬p_NC703)
```

Todas precisam ser verdadeiras para liberar a planta.

---

## Comando do Alimentador (`c_ALIM`)

A regra é:

```text
c_ALIM ↔ c_PERM ∧ p_MOV201 ∧ ¬p_NB101
```

A expressão já é compacta.

Uma alternativa seria expandir `c_PERM`, porém isso repetiria a lógica de segurança.

### Forma recomendada

```text
c_ALIM ↔ c_PERM ∧ p_MOV201 ∧ ¬p_NB101
```

Assim, `c_PERM` pode ser calculada uma vez e reutilizada.

---

## Classificação Categoria A (`p_A`)

A regra é:

```text
p_A ↔ (
    p_CV101
    ∧ p_CV103
    ∧ p_CV105
    ∧ ¬p_CV107
    ∧ ¬p_CV108
    ∧ ¬p_CV109
)
```

Não há condições repetidas ou contraditórias.

Portanto:

```text
p_A ↔ p_CV101 ∧ p_CV103 ∧ p_CV105 ∧ ¬p_CV107 ∧ ¬p_CV108 ∧ ¬p_CV109
```

já é uma forma simplificada.

---

## Classificação Categoria C (`p_C`)

A regra é:

```text
p_C ↔ (
    p_CV107
    ∨ p_CV108
    ∨ p_CV109
    ∨ (¬p_CV101 ∧ ¬p_CV102)
    ∨ (¬p_CV103 ∧ ¬p_CV104)
    ∨ (¬p_CV105 ∧ ¬p_CV106)
)
```

A expressão já possui uma estrutura próxima da **FND/SOP**.

Cada termo representa um caminho suficiente para classificar o grão como rejeitado:

```text
dano
OU
praga
OU
impureza
OU
cor fora do padrão
OU
tamanho fora do padrão
OU
formato fora do padrão
```

Não há uma simplificação algébrica direta sem acrescentar novas hipóteses sobre os sinais da visão computacional.

---

## Classificação Categoria B (`p_B`)

A regra é:

```text
p_B ↔ ¬p_A ∧ ¬p_C
```

Não é necessário expandir `p_A` e `p_C`.

### Forma recomendada

```text
p_B ↔ ¬p_A ∧ ¬p_C
```

O SCADA-Core pode primeiro calcular `p_A` e `p_C` e depois utilizar esses resultados para calcular `p_B`.

Isso evita recalcular todas as condições da visão computacional.

---

## Comando do Ejetor (`c_FY603`)

A regra é:

```text
c_FY603 ↔ p_C ∧ p_POS603 ∧ ¬p_PAL601
```

Essa expressão já está simplificada.

Se fosse escrita de forma redundante:

```text
c_FY603 ↔ p_C ∧ p_POS603 ∧ ¬p_PAL601 ∧ p_C
```

Aplicando **idempotência**:

```text
p_C ∧ p_C ≡ p_C
```

obtemos:

```text
c_FY603 ↔ p_C ∧ p_POS603 ∧ ¬p_PAL601
```

---

## Diagnóstico de Falha do Ejetor

A regra é:

```text
p_FALHA_EJETOR ↔ c_FY603 ∧ ¬p_ZSH601
```

Uma versão redundante poderia ser:

```text
p_FALHA_EJETOR ↔ c_FY603 ∧ ¬p_ZSH601 ∧ c_FY603
```

Aplicando idempotência:

```text
c_FY603 ∧ c_FY603 ≡ c_FY603
```

Resultado:

```text
p_FALHA_EJETOR ↔ c_FY603 ∧ ¬p_ZSH601
```

---

## Exemplo de Contradição no Processo

Considere uma regra incorreta:

```text
c_TESTE ↔ p_MOV201 ∧ ¬p_MOV201 ∧ p_KSA401
```

Aplicando o complemento:

```text
p_MOV201 ∧ ¬p_MOV201 ≡ 0
```

Então:

```text
c_TESTE ↔ 0 ∧ p_KSA401
```

Pela dominação:

```text
c_TESTE ↔ 0
```

### Interpretação

O comando nunca poderá ser ativado.

Esse tipo de simplificação pode ser usado pelo SCADA-Core para identificar automaticamente possíveis contradições nas regras de controle.

---

## Exemplo de Absorção no Processo

Considere uma regra redundante:

```text
p_ALARME ↔ p_PAL601 ∨ (p_PAL601 ∧ p_NC703)
```

Aplicando a lei da absorção:

```text
A ∨ (A ∧ B) ≡ A
```

temos:

```text
p_ALARME ↔ p_PAL601
```

A segunda condição é redundante porque, sempre que `p_PAL601 ∧ p_NC703` for verdadeira, `p_PAL601` já será verdadeira.

---

# Resumo das Aplicações

| **Regra do processo** | **Simplificação / técnica** | **Aplicação** |
| :--- | :--- | :--- |
| `c_PERM` | FNC / organização | Restrições de segurança |
| `c_ALIM` | Reutilização de `c_PERM` | Evita repetir condições |
| `p_A` | Conjunção de condições | Características necessárias |
| `p_C` | FND/SOP | Caminhos de rejeição |
| `p_B` | Reutilização de `p_A` e `p_C` | Evita expandir a lógica |
| `c_FY603` | Idempotência | Remove condições repetidas |
| `p_FALHA_EJETOR` | Idempotência | Remove condições repetidas |
| Intertravamentos | Complemento | Detecta contradições |
| Alarmes | Absorção | Remove condições redundantes |

---

# Cadeia Lógica Otimizada

```text
c_PERM ↔ ¬p_EMERG ∧ ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 ∧ ¬p_NC703

c_ALIM ↔ c_PERM ∧ p_MOV201 ∧ ¬p_NB101

p_A ↔ p_CV101 ∧ p_CV103 ∧ p_CV105 ∧ ¬p_CV107 ∧ ¬p_CV108 ∧ ¬p_CV109

p_C ↔ p_CV107 ∨ p_CV108 ∨ p_CV109
      ∨ (¬p_CV101 ∧ ¬p_CV102)
      ∨ (¬p_CV103 ∧ ¬p_CV104)
      ∨ (¬p_CV105 ∧ ¬p_CV106)

p_B ↔ ¬p_A ∧ ¬p_C

c_FY603 ↔ p_C ∧ p_POS603 ∧ ¬p_PAL601

p_FALHA_EJETOR ↔ c_FY603 ∧ ¬p_ZSH601
```

---

# Conclusão

As simplificações booleanas permitem reduzir expressões redundantes sem alterar seu resultado lógico.

No SCADA-Core Automática, elas podem ser utilizadas principalmente para:

- remover condições repetidas;
- detectar contradições;
- eliminar condições redundantes;
- organizar expressões em FND/FNC;
- reutilizar proposições já calculadas;
- reduzir a complexidade das regras implementadas no CLP.

A ideia central é:

```text
Expressão original
        ↓
Identificação de redundâncias
        ↓
Aplicação das leis booleanas
        ↓
Expressão simplificada
        ↓
Validação da equivalência
        ↓
Implementação no CLP / SCADA-Core
```

A expressão otimizada deve sempre manter o mesmo comportamento lógico da expressão original.

