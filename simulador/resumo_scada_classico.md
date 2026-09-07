# Walkthrough: Adoção do Padrão SCADA Industrial Clássico (Estética WinCC / InTouch - Imagem de Referência 2)

A interface do supervisório foi totalmente reestruturada para refletir o padrão autêntico e consagrado de **SCADA Industrial Clássico** (como em sistemas **Siemens WinCC**, **Wonderware InTouch** e **Citect**), correspondendo exatamente à **Imagem de Referência (2)** fornecida (`Complex geotermal computerizat`).

Qualquer aspecto remanescente de "dark mode web app" ou alto contraste moderno foi substituído pela paleta, ergonomia e simbologia que engenheiros de automação encontram em plantas industriais reais.

---

## 🎨 Principais Mudanças Visuais e de Ergonomia

### 1. Fundo do Sinótico em Verde-Ardósia / Teal Industrial (`#4d7373`)
- O sinótico principal (tanto o fluxograma P&ID quanto o gêmeo físico 2D) agora utiliza a clássica cor de fundo **Teal Industrial (`#4d7373`)** com **malha matricial de pontos de alinhamento técnico (Dotted Grid)**, fiel à Imagem de Referência 2.

### 2. Chassi da Estação e Janelas em Cinza de Painel (`#d4d0c8`) com Relevo 3D
- Toda a moldura da aplicação, cabeçalhos, barras de ferramentas e consoles laterais adotam o cinza industrial `#d4d0c8` com bordas chanfradas em relevo 3D (*beveled edges* salientes e rebaixadas no estilo clássico do Windows NT / WinCC).

### 3. Tubulações em Aço Cinza com Contorno Preto de 2px
- As tubulações foram desenhadas com espessura sólida, preenchimento em aço cinza-claro (`#dcdcdc`), contorno preto nítido (`#000000`, 2px) e **setas direcionais de fluxo (`►`, `▼`)** em caixas integradas aos tubos.

### 4. Displays Digitais (IO Fields) em Caixas Pretas Rebaixadas
- As grandezas de processo são exibidas em caixas pretas rebaixadas (*sunken 3D boxes*) com tipografia digital de alto contraste e legibilidade:
  - **Verde Fosforescente (`#00ff00`)**: Valores em regime normal (velocidade da esteira `ST-201`, pressão `PT-601`, etc.).
  - **Amarelo (`#ffff00`)**: Valores de vazão mássica `FT-301` e corrente do motor `JI-201`.
  - **Branco / Vermelho**: Contadores acumulados e indicações de alarme.

### 5. Bombas, Motores e Válvulas com Blocos de Estado `[ON]` / `[OFF]`
- Símbolos clássicos ANSI/ISA:
  - **Motor M-201**: Círculo com saída tangencial, **verde sólido (`#00c000`)** em marcha e **vermelho (`#c00000`)** quando parado, acompanhado dos blocos 3D `[ON]` (verde) e `[OFF]` (vermelho), como nas bombas da Imagem de Referência 2.
  - **Válvulas Solenoides XV-603 e XV-602**: Triângulos opostos com atuador solenoide `[S]` no topo e blocos de estado `[ON]` / `[OFF]`.
  - **Funil e Silos**: Vasos em aço cinza com bordas pretas, colunas analógicas de nível e displays digitais integrados.

### 6. Barra de Alarmes de Rodapé (ISA-18.2 / Imagem de Referência 2)
- Faixa horizontal preta com borda rebaixada, exibindo mensagens de alarme em **vermelho vivo (`ALR PT_601...`)** ou texto em verde quando nominal, acompanhada de botoeiras chanfradas:
  - `[ ✓ ACK ALARME ]`
  - `[ 🔔 MUTE ]`

### 7. Indicador de Comunicação PLC-SCADA
- Cabeçalho superior com caixa clássica de status:
  - `Comunicatii PLC - SCADA: [ DA ] (em verde vivo)`, exatamente como na Imagem de Referência 2.
  - Informações de scan (`10ms`), estação (`HMI-WS01`) e operador (`OP01`).

---

## 📁 Arquivos Atualizados

1. **`simulador/css/style.css`**: Design System completo de SCADA clássico (variáveis de cor, bordas 3D chanfradas `.bevel-raised`, `.bevel-sunken`, displays digitais `.scada-io-field`, botões clássicos `.btn-classic`, bloquinhos `.state-block`).
2. **`simulador/index.html`**: Layout da estação reestruturado com cabeçalho cinza, viewport de processo teal `#4d7373`, mesa de comando clássica, abas de navegação WinCC e faixa de alarmes.
3. **`simulador/js/scada_industrial.js`**: Renderização completa do canvas P&ID em `#4d7373` com malha de pontos, tubulações espessas cinza/preto, setas direcionais, displays digitais integrados e blocos `[ON]` / `[OFF]`.
4. **`simulador/js/scada.js`**: Atualização do gêmeo físico 2D para fundo teal `#4d7373`, chassi mecânico cinza e elementos sem estilo gamer.
5. **`simulador/js/charts.js`**: Registrador gráfico de tendência em fundo preto com grade técnica verde escura e traço amarelo/verde.
6. **`simulador/js/vision.js`**: Monitor de visão de máquina industrial com retícula verde escura e telemetria de alto contraste sobre fundo preto.

---

## 🧪 Verificação Sintática e Operacional

- `node --check simulador/js/scada.js`: Sucesso (0 erros).
- `node --check simulador/js/scada_industrial.js`: Sucesso (0 erros).
- `node --check simulador/js/charts.js`: Sucesso (0 erros).
- `node --check simulador/js/vision.js`: Sucesso (0 erros).
- Validação da árvore HTML com Python: `HTML Syntax OK` (0 erros).

---

## 🚀 Como Visualizar

Para rodar o servidor local:
```bash
py simulador/run_simulador.py
```
Abra no navegador em `http://localhost:8080` ou abra diretamente:
[simulador/index.html](file:///c:/Users/migue/Documents/.autom%C3%A1tica/Scada%20github/SCADA-Core_Automatica_GRUPO4/simulador/index.html).
