# 🎮 MiaGames

App mobile de jogos educativos para crianças de 3 a 6 anos, construído com **Flutter**.

> Histórico de correções e próximos passos: [`docs/PLANO-DE-CORRECOES.md`](docs/PLANO-DE-CORRECOES.md).

---

## 🏛️ Arquitetura: shell Flutter + mini-jogos web

O Flutter é o **shell** do app: Home, navegação, tema, voz, progresso e Área dos pais. Cada jogo é um
**mini-app HTML/CSS/JS** em `assets/games/<jogo>/`, carregado numa WebView.
Os dois lados conversam por uma ponte JavaScript.

```
miagames/
├── lib/
│   ├── main.dart                  ← Ponto de entrada (cria o narrador real)
│   ├── app.dart                   ← MaterialApp + tema
│   ├── core/
│   │   ├── audio/narrator.dart    ← Voz em pt-BR (flutter_tts), injetável nos testes
│   │   ├── audio/configurable_narrator.dart ← Respeita a opção "Voz"
│   │   ├── bridge/game_message.dart ← Mensagens jogo → Flutter (parse seguro)
│   │   ├── bridge/game_session.dart ← Ponte de uma partida (INIT, voz, salvar)
│   │   ├── storage/progress_store.dart ← Recordes e preferências (shared_preferences)
│   │   ├── theme/                 ← Cores, espaçamento, ThemeData
│   │   └── widgets/               ← ExitGuard, bloqueio parental, estrelas
│   ├── modules/
│   │   ├── game_module.dart       ← Contrato de um jogo + dificuldades
│   │   └── game_registry.dart     ← Lista de jogos exibidos na Home
│   └── screens/
│       ├── home_screen.dart       ← Grid de jogos + seletor de dificuldade (com recordes)
│       ├── game_screen.dart       ← WebView + ponte com o jogo
│       └── parents_screen.dart    ← Área dos pais
├── assets/images/                 ← Ilustrações do app (ícones dos jogos)
├── assets/games/memory/           ← Jogo da Memória (mini-app web)
│   ├── index.html
│   ├── style.css
│   ├── img/                       ← Ilustrações dos animais (SVG)
│   ├── memory-logic.js            ← Regras puras (testadas no Node)
│   ├── sounds.js                  ← Efeitos sonoros sintetizados (Web Audio)
│   └── game.js                    ← DOM, timers e ponte
├── tool/generate_illustrations.py ← Gera os SVGs (python3, sem dependências)
├── test/
│   ├── *_test.dart                ← Testes Flutter
│   └── games/*.test.js            ← Testes da lógica dos jogos (node --test)
├── android/  ios/                 ← Projetos nativos
└── pubspec.yaml
```

### Ponte Flutter ↔ jogo

| Direção | Mensagem | Para quê |
|---------|----------|----------|
| Flutter → jogo | `window.handleFlutterMessage({type: 'INIT', difficulty, gameId, sound, best})` | Inicia a partida com a dificuldade, a preferência de som e o recorde atual (`{stars, moves}` ou `null`) |
| jogo → Flutter | `SPEAK {text}` | Fala um texto. A voz do navegador não funciona na WebView do Android |
| jogo → Flutter | `NAVIGATE_BACK` | Volta para a Home |
| jogo → Flutter | `GAME_COMPLETE {stars, moves, timeSeconds}` | Fim da partida: o Flutter salva o recorde |

O jogo envia com `MiaGamesFlutter.postMessage(JSON)`. O Flutter ignora
mensagens malformadas, e a WebView só navega para os arquivos locais do jogo.

### Adicionar um novo jogo

1. Criar `assets/games/<jogo>/` com `index.html`, que implementa `window.handleFlutterMessage` e usa as mensagens acima
2. Declarar a pasta **e cada subpasta** em `flutter.assets` no `pubspec.yaml`, porque o Flutter não inclui subpastas sozinho
3. Adicionar um `GameModule` em `lib/modules/game_registry.dart`, com a ilustração em `iconAsset`

A Home, o seletor de dificuldade e a tela de jogo funcionam automaticamente.

---

## 🎮 Jogo da Memória

Pares de animais ilustrados, com o nome de cada um falado ao virar a carta e
efeitos sonoros ao virar, acertar, errar e vencer.

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
- Resultado com 1 a 3 estrelas. Mais estrelas vencem o recorde; com as mesmas estrelas, vencem menos jogadas
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
- **Área dos pais** atrás de um bloqueio (conta de somar): liga e desliga voz e sons, mostra o progresso e permite apagá-lo
- Cards e cartas anunciados corretamente por leitores de tela

## 📈 Próximos passos

- Novos jogos: números, cores, traçado de letras
- Ícone do app (launcher) com arte final
- Compras no app, se houver, atrás do bloqueio parental
