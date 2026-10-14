/**
 * Regras do Jogo da Memória — funções puras, sem DOM, timers ou ponte.
 *
 * Roda no navegador (expõe window.MemoryLogic) e no Node (module.exports),
 * o que permite testar as regras com `node --test` sem abrir a WebView.
 *
 * Cada função recebe um estado e devolve um estado NOVO; quem chama
 * (game.js) cuida de desenhar, agendar a verificação e falar com o Flutter.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MemoryLogic = factory();
  }
})(this, function () {
  'use strict';

  // maxNumber: os números sorteados vão de 0 até este valor. No fácil, só
  // algarismos soltos; nos níveis seguintes entram os números de dois algarismos.
  var DIFFICULTY = {
    easy:   { pairs: 6,  cols: 3, maxNumber: 9 },
    medium: { pairs: 8,  cols: 4, maxNumber: 20 },
    hard:   { pairs: 10, cols: 4, maxNumber: 50 },
  };

  // Letras (A–Z) e números (0 até o máximo da dificuldade). `name` é o que a voz fala: o NOME da letra em
  // português ("Bê", "Cê"...), e não o som que o motor de voz leria sozinho —
  // sozinho, ele lê "E" como a palavra "e" ("i") e "Q" como "cu".
  var LETTERS = [
    ['A', 'Á'],    ['B', 'Bê'],   ['C', 'Cê'],    ['D', 'Dê'],     ['E', 'Ê'],
    ['F', 'Éfe'],  ['G', 'Gê'],   ['H', 'Agá'],   ['I', 'I'],      ['J', 'Jota'],
    ['K', 'Cá'],   ['L', 'Éle'],  ['M', 'Ême'],   ['N', 'Êne'],    ['O', 'Ó'],
    ['P', 'Pê'],   ['Q', 'Quê'],  ['R', 'Érre'],  ['S', 'Ésse'],   ['T', 'Tê'],
    ['U', 'U'],    ['V', 'Vê'],   ['W', 'Dáblio'], ['X', 'Xis'],   ['Y', 'Ípsilon'],
    ['Z', 'Zê'],
  ].map(function (l) { return { symbol: l[0], name: l[1], kind: 'letter' }; });

  var UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  var TEENS = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var TENS = { 2: 'vinte', 3: 'trinta', 4: 'quarenta', 5: 'cinquenta' };

  /** Nome do número por extenso, até 59: 7 → "Sete", 37 → "Trinta e sete" */
  function numberName(n) {
    var text;
    if (n < 10) text = UNITS[n];
    else if (n < 20) text = TEENS[n - 10];
    else {
      var tens = Math.floor(n / 10);
      var unit = n % 10;
      text = TENS[tens] + (unit ? ' e ' + UNITS[unit] : '');
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Cartas de número de 0 até `max` */
  function numbersUpTo(max) {
    var list = [];
    for (var n = 0; n <= max; n++) {
      list.push({ symbol: String(n), name: numberName(n), kind: 'number' });
    }
    return list;
  }

  /**
   * Símbolos que se parecem: nunca aparecem no mesmo tabuleiro. Para quem está
   * aprendendo a ler, "O" e "0" (e "I" e "1") são a mesma figura — o erro não
   * seria de memória, e sim de uma distinção que a criança ainda não domina.
   */
  var LOOKALIKES = { 'O': '0', '0': 'O', 'I': '1', '1': 'I' };

  /**
   * Dois símbolos que a criança costuma trocar: os que se parecem (O/0, I/1) e os
   * números com os algarismos invertidos (12 e 21, 13 e 31) — erro comum de quem
   * ainda está aprendendo a ordem dos algarismos.
   */
  function looksAlike(a, b) {
    if (LOOKALIKES[a] === b) return true;
    return a.length === 2 && b.length === 2 && a !== b && a.charAt(0) === b.charAt(1) && a.charAt(1) === b.charAt(0);
  }

  /** Fração de pares que são números; o resto são letras (foco na alfabetização) */
  var NUMBER_SHARE = 0.4;

  /** A letra ou o número de um símbolo ("B", "37") — para quem só tem o texto da carta */
  function findSymbol(symbol) {
    for (var i = 0; i < LETTERS.length; i++) {
      if (LETTERS[i].symbol === symbol) return LETTERS[i];
    }
    var n = Number(symbol);
    return n >= 0 && String(n) === symbol ? numbersUpTo(n).pop() : null;
  }

  /** Rótulo para leitores de tela: "Letra B", "Número 3" */
  function labelFor(item) {
    return (item.kind === 'letter' ? 'Letra ' : 'Número ') + item.symbol;
  }

  /** Tempo (ms) que as duas cartas ficam visíveis antes da verificação */
  var CHECK_DELAY_MS = 800;

  function configFor(difficulty) {
    return DIFFICULTY[difficulty] || DIFFICULTY.easy;
  }

  /** Fisher-Yates — distribuição uniforme, não altera o array original */
  function shuffle(arr, random) {
    var rnd = random || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /**
   * Escolhe os símbolos de uma partida: uma mistura de letras e números (cerca de
   * 60% letras), sem repetir símbolo e sem juntar símbolos que se confundem.
   * Os números vão de 0 até `maxNumber`.
   */
  function pickSymbols(pairs, random, maxNumber) {
    var numberCount = Math.round(pairs * NUMBER_SHARE);
    var letters = shuffle(LETTERS, random).slice(0, pairs - numberCount);

    var chosen = letters.slice();
    var numbers = [];
    shuffle(numbersUpTo(maxNumber === undefined ? 9 : maxNumber), random).forEach(function (n) {
      if (numbers.length >= numberCount) return;
      var confusable = chosen.some(function (c) { return looksAlike(c.symbol, n.symbol); });
      if (confusable) return;
      numbers.push(n);
      chosen.push(n);
    });

    return letters.concat(numbers);
  }

  /**
   * Cria uma partida nova. `round` identifica a partida: uma verificação
   * agendada numa rodada anterior é ignorada (ver resolve).
   */
  function createGame(difficulty, options) {
    var opts = options || {};
    var key = DIFFICULTY[difficulty] ? difficulty : 'easy';
    var cfg = DIFFICULTY[key];

    var cards = [];
    pickSymbols(cfg.pairs, opts.random, cfg.maxNumber).forEach(function (item, pairId) {
      [0, 1].forEach(function (copy) {
        cards.push({
          id: pairId * 2 + copy,
          symbol: item.symbol,
          kind: item.kind,
          name: item.name,
          label: labelFor(item),
          pairId: pairId,
          state: 'hidden',
        });
      });
    });

    return {
      difficulty: key,
      cols: cfg.cols,
      cards: shuffle(cards, opts.random),
      phase: 'playing',     // playing | checking | completed
      flipped: [],          // no máximo 2 ids
      moves: 0,
      matches: 0,
      totalPairs: cfg.pairs,
      startedAt: null,      // primeiro toque — o cronômetro não corre antes disso
      completedAt: null,
      round: (opts.previousRound || 0) + 1,
    };
  }

  function withCardStates(cards, ids, state) {
    return cards.map(function (c) {
      return ids.indexOf(c.id) !== -1 ? Object.assign({}, c, { state: state }) : c;
    });
  }

  /**
   * Vira uma carta. Retorna o mesmo estado (===) quando o toque deve ser
   * ignorado: verificação em andamento, jogo concluído, duas cartas já
   * abertas, ou carta que não está escondida.
   */
  function flip(state, cardId, now) {
    if (state.phase !== 'playing') return state;
    if (state.flipped.length >= 2) return state;

    var card = state.cards.find(function (c) { return c.id === cardId; });
    if (!card || card.state !== 'hidden') return state;

    var flipped = state.flipped.concat([cardId]);
    var isSecond = flipped.length === 2;

    return Object.assign({}, state, {
      cards: withCardStates(state.cards, [cardId], 'flipped'),
      flipped: flipped,
      phase: isSecond ? 'checking' : 'playing',
      moves: isSecond ? state.moves + 1 : state.moves,
      startedAt: state.startedAt === null ? now : state.startedAt,
    });
  }

  /**
   * Verifica as duas cartas abertas. `round` deve ser a rodada em que a
   * verificação foi agendada — se o jogo foi reiniciado no meio, nada muda.
   * Retorna { state, result } com result: 'match' | 'mismatch' | 'complete' | null.
   */
  function resolve(state, round, now) {
    if (round !== state.round || state.phase !== 'checking' || state.flipped.length !== 2) {
      return { state: state, result: null };
    }

    var a = state.cards.find(function (c) { return c.id === state.flipped[0]; });
    var b = state.cards.find(function (c) { return c.id === state.flipped[1]; });

    if (a.pairId !== b.pairId) {
      return {
        state: Object.assign({}, state, {
          cards: withCardStates(state.cards, state.flipped, 'hidden'),
          flipped: [],
          phase: 'playing',
        }),
        result: 'mismatch',
      };
    }

    var matches = state.matches + 1;
    var isComplete = matches === state.totalPairs;

    return {
      state: Object.assign({}, state, {
        cards: withCardStates(state.cards, state.flipped, 'matched'),
        flipped: [],
        matches: matches,
        phase: isComplete ? 'completed' : 'playing',
        completedAt: isComplete ? now : null,
      }),
      result: isComplete ? 'complete' : 'match',
    };
  }

  /** 1 a 3 estrelas — o ideal é 1 jogada por par */
  function calcStars(state) {
    var ratio = state.totalPairs / Math.max(state.moves, 1);
    if (ratio >= 0.75) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  }

  /**
   * A partida terminada bate o recorde salvo? Mais estrelas vencem; com as
   * mesmas estrelas, menos jogadas. Sem recorde salvo, não é "novo recorde"
   * (a primeira partida não deve parecer uma conquista especial).
   */
  function isNewRecord(best, stars, moves) {
    if (!best) return false;
    if (stars !== best.stars) return stars > best.stars;
    return moves < best.moves;
  }

  /** Milissegundos desde o primeiro toque (0 antes de começar) */
  function elapsedMs(state, now) {
    if (state.startedAt === null) return 0;
    var end = state.completedAt !== null ? state.completedAt : now;
    return Math.max(0, end - state.startedAt);
  }

  /**
   * Lado da carta (px) para o grid caber na área disponível, considerando
   * largura E altura — em tablets e telas baixas a altura é o limite.
   */
  function cardSize(width, height, cols, rows, gap) {
    var byWidth = (width - gap * (cols - 1)) / cols;
    var byHeight = (height - gap * (rows - 1)) / rows;
    return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
  }

  return {
    DIFFICULTY: DIFFICULTY,
    LETTERS: LETTERS,
    numbersUpTo: numbersUpTo,
    numberName: numberName,
    looksAlike: looksAlike,
    findSymbol: findSymbol,
    LOOKALIKES: LOOKALIKES,
    pickSymbols: pickSymbols,
    CHECK_DELAY_MS: CHECK_DELAY_MS,
    configFor: configFor,
    shuffle: shuffle,
    createGame: createGame,
    flip: flip,
    resolve: resolve,
    calcStars: calcStars,
    isNewRecord: isNewRecord,
    elapsedMs: elapsedMs,
    cardSize: cardSize,
  };
});
