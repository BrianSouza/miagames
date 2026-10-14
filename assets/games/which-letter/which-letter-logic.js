/**
 * Regras do "Qual é a letra?" — funções puras, sem DOM, timers ou ponte.
 *
 * A voz diz o nome de uma letra (ou número) e a criança toca na figura certa.
 * Roda no navegador (window.WhichLetterLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../_shared/symbols.js'), require('../_shared/game-utils.js'));
  } else {
    root.WhichLetterLogic = factory(root.GameSymbols, root.GameUtils);
  }
})(this, function (Symbols, Utils) {
  'use strict';

  // options: quantas figuras aparecem. maxNumber: null = só letras; senão entram
  // números de 0 até esse valor (o mesmo alcance do Jogo da Memória)
  var DIFFICULTY = {
    easy:   { rounds: 8, options: 3, maxNumber: null },
    medium: { rounds: 8, options: 4, maxNumber: 20 },
    hard:   { rounds: 8, options: 6, maxNumber: 50 },
  };

  /** Fração das rodadas que perguntam um número; o resto são letras (alfabetização) */
  var NUMBER_SHARE = 0.4;

  /** Pausa depois de um acerto, para a criança curtir antes da próxima rodada */
  var ADVANCE_DELAY_MS = 1500;

  /** Depois de tantos erros na mesma rodada, a resposta certa "respira" como dica */
  var HINT_AFTER_MISSES = 2;

  function configFor(difficulty) {
    return DIFFICULTY[difficulty] || DIFFICULTY.easy;
  }

  /** O que a voz pergunta: "Qual é a letra Bê?", "Qual é o número treze?" */
  function promptFor(item) {
    var name = item.name.charAt(0).toLowerCase() + item.name.slice(1);
    return item.kind === 'letter' ? 'Qual é a letra ' + item.name + '?' : 'Qual é o número ' + name + '?';
  }

  /** As respostas das rodadas: sem repetir, com cerca de 60% de letras */
  function pickAnswers(cfg, random) {
    var numberCount = cfg.maxNumber === null ? 0 : Math.round(cfg.rounds * NUMBER_SHARE);
    var letters = Symbols.shuffle(Symbols.LETTERS, random).slice(0, cfg.rounds - numberCount);
    var numbers = Symbols.shuffle(Symbols.numbersUpTo(cfg.maxNumber || 0), random).slice(0, numberCount);
    return Symbols.shuffle(letters.concat(numbers), random);
  }

  /**
   * As figuras de uma rodada: a resposta mais distratores do MESMO tipo (letra
   * com letras, número com números), para a criança distinguir de verdade, e
   * nunca um que se pareça com a resposta (12 e 21).
   */
  function pickOptions(answer, cfg, random) {
    var pool = answer.kind === 'letter' ? Symbols.LETTERS : Symbols.numbersUpTo(cfg.maxNumber);
    var candidates = pool.filter(function (item) {
      return item.symbol !== answer.symbol && !Symbols.looksAlike(answer.symbol, item.symbol);
    });
    var distractors = Symbols.shuffle(candidates, random).slice(0, cfg.options - 1);
    return Symbols.shuffle([answer].concat(distractors), random);
  }

  /** Cria uma partida. `round` identifica a partida (ver next) */
  function createGame(difficulty, options) {
    var opts = options || {};
    var key = DIFFICULTY[difficulty] ? difficulty : 'easy';
    var cfg = DIFFICULTY[key];

    var rounds = pickAnswers(cfg, opts.random).map(function (answer) {
      return { answer: answer, options: pickOptions(answer, cfg, opts.random) };
    });

    return {
      difficulty: key,
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
      round: (opts.previousRound || 0) + 1,
    };
  }

  function currentRound(state) {
    return state.rounds[state.index];
  }

  /**
   * A criança tocou numa figura. Devolve { state, result } com result:
   * 'correct' | 'wrong' | null (toque ignorado: fora da vez ou figura já eliminada).
   */
  function answer(state, symbol, now) {
    if (state.phase !== 'asking') return { state: state, result: null };
    var round = currentRound(state);
    if (state.eliminated.indexOf(symbol) !== -1) return { state: state, result: null };
    if (!round.options.some(function (o) { return o.symbol === symbol; })) {
      return { state: state, result: null };
    }

    var startedAt = state.startedAt === null ? now : state.startedAt;

    if (symbol !== round.answer.symbol) {
      return {
        state: Object.assign({}, state, {
          misses: state.misses + 1,
          errors: state.errors + 1,
          eliminated: state.eliminated.concat([symbol]),
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

  /** Depois de HINT_AFTER_MISSES erros seguidos na rodada, a resposta certa pulsa */
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
    return Utils.starsForAccuracy(state.firstTry, state.total);
  }

  return {
    DIFFICULTY: DIFFICULTY,
    NUMBER_SHARE: NUMBER_SHARE,
    ADVANCE_DELAY_MS: ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: HINT_AFTER_MISSES,
    configFor: configFor,
    promptFor: promptFor,
    pickAnswers: pickAnswers,
    pickOptions: pickOptions,
    createGame: createGame,
    currentRound: currentRound,
    answer: answer,
    shouldHint: shouldHint,
    next: next,
    calcStars: calcStars,
    isNewRecord: Utils.isNewRecord,
    elapsedMs: Utils.elapsedMs,
  };
});
