# PBL SCADA-Core Automática

## Aula 01 - Kick-off & Arquitetura do SCADA

### Definição da Planta Industrial

**Planta escolhida:** Sistema Automatizado de Classificação e Seleção de Grãos por Visão Computacional

**Aplicação:** Agronegócio - processamento e classificação de grãos.

**Sistema de supervisão:** SCADA-Core Automática

---

# 1. Introdução

O projeto **SCADA-Core Automática** será aplicado a uma planta industrial destinada ao processamento, transporte, inspeção e classificação automatizada de grãos.

A planta recebe grãos provenientes de uma etapa anterior de produção, armazenamento ou beneficiamento e realiza seu transporte por meio de uma esteira de alta velocidade. Durante o deslocamento, os grãos são submetidos a um processo de inspeção utilizando visão computacional, responsável por identificar características como:

- Cor;
- Tamanho;
- Formato;
- Presença de pragas;
- Danos mecânicos;
- Deformações;
- Impurezas;
- Características fora do padrão de qualidade.

A partir da classificação realizada pelo sistema de visão, um conjunto de atuadores pneumáticos de resposta rápida realiza a separação dos grãos, direcionando cada unidade para a categoria correspondente.

O sistema será supervisionado por um sistema SCADA, responsável por apresentar ao operador as principais informações do processo, controlar determinados equipamentos, registrar eventos e alarmes e auxiliar na identificação de falhas.

Além da supervisão convencional, o projeto utilizará conceitos de matemática discreta para desenvolver os mecanismos computacionais internos do SCADA-Core Automática.

---

# 2. Objetivo da Planta

O objetivo principal da planta é realizar a **classificação automática de grãos em alta velocidade**, garantindo que cada produto seja direcionado para a categoria adequada de acordo com critérios previamente definidos.

O sistema deverá:

1. Receber os grãos através de um sistema de alimentação;
2. Controlar o fluxo de material para evitar sobrecarga;
3. Transportar os grãos por uma esteira;
4. Realizar a pesagem do material transportado;
5. Medir variáveis ambientais e operacionais;
6. Realizar a inspeção dos grãos por visão computacional;
7. Classificar os produtos conforme os critérios estabelecidos;
8. Acionar atuadores pneumáticos para realizar a separação;
9. Monitorar o rendimento de cada categoria;
10. Detectar condições anormais de operação;
11. Gerar alarmes para o operador;
12. Registrar eventos importantes do processo;
13. Realizar inter-travamentos para impedir operações inseguras;
14. Permitir o diagnóstico de falhas;
15. Apresentar as informações do processo através de uma interface SCADA.

---

# 3. Descrição Geral do Processo

O processo pode ser dividido nas seguintes etapas:

**Recepção → Alimentação → Transporte → Pesagem → Inspeção → Classificação → Ejeção → Coleta → Monitoramento**

O fluxo básico do processo é:

! IMAGEM

---


# 4. Etapas do Processo Industrial

## 4.1 Recepção e Alimentação

Os grãos chegam à planta e são depositados em um **funil de alimentação**.

O funil funciona como um reservatório temporário, permitindo que o material seja encaminhado de maneira controlada para a esteira.

O sistema deverá monitorar o nível de material presente no funil.

As principais condições consideradas são:

- Nível normal;
- Nível baixo;
- Nível alto;
- Nível crítico;
- Obstrução.

Uma condição de nível excessivamente alto pode indicar que os grãos não estão sendo transportados adequadamente.

Após o funil, um mecanismo de alimentação controla a quantidade de grãos que entra na esteira.

Esse mecanismo, para o nosso caso, é um alimentador vibratório, cuja função é manter uma quantidade adequada de grãos sobre a esteira.

Esse controle evita duas condições principais:

### Subalimentação

Poucos grãos entram no sistema.

Possíveis consequências:

- Baixa produtividade;
- Baixa utilização da capacidade da planta;
- Redução do rendimento.

### Sobrealimentação

Uma quantidade excessiva de grãos entra na esteira.

Possíveis consequências:

- Sobrecarga;
- Dificuldade de classificação;
- Sobreposição dos grãos;
- Redução da eficiência da visão computacional;
- Possível obstrução;
- Aumento da probabilidade de falha.

---

## 4.2 Transporte pela Esteira

Os grãos são transportados por uma **esteira de alta velocidade**, a qual terá o seu motor como um dos principais atuadores da planta.

A velocidade da esteira , a qual deve permanecer dentro de uma faixa operacional adequada, deverá ser monitorada continuamente, pois influencia diretamente a capacidade de processamento e a precisão da classificação.

A velocidade pode ser expressa por :
**[m/s]** ou  **[m/min]**

### Velocidade muito baixa

Pode causar:

- Redução da produtividade;
- Aumento do tempo de processamento;
- Concentração excessiva de produto.

### Velocidade muito alta

Pode causar:

- Redução da precisão da classificação;
- Dificuldade de sincronização entre câmera e atuadores;
- Falha na ejeção;
- Aumento da probabilidade de classificação incorreta;
- Perda de produtos.

---

## 4.3 Pesagem Contínua

Durante o transporte, a planta realizará uma **pesagem contínua dos grãos**.

O sistema poderá utilizar uma célula de carga ou dispositivo equivalente para estimar a massa de material processado.

A principal variável, a massa, será expressa por : **[kg]**

A partir da massa e do intervalo de tempo, pode-se calcular a vazão mássica:

$$
Q_m = \frac{\Delta m}{\Delta t}
$$

Onde:

- $Q_m$ = vazão mássica;
- $\Delta m$ = variação da massa;
- $\Delta t$ = intervalo de tempo.

A vazão poderá ser utilizada para determinar e acompanhar o rendimento da planta.

---

## 4.4 Inspeção por Visão Computacional

Depois da pesagem, os grãos passam por uma região de inspeção.

Nesse ponto, uma câmera realiza a **aquisição de imagens dos produtos**.

O sistema de visão deverá identificar características relevantes dos grãos, como:

### Cor

Permite identificar diferenças de coloração entre os produtos.

### Tamanho

Permite separar grãos maiores e menores.

### Formato

Permite identificar deformações ou características geométricas fora do padrão.

### Danos mecânicos

Permite identificar:

- Rachaduras;
- Quebras;
- Deformações;
- Regiões danificadas.

### Pragas

O sistema poderá identificar características visuais associadas à presença de pragas.

---

## 4.5 Classificação do tipo dos grãos agrícolas

Os grãos serão separados em 3 categorias diferentes, que serão explicadas no **tópico 5**.

---

## 4.5 Sistema de Ejeção Pneumática

A separação dos grãos será realizada através de **atuadores pneumáticos de alta velocidade**.

O sistema deverá identificar a posição do grão na esteira e acionar o atuador correspondente no instante correto.

A lógica simplificada é:


É fundamental para o funcionamento correto da planta a sincronização entre:

- Câmera;
- Velocidade da esteira;
- Posição do grão;
- Controlador;
- Válvula pneumática;
- Atuador.

---

## 4.5 Coleta e Monitoramento

Após a classificação, cada categoria será direcionada para um recipiente ou linha de coleta.

A planta poderá possuir:

- Recipiente para produtos aprovados;
- Recipiente para produtos secundários;
- Recipiente para produtos rejeitados.

Cada recipiente poderá possuir sensores de nível ou massa para determinar quando sua capacidade.

Já em relação ao monitoramento, com base nos dados obtidos a partir das etapas anteriores, pode-se obter a vazão atual, a massa processada, rendimento em relação a cada Categoria (Aprovado, Secundário ou Rejeitado).
Além de poder estipular o número de grãos total, o faturamento em cima dos grãos já processados, entre outros.

---

# 5. Categoria do Produto Processado

Para o desenvolvimento inicial do projeto, será considerado um sistema genérico de **classificação de grãos agrícolas**, podendo representar, por exemplo:

- Café;
- Soja;
- Milho;
- Feijão;
- Outros produtos agrícolas com características físicas classificáveis.

A escolha por um modelo genérico permite que o projeto mantenha seu foco na **automação e na arquitetura do SCADA**, sem ficar excessivamente dependente das características específicas de um único produto.

Para fins de simulação e desenvolvimento, os grãos poderão ser classificados em três categorias principais:

## 5.1 Categoria A - Produto Aprovado

Representa os grãos que atendem aos critérios de qualidade estabelecidos.

Características esperadas:

- Tamanho adequado;
- Coloração dentro do padrão;
- Ausência de danos significativos;
- Ausência de pragas detectadas;
- Ausência de deformações relevantes.

Esses produtos serão direcionados para o recipiente destinado aos grãos aprovados.

---

## 5.2 Categoria B - Produto Secundário

Representa os grãos que não apresentam características suficientemente adequadas para a categoria principal, mas que ainda podem ser aproveitados.

Exemplos:

- Tamanho inferior ao padrão;
- Pequenas variações de coloração;
- Pequenas imperfeições;
- Características parcialmente fora da especificação principal.

Esses produtos serão direcionados para uma linha ou recipiente de classificação secundária.

---

## 5.3 Categoria C - Produto Rejeitado

Representa os grãos que apresentam características incompatíveis com os padrões estabelecidos.

Exemplos:

- Presença de pragas;
- Danos mecânicos severos;
- Coloração inadequada;
- Deformações significativas;
- Impurezas;
- Tamanho extremamente fora do padrão.

Esses produtos serão direcionados para o recipiente de rejeitos.
