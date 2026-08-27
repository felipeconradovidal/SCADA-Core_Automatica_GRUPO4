# Variáveis do Processo

Nesta etapa do projeto foi realizado o **mapeamento simbólico das variáveis do processo**, convertendo sinais provenientes de sensores, atuadores e do sistema de visão computacional em **proposições lógicas binárias**. O objetivo é estabelecer uma representação formal do processo industrial, permitindo que cada condição física seja interpretada pelo sistema de controle como uma variável lógica (`0` ou `1`).

A padronização adotada segue a **norma ISA 5.1 (Instrumentation Symbols and Identification)**, responsável por definir convenções para identificação de instrumentos, sensores, atuadores e dispositivos de controle em sistemas industriais. A utilização dessa norma garante organização, rastreabilidade e compatibilidade entre a lógica de controle, o CLP, o sistema supervisório (SCADA) e os módulos de visão computacional.

---

# Metodologia

O levantamento das variáveis foi dividido em duas categorias principais:

1. **Variáveis da Visão Computacional** – responsáveis pela classificação das características dos grãos, como cor, tamanho, formato, dano, praga e impureza.
2. **Variáveis do Processo** – responsáveis pelo monitoramento dos sensores, atuadores pneumáticos, motores, dispositivos de segurança e sinalização da planta automatizada.

Para cada variável foram definidos os seguintes elementos:

- **Tag instrumentativo**
- **Tipo de dispositivo**
- **Variável física monitorada**
- **Proposição lógica**
- **Estado 0**
- **Estado 1**
- **Símbolo Lógico** *(adicionado na revisão da Parte 3 — ver nota abaixo)*

Essa estrutura permite que cada condição física seja representada por uma expressão lógica utilizada posteriormente na implementação dos intertravamentos, regras de decisão e algoritmos de controle.

---

# Parte 1 – Variáveis da Visão Computacional (ISA 5.1)

A tabela a seguir apresenta o conjunto de variáveis provenientes do sistema de visão computacional utilizado na classificação automática dos grãos (arroz).

# Tabela 1 – Variáveis da Visão Computacional

| Tag Instrumentativo | Tipo de dispositivo | Variável física | Proposição lógica | Estado 0 | Estado 1 | Símbolo Lógico |
| :------------------ | :------------------ | :-------------- | :---------------- | :------- | :------- | :-------------- |
| **CV-101** | Câmera + IA | Cor Ideal | CV-101: Cor dentro do padrão ideal | Cor fora do padrão ideal | Cor dentro do padrão ideal | `p_CV101` |
| **CV-102** | Câmera + IA | Cor Secundária | CV-102: Cor dentro do padrão secundário | Cor fora do padrão secundário | Cor dentro do padrão secundário | `p_CV102` |
| **CV-103** | Câmera + IA | Tamanho Ideal | CV-103: Tamanho dentro do padrão ideal | Tamanho fora do padrão ideal | Tamanho dentro do padrão ideal | `p_CV103` |
| **CV-104** | Câmera + IA | Tamanho Secundário | CV-104: Tamanho dentro do padrão secundário | Tamanho fora do padrão secundário | Tamanho dentro do padrão secundário | `p_CV104` |
| **CV-105** | Câmera + IA | Formato Ideal | CV-105: Formato dentro do padrão ideal | Formato fora do padrão ideal | Formato dentro do padrão ideal | `p_CV105` |
| **CV-106** | Câmera + IA | Formato Secundário | CV-106: Formato dentro do padrão secundário | Formato fora do padrão secundário | Formato dentro do padrão secundário | `p_CV106` |
| **CV-107** | Câmera + IA | Dano | CV-107: Possui dano | Sem dano | Com dano | `p_CV107` |
| **CV-108** | Câmera + IA | Praga | CV-108: Possui praga | Sem praga | Com praga | `p_CV108` |
| **CV-109** | Câmera + IA | Impureza | CV-109: Contém impureza | Sem impureza | Com impureza | `p_CV109` |

---

# Parte 2 – Variáveis do Processo (ISA 5.1)

A parte a seguir apresenta o catálogo de tags referente aos sensores, atuadores, dispositivos de segurança, motores e sinalizadores presentes na planta automatizada.

## Tabela de Variáveis do Processo (SCADA)
---

| Tag Instrumentativo | Tipo de dispositivo | Variável física | Proposição lógica | Estado 0 | Estado 1 | Símbolo Lógico |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LIT-101** | Transmissor de nível ultrassônico | Nível | Medição contínua do nível do funil de recepção | N/A (Analógico) | N/A (Analógico) | — (analógica → gera `p_NB101`, `p_NA101`, `p_NC101`) |
| **N/A** | Driver PWM / Inversor de frequência | Frequência | Comando de partida do alimentador vibratório | Alimentador desligado | Alimentador acionado | `c_ALIM` |
| **ST-201** | Encoder incremental | Velocidade | Medição contínua da velocidade real da esteira | N/A (Analógico) | N/A (Analógico) | — (analógica → gera `p_MOV201`, `p_VB201`, `p_VA201`) |
| **JI-201** | Relé de sobrecarga digital | Corrente elétrica | Sobrecarga no motor da esteira | Motor OK | Sobrecarga detectada | `p_JI201` |
| **WT-301** | Célula de carga com transmissor | Massa | Medição contínua de massa na seção de pesagem | N/A (Analógico) | N/A (Analógico) | — (analógica; usada no cálculo de `FT-301`) |
| **FT-301** | Variável calculada (CLP) | Vazão mássica | Taxa instantânea de processamento de grãos | N/A (Analógico) | N/A (Analógico) | — (analógica/calculada) |
| **XS-401** | Sensor fotoelétrico de barreira | Presença | Trigger de captura de imagem para a câmera | Sem grão no ponto | Grão detectado | `p_XS401` |
| **KSA-401** | Câmera industrial / Software | Não se aplica — variável lógica/calculada | Status de comunicação e operação da câmera | Câmera OFF / Falha | Câmera Pronta / OK | `p_KSA401` |
| **KXA-501** | Algoritmo de Visão Computacional | Não se aplica — variável lógica/calculada | Grão inspecionado classificado como Categoria A | Falso | Verdadeiro | `p_A` (≡ KXA-501) |
| **KXA-502** | Algoritmo de Visão Computacional | Não se aplica — variável lógica/calculada | Grão inspecionado classificado como Categoria B | Falso | Verdadeiro | `p_B` (≡ KXA-502) |
| **KXA-503** | Algoritmo de Visão Computacional | Não se aplica — variável lógica/calculada | Grão inspecionado classificado como Categoria C | Falso | Verdadeiro | `p_C` (≡ KXA-503) |
| **PT-601** | Transmissor de pressão piezoelétrico | Pressão | Medição contínua da pressão da linha pneumática | N/A (Analógico) | N/A (Analógico) | — (analógica; usada no cálculo de `PAL-601`) |
| **PAL-601** | Pressostato digital / CLP | Pressão | Pressão de ar comprimido abaixo do mínimo operacional | Pressão normal | Pressão baixa | `p_PAL601` |
| **FY-603** | Válvula solenoide ultrarrápida | Não se aplica — variável lógica/calculada | Comando de disparo do ejetor da Categoria C | Válvula fechada | Válvula acionada | `c_FY603` |
| **ZSH-601** | Sensor magnético de cilindro | Posição | Confirmação física de avanço do atuador pneumático | Atuador recuado | Atuador avançado | `p_ZSH601` |
| **LIT-703** | Sensor de nível ultrassônico | Nível | Medição contínua do nível no recipiente Categoria C | N/A (Analógico) | N/A (Analógico) | — (analógica → gera `p_NA703`, `p_NC703`) |
| **N/A** | Lógica de intertravamento (CLP) | Não se aplica — variável lógica/calculada | Permissão geral para operação da planta | Condição impeditiva | Planta liberada | `c_PERM` |
| **N/A** | Variável calculada (SCADA) | Não se aplica — variável lógica/calculada | Taxa de rejeição total (Categoria C) em relação ao total | N/A (Analógico) | N/A (Analógico) | — (analógica/calculada, %) |
| **XA-901** | Botoeira de Emergência | Não se aplica — variável lógica | Botoeira de parada de emergência do processo | Não há falha no sistema | Estado de Emergência | `p_EMERG` |
