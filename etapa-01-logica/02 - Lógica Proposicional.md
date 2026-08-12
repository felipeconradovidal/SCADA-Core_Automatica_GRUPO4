# Lógica Proposicional do Processo

## Da Representação Simbólica às Regras de Decisão do SCADA-Core Automática

## Objetivo

Este documento dá continuidade à Parte 2, utilizando os símbolos lógicos definidos na tabela de variáveis (**Representação_Simbólica.md** e **Variáveis_Do_Processo.md**) para construir, em **lógica proposicional clássica**, as regras que vão governar:

1. A geração de proposições binárias a partir de variáveis analógicas (comparadores de limiar);
2. O intertravamento de segurança e a Permissão Geral de Operação;
3. O comando do alimentador vibratório;
4. A classificação dos grãos em Categoria A, B e C;
5. O acionamento e diagnóstico do sistema de ejeção pneumática;
6. Os alarmes de processo.

Cada regra é apresentada como uma expressão lógica formal (usando os operadores `¬`, `∧`, `∨`, `→`, `↔`), acompanhada da leitura em português e, quando relevante, de uma tabela-verdade.

---

# 1. Convenção de Notação

| Símbolo | Significado |
| :--- | :--- |
| `¬p` | Negação de `p` (NÃO) |
| `p ∧ q` | Conjunção (E) |
| `p ∨ q` | Disjunção (OU) |
| `p → q` | Condicional (SE... ENTÃO) |
| `p ↔ q` | Bicondicional (SE E SOMENTE SE) |
| `p_TAG` | Proposição de **entrada** (sensor/status observado) |
| `c_TAG` | Proposição de **saída/comando**, calculada pelo CLP |

Convenção de estado: em todas as proposições, **1 (Verdadeiro)** corresponde ao "Estado 1" definido na tabela de variáveis, e **0 (Falso)** ao "Estado 0".

---

# 2. Proposições Derivadas de Variáveis Analógicas

Variáveis analógicas (`LIT-101`, `ST-201`, `WT-301`, `FT-301`, `PT-601`, `LIT-703`) não são proposições por si — elas alimentam **comparadores de limiar** no CLP, que geram as proposições binárias efetivamente usadas na lógica de controle. Isso mantém a tabela de variáveis fiel à ISA 5.1 (que não teria como listar limiares específicos) e concentra as definições de setpoint aqui, onde elas podem evoluir sem reabrir o catálogo de tags.

## 2.1 Nível do Funil de Recepção (LIT-101)

| Símbolo | Definição | Condição |
| :--- | :--- | :--- |
| `p_NB101` | Nível baixo | `LIT-101 < L_min` |
| `p_NA101` | Nível alto | `LIT-101 > L_max` |
| `p_NC101` | Nível crítico | `LIT-101 ≥ L_crit` |

`L_min`, `L_max` e `L_crit` são setpoints a definir com a equipe de processo (percentual ou altura de coluna de grãos).

## 2.2 Velocidade da Esteira (ST-201)

| Símbolo | Definição | Condição |
| :--- | :--- | :--- |
| `p_MOV201` | Esteira em movimento | `ST-201 > 0` |
| `p_VB201` | Velocidade abaixo da faixa | `ST-201 < V_min` |
| `p_VA201` | Velocidade acima da faixa | `ST-201 > V_max` |
| `p_VN201` | Velocidade normal | `p_VN201 ↔ (¬p_VB201 ∧ ¬p_VA201 ∧ p_MOV201)` |

## 2.3 Pressão Pneumática (PT-601)

O `PAL-601` já é o comparador digital de `PT-601`, então não é necessário derivar outra proposição — `p_PAL601` cobre essa condição (ver tabela de variáveis).

## 2.4 Nível do Reservatório de Rejeito (LIT-703)

| Símbolo | Definição | Condição |
| :--- | :--- | :--- |
| `p_NA703` | Reservatório cheio (alarme) | `LIT-703 > 90%` |
| `p_NC703` | Nível crítico (bloqueio) | `LIT-703 ≥ 100%` |

---

# 3. Permissão Geral de Operação (`c_PERM`)

De acordo com o descritivo do processo, a planta só pode partir se: não houver sobrecarga no motor da esteira, a pressão pneumática estiver normal e a câmera estiver pronta.

```
c_PERM ↔ ( ¬p_EMERG ∧ ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 )
```

**Leitura:** a planta está liberada **se e somente se** não houver sobrecarga no motor da esteira **E** não houver pressão baixa na linha pneumática **E** a câmera estiver pronta/OK.

### Tabela-verdade


| `p_EMERG` | `p_JI201` | `p_PAL601` | `p_KSA401` | `c_PERM` |
| :---: | :---: | :---: | :---: | :---: |
| 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 0 | 1 | **1** |
| 0 | 0 | 1 | 0 | 0 |
| 0 | 0 | 1 | 1 | 0 |
| 0 | 1 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 0 |
| 0 | 1 | 1 | 0 | 0 |
| 0 | 1 | 1 | 1 | 0 |
| 1 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 1 | 0 |
| 1 | 0 | 1 | 0 | 0 |
| 1 | 0 | 1 | 1 | 0 |
| 1 | 1 | 0 | 0 | 0 |
| 1 | 1 | 0 | 1 | 0 |
| 1 | 1 | 1 | 0 | 0 |
| 1 | 1 | 1 | 1 | 0 |

Apenas a primeira linha libera a planta — é a única combinação em que todas as condições de segurança estão satisfeitas simultaneamente.

---

# 4. Comando do Alimentador Vibratório (`c_ALIM`)

O alimentador só deve dosar grãos se a planta estiver liberada, a esteira estiver em movimento e o funil não estiver com nível baixo (evitar rodar a seco):

```
c_ALIM ↔ ( c_PERM ∧ p_MOV201 ∧ ¬p_NB101 )
```

**Leitura:** o alimentador vibratório é acionado **se e somente se** a planta estiver liberada **E** a esteira estiver em movimento **E** o nível do funil não estiver baixo.

Isso cobre diretamente os dois casos descritos no texto original: parada da esteira (`¬p_MOV201`) ou desabastecimento do funil (`p_NB101`) desligam o alimentador.

---

# 5. Classificação dos Grãos (Categoria A, B, C)

## 5.1 Categoria A — Produto Aprovado (`p_A` / `KXA-501`)

Um grão é Categoria A quando atende **integralmente** aos padrões ideais de cor, tamanho e formato, e não apresenta dano, praga ou impureza:

```
p_A ↔ ( p_CV101 ∧ p_CV103 ∧ p_CV105 ∧ ¬p_CV107 ∧ ¬p_CV108 ∧ ¬p_CV109 )
```

**Leitura:** grão é Categoria A **se e somente se** cor ideal **E** tamanho ideal **E** formato ideal **E** sem dano **E** sem praga **E** sem impureza.

## 5.2 Categoria C — Produto Rejeitado (`p_C` / `KXA-503`)

Um grão é rejeitado se apresentar qualquer defeito grave — dano, praga, impureza, ou estiver **totalmente** fora do padrão de cor, tamanho ou formato (nem ideal, nem secundário):

```
p_C ↔ ( p_CV107 ∨ p_CV108 ∨ p_CV109 ∨ (¬p_CV101 ∧ ¬p_CV102) ∨ (¬p_CV103 ∧ ¬p_CV104) ∨ (¬p_CV105 ∧ ¬p_CV106) )
```

**Leitura:** grão é Categoria C **se** possui dano **OU** possui praga **OU** contém impureza **OU** a cor não é ideal nem secundária **OU** o tamanho não é ideal nem secundário **OU** o formato não é ideal nem secundário.

## 5.3 Categoria B — Produto Secundário (`p_B`)

Definida por exclusão, exatamente como no descritivo original — não é necessário (nem desejável) que a visão computacional gere um terceiro sinal para B, já que ele é logicamente redundante:

```
p_B ↔ ( ¬p_A ∧ ¬p_C )
```

### Consistência lógica do particionamento

Uma validação importante da lógica: as três categorias devem ser **mutuamente exclusivas e coletivamente exaustivas** (todo grão cai em exatamente uma categoria). Isso é garantido *por construção*, pois:

```
p_A ∨ p_B ∨ p_C  ≡  Verdadeiro          (exaustividade, por definição de p_B)
(p_A ∧ p_C)  ≡  Falso                    (deve ser verificado — ver observação abaixo)
```

---

# 6. Sistema de Ejeção Pneumática

## 6.1 Comando de Disparo (`c_FY603`)

O ejetor deve atuar apenas quando o grão rejeitado atinge fisicamente a posição do bocal (calculada via *shift register* a partir da velocidade do encoder) **e** houver pressão suficiente:

```
c_FY603 ↔ ( p_C ∧ p_POS603 ∧ ¬p_PAL601 )
```

Onde `p_POS603` é a proposição — gerada pelo temporizador/*shift register* do CLP — que indica "grão rejeitado está na posição do ejetor agora". Essa variável ainda não tem tag própria no catálogo; sugiro criarmos algo como `ZC-603` (posição calculada) na próxima revisão da tabela.

**Leitura:** a válvula é acionada **se e somente se** o grão à frente do bocal for Categoria C **E** ele estiver na posição correta **E** não houver alarme de pressão baixa.

## 6.2 Diagnóstico de Falha do Atuador

A confirmação física do avanço do cilindro (`ZSH-601`) deve ocorrer dentro de uma janela de tempo `T` após o comando. Se isso não acontecer, é uma falha de acionamento:

```
p_FALHA_EJETOR ↔ ( c_FY603 ∧ ¬p_ZSH601 )   [avaliado após o tempo T de espera]
```

**Leitura:** há falha de ejeção **se e somente se** o comando foi enviado **E**, decorrido o tempo `T`, o sensor magnético não confirmou o avanço do atuador.

---

# 7. Alarmes de Processo

| Alarme | Expressão | Leitura |
| :--- | :--- | :--- |
| Sobrecarga do motor | `Alarme_JI201 ↔ p_JI201` | Dispara quando o relé de sobrecarga muda para 1 |
| Pressão pneumática baixa | `Alarme_PAL601 ↔ p_PAL601` | Dispara quando a pressão cai abaixo do mínimo |
| Reservatório de rejeito cheio | `Alarme_LIT703 ↔ p_NA703` | Alerta visual/sonoro ao atingir ~90% |
| Bloqueio por rejeito crítico | `Bloqueio_LIT703 ↔ p_NC703` | Interrompe a alimentação (`c_ALIM → 0`, via `c_PERM`) ao atingir 100% |
| Falha de ejeção | `Alarme_EJETOR ↔ p_FALHA_EJETOR` | Ver seção 6.2 |

Note que o bloqueio por reservatório cheio se propaga naturalmente pela cadeia lógica já definida se incorporarmos `¬p_NC703` à Permissão Geral:

```
c_PERM ↔ ( ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 ∧ ¬p_NC703 )
```

Isso é consistente com o texto do descritivo ("o CLP interrompe preventivamente a alimentação do processo") e evita criar uma segunda lógica de bloqueio paralela ao intertravamento principal — sugiro adotarmos essa versão consolidada de `c_PERM` daqui para frente (substitui a da Seção 3).

---

# 8. Consolidação — Cadeia Lógica Completa

```
c_PERM ↔ ( ¬p_EMERG ∧ ¬p_JI201 ∧ ¬p_PAL601 ∧ p_KSA401 )
c_ALIM   ↔ c_PERM ∧ p_MOV201 ∧ ¬p_NB101

p_A      ↔ p_CV101 ∧ p_CV103 ∧ p_CV105 ∧ ¬p_CV107 ∧ ¬p_CV108 ∧ ¬p_CV109
p_C      ↔ p_CV107 ∨ p_CV108 ∨ p_CV109 ∨ (¬p_CV101∧¬p_CV102) ∨ (¬p_CV103∧¬p_CV104) ∨ (¬p_CV105∧¬p_CV106)
p_B      ↔ ¬p_A ∧ ¬p_C

c_FY603  ↔ p_C ∧ p_POS603 ∧ ¬p_PAL601
```

Essa cadeia cobre, em lógica proposicional pura, todo o fluxo descrito no README (recepção → alimentação → transporte → inspeção → classificação → ejeção → monitoramento), servindo de base direta para:

- **Diagrama Ladder / lista de instruções** no CLP (cada `∧`, `∨`, `¬` mapeia 1:1 para contatos NA/NF e bobinas);
- **Tabelas-verdade de validação** antes da implementação;
- Próxima aula: acredito que faça sentido evoluirmos isso para **álgebra booleana com simplificação (mapas de Karnaugh)** assim que fecharmos os setpoints analógicos da Seção 2, e depois para os diagramas de intertravamento formais.

---

