# Simulador & Gêmeo Digital SCADA-Core Automática

Este diretório contém o **Protótipo Interativo e Simulador Industrial** da planta de **Classificação Óptica de Grãos por Visão Computacional e Ejeção Pneumática**, desenvolvido sob os preceitos da Engenharia de Controle e Automação.

---

## 🚀 Como Executar

Você pode executar o simulador de duas formas simples:

### Opção 1: Via Python Launcher (Recomendado)
No terminal, execute:
```bash
py simulador/run_simulador.py
```
*O launcher iniciará o servidor local e abrirá automaticamente o painel SCADA no seu navegador padrão (`http://localhost:8080`).*

### Opção 2: Abertura Direta
Abra o arquivo `simulador/index.html` em qualquer navegador web moderno (Google Chrome, Microsoft Edge, Firefox, etc.).

---

## 🛠️ Arquitetura e Módulos do Sistema

| Arquivo | Função / Camada |
| :--- | :--- |
| `index.html` | Interface HMI / SCADA com Sinótico 2D, Mesa de Comando, Quadro de Alarmes e Painel de Falhas |
| `css/style.css` | Estilos industriais escuros, lâmpadas piloto com glow neon e botões industriais táteis |
| `js/logic.js` | CLP Virtual com a cadeia de **Lógica Proposicional** e intertravamentos de segurança (ISA 5.1) |
| `js/vision.js` | Sistema de **Visão Computacional** com extração de atributos dos grãos e HUD estilo OpenCV |
| `js/engine.js` | Motor de **Cinemática e Física** da esteira, alimentador vibratório, balança e pistão pneumático |
| `js/charts.js` | Historiador e gráficos em tempo real de vazão mássica ($FT-301$) e distribuição de categorias |
| `js/scada.js` | Controlador central da supervisão, renderizador do sinótico e gerenciador de alarmes (ISA 18.2) |
| `run_simulador.py` | Servidor HTTP local standalone com auto-start no navegador |

---

## 🏷️ Mapeamento de Tags e Variáveis (Norma ISA 5.1)

### Instrumentação e Entradas:
- **`LIT-101`**: Transmissor de nível do funil de recepção (`p_NB101`, `p_NA101`, `p_NC101`).
- **`ST-201`**: Encoder de velocidade da esteira transportadora (`p_MOV201`, `p_VB201`, `p_VA201`, `p_VN201`).
- **`WT-301` / `FT-301`**: Célula de carga e vazão mássica instantânea calculada ($Q_m = \frac{\Delta m}{\Delta t}$).
- **`XS-401`**: Sensor fotoelétrico de barreira (trigger óptico de aquisição de imagem).
- **`KSA-401`**: Status de comunicação da câmera industrial (`p_KSA401`).
- **`CV-101` a `CV-109`**: Proposições da visão computacional (cor, tamanho, formato, danos, pragas, impurezas).
- **`PT-601` / `PAL-601`**: Transmissor e pressostato da linha pneumática de ar comprimido.
- **`JI-201`**: Relé de sobrecarga do motor de tração da esteira.
- **`ZSH-601`**: Sensor magnético de fim de curso (confirmação física do avanço do pistão).
- **`LIT-703`**: Sensor de nível do Silo de Rejeito Categoria C (`p_NA703`, `p_NC703`).
- **`XA-901`**: Botoeira de Parada de Emergência (`p_EMERG`).

### Equações Lógicas do CLP:
1. **Permissão Geral de Operação (`c_PERM`)**:
   $$c_{\text{PERM}} \leftrightarrow (\neg p_{\text{EMERG}} \land \neg p_{\text{JI201}} \land \neg p_{\text{PAL601}} \land p_{\text{KSA401}} \land \neg p_{\text{NC703}})$$
2. **Comando do Alimentador Vibratório (`c_ALIM`)**:
   $$c_{\text{ALIM}} \leftrightarrow (c_{\text{PERM}} \land p_{\text{MOV201}} \land \neg p_{\text{NB101}})$$
3. **Classificação Categoria A (`p_A`)**:
   $$p_{\text{A}} \leftrightarrow (p_{\text{CV101}} \land p_{\text{CV103}} \land p_{\text{CV105}} \land \neg p_{\text{CV107}} \land \neg p_{\text{CV108}} \land \neg p_{\text{CV109}})$$
4. **Classificação Categoria C (`p_C`)**:
   $$p_{\text{C}} \leftrightarrow (p_{\text{CV107}} \lor p_{\text{CV108}} \lor p_{\text{CV109}} \lor (\neg p_{\text{CV101}} \land \neg p_{\text{CV102}}) \lor (\neg p_{\text{CV103}} \land \neg p_{\text{CV104}}) \lor (\neg p_{\text{CV105}} \land \neg p_{\text{CV106}}))$$
5. **Classificação Categoria B (`p_B`)**:
   $$p_{\text{B}} \leftrightarrow (\neg p_{\text{A}} \land \neg p_{\text{C}})$$
6. **Comando de Disparo do Ejetor Pneumático (`c_FY603`)**:
   $$c_{\text{FY603}} \leftrightarrow (p_{\text{C}} \land p_{\text{POS603}} \land \neg p_{\text{PAL601}})$$

---

## 🧪 Recursos de Comissionamento e Teste
O painel inclui chaves de **Injeção de Falhas**, permitindo validar em tempo real o desarmamento dos permissivos, a atuação de alarmes segundo a **ISA 18.2** e o diagnóstico de falha de ejetor (`p_FALHA_EJETOR`).
