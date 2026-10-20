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
│   │   └── widgets/               ← ExitGuard, bloqueio parental, estrelas, Mia (MiaAvatar), cartão de jogo
│   ├── modules/
│   │   ├── game_module.dart       ← Contrato de um jogo + os 6 níveis
│   │   ├── game_registry.dart     ← Lista de jogos exibidos na Home
│   │   ├── level_progress.dart    ← Níveis abertos (2 estrelas abrem o próximo) e o que a Mia sugere
│   │   ├── outfits.dart           ← Os acessórios da Mia, seus limiares de estrelas e a regra de vestir
│   │   └── outfit_progress.dart   ← Total de estrelas e o que a Mia veste agora
│   └── screens/
│       ├── home_screen.dart       ← A Mia acena + cartões grandes dos jogos (grade adaptativa)
│       ├── level_sheet.dart       ← Trilha dos 6 níveis: estrelas, cadeados e a sugestão da Mia
│       ├── wardrobe_screen.dart   ← Guarda-roupa da Mia
│       ├── game_screen.dart       ← WebView + ponte com o jogo
│       └── parents_screen.dart    ← Área dos pais
├── assets/images/                 ← Ícones dos jogos e a gatinha Mia em 4 poses (SVG)
├── assets/icon/  assets/splash/   ← PNGs do ícone do app e do splash (gerados, veja abaixo)
├── assets/games/_shared/          ← Kit comum dos jogos (carregado por `../_shared/...`)
│   ├── kit.css                    ← Reset, fonte e cores
│   ├── bridge.js                  ← Ponte com o Flutter (INIT, voz, fim de jogo, voltar)
│   ├── hold-exit.js               ← Segurar para sair
│   ├── kit.js                     ← Cabeçalho: voltar, estrelas de progresso, ouvir de novo, reiniciar
│   ├── result.js  confetti.js     ← Tela de parabéns (Mia, estrelas, confete)
│   ├── game-utils.js              ← Contas comuns: encaixe na tela, estrelas, recorde, tempo
│   ├── quiz.js                    ← Motor dos jogos de responder (rodadas, erros, dica, estrelas)
│   ├── drag.js  drag-logic.js     ← Kit de arrastar (Pointer Events, peça que levanta, encaixe) e as contas dele (Node)
│   ├── quiz-ui.js                 ← Tela dos jogos de responder (ponte, rodadas, retorno)
│   ├── sounds.js                  ← Efeitos sonoros sintetizados (Web Audio)
│   ├── symbols.js                 ← Letras, números por extenso e símbolos que se confundem (testado no Node)
│   └── fonts/                     ← Andika (fonte para alfabetização, licença OFL)
├── assets/games/which-letter/     ← Qual é a letra? (index.html, which-letter-logic.js, game.js)
├── assets/games/paint/            ← Colorir (canvas em camadas: máscara, tinta recortada, contorno)
├── assets/games/build-word/       ← Montar a palavra (arrasta sílabas para as lacunas)
├── assets/games/sort-box/         ← Na caixa certa (arrasta peças para as caixas ou objetos para o prato)
├── assets/games/puzzle/           ← Quebra-cabeça (o desenho de uma palavra cortado em peças só com CSS)
├── assets/games/how-many/         ← Quantos tem? (+ img/ com os objetos)
├── assets/games/missing-syllable/ ← Qual sílaba falta? (lógica, game.js + img/ com o desenho de cada palavra; a lista de palavras é `_shared/words.js`)
├── assets/games/memory/           ← Jogo da Memória (mini-app web)
│   ├── index.html
│   ├── style.css
│   ├── memory-logic.js            ← Regras puras (testadas no Node)
│   └── game.js                    ← DOM e timers
├── tool/generate_illustrations.py ← Gera os SVGs (python3, sem dependências); a Mia é desenhada em tool/mia.py
├── tool/render_brand.js           ← Rasteriza a Mia para o ícone e o splash (Chromium do Playwright)
├── test/
│   ├── *_test.dart                ← Testes Flutter
│   ├── games/*.test.js            ← Testes da lógica dos jogos (node --test)
│   └── e2e/*.spec.js              ← Testes de navegador (Playwright)
├── android/  ios/                 ← Projetos nativos
└── pubspec.yaml
```

### Ícone e splash (a gatinha Mia)

A Mia é desenhada em código (`tool/mia.py`), só com formas e traços. Para refazer a arte:

```bash
python3 tool/generate_illustrations.py          # SVGs (app, jogos e fontes do ícone)
node tool/render_brand.js                       # PNGs em assets/icon e assets/splash
dart run flutter_launcher_icons                 # ícone (Android adaptativo + monocromático, iOS)
dart run flutter_native_splash:create           # splash nativo (fundo creme + Mia)
```

Os arquivos nativos gerados ficam versionados. Depois de rodar, confira o `git diff`: as duas
ferramentas reescrevem `Info.plist` (só formatação) e trocam uma opção do `project.pbxproj` que
não deve mudar. Os PNGs de `assets/icon` e `assets/splash` são só entrada das ferramentas, e não vão dentro do app.

### Ponte Flutter ↔ jogo

| Direção | Mensagem | Para quê |
|---------|----------|----------|
| Flutter → jogo | `window.handleFlutterMessage({type: 'INIT', level, gameId, sound, best, outfit})` | Inicia a partida no nível (1 a 6), a preferência de som, o recorde atual (`{stars, moves}` ou `null`) e os ids dos acessórios que a Mia veste (`['crown', 'glasses']`) |
| jogo → Flutter | `SPEAK {text}` | Fala um texto. A voz do navegador não funciona na WebView do Android |
| jogo → Flutter | `NAVIGATE_BACK` | Volta para a Home |
| jogo → Flutter | `GAME_COMPLETE {stars, moves, timeSeconds}` | Fim da partida: o Flutter salva o recorde |

O jogo envia com `MiaGamesFlutter.postMessage(JSON)`. O Flutter ignora
mensagens malformadas, e a WebView só navega para os arquivos locais do jogo.

### Adicionar um novo jogo

1. Criar `assets/games/<jogo>/` com `index.html`, que implementa `window.handleFlutterMessage` e usa as mensagens acima
2. Declarar a pasta **e cada subpasta** em `flutter.assets` no `pubspec.yaml`, porque o Flutter não inclui subpastas sozinho (`test/pubspec_assets_test.dart` confere)
3. Adicionar um `GameModule` em `lib/modules/game_registry.dart`, com a ilustração em `iconAsset`

A Home, a trilha de níveis e a tela de jogo funcionam automaticamente. O jogo recebe `level` (1 a 6) e deve ter uma tabela `LEVELS` com 6 linhas.

---

## 🎮 Os jogos

| Jogo | O que a criança faz | O que cresce nos 6 níveis |
|------|---------------------|---------------------------|
| **Jogo da Memória** | Acha os pares de letras e números | 4, 6, 8, 10, 12 e 14 pares; números até 5, 9, 15, 20, 30 e 50 |
| **Qual é a letra?** | A voz fala o nome e a criança toca na figura certa | letras A–M (3 figuras) → todas as letras → com números até 10, 20, 30 e 50; 3 a 6 figuras; do nível 4 em diante, uma figura parecida (E/F, M/N, 13/23) |
| **Quantos tem?** | Conta os objetos (tocar em cada um fala o número) e escolhe quantos são | contar até 3, 5, 10, 15, 20 e 20 (com 5 respostas) |
| **Colorir** | Escolhe a cor e pinta com o dedo **dentro** de uma letra ou palavra (a tinta não sai do contorno) | vogais → letras de traços retos → todas as maiúsculas → minúsculas → palavras de 4 letras (com o desenho) → palavras de 6 letras; o pincel afina e a tolerância encolhe |
| **Qual sílaba falta?** | Vê o desenho de uma palavra e a palavra com uma sílaba faltando (`BO _`); escolhe a que completa | palavras de 2 sílabas (a lacuna é sempre a última no nível 1) → 2 sílabas com respostas parecidas → palavras de 3 sílabas, com 3, 4 e 5 respostas |
| **Montar a palavra** | **Arrasta** as sílabas para as lacunas embaixo do desenho de uma palavra | 2 sílabas sem peças a mais → +1 → +2 parecidas; 3 sílabas sem peças a mais → +2 → +3 parecidas |
| **Na caixa certa** | **Arrasta** letras e números para a caixa certa, ou dá ao prato os objetos pedidos | letras × números → vogais × consoantes → "Dê até 5 objetos" → 3 caixas → "Dê até 8" → 3 caixas com 12 peças e números até 20 |
| **Quebra-cabeça** | **Arrasta** as peças do desenho de uma palavra para o lugar delas | 2, 4, 6 e 9 peças com o desenho esmaecido de guia → 12 e 16 peças sem guia |

### Vestir a Mia

As estrelas viram acessórios. A soma das estrelas de todos os jogos e níveis abre, em ordem, **9 itens** para a Mia
(florzinha com 3 estrelas, chapéu de festa 7, óculos 12, tiara 18, cachecol 26, coroa 35, óculos escuros 46,
medalha 58 e chapéu de pirata 72; o máximo possível é 144, com os 8 jogos). Os itens ficam em 3 espaços (cabeça, rosto e pescoço) e
cada espaço veste um item só.

- **Guarda-roupa**: o botão de cabide na Home abre a tela, com a Mia vestida em cima e os itens embaixo. Tocar num item aberto o veste (a voz fala o nome) ou o tira; tocar num fechado fala quantas estrelas faltam
- Quando as estrelas de uma partida abrem um item, a Mia o ganha e a criança escolhe vesti-lo na hora ou deixar para depois
- A Mia vestida aparece na Home, no seletor de níveis, na comemoração de nível aberto, enquanto o jogo carrega e **dentro dos jogos** (na pergunta e na tela de parabéns): o Flutter manda os ids em `INIT.outfit` e o kit empilha os SVGs sobre a Mia
- Cada acessório é um SVG transparente no mesmo quadro da Mia (`tool/mia.py`, `outfit_<id>.svg`), então serve em qualquer pose. Para acrescentar um item: desenhe-o em `tool/mia.py`, acrescente-o em `lib/modules/outfits.dart` e rode `python3 tool/generate_illustrations.py`; os testes conferem que todo item tem desenho no app e nos jogos
- A roupa fica salva no aparelho. Apagar o progresso fecha os itens de novo, e eles saem da Mia

### Trilha de 6 níveis

Cada jogo tem **6 níveis**. Só o 1 começa aberto; **cada nível novo abre quando o anterior rende 2 estrelas**
(o cadeado some e a Mia comemora "Nível 3 aberto!", com um botão para ir direto jogá-lo).
A Mia sugere o nível mais alto aberto.

Subir fica **mais difícil a cada degrau**. Nos jogos de responder (8 rodadas), as estrelas vêm dos acertos **de primeira**:

| Nível | 1 | 2 | 3 | 4 | 5 | 6 |
|-------|---|---|---|---|---|---|
| 2 estrelas (abre o próximo) | 4 de 8 | 5 de 8 | 5 de 8 | 6 de 8 | 6 de 8 | 7 de 8 |
| 3 estrelas | 6 de 8 | 7 de 8 | 7 de 8 | 7 de 8 | 8 de 8 | 8 de 8 |

Na Memória, a razão pares/jogadas exigida nos 3 e 2 estrelas vai de 0,70/0,50 (níveis 1 e 2) a 0,55/0,40 (nível 6): o
tabuleiro maior já pesa mais na sorte, e o que cresce de verdade é o número de pares e o alcance dos números.
A tabela de cada jogo está em `LEVELS` no arquivo de regras (`*-logic.js`) e os textos do app são conferidos contra ela nos testes.

Com 1 estrela, a voz diz "Quase! Vamos tentar de novo?" (sem dizer que errou). Os recordes de uma versão
anterior (que tinha só 3 níveis, `easy`/`medium`/`hard`) não são aproveitados.

Os jogos de responder têm **8 rodadas**. A pontuação que vai
para o Flutter (`moves`) é o **número de erros**, e a Área dos pais a chama de "erros"
(na Memória, "jogadas"). Errar não tem castigo: a figura some de leve, a voz diz "Tente de novo!"
e, depois de 2 erros na mesma rodada, a resposta certa "respira" e a pergunta se repete.

### Jogos de arrastar

A filha gosta de tocar e arrastar coisas, então três jogos usam o **kit de arrastar** (`_shared/drag.js`, com as contas em
`drag-logic.js`, testadas no Node):

- Usa **Pointer Events** com a captura do ponteiro, como o Colorir (o arrastar HTML5 não funciona em toque na WebView). Só **um dedo por vez**; um segundo dedo, o botão direito do mouse e o `pointercancel` são tratados
- A peça **levanta**: cresce 10% e fica 28 px acima do dedo, para o dedo não esconder o que se arrasta. Quem decide o alvo é o **centro da peça**, com uma **folga de 20 px** em volta de cada alvo (a criança não precisa acertar na mosca); quem contém o ponto de verdade vence quem só o alcança pela folga
- Ao soltar, o jogo responde `'accept'` ou `'reject'`: a peça desliza até o lugar novo ou volta suave para onde estava. Soltar **fora de todos os alvos não conta erro**. Um toque curto, sem arrastar, é um "toque" (a voz diz o que é)
- A casa da peça fica na bandeja quando ela sai, para as outras não mudarem de lugar. Girar a tela, reiniciar ou perder o dedo no meio do arrasto cancela o gesto e a peça volta
- Depois de 2 erros na mesma rodada, a peça certa e o lugar certo "respiram" (`.pulse`; a classe `.hint` do kit é a dica escrita do cabeçalho)
- Nos jogos com muitas peças, o cabeçalho mostra no máximo **8 estrelas** de progresso (cada uma vale mais de uma peça): uma estrela por peça ficaria minúscula num celular
- Estrelas: os erros (peças soltas no lugar errado) viram o `moves` do Flutter, como no Colorir. Cada nível tem `three` e `two` na tabela `LEVELS`: o máximo de erros que ainda vale 3 e 2 estrelas

### Montar a palavra

- O desenho e a palavra (os do "Qual sílaba falta?") com uma lacuna por sílaba, e uma bandeja de sílabas para arrastar. Acertar fala a sílaba; a última fala "bô, lá, bola! Muito bem!". Errar fala a sílaba escolhida ("tô. Tente de novo!")
- As peças a mais **nunca formam outra palavra** que a criança conheça (a mesma conferência do "Qual sílaba falta?"). Nos níveis "parecidos" (3 e 6) repartem a consoante ou a vogal com as da palavra
- Palavras com a mesma sílaba duas vezes (BA-NA-NA): qualquer "NA" serve em qualquer lacuna "NA"
- 6 palavras por partida. Estrelas: palavras montadas **sem erro** (2★ com 3, 3, 4, 4, 5 e 5; 3★ com 5, 5, 5, 6, 6 e 6)

### Na caixa certa

- **Separar** (níveis 1, 2, 4 e 6): as peças são letras e números (todos da mesma cor: a cor entregaria a caixa); cada uma vai para a caixa certa e encolhe lá dentro. A voz diz "Bê. Consoante!". Nunca há símbolos que se confundem (O e 0)
- **Dar** (níveis 3 e 5): "Dê três maçãs para a Mia!" — o prato mostra o número; a voz **conta** cada objeto que cai ("Um", "Dois", "Três maçãs! Muito bem!") e a rodada termina no número pedido. Na pilha há objetos pedidos a mais e objetos de outro tipo: soltar um deles é erro ("Essa é uma bola. Procure as maçãs!"). O gênero e o número são os do "Quantos tem?"
- Uma partida tem no máximo 12 peças a colocar. Estrelas pelos erros: até 1 erro vale 3★ e até 3 ou 4 valem 2★

### Quebra-cabeça

- O desenho de uma palavra (SVG quadrado) é cortado **só com CSS**: cada peça mostra a sua fatia (`background-size` e `background-position`), sobre um fundo em degradê que muda de cor pelo quadro, para as peças de "céu" também se distinguirem. O quadro é sempre quadrado, então o desenho nunca é esticado; as peças da bandeja são cópias menores dos lugares da grade (mesma proporção) e crescem ao encaixar
- Grades de 2×1, 2×2, 3×2, 3×3, 4×3 e 4×4; nos níveis 1 a 4 o desenho esmaecido aparece atrás da grade como guia. Quando o desenho fica pronto, a palavra aparece escrita e a voz a diz
- Em celular pequeno o quadro fica pequeno (~140 px); por isso as peças da bandeja podem ser até 1,5 vez maiores que o lugar delas (e encolhem ao encaixar). As 16 peças do nível 6 ficam com ~45 px de lado: é o limite de caber numa bandeja

### Colorir

- A criança escolhe uma entre **8 cores** (a voz fala o nome) e passa o dedo na letra. A tinta é desenhada sem recorte numa camada interna e só aparece onde a **máscara** (a forma da letra, em Andika) deixa: **nunca sai do contorno**, então ela aprende o desenho da letra sem "errar" a pintura
- Cada vez que o dedo **sai do contorno** (com uma tolerância que encolhe a cada nível) conta uma saída e a forma balança de leve. Esse número vira o `moves` do Flutter (a Área dos pais o chama de "saídas") e define as estrelas: de 10 saídas por partida para 3 estrelas no nível 1 até 5 no nível 6. Começar o toque fora e andar por fora antes de entrar não conta; ficar fora por vários movimentos conta uma saída só
- Depois de 3 saídas na mesma forma, a voz diz "Devagarinho, dentro da letra." (uma vez)
- A forma termina quando a cobertura do nível é atingida (80% no nível 1, 90% no 6); o que faltava se completa sozinho, a Mia comemora e vem a próxima. São 5 formas por partida
- Nos níveis de palavras, o desenho da palavra aparece em cima; palavras longas quebram em duas linhas, entre sílabas ("ba / nana"), quando isso deixa as letras maiores
- Em telas de 320–360 px de largura, uma palavra de 6 letras numa linha só fica com letras de ~50 px de altura (nos tablets, bem maiores): é o limite de caber na tela

### Qual é a letra?

- A voz diz "Qual é a letra Bê?" (ou "Qual é o número treze?"); o alto-falante e a Mia repetem
- As figuras de uma rodada são todas do mesmo tipo da resposta (letra com letras, número com números) e nunca parecidas com ela (12 e 21)
- Nenhuma resposta se repete na partida; cerca de 60% letras e 40% números nos níveis com número

### Quantos tem?

- Objetos (estrela, bola, maçã, peixe, flor) em **fileiras de 5**, fáceis de contar de 5 em 5
- Tocar num objeto fala o próximo número ("um", "dois"...) e mostra o número ao lado: **um objeto, um número**
- A pergunta tem o gênero certo: "Quantas estrelas…", "Quantos peixes…"
- A partir do nível 3, uma das respostas é vizinha da certa (errar por um é o engano mais comum); as figuras vêm em ordem crescente
- Nos níveis 4 a 6, metade das rodadas passa de 10 objetos

### Qual sílaba falta?

- 31 palavras com desenho próprio (`tool/words_art.py`): 19 de duas sílabas e 12 de três, todas só com sílabas "consoante + vogal" (BO-LA, CA-SA)
- A voz diz "Bola. Qual sílaba falta?". Ao acertar, a sílaba entra na lacuna e a voz soletra e fala a palavra ("bô, lá, bola!")
- **Nenhuma resposta errada forma outra palavra** que a criança conheça: BO_A com CA seria "boca". A conferência usa as palavras do jogo e uma lista de outras palavras comuns (`OTHER_WORDS` em `_shared/words.js`)
- Níveis 1, 2 e 4: respostas bem diferentes da certa (outra consoante e outra vogal). Níveis 3, 5 e 6: parecidas, uma com a mesma consoante (BO → BA), uma com a mesma vogal (BO → LO) e as demais quaisquer
- Ao errar, a voz fala a sílaba que a criança escolheu ("cá. Tente de novo!"), para ela aprender o som
- `sayFor` (em `_shared/words.js`) dá a pronúncia de cada sílaba solta, com a vogal acentuada ("to" → "tô"), porque o motor de voz leria "tu". Uma sílaba que ainda soe estranha no aparelho se corrige em `SAY_OVERRIDES`, sem mexer no resto
- Para trocar ou acrescentar uma palavra: edite `_shared/words.js`, desenhe-a em `tool/words_art.py` e rode `python3 tool/generate_illustrations.py`. Os testes conferem sílabas, desenho e que nenhuma resposta errada forme palavra

### Jogo da Memória

Pares de **letras e números**, para quem está na fase de alfabetização. Ao virar uma
carta, a voz fala o **nome** da letra ("Bê", "Cê") ou do número ("três"); ao achar o par, ela
repete o nome e elogia. Há efeitos sonoros ao virar, acertar, errar e vencer.

- Cada partida mistura cerca de 60% de letras (A–Z) e 40% de números
- O alcance dos números cresce com o nível: **0–5, 0–9, 0–15, 0–20, 0–30 e 0–50**.
  Os números são falados por extenso ("Trinta e sete"); o seletor mostra o que cada nível traz
- Letras em azul e números em rosa; todas as letras têm a mesma cor, então a cor não entrega o par
- **Nunca aparecem juntos símbolos que se confundem**: "O" com "0", "I" com "1" e números com os
  algarismos invertidos (12 com 21): o erro não seria de memória, e sim de uma distinção que a criança ainda não domina
- Fonte **Andika**, desenhada para quem está aprendendo a ler: o "I" tem serifas e não se confunde com o "1" nem com o "L"
- A voz usa o nome da letra em português, e não o que o motor de voz leria sozinho (que leria "E" como a palavra "e")

| Nível | 1 | 2 | 3 | 4 | 5 | 6 |
|-------|---|---|---|---|---|---|
| Pares | 4 | 6 | 8 | 10 | 12 | 14 |

O número de colunas não é fixo: o tabuleiro escolhe, a cada tela, o arranjo que dá as maiores cartas.

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

npm ci && npx playwright install chromium   # uma vez, para os testes de navegador
npm run test:e2e                   # testes de navegador (Playwright)
npm run test:e2e:ui                # o mesmo, no modo interativo
```

Os mesmos comandos, além de um build Android, rodam no CI a cada PR.

### Testar num aparelho Android sem instalar o Flutter

**Versão mais recente do `main`** (sem prazo de validade, sem login no GitHub se o repositório for público):
`https://github.com/BrianSouza/miagames/releases/latest/download/miagames.apk`

A cada merge no `main`, o workflow `release.yml` gera o APK e atualiza a release `latest`.
O APK é assinado com a chave de debug, que muda a cada build: para instalar uma versão
nova, **desinstale a anterior primeiro** (o progresso salvo no app é apagado).

**Código de um PR ainda não mergeado:** todo PR gera um APK de teste no CI:

1. Abra o PR no GitHub, aba **Checks** (ou **Actions**) e entre na execução mais recente
2. Em **Artifacts**, baixe `miagames-debug-apk` (um `.zip` com o `app-debug.apk`)
3. Extraia o `.zip` no aparelho (ou no computador e copie o arquivo)
4. Abra o APK e permita a instalação de fontes desconhecidas quando o Android pedir

É um APK de **depuração**, assinado com a chave de debug: serve para testar, não para publicar.
Fica disponível por 14 dias. Baixar artefatos exige estar logado no GitHub.

### Testes de navegador (Playwright)

Os mini-jogos são HTML; os testes em `test/e2e/` abrem o jogo real num Chromium
e simulam a ponte do Flutter (`SPEAK`, `GAME_COMPLETE`, `NAVIGATE_BACK`).
`test/e2e/fixtures.js` cuida de três coisas:

- **Relógio falso e pausado** (`page.clock`): o tempo só avança com `game.tick(ms)`,
  então os testes não dependem da velocidade da máquina nem usam esperas fixas
- **Web Audio espiada**: `game.notes()` conta as notas tocadas
- **Erros viram falha**: qualquer erro de página, `console.error` ou ilustração que
  não carrega derruba o teste

Para cobrir um jogo novo, abra-o com `fixtures.js` ou crie uma fixture parecida.

---

## ♿ Pensado para crianças de 3 a 6 anos

- **A gatinha Mia** acena na Home (tocar nela fala "Oi! Vamos brincar?"), pensa enquanto o jogo carrega e comemora no fim; as estrelas ganhas viram roupas para ela (**Vestir a Mia**)
- **Quase sem texto**: cada jogo é um cartão grande com figura e alto-falante; o nome é falado ao toque
- **Sem cronômetro nem contagem de jogadas** na tela da criança: o progresso é uma fileira de estrelas que acendem ao acertar. Jogadas e tempo continuam salvos para a Área dos pais
- **Retorno sem castigo**: acertar faz o par "pular", errar balança de leve, nunca vermelho forte nem "errou"
- A **Mia sugere o nível**: o primeiro que ainda não tem as 3 estrelas (o botão "respira" por alguns segundos)
- Tela de parabéns com confete (desligado para quem pede menos movimento), estrelas que aparecem uma a uma e dois botões grandes com ícone
- **Funciona em pé e deitado**: a grade da Home e o tabuleiro se ajustam à tela
- Voz em pt-BR: nomes dos jogos, dos níveis, das letras e dos números, e comemoração a cada par
- Áreas de toque de no mínimo 56px (botões do jogo com 60px, os da tela de parabéns com 88px)
- Texto e botões com contraste ≥ 4.5:1 (WCAG AA)
- Sair do jogo exige **segurar** o botão voltar do jogo ou tocar **duas vezes** no voltar do sistema
- **Área dos pais** atrás de um bloqueio (conta de somar): liga e desliga voz e sons, mostra o progresso e permite apagá-lo
- Cards e cartas anunciados corretamente por leitores de tela

## 📈 Próximos passos

- Novos jogos: números, cores, traçado de letras
- Compras no app, se houver, atrás do bloqueio parental
