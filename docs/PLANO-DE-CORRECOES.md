# Plano de correções — MiaGames (Flutter)

O app foi migrado de React Native para **Flutter** (PR #2). O Flutter faz o
"shell" (Home, navegação, tema, voz) e cada jogo é um mini-app HTML/CSS/JS
carregado numa WebView, conversando com o Flutter por uma ponte JavaScript.

Este plano parte da avaliação do estado em que o PR #2 deixou o projeto. O
app **não compilava** no Flutter atual, não tinha as pastas `android/` e
`ios/` e ainda carregava todo o código React Native. Os problemas da avaliação
anterior que continuavam valendo na versão Flutter também entram aqui.

Legenda: ✅ feito · ⏭️ fica para depois

---

## Fase 1 — Fazer o app compilar e rodar (bloqueante)

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 1.1 | `CardTheme` passado para `ThemeData.cardTheme`, que hoje espera `CardThemeData` (erro de compilação, nenhum teste rodava) | Usar `CardThemeData` | ✅ |
| 1.2 | Sem as pastas `android/` e `ios/`: `flutter run` impossível | Geradas com `flutter create --platforms=android,ios` | ✅ |
| 1.3 | Código React Native inteiro ainda no repositório (`src/`, `App.tsx`, `package.json`, Babel, tsconfig) | Removido. O histórico fica no git | ✅ |
| 1.4 | Sem `pubspec.lock` (builds não reproduzíveis) | Versionado, como recomendado para apps | ✅ |
| 1.5 | APIs obsoletas (`withOpacity`) e `flutter_lints` desatualizado | `withValues(alpha: …)` e `flutter_lints` 6 | ✅ |

**Critério de pronto:** `flutter analyze` sem problemas e `flutter run` abre o app.

## Fase 2 — Testes e CI

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 2.1 | A lógica do jogo ficava misturada com o DOM em `game.js`: impossível de testar | Regras extraídas para `memory-logic.js`, com funções puras que rodam no navegador e no Node | ✅ |
| 2.2 | Nenhum teste da lógica do jogo | Testes com `node --test` em `test/games/` (sem dependências; fora de `assets/` para não irem dentro do app) | ✅ |
| 2.3 | Um único teste de widget, sem cobrir a navegação | Testes da Home, do seletor de dificuldade, da narração e da ponte com o jogo | ✅ |
| 2.4 | Sem CI | GitHub Actions: `flutter analyze`, `flutter test` e `node --test` | ✅ |
| 2.5 | O jogo só era conferido à mão, num navegador | **Testes de navegador com Playwright** (`test/e2e/`, 54 testes): partida completa, bug do reinício, segurar para sair, sons, recorde e tabuleiro em 6 tamanhos de tela × 3 dificuldades. O relógio é falso e pausado, então os testes são rápidos e deterministas. Rodam no CI, com relatório e traces em caso de falha | ✅ |

## Fase 3 — Corretude da lógica do jogo

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 3.1 | **Reiniciar durante os 800ms de verificação corrompia o jogo novo**: o timer antigo disparava sobre as cartas novas (os ids se repetem) e podia marcar como par cartas que não formam par | O timer pendente é cancelado no reinício, e cada partida tem um número de rodada. Uma verificação de outra rodada é ignorada | ✅ |
| 3.2 | O cronômetro começava quando o tabuleiro aparecia | Começa no primeiro toque | ✅ |
| 3.3 | Mensagens inválidas da WebView derrubavam a tela (`jsonDecode` sem tratamento) | Mensagens malformadas são ignoradas | ✅ |
| 3.4 | A WebView podia navegar para qualquer URL | Só são permitidos os arquivos locais do jogo | ✅ |
| 3.5 | Leitor de tela anunciava a carta escondida como "Carta virada" | "Carta escondida", e a carta aberta anuncia "Letra B" ou "Número 3" | ✅ |

## Fase 4 — Usabilidade para crianças de 3 a 6 anos

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 4.1 | Nenhum som: quem não lê não tem retorno nenhum | Narração em pt-BR com `flutter_tts`: o nome da letra ou do número de cada carta, "Muito bem!" a cada par, comemoração no final e os nomes dos jogos e das dificuldades. O jogo pede a fala ao Flutter pela ponte (`SPEAK`), já que a voz do navegador não funciona na WebView do Android | ✅ |
| 4.2 | Contraste ruim: texto branco sobre turquesa (1.9:1), contador turquesa, "jogadas" cinza-claro sobre branco | Cores de texto e botões com contraste ≥ 4.5:1 (WCAG AA) | ✅ |
| 4.3 | Botões do jogo com 44px, abaixo dos 56px usados no resto do app | 56px | ✅ |
| 4.4 | Tabuleiro limitado a 420px de largura (pequeno em tablets) e calculado só pela largura | Tamanho calculado pela largura **e** pela altura disponíveis | ✅ |
| 4.5 | Um toque no "voltar" do jogo ou no voltar do sistema encerrava a partida sem querer | No jogo, é preciso **segurar** o botão voltar. No sistema, é preciso tocar voltar duas vezes. Um toque só mostra a dica | ✅ |
| 4.6 | Emoji no lugar de ilustrações: a aparência mudava de um aparelho para outro | Ícone do jogo e estrelas do resultado em SVG, desenhados com traços (sem `<text>`, que o `flutter_svg` não desenha). Gerados por `tool/generate_illustrations.py` | ✅ |
| 4.7 | Nenhum efeito sonoro além da voz | Sons de virar, acertar, errar e vencer, **sintetizados** com a Web Audio API (`sounds.js`), sem arquivos de áudio. Volume baixo, para não cobrir a voz | ✅ |
| 4.8 | O progresso se perdia ao fechar o app | Recordes por jogo e dificuldade (estrelas, jogadas, tempo, partidas) salvos com `shared_preferences`. O seletor de dificuldade mostra o recorde, e o jogo exibe "Novo recorde!" quando ele é batido | ✅ |
| 4.9 | Sem bloqueio parental | A **Área dos pais** (voz, sons, progresso, apagar progresso) só abre depois de uma conta de somar com resultado de 10 a 18, que crianças de 3 a 6 anos não resolvem | ✅ |
| 4.10 | Compras no app | Ainda não existem. Quando existirem, devem passar pelo mesmo bloqueio | ⏭️ |
| 4.11 | Ícone do app (launcher) próprio | Ícone e splash com a **gatinha Mia**, desenhada em código (`tool/mia.py`): ícone adaptativo e monocromático (Android 13) com `flutter_launcher_icons`, splash com `flutter_native_splash` (inclusive Android 12). O recorte circular e arredondado foi conferido em imagem; o visual no aparelho só se confirma no tablet | ✅ |
| 4.12 | O jogo usava emoji de animais; a criança está em fase de **alfabetização** e o jogo precisa ensinar letras e números | Jogo da Memória com **letras (A–Z) e números (0–9)**: ~60% letras, ~40% números. A voz fala o **nome** da letra em português. Fonte **Andika**, própria para quem aprende a ler. Nunca juntam "O"/"0" nem "I"/"1" no mesmo tabuleiro | ✅ |
| 4.15 | A dificuldade só mudava o número de cartas; a criança precisa avançar nos números | O alcance dos números cresce com o nível: **fácil 0–9, médio 0–20, difícil 0–50**, falados por extenso ("Trinta e sete"). Números de dois algarismos têm fonte menor para caberem na carta. Não juntam números com algarismos invertidos (12 e 21). O seletor mostra o alcance de cada nível | ✅ |
| 4.16 | A interface era feita para um adulto: etiquetas de texto na Home, "00:00 · 0 jogadas" no jogo, estatísticas no fim e tela presa na vertical | **Redesenho para 5 anos:** a Mia na Home, cartões grandes só com figura e voz, nível sugerido pela Mia, estrelas de progresso no lugar do cronômetro, balanço leve ao errar, tela de parabéns com confete, e a tela gira (paisagem). Kit visual compartilhado em `assets/games/_shared/`. Fica a confirmar no tablet: se uma criança de 5 anos entende o fluxo sem ajuda | ✅ |
| 4.17 | Subir de nível era fácil demais (3 níveis, 2 estrelas com 3 de 8 acertos) e, com a trilha curta, a criança chegava ao fim rápido | **Trilha de 6 níveis por jogo.** Cada nível abre com 2 estrelas no anterior e as estrelas ficam mais exigentes (nos jogos de responder: 2★ = 4, 5, 5, 6, 6 e 7 acertos de primeira de 8; 3★ = 6, 7, 7, 7, 8 e 8). O conteúdo cresce junto (Memória de 4 a 14 pares; letras parecidas como E/F; contar até 20; palavras de 3 sílabas). Mia comemora cada nível aberto. Os limiares são estimativas: ficam em `LEVELS` para ajustar com o uso real | ✅ |
| 4.18 | Faltava um jogo de escrita/contorno para quem está aprendendo as letras | **Colorir**: pinta com o dedo dentro de letras e palavras; a tinta só aparece dentro da forma e as saídas do contorno viram a pontuação. 6 níveis (vogais → todas as letras → minúsculas → palavras). Tolerância e pincel estimados, para ajustar com a criança | ✅ |
| 4.19 | O app ainda não cativava | **Vestir a Mia**: as estrelas somadas abrem 9 acessórios (de 3 a 72 estrelas) e a Mia os veste na Home, no seletor e dentro dos jogos. Se cativa, só o uso mostra | ✅ |
| 4.20 | A filha gosta de tocar e arrastar coisas na tela | **Kit de arrastar** (`_shared/drag.js` e `drag-logic.js`): Pointer Events, a peça levanta acima do dedo, folga generosa para soltar, volta suave se errar, um dedo por vez, cancela ao girar a tela. Ao testar, apareceram dois erros reais, já corrigidos: a peça com a dica pulsando não seguia o dedo (a animação de CSS mandava mais que o arrasto) e a classe `.hint` colidia com a do kit | ✅ |
| 4.21 | Arrastar para aprender a ler | **Montar a palavra**: arrasta as sílabas para as lacunas embaixo do desenho; 6 níveis (de 2 a 3 sílabas, com 0 a 3 peças a mais, parecidas no fim de cada grupo) | ✅ |
| 4.22 | Arrastar para separar e contar | **Na caixa certa**: separa letras e números, vogais e consoantes, ou dá a quantidade pedida ao prato ("Dê 3 maçãs para a Mia!"); a voz conta cada objeto; 6 níveis | ✅ |
| 4.23 | Arrastar para montar | **Quebra-cabeça**: o desenho de uma palavra cortado em 2 a 16 peças, com o desenho esmaecido de guia nos 4 primeiros níveis; a palavra aparece escrita quando fica pronto | ✅ |
| 4.13 | Casar maiúscula com minúscula ("A" com "a"), como a escola ensina | Modo extra do Jogo da Memória, com cartas de pares diferentes | ⏭️ |
| 4.14 | Jogos só de letras ou só de números, e escolher o conjunto de letras (ex.: só as do nome) | Seletor de conteúdo antes da partida | ⏭️ |

---

## Como rodar

```bash
flutter pub get
flutter run                      # emulador Android, simulador iOS ou aparelho conectado

flutter analyze                  # análise estática
flutter test                     # testes do app Flutter
node --test test/games/*.test.js # testes da lógica dos jogos (Node 18+)
npm ci && npx playwright install chromium   # uma vez
npm run test:e2e                 # testes de navegador (Playwright)
```
