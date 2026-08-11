# Tabela Final de Variáveis do Processo (SCADA)

| Tag Instrumentativo | Tipo de dispositivo | Variável física | Proposição lógica | Estado 0 | Estado 1 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LIT-101** | Transmissor de nível ultrassônico | Nível | Medição contínua do nível do funil de recepção | N/A (Analógico) | N/A (Analógico) |
| **N/A** | Driver PWM / Inversor de frequência | Frequência | Comando de partida do alimentador vibratório | Alimentador desligado | Alimentador acionado |
| **ST-201** | Encoder incremental | Velocidade | Medição contínua da velocidade real da esteira | N/A (Analógico) | N/A (Analógico) |
| **JI-201** | Relé de sobrecarga digital | Corrente elétrica | Sobrecarga no motor da esteira | Motor OK | Sobrecarga detectada |
| **WT-301** | Célula de carga com transmissor | Massa | Medição contínua de massa na seção de pesagem | N/A (Analógico) | N/A (Analógico) |
| **FT-301** | Variável calculada (PLC) | Vazão mássica | Taxa instantânea de processamento de grãos | N/A (Analógico) | N/A (Analógico) |
| **XS-401** | Sensor fotoelétrico de barreira | Presença | Trigger de captura de imagem para a câmera | Sem grão no ponto | Grão detectado |
| **KSA-401** | Câmera industrial / Software | Não se aplica — variável lógica/calculada | Status de comunicação e operação da câmera | Câmera OFF / Falha | Câmera Pronta / OK |
| **KXA-501** | Algoritmo de Visão Computacional | Não se aplica — variável lógica/calculada | Grão inspecionado classificado como Categoria A | Falso | Verdadeiro |
| **KXA-503** | Algoritmo de Visão Computacional | Não se aplica — variável lógica/calculada | Grão inspecionado classificado como Categoria C | Falso | Verdadeiro |
| **PT-601** | Transmissor de pressão piezoelétrico | Pressão | Medição contínua da pressão da linha pneumática | N/A (Analógico) | N/A (Analógico) |
| **PAL-601** | Pressostato digital / PLC | Pressão | Pressão de ar comprimido abaixo do mínimo operacional | Pressão normal | Pressão baixa |
| **FY-603** | Válvula solenoide ultrarrápida | Não se aplica — variável lógica/calculada | Comando de disparo do ejetor da Categoria C | Válvula fechada | Válvula acionada |
| **ZSH-601** | Sensor magnético de cilindro | Posição | Confirmação física de avanço do atuador pneumático | Atuador recuado | Atuador avançado |
| **LIT-703** | Sensor de nível ultrassônico | Nível | Medição contínua do nível no recipiente Categoria C | N/A (Analógico) | N/A (Analógico) |
| **N/A** | Lógica de intertravamento (PLC) | Não se aplica — variável lógica/calculada | Permissão geral para operação da planta | Condição impeditiva | Planta liberada |
| **N/A** | Variável calculada (SCADA) | Não se aplica — variável lógica/calculada | Taxa de rejeição total (Categoria C) em relação ao total | N/A (Analógico) | N/A (Analógico) |

# Descritivo do Processo

## 1. Recepção e Alimentação dos Grãos

A etapa de recepção e alimentação é o ponto de entrada da matéria-prima na planta automatizada. Os grãos chegam ao sistema e são descarregados em um funil de recepção responsável pelo armazenamento temporário e pela regularização do fluxo de material para o restante da linha.

O correto funcionamento e a continuidade do processo produtivo dependem diretamente do monitoramento constante do volume contido no funil. Para isso, o sistema utiliza o transmissor de nível ultrassônico **LIT-101**, que realiza a medição contínua da altura da camada de grãos.

Essa medição contínua é fundamental para a estratégia de controle da planta. Caso o funil atinja níveis excessivamente baixos, o processo corre o risco de operar a seco, resultando em descontinuidade no abastecimento da esteira e falhas no ritmo de classificação. Em contrapartida, um volume elevado sem controle pode levar ao transbordo de grãos. Dessa forma, a informação fornecida pelo **LIT-101** é processada pelo PLC para garantir a liberação ou o bloqueio da etapa subsequente de alimentação, além de alimentar o sinóptico do SCADA com a indicação precisa do volume disponível.

---

## 2. Alimentador Vibratório

Posicionado imediatamente abaixo da boca de descarga do funil, o alimentador vibratório tem a função de dosar e distribuir os grãos de forma uniforme sobre a esteira transportadora. A dosagem adequada é um requisito crítico: a sobrealimentação causa o acúmulo de grãos sobrepostos na esteira, o que compromete a eficiência do sistema de visão computacional, enquanto a subalimentação reduz a produtividade global da planta.

O acionamento do alimentador é realizado pelo comando lógico **Comando do Alimentador Vibratório** (Driver PWM / Inversor de frequência), responsável por ajustar a frequência e amplitude de vibração da calha.

A operação do alimentador está diretamente associada ao estado de abastecimento do funil de recepção. Quando o transmissor **LIT-101** indica que há produto suficiente no funil e a esteira está em movimento, o comando do alimentador é ativado para iniciar a dosagem. Em caso de parada da esteira ou desabastecimento do funil, o comando é desativado imediatamente para evitar o acúmulo indesejado de grãos na entrada do sistema de transporte.

---

## 3. Transporte pela Esteira

A esteira transportadora é o elemento central de movimentação e integração física da planta. Ela conduz os grãos dosados pelo alimentador vibratório sequencialmente pelas estações de pesagem, inspeção por visão computacional e ejeção pneumática.

A velocidade da esteira precisa ser rigorosamente controlleda e monitorada. Para essa medição, utiliza-se o encoder incremental **ST-201**, acoplado ao eixo do motor, que fornece ao PLC o valor em tempo real da velocidade real de deslocamento da correia. A manutenção da velocidade no setpoint correto é vital para a dinâmica da planta: se a velocidade estiver abaixo do especificado, o fluxo de produção cai e o tempo de trânsito aumenta; se estiver acima, a captura de imagem pelo sistema de visão pode sofrer desfoque por movimento (*motion blur*) e os atuadores de ejeção não responderão a tempo.

A sincronização espacial e temporal do processo baseia-se na velocidade contínua lida pelo **ST-201**. O PLC utiliza esse sinal para calcular o tempo exato que um determinado grão leva desde a passagem pela câmera de inspeção até atingir a posição dos ejetores pneumáticos.

Para a proteção da mecânica e do motor da esteira, o sistema conta com a variável **JI-201** (relé de sobrecarga digital). Caso ocorra um travamento mecânico na correia ou sobrecarga elétrica no motor, a variável **JI-201** muda de estado (Estado 1), provocando o desligamento imediato do acionamento e gerando um alarme crítico no SCADA para diagnóstico operacional.

---

## 4. Pesagem

Após a alimentação e estabilização na esteira, os grãos passam por uma seção dedicada à pesagem dinâmica contínua. O objetivo desta etapa é determinar a massa do produto que transita pelo processo para acompanhamento de produção, rendimento e métricas operacionais.

A medição física direta é realizada por uma célula de carga com transmissor integrado, representada pela tag **WT-301**, que envia ao PLC o valor da massa instantânea incidente sobre a seção da balança.

A partir do valor analógico de massa fornecido pelo **WT-301** e da velocidade de deslocamento do material obtida pelo encoder, o algoritmo do PLC efetua o cálculo da vazão mássica instantânea de processamento, representada pela variável **FT-301**.

É fundamental diferenciar as duas grandezas nesta etapa:

* **Massa Instantânea (WT-301):** grandeza física medida diretamente pelo sensor de força (célula de carga).
* **Vazão Mássica (FT-301):** grandeza calculada pelo PLC por meio da integração do peso em relação ao tempo e velocidade da correia, expressa em unidades de taxa de produção (por exemplo, kg/h).

O SCADA utiliza a variável calculada **FT-301** para apresentar ao operador o gráfico de tendência de produtividade em tempo real, permitindo identificar oscilações no fornecimento de matéria-prima e avaliar a eficiência operacional do lote em processamento.

---

## 5. Inspeção por Visão Computacional

À medida que os grãos avançam pela esteira transportadora, eles entram na zona de inspeção por visão computacional. Esta etapa é responsável por analisar individualmente as características ópticas e geométrico-superficiais de cada grão para determinar sua qualidade.

O processo de aquisição de imagem é iniciado pelo sensor fotoelétrico de barreira **XS-401**. Posicionado no ponto de entrada do túnel de inspeção, o sensor opera como um trigger discreto: ao detectar a passagem de um grão, seu estado muda de 0 para 1, enviando um pulso instantâneo para a câmera industrial e para o PLC. Esse pulso garante que a imagem seja capturada exatamente no instante em que o grão está posicionado sob o campo de visão otimizado e sob a iluminação controlada.

A prontidão e integridade do sistema de captura são monitoradas continuamente pela variável **KSA-401** (Status do Sistema de Visão / Câmera). Esta variável reflete o estado de comunicação da câmera, o funcionamento do algoritmo de processamento e a disponibilidade de hardware. Se a variável **KSA-401** indicar falha (Estado 0), a planta entra em condição de alerta, impedindo a passagem de grãos sem a devida classificação.

Após o disparo efetuado pelo **XS-401**, o algoritmo de visão computacional analisa o enquadramento do grão, processando simultaneamente múltiplos atributos como cor, tamanho, formato, presença de manchas, trincas, danos mecânicos, bolor ou contaminação por pragas.

---

## 6. Classificação dos Grãos

A etapa de classificação converte a análise realizada pela visão computacional em decisões lógicas de separação. Com base nas características geométricas e de cor extraídas da imagem, o sistema categoriza o grão inspecionado em uma das três famílias pré-definidas no projeto:

* **Categoria A (Produto Aprovado / Nobre):** grãos que atendem integralmente aos padrões de cor, formato, tamanho e ausência de defeitos.
* **Categoria B (Produto Comercial / Secundário):** grãos com pequenas variações estéticas ou de tamanho, porém sem contaminação ou danos graves.
* **Categoria C (Produto Rejeitado / Descarte):** grãos com severa alteração de cor, presença de pragas, trincados, mofados ou que sejam impurezas (pedras, palha).

Nesta arquitetura de controle, a classificação é representada por variáveis de resultado lógicas geradas pelo algoritmo de visão e transmitidas ao PLC:

* **KXA-501 (Grão Categoria A):** assume o estado lógico 1 quando o grão analisado atende aos critérios de aprovação integral.
* **KXA-503 (Grão Categoria C):** assume o estado lógico 1 quando o grão é diagnosticado como defeituoso ou rejeito.

A Categoria B é tratada de forma complementar pelo sistema: grãos que não acionam a condição de aprovação total (**KXA-501** = 0) nem a condição de rejeição absoluta (**KXA-503** = 0) são definidos logicamente como Categoria B.

Assim que a decisão lógica é tomada, o registro da classificação do grão entra em uma fila de deslocamento (*shift register*) dentro do PLC, vinculada ao rastreamento do tempo e da velocidade da esteira obtida pelo encoder, preparando o disparo da próxima etapa: a ejeção pneumática.

---

## 7. Sistema Pneumático e Ejeção

O sistema pneumático é o atuador físico responsável por desviar mecanicamente os grãos para fora da esteira com base no resultado da classificação obtido na etapa anterior. Como o processo ocorre em alta velocidade, o sistema exige pressão de ar adequada e tempos de resposta na ordem de milissegundos.

A linha principal de suprimento de ar comprimido é monitorada pelo transmissor de pressão piezoelétrico **PT-601**, que fornece o valor contínuo da pressão do sistema. O correto funcionamento da ejeção depende intrinsecamente do nível de pressão. Se o ar comprimido cair abaixo do limite necessário para vencer a inércia dos grãos, a força do sopro pneumático será insuficiente, gerando falhas na separação física. Para proteger a planta contra essa condição, atua a variável **PAL-601** (Pressostato digital / Alarme de Pressão Baixa), que muda para o estado 1 se a pressão for insuficiente para a operação segura dos atuadores.

Quando um grão classificado como Categoria C (**KXA-503** = 1) atinge a posição exata do bocal de desvio na esteira (calculada pelo tempo de trânsito), o PLC aciona o comando da válvula solenoide ultrarrápida **FY-603**. A abertura energizada da válvula libera um jacto de ar comprimido de curta duração que ejeta o grão descartado para fora da correia transportadora.

Para garantir que a ação física de ejeção realmente ocorreu e não houve falha elétrica na bobina da solenoide ou travamento mecânico da válvula/cilindro, o sistema conta com a confirmação dada pelo sensor magnético de posição **ZSH-601** (confirmação física de avanço do atuador). A leitura do **ZSH-601** permite ao PLC verificar se o atuador respondeu ao comando no tempo esperado, fornecendo o diagnóstico de falha de acionamento em tempo real.

---

## 8. Coleta dos Produtos

Após a etapa de ejeção, os grãos devidamente separados seguem para os seus respectivos reservatórios de destino final:

* Grãos ejetados pela ação do sopro pneumático são direcionados à calha e recipiente de **Rejeito (Categoria C)**.
* Grãos aprovados permanecem sobre a esteira e são depositados ao final do percurso no recipiente correspondente (**Categoria A**).

O recipiente de recepção de rejeito exige monitoramento contínuo para prevenir o extravasamento de produto descartado sobre o chão de fábrica. Esse acompanhamento é realizado pelo sensor de nível ultrassônico **LIT-703**, instalado no topo do reservatório de Categoria C.

À medida que o recipiente é preenchido, o valor medido pelo **LIT-703** cresce continuamente de 0 a 100%. Quando a capacidade máxima operacional é atingida, o SCADA gera um alarme visual e sonoro de recipiente cheio. Essa indicação orienta a equipe de operação sobre a necessidade de substituição ou esvaziamento do reservatório. Caso o operador não realize a troca em tempo hábil e o nível atinja a condição crítica, o PLC interrompe preventivamente a alimentação do processo para evitar o acúmulo desordenado de rejeito na área de desvio.

---

## 9. Supervisão pelo SCADA

O sistema de supervisão e aquisição de dados (SCADA) atua como o ambiente central de interface homem-máquina (IHM) e inteligência operacional da planta. Ele consolida todas as variáveis físicas transmitidas pelos instrumentos e as variáveis calculadas geradas pelo PLC em um sinóptico dinâmico e amigável.

Através do SCADA, o operador monitora em tempo real:

* **Estado Geral da Planta:** por meio da variável **Permissão Geral de Operação (Intertravamento do PLC)**, que indica se as condições de segurança (emergência, pressão de ar **PAL-601**, motor da esteira **JI-201** e visão **KSA-401**) estão satisfeitas para permitir a partida do processo (Estado 1).
* **Fluxo de Processamento:** visualização gráfica do nível do funil (**LIT-101**), velocidade da esteira (**ST-201**), massa instantânea na balança (**WT-301**) e a taxa de vazão mássica em tempo real (**FT-301**).
* **Diagnóstico e Alarmes:** exibição em painel de eventos de falhas elétricas por sobrecarga no motor (**JI-201** = 1), baixa pressão na linha pneumática (**PAL-601** = 1) e necessidade de intervenção na coleta pelo nível elevado no reservatório de rejeito (**LIT-703**).
* **Métricas de Produtividade e Qualidade:** apresentação da variável calculada **Taxa de Rejeição Total (SCADA)**, que correlaciona continuamente os grãos computados como rejeito (**KXA-503**) frente ao volume total processado. Esse indicador permite acompanhar desvios de qualidade do lote recebido na recepção.

O SCADA armazena o histórico contínuo das variáveis em banco de dados, possibilitando a geração de relatórios de produção, gráficos de tendência e rastreabilidade da operação do sistema.

---

## 10. Fluxo Geral de Operação

O funcionamento integrado da planta automatizada segue uma sequência encadeada e estritamente sincronizada:

1. **Abastecimento Inicial:** Os grãos chegam à planta e são despejados no funil de recepção. O transmissor **LIT-101** registra o nível de produto armazenado.
2. **Verificação de Permissões:** O operador solicita a partida da planta via SCADA. O PLC valida a **Permissão Geral de Operação (Intertravamento)**, verificando se não há emergências ativas, se o motor da esteira está íntegro (**JI-201** = 0), se a pressão de ar está normal (**PAL-601** = 0) e se a câmera está operacional (**KSA-401** = 1).
3. **Partida do Transporte e Alimentação:** A esteira transportadora é acionada, e sua velocidade real é monitorada continuamente pelo encoder **ST-201**. Em seguida, o **Comando do Alimentador Vibratório** é ativado, iniciando a dosagem controlada e contínua dos grãos sobre a esteira em movimento.
4. **Pesagem Dinâmica:** Os grãos avançam sobre a esteira e passam pela mesa de pesagem. A célula de carga **WT-301** mede a massa instantânea, e o PLC calcula continuamente a vazão mássica de processamento **FT-301**, disponibilizando o dado no SCADA.
5. **Detecção e Disparo da Inspeção:** Ao entrarem na estação de visão, a passagem de cada grão é detectada pelo sensor fotoelétrico **XS-401**. O disparo instantâneo aciona a captura da imagem pela câmera industrial.
6. **Processamento da Imagem e Classificação:** O algoritmo de visão analisa a imagem capturada e toma a decisão lógica de qualidade: se o grão for aprovado, ativa **KXA-501**; se for identificado defeito, ativa **KXA-503**.
7. **Rastreamento e Ejeção Pneumática:** A decisão de classificação entra no registrador de deslocamento do PLC. O sistema acompanha a posição física do grão com base na velocidade fornecida pelo encoder **ST-201**. Ao atingir o ponto de ejeção, se a decisão for de rejeição (**KXA-503** = 1), o PLC aciona a válvula solenoide **FY-603**. O jacto de ar comprimido ejeta o grão defeituoso, enquanto a chave **ZSH-601** confirma a atuação física do cilindro.
8. **Coleta e Monitoramento de Silos:** Os grãos ejetados caem no reservatório de rejeito (Categoria C), cujo volume é monitorado em tempo real pelo sensor de nível **LIT-703**. Os grãos aprovados seguem na esteira e descarregam no reservatório final (Categoria A).
9. **Supervisão Contínua:** Durante todo o percurso, o SCADA atualiza as variáveis do sinóptico e processa a **Taxa de Rejeição Total (SCADA)**, garantindo controle, diagnóstico e rastreabilidade total do processo de seleção de grãos.

---

flowchart TD
    %% Estilização do Diagrama
    classDef equipamento fill:#2b3e50,stroke:#1a252f,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef decisao fill:#d35400,stroke:#a04000,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef scada fill:#27ae60,stroke:#1e8449,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef variavel fill:#ecf0f1,stroke:#bdc3c7,stroke-width:1px,color:#2c3e50,font-size:11px;
    classDef destino fill:#2980b9,stroke:#1b4f72,stroke-width:2px,color:#ffffff,font-weight:bold;

    %% Camada Superior de Supervisão SCADA
    subgraph CAMADA_SUPERVISAO [" Camada de Supervisão & Controle (SCADA / PLC) "]
        SCADA["SCADA / PLC<br>• Intertravamento: Permissão Geral<br>• KPI: Taxa de Rejeição Total"]:::scada
    end

    %% Fluxo Físico do Processo
    subgraph FLUXO_PROCESSO [" Fluxo Físico do Processo "]
        E1["1. Entrada dos Grãos"] --> E2["2. Funil de Alimentação"]:::equipamento
        
        VAR_LIT101["[LIT-101] Nível Funil"]:::variavel --- E2
        
        E2 --> E3["3. Alimentador Vibratório"]:::equipamento
        VAR_CMD_ALIM["[Comando Alimentador] (Driver/Inversor)"]:::variavel --- E3
        
        E3 --> E4["4. Esteira Transportadora"]:::equipamento
        VAR_ST201["[ST-201] Velocidade Real"]:::variavel --- E4
        VAR_JI201["[JI-201] Sobrecarga Motor"]:::variavel --- E4
        
        E4 --> E5["5. Pesagem Dinâmica"]:::equipamento
        VAR_WT301["[WT-301] Massa Instantânea"]:::variavel --- E5
        VAR_FT301["[FT-301] Vazão Mássica (Calculada)"]:::variavel --- E5
        
        E5 --> E6["6. Inspeção por Visão Computacional"]:::equipamento
        VAR_XS401["[XS-401] Trigger Óptico"]:::variavel --- E6
        VAR_KSA401["[KSA-401] Status da Câmera"]:::variavel --- E6
        
        E6 --> D7{"7. Decision / Classificação"}:::decisao
    end

    %% Ramificações da Classificação e Atuação
    VAR_KXA501["[KXA-501] Grão Categoria A"]:::variavel --- D7
    VAR_KXA503["[KXA-503] Grão Categoria C"]:::variavel --- D7

    D7 -- "Aprovado (KXA-501 = 1)" --> DEST_A["Produto A<br>(Segue na Esteira)"]:::destino
    D7 -- "Comercial (KXA-501=0 e KXA-503=0)" --> DEST_B["Produto B<br>(Desvio Secundário)"]:::destino
    D7 -- "Rejeito (KXA-503 = 1)" --> E8["8. Ejeção Pneumática"]:::equipamento

    subgraph SISTEMA_PNEUMATICO [" Sistema Pneumático "]
        E8
        VAR_PT601["[PT-601] Pressão da Linha"]:::variavel --- E8
        VAR_PAL601["[PAL-601] Alarme Pressão Baixa"]:::variavel --- E8
        VAR_FY603["[FY-603] Comando Válvula Sopro"]:::variavel --- E8
        VAR_ZSH601["[ZSH-601] Avanço do Atuador"]:::variavel --- E8
    end

    E8 --> DEST_C["Produto C<br>(Recipiente de Rejeito)"]:::destino
    VAR_LIT703["[LIT-703] Nível Recipiente Rejeito"]:::variavel --- DEST_C

    subgraph COLETA [" 9. Coleta dos Produtos "]
        DEST_A --> COLET_A["Recipiente Categoria A"]:::destino
        DEST_B --> COLET_B["Recipiente Categoria B"]:::destino
        DEST_C --> COLET_C["Recipiente Categoria C"]:::destino
    end

    %% Conexões de Telemetria e Controle SCADA (Linhas Tracejadas)
    SCADA -.- VAR_LIT101
    SCADA -.- VAR_CMD_ALIM
    SCADA -.- VAR_ST201
    SCADA -.- VAR_JI201
    SCADA -.- VAR_FT301
    SCADA -.- VAR_KSA401
    SCADA -.- VAR_KXA501
    SCADA -.- VAR_KXA503
    SCADA -.- VAR_PAL601
    SCADA -.- VAR_LIT703
