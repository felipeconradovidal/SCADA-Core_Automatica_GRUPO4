# Parte 2 – Variáveis do Processo (ISA 5.1)

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
| **XA-901** | Botoeira de Emergência | Não se aplica — variável lógica | Botoeira para de falha física no processo | Não há falha no sistema | Estado de Emergência | `p_EMERG` |
