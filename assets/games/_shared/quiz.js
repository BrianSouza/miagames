/**
 * Motor dos jogos de responder (Qual é a letra?, Quantos tem?, Qual sílaba falta?):
 * uma pergunta por rodada, a criança toca numa das figuras.
 *
 * Cada rodada traz `answerKey` (a figura certa) e `optionKeys` (todas as figuras,
 * incluindo a certa); o resto da rodada é com cada jogo. Funções puras, sem DOM:
 * cada jogada devolve um estado NOVO.
 *
 * Roda no navegador (window.GameQuiz) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./game-utils.js'));
  } else {
    root.GameQuiz = factory(root.GameUtils);
  }
})(this, function (Utils) {
  'use strict';

  /** Pausa depois de um acerto, para a criança curtir antes da próxima rodada */
  var ADVANCE_DELAY_MS = 1500;

  /** Depois de tantos erros na mesma rodada, a resposta certa "respira" como dica */
  var HINT_AFTER_MISSES = 2;

  /** Cria uma partida do nível `level` com as `rounds` dadas. `previousRound` identifica a partida (ver next) */
  function createState(level, rounds, previousRound) {
    return {
      level: level,
      rounds: rounds,
      total: rounds.length,
      index: 0,
      phase: 'asking',       // asking | celebrating | completed
      misses: 0,             // erros na rodada atual
      eliminated: [],        // figuras erradas já tocadas nesta rodada
      errors: 0,             // erros na partida toda (vira "moves" no Flutter)
      firstTry: 0,           // rodadas acertadas de primeira
      solved: 0,
      startedAt: null,       // primeiro toque — o tempo não corre antes disso
      completedAt: null,
      round: (previousRound || 0) + 1,
    };
  }

  function currentRound(state) {
    return state.rounds[state.index];
  }

  /**
   * A criança tocou numa figura. Devolve { state, result } com result:
   * 'correct' | 'wrong' | null (toque ignorado: fora da vez ou figura já eliminada).
   */
  function answer(state, key, now) {
    if (state.phase !== 'asking') return { state: state, result: null };
    var round = currentRound(state);
    if (state.eliminated.indexOf(key) !== -1) return { state: state, result: null };
    if (round.optionKeys.indexOf(key) === -1) return { state: state, result: null };

    var startedAt = state.startedAt === null ? now : state.startedAt;

    if (key !== round.answerKey) {
      return {
        state: Object.assign({}, state, {
          misses: state.misses + 1,
          errors: state.errors + 1,
          eliminated: state.eliminated.concat([key]),
          startedAt: startedAt,
        }),
        result: 'wrong',
      };
    }

    return {
      state: Object.assign({}, state, {
        phase: 'celebrating',
        solved: state.solved + 1,
        firstTry: state.firstTry + (state.misses === 0 ? 1 : 0),
        startedAt: startedAt,
      }),
      result: 'correct',
    };
  }

  /** Depois de HINT_AFTER_MISSES erros na rodada, a resposta certa pulsa */
  function shouldHint(state) {
    return state.phase === 'asking' && state.misses >= HINT_AFTER_MISSES;
  }

  /**
   * Passa para a próxima rodada (ou termina). `round` é a rodada em que a pausa foi
   * agendada: se o jogo foi reiniciado no meio, nada muda.
   * Devolve { state, result } com result: 'next' | 'complete' | null.
   */
  function next(state, round, now) {
    if (round !== state.round || state.phase !== 'celebrating') {
      return { state: state, result: null };
    }
    if (state.index + 1 >= state.total) {
      return {
        state: Object.assign({}, state, { phase: 'completed', completedAt: now }),
        result: 'complete',
      };
    }
    return {
      state: Object.assign({}, state, {
        phase: 'asking',
        index: state.index + 1,
        misses: 0,
        eliminated: [],
      }),
      result: 'next',
    };
  }

  function calcStars(state) {
    return Utils.starsForAccuracy(state.firstTry, state.total, state.level);
  }

  return {
    ADVANCE_DELAY_MS: ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: HINT_AFTER_MISSES,
    createState: createState,
    currentRound: currentRound,
    answer: answer,
    shouldHint: shouldHint,
    next: next,
    calcStars: calcStars,
    isNewRecord: Utils.isNewRecord,
    elapsedMs: Utils.elapsedMs,
  };
});
