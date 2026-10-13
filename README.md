# 🎮 MiaGames

App mobile de jogos educativos para crianças de 3 a 6 anos, construído com **Flutter**.

> Histórico de correções e próximos passos: [`docs/PLANO-DE-CORRECOES.md`](docs/PLANO-DE-CORRECOES.md).

---

## 🏛️ Arquitetura: shell Flutter + mini-jogos web

O Flutter é o **shell** do app: Home, navegação, tema e voz. Cada jogo é um
**mini-app HTML/CSS/JS** em `assets/games/<jogo>/`, carregado numa WebView.
Os dois lados conversam por uma ponte JavaScript.

```
miagames/
├── lib/
│   ├── main.dart                  ← Ponto de entrada (cria o narrador real)
│   ├── app.dart                   ← MaterialApp + tema
│   ├── core/
│   │   ├── audio/narrator.dart    ← Voz em pt-BR (flutter_tts), injetável nos testes
│   │   ├── bridge/game_message.dart ← Mensagens jogo → Flutter (parse seguro)
│   │   ├── theme/                 ← Cores, espaçamento, ThemeData
│   │   └── widgets/exit_guard.dart  ← "Voltar" do sistema exige dois toques
│   ├── modules/
│   │   ├── game_module.dart       ← Contrato de um jogo + dificuldades
│   │   └── game_registry.dart     ← Lista de jogos exibidos na Home
│   └── screens/
│       ├── home_screen.dart       ← Grid de jogos + seletor de dificuldade
│       └── game_screen.dart       ← WebView + ponte com o jogo
├── assets/games/memory/           ← Jogo da Memória (mini-app web)
│   ├── index.html
│   ├── style.css
│   ├── memory-logic.js            ← Regras puras (testadas no Node)
│   └── game.js                    ← DOM, timers e ponte
├── test/
│   ├── *_test.dart                ← Testes Flutter
│   └── games/*.test.js            ← Testes da lógica dos jogos (node --test)
├── android/  ios/                 ← Projetos nativos
└── pubspec.yaml
```

### Ponte Flutter ↔ jogo

| Direção | Mensagem | Para quê |
|---------|----------|----------|
| Flutter → jogo | `window.handleFlutterMessage({type: 'INIT', difficulty, gameId})` | Inicia a partida na dificuldade escolhida |
| jogo → Flutter | `SPEAK {text}` | Fala um texto. A voz do navegador não funciona na WebView do Android |
| jogo → Flutter | `NAVIGATE_BACK` | Volta para a Home |
| jogo → Flutter | `GAME_COMPLETE {moves, stars, timeSeconds, …}` | Fim da partida (base para salvar progresso) |

O jogo envia com `MiaGamesFlutter.postMessage(JSON)`. O Flutter ignora
mensagens malformadas, e a WebView só navega para os arquivos locais do jogo.

### Adicionar um novo jogo

1. Criar `assets/games/<jogo>/` com `index.html`, que implementa `window.handleFlutterMessage` e usa as mensagens acima
2. Declarar a pasta em `flutter.assets` no `pubspec.yaml`
3. Adicionar um `GameModule` em `lib/modules/game_registry.dart`

A Home, o seletor de dificuldade e a tela de jogo funcionam automaticamente.

---

## 🎮 Jogo da Memória

Pares de animais, com o nome de cada um falado ao virar a carta.

| Nível   | Pares | Colunas |
|---------|-------|---------|
| Fácil   | 6     | 3       |
| Médio   | 8     | 4       |
| Difícil | 10    | 4       |

```
playing ─(1ª carta: inicia o cronômetro)→ playing ─(2ª carta)→ checking (800ms)
                                                                 ├── par    → playing | completed
                                                                 └── errou  → playing
```

- As regras ficam em `memory-logic.js`, com funções puras: cada jogada devolve um estado novo
- Cada partida tem um número de rodada. Uma verificação agendada antes de reiniciar é ignorada
- O tamanho das cartas é calculado pela largura **e** pela altura disponíveis, então o tabuleiro cabe em qualquer tela
- Embaralhamento Fisher-Yates

---

## 🚀 Como executar

```bash
flutter pub get
flutter run                        # emulador Android, simulador iOS ou aparelho conectado

flutter analyze                    # análise estática
flutter test                       # testes do app Flutter
node --test test/games/*.test.js   # testes da lógica dos jogos (Node 18+)
```

Os mesmos comandos, além de um build Android, rodam no CI a cada PR.

---

## ♿ Pensado para crianças de 3 a 6 anos

- Voz em pt-BR: nomes dos jogos, das dificuldades e dos animais, e comemoração a cada par
- Áreas de toque de no mínimo 56px
- Texto e botões com contraste ≥ 4.5:1 (WCAG AA)
- Sair do jogo exige **segurar** o botão voltar do jogo ou tocar **duas vezes** no voltar do sistema
- Cards e cartas anunciados corretamente por leitores de tela

## 📈 Próximos passos

- Ilustrações próprias no lugar de emoji
- Efeitos sonoros (virar, acerto, vitória)
- Salvar estrelas e progresso (`GAME_COMPLETE` já chega ao Flutter)
- Novos jogos: números, cores, traçado de letras
