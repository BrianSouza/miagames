/**
 * Regras do "Quebra-cabeça" — funções puras, sem DOM, timers ou ponte.
 *
 * O desenho de uma palavra (o mesmo do "Qual sílaba falta?") é cortado em peças, que ficam
 * embaralhadas; a criança arrasta cada peça para o lugar dela na grade. Soltar uma peça num lugar
 * que não é o dela é um erro (a peça volta); soltar fora da grade não conta nada. Ao montar, a voz
 * diz a palavra e ela aparece escrita.
 *
 * A peça de número i é a do lugar i (da esquerda para a direita, de cima para baixo).
 * Roda no navegador (window.PuzzleLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../_shared/symbols.js'),
      require('../_shared/words.js'),
      require('../_shared/game-utils.js'),
    );
  } else {
    root.PuzzleLogic = factory(root.GameSymbols, root.SyllableWords, root.GameUtils);
  }
})(this, function (Symbols, Data, Utils) {
  'use strict';

  // Os 6 níveis (do 1 ao 6). cols x rows: a grade (e o número de peças); rounds: quantos desenhos por
  // partida; guide: o desenho aparece esmaecido atrás da grade (nos últimos níveis só há a grade).
  // two/three: o máximo de erros (peças soltas no lugar errado) na partida inteira que ainda valem
  // 2 e 3 estrelas. A exigência CRESCE: mais peças, sem o guia, menos erros permitidos.
  var LEVELS = [
    { cols: 2, rows: 1, rounds: 3, guide: true,  two: 3, three: 1 },
    { cols: 2, rows: 2, rounds: 3, guide: true,  two: 4, three: 1 },
    { cols: 3, rows: 2, rounds: 2, guide: true,  two: 4, three: 1 },
    { cols: 3, rows: 3, rounds: 1, guide: true,  two: 3, three: 1 },
    { cols: 4, rows: 3, rounds: 1, guide: false, two: 3, three: 1 },
    { cols: 4, rows: 4, rounds: 1, guide: false, two: 4, three: 1 },
  ];

  /** Pausa depois de montar um desenho, para a criança curtir antes do próximo */
  var ADVANCE_DELAY_MS = 1500;

  /** Depois de tantos erros no mesmo desenho, a peça e o lugar certos "respiram" como dica */
  var HINT_AFTER_MISSES = 2;

  function configFor(level) {
    return LEVELS[Utils.clampLevel(level) - 1];
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Quantas peças tem um desenho do nível */
  function piecesIn(cfg) {
    return cfg.cols * cfg.rows;
  }

  /** Cria uma partida. `previousRound` identifica a partida (ver next) */
  function createGame(level, options) {
    var opts = options || {};
    var key = Utils.clampLevel(level);
    var cfg = LEVELS[key - 1];
    var count = piecesIn(cfg);

    var words = Symbols.shuffle(Data.WORDS, opts.random).slice(0, cfg.rounds);
    var rounds = words.map(function (entry) {
      var ids = [];
      for (var i = 0; i < count; i++) ids.push('p' + i);
      return {
        id: entry.id,
        word: entry.word,
        syllables: entry.syllables,
        cols: cfg.cols,
        rows: cfg.rows,
        guide: cfg.guide,
        // a peça pN é a do lugar N; `order` é como elas aparecem embaralhadas na bandeja
        pieces: ids.map(function (id, cell) {
          return { id: id, cell: cell, col: cell % cfg.cols, row: Math.floor(cell / cfg.cols) };
        }),
        order: Symbols.shuffle(ids, opts.random),
      };
    });

    return {
      level: key,
      rounds: rounds,
      // uma estrela de progresso por peça que se coloca no lugar certo
      total: rounds.length * count,
      index: 0,
      phase: 'building',         // building | celebrating | completed
      placed: {},                // peça → lugar onde está (só do desenho atual)
      placedCount: 0,
      doneUnits: 0,              // quantas peças já estão no lugar na partida toda
      misses: 0,                 // erros no desenho atual
      lastWrong: null,           // a última peça solta no lugar errado (para a dica)
      errors: 0,                 // erros na partida toda (vira "moves" no Flutter)
      startedAt: null,           // primeiro toque — o tempo não corre antes disso
      completedAt: null,
      round: (opts.previousRound || 0) + 1,
    };
  }

  function currentRound(state) {
    return state.rounds[state.index];
  }

  function pieceById(round, pieceId) {
    for (var i = 0; i < round.pieces.length; i++) if (round.pieces[i].id === pieceId) return round.pieces[i];
    return null;
  }

  /** A criança encostou o dedo numa peça: o tempo começa a contar */
  function start(state, now) {
    return state.startedAt === null ? Object.assign({}, state, { startedAt: now }) : state;
  }

  /** O lugar `cell` já tem uma peça? */
  function isFilled(state, cell) {
    return Object.keys(state.placed).some(function (id) { return state.placed[id] === cell; });
  }

  /**
   * A criança soltou a peça `pieceId` no lugar `cell`. Devolve { state, result } com result:
   * 'correct' (encaixou) | 'complete' (era a última: o desenho está montado) | 'wrong' |
   * null (ignorado: fora da vez, peça ou lugar inexistente, peça já encaixada, lugar já ocupado).
   */
  function place(state, pieceId, cell, now) {
    if (state.phase !== 'building') return { state: state, result: null };
    var round = currentRound(state);
    var piece = pieceById(round, pieceId);
    if (!piece || state.placed[pieceId] !== undefined) return { state: state, result: null };
    if (!Number.isInteger(cell) || cell < 0 || cell >= round.pieces.length || isFilled(state, cell)) {
      return { state: state, result: null };
    }

    var startedAt = state.startedAt === null ? now : state.startedAt;

    if (piece.cell !== cell) {
      return {
        state: Object.assign({}, state, {
          misses: state.misses + 1,
          errors: state.errors + 1,
          lastWrong: pieceId,
          startedAt: startedAt,
        }),
        result: 'wrong',
      };
    }

    var placed = Object.assign({}, state.placed);
    placed[pieceId] = cell;
    var placedCount = state.placedCount + 1;
    var done = placedCount >= round.pieces.length;
    return {
      state: Object.assign({}, state, {
        placed: placed,
        placedCount: placedCount,
        doneUnits: state.doneUnits + 1,
        phase: done ? 'celebrating' : 'building',
        startedAt: startedAt,
      }),
      result: done ? 'complete' : 'correct',
    };
  }

  /** Depois de HINT_AFTER_MISSES erros no desenho, a peça e o lugar certos pulsam */
  function shouldHint(state) {
    return state.phase === 'building' && state.misses >= HINT_AFTER_MISSES;
  }

  /** Qual peça e qual lugar pulsam: a última peça que errou (se ainda está solta) ou a primeira solta */
  function hintFor(state) {
    var round = currentRound(state);
    var last = state.lastWrong === null ? null : pieceById(round, state.lastWrong);
    if (last && state.placed[last.id] === undefined) return { pieceId: last.id, cell: last.cell };
    for (var i = 0; i < round.order.length; i++) {
      var piece = pieceById(round, round.order[i]);
      if (state.placed[piece.id] === undefined) return { pieceId: piece.id, cell: piece.cell };
    }
    return null;
  }

  /**
   * Passa para o próximo desenho (ou termina). `round` é a partida em que a pausa foi agendada:
   * se o jogo foi reiniciado no meio, nada muda. Devolve { state, result } com result:
   * 'next' | 'complete' | null.
   */
  function next(state, round, now) {
    if (round !== state.round || state.phase !== 'celebrating') return { state: state, result: null };
    if (state.index + 1 >= state.rounds.length) {
      return {
        state: Object.assign({}, state, { phase: 'completed', completedAt: now }),
        result: 'complete',
      };
    }
    return {
      state: Object.assign({}, state, {
        phase: 'building',
        index: state.index + 1,
        placed: {},
        placedCount: 0,
        misses: 0,
        lastWrong: null,
      }),
      result: 'next',
    };
  }

  /** Estrelas pelos erros da partida: poucos erros valem mais; terminar já vale ao menos uma */
  function starsFor(level, errors) {
    var cfg = configFor(level);
    if (errors <= cfg.three) return 3;
    if (errors <= cfg.two) return 2;
    return 1;
  }

  function calcStars(state) {
    return starsFor(state.level, state.errors);
  }

  // ── O que a voz diz ───────────────────────────────────────────────────────────
  /** O pedido: "Gato. Monte o quebra-cabeça!" */
  function promptFor(round) {
    return capitalize(round.word) + '. Monte o quebra-cabeça!';
  }

  /** Ao terminar: "gá, tô, gato! Muito bem!" (as sílabas e a palavra) */
  function correctSpeechFor(round) {
    return round.syllables.map(Data.sayFor).join(', ') + ', ' + round.word + '! Muito bem!';
  }

  function wrongSpeech() {
    return 'Tente de novo!';
  }

  return {
    LEVELS: LEVELS,
    ADVANCE_DELAY_MS: ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: HINT_AFTER_MISSES,
    configFor: configFor,
    piecesIn: piecesIn,
    createGame: createGame,
    currentRound: currentRound,
    start: start,
    place: place,
    shouldHint: shouldHint,
    hintFor: hintFor,
    next: next,
    starsFor: starsFor,
    calcStars: calcStars,
    promptFor: promptFor,
    correctSpeechFor: correctSpeechFor,
    wrongSpeech: wrongSpeech,
    isNewRecord: Utils.isNewRecord,
    elapsedMs: Utils.elapsedMs,
  };
});
