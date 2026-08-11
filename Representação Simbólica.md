# Aula 02 – Representação Simbólica

## Mapeamento de Variáveis de Processo em Proposições Lógicas (ISA 5.1)

## Objetivo

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

Essa estrutura permite que cada condição física seja representada por uma expressão lógica utilizada posteriormente na implementação dos intertravamentos, regras de decisão e algoritmos de controle.

---

# Parte 1 – Variáveis da Visão Computacional (ISA 5.1)

A tabela a seguir apresenta o conjunto de variáveis provenientes do sistema de visão computacional utilizado na classificação automática dos grãos (arroz).

# Tabela 1 – Variáveis da Visão Computacional

| Tag Instrumentativo | Tipo de dispositivo | Variável física | Proposição lógica | Estado 0 | Estado 1 |
| :------------------ | :------------------ | :-------------- | :---------------- | :------- | :------- |
| **CV-101** | Câmera + IA | Cor Ideal | CV-101: Cor dentro do padrão ideal | Cor fora do padrão ideal | Cor dentro do padrão ideal |
| **CV-102** | Câmera + IA | Cor Secundária | CV-102: Cor dentro do padrão secundário | Cor fora do padrão secundário | Cor dentro do padrão secundário |
| **CV-103** | Câmera + IA | Tamanho Ideal | CV-103: Tamanho dentro do padrão ideal | Tamanho fora do padrão ideal | Tamanho dentro do padrão ideal |
| **CV-104** | Câmera + IA | Tamanho Secundário | CV-104: Tamanho dentro do padrão secundário | Tamanho fora do padrão secundário | Tamanho dentro do padrão secundário |
| **CV-105** | Câmera + IA | Formato Ideal | CV-105: Formato dentro do padrão ideal | Formato fora do padrão ideal | Formato dentro do padrão ideal |
| **CV-106** | Câmera + IA | Formato Secundário | CV-106: Formato dentro do padrão secundário | Formato fora do padrão secundário | Formato dentro do padrão secundário |
| **CV-107** | Câmera + IA | Dano | CV-107: Possui dano | Sem dano | Com dano |
| **CV-108** | Câmera + IA | Praga | CV-108: Possui praga | Sem praga | Com praga |
| **CV-109** | Câmera + IA | Impureza | CV-109: Contém impureza | Sem impureza | Com impureza |

---

# Parte 2 – Variáveis do Processo (ISA 5.1)

A parte a seguir apresenta o catálogo de tags referente aos sensores, atuadores, dispositivos de segurança, motores e sinalizadores presentes na planta automatizada. Contudo, por apresentar um conteúdo bastante importante e detalhado, foi criado um arquivo exclusivamente para essa parte. Tal documento pode ser acessado com o link abaixo: 

[📘 Variáveis do Processo](./Variáveis%20Do%20Processo.md)

---

# Validação do Catálogo de Tags

A validação do catálogo de tags consistiu na verificação da consistência entre a identificação instrumentativa, a variável física associada e sua correspondente representação lógica.

Os principais critérios adotados foram:

- **Unicidade das tags:** cada dispositivo possui um identificador exclusivo;
- **Coerência com a ISA 5.1:** utilização de prefixos compatíveis com a função do instrumento (`ZS`, `XV`, `HS`, `HSE`, `M`, `YL`, `XA`, `CV`, etc.);
- **Correspondência binária:** definição clara dos estados lógicos `0` e `1`;
- **Rastreabilidade:** possibilidade de relacionar cada variável lógica diretamente ao dispositivo físico correspondente.

Como resultado, obteve-se um **catálogo padronizado de variáveis**, que servirá como base para as próximas etapas do projeto, incluindo a modelagem dos intertravamentos, desenvolvimento da lógica em CLP, integração com o sistema SCADA e implementação das regras de classificação automática por visão computacional.

---

# Conclusão

A representação simbólica das variáveis do processo constitui uma etapa fundamental para o desenvolvimento do sistema de automação. A padronização das tags e das proposições lógicas reduz ambiguidades, facilita a comunicação entre os membros da equipe e garante compatibilidade entre os diferentes módulos do projeto.

O catálogo validado nesta aula será utilizado como referência oficial nas próximas etapas do desenvolvimento do sistema de classificação automatizada de grãos, servindo como base para a implementação da lógica de controle, dos intertravamentos e da integração com o sistema supervisório (SCADA).
