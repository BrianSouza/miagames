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
    module.exports = factory(require('../_shared/symbols.js'), require('../_shared/game-utils.js'));
  } else {
    root.MemoryLogic = factory(root.GameSymbols, root.GameUtils);
  }
})(this, function (Symbols, Utils) {
  'use strict';

  // maxNumber: os números sorteados vão de 0 até este valor. No fácil, só
  // algarismos soltos; nos níveis seguintes entram os números de dois algarismos.
  var DIFFICULTY = {
    easy:   { pairs: 6,  cols: 3, maxNumber: 9 },
    medium: { pairs: 8,  cols: 4, maxNumber: 20 },
    hard:   { pairs: 10, cols: 4, maxNumber: 50 },
  };

  var LETTERS = Symbols.LETTERS;
  var numbersUpTo = Symbols.numbersUpTo;
  var numberName = Symbols.numberName;
  var LOOKALIKES = Symbols.LOOKALIKES;
  var looksAlike = Symbols.looksAlike;
  var findSymbol = Symbols.findSymbol;
  var labelFor = Symbols.labelFor;
  var shuffle = Symbols.shuffle;

  /** Fração de pares que são números; o resto são letras (foco na alfabetização) */
  var NUMBER_SHARE = 0.4;

  /** Tempo (ms) que as duas cartas ficam visíveis antes da verificação */
  var CHECK_DELAY_MS = 800;

  function configFor(difficulty) {
    return DIFFICULTY[difficulty] || DIFFICULTY.easy;
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

  var isNewRecord = Utils.isNewRecord;
  var elapsedMs = Utils.elapsedMs;
  var cardSize = Utils.fitSquare;

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
