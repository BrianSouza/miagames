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

## Fase 3 — Corretude da lógica do jogo

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 3.1 | **Reiniciar durante os 800ms de verificação corrompia o jogo novo**: o timer antigo disparava sobre as cartas novas (os ids se repetem) e podia marcar como par cartas que não formam par | O timer pendente é cancelado no reinício, e cada partida tem um número de rodada. Uma verificação de outra rodada é ignorada | ✅ |
| 3.2 | O cronômetro começava quando o tabuleiro aparecia | Começa no primeiro toque | ✅ |
| 3.3 | Mensagens inválidas da WebView derrubavam a tela (`jsonDecode` sem tratamento) | Mensagens malformadas são ignoradas | ✅ |
| 3.4 | A WebView podia navegar para qualquer URL | Só são permitidos os arquivos locais do jogo | ✅ |
| 3.5 | Leitor de tela anunciava a carta escondida como "Carta virada" | "Carta escondida", e a carta aberta anuncia o animal | ✅ |

## Fase 4 — Usabilidade para crianças de 3 a 6 anos

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 4.1 | Nenhum som: quem não lê não tem retorno nenhum | Narração em pt-BR com `flutter_tts`: o nome do animal de cada carta, "Muito bem!" a cada par, comemoração no final e os nomes dos jogos e das dificuldades. O jogo pede a fala ao Flutter pela ponte (`SPEAK`), já que a voz do navegador não funciona na WebView do Android | ✅ |
| 4.2 | Contraste ruim: texto branco sobre turquesa (1.9:1), contador turquesa, "jogadas" cinza-claro sobre branco | Cores de texto e botões com contraste ≥ 4.5:1 (WCAG AA) | ✅ |
| 4.3 | Botões do jogo com 44px, abaixo dos 56px usados no resto do app | 56px | ✅ |
| 4.4 | Tabuleiro limitado a 420px de largura (pequeno em tablets) e calculado só pela largura | Tamanho calculado pela largura **e** pela altura disponíveis | ✅ |
| 4.5 | Um toque no "voltar" do jogo ou no voltar do sistema encerrava a partida sem querer | No jogo, é preciso **segurar** o botão voltar. No sistema, é preciso tocar voltar duas vezes. Um toque só mostra a dica | ✅ |
| 4.6 | Ícones e ilustrações próprios em vez de emoji | Precisa de assets de design | ⏭️ |
| 4.7 | Sons de efeito (virar, acerto) além da voz | Precisa de arquivos de áudio | ⏭️ |
| 4.8 | Salvar o progresso e as estrelas (`GAME_COMPLETE` já chega ao Flutter) | Persistência local, como `shared_preferences` | ⏭️ |
| 4.9 | Bloqueio de controle parental para configurações e compras | Só faz sentido quando existirem essas telas | ⏭️ |

---

## Como rodar

```bash
flutter pub get
flutter run                      # emulador Android, simulador iOS ou aparelho conectado

flutter analyze                  # análise estática
flutter test                     # testes do app Flutter
node --test test/games/*.test.js # testes da lógica dos jogos (Node 18+)
```
