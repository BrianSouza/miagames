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

  var DIFFICULTY = {
    easy:   { pairs: 6,  cols: 3 },
    medium: { pairs: 8,  cols: 4 },
    hard:   { pairs: 10, cols: 4 },
  };

  // 10 animais (suficiente para o nível mais difícil), com o nome falado
  var ANIMALS = [
    { emoji: '🐶', name: 'Cachorro' },
    { emoji: '🐱', name: 'Gato' },
    { emoji: '🐭', name: 'Rato' },
    { emoji: '🐰', name: 'Coelho' },
    { emoji: '🦊', name: 'Raposa' },
    { emoji: '🐻', name: 'Urso' },
    { emoji: '🐼', name: 'Panda' },
    { emoji: '🐨', name: 'Coala' },
    { emoji: '🐯', name: 'Tigre' },
    { emoji: '🦁', name: 'Leão' },
  ];

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
   * Cria uma partida nova. `round` identifica a partida: uma verificação
   * agendada numa rodada anterior é ignorada (ver resolve).
   */
  function createGame(difficulty, options) {
    var opts = options || {};
    var key = DIFFICULTY[difficulty] ? difficulty : 'easy';
    var cfg = DIFFICULTY[key];
    var animals = shuffle(ANIMALS, opts.random).slice(0, cfg.pairs);

    var cards = [];
    animals.forEach(function (animal, pairId) {
      cards.push({ id: pairId * 2,     emoji: animal.emoji, name: animal.name, pairId: pairId, state: 'hidden' });
      cards.push({ id: pairId * 2 + 1, emoji: animal.emoji, name: animal.name, pairId: pairId, state: 'hidden' });
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
    ANIMALS: ANIMALS,
    CHECK_DELAY_MS: CHECK_DELAY_MS,
    configFor: configFor,
    shuffle: shuffle,
    createGame: createGame,
    flip: flip,
    resolve: resolve,
    calcStars: calcStars,
    elapsedMs: elapsedMs,
    cardSize: cardSize,
  };
});
