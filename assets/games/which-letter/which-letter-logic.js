/**
 * Regras do "Qual é a letra?" — funções puras, sem DOM, timers ou ponte.
 *
 * A voz diz o nome de uma letra (ou número) e a criança toca na figura certa.
 * Roda no navegador (window.WhichLetterLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../_shared/symbols.js'), require('../_shared/quiz.js'));
  } else {
    root.WhichLetterLogic = factory(root.GameSymbols, root.GameQuiz);
  }
})(this, function (Symbols, Quiz) {
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

  /** Cria uma partida. `round` identifica a partida (ver Quiz.next) */
  function createGame(difficulty, options) {
    var opts = options || {};
    var key = DIFFICULTY[difficulty] ? difficulty : 'easy';
    var cfg = DIFFICULTY[key];

    var rounds = pickAnswers(cfg, opts.random).map(function (answer) {
      var choices = pickOptions(answer, cfg, opts.random);
      return {
        answer: answer,
        options: choices,
        answerKey: answer.symbol,
        optionKeys: choices.map(function (o) { return o.symbol; }),
      };
    });
    return Quiz.createState(key, rounds, opts.previousRound);
  }

  return {
    DIFFICULTY: DIFFICULTY,
    NUMBER_SHARE: NUMBER_SHARE,
    ADVANCE_DELAY_MS: Quiz.ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: Quiz.HINT_AFTER_MISSES,
    configFor: configFor,
    promptFor: promptFor,
    pickAnswers: pickAnswers,
    pickOptions: pickOptions,
    createGame: createGame,
    currentRound: Quiz.currentRound,
    answer: Quiz.answer,
    shouldHint: Quiz.shouldHint,
    next: Quiz.next,
    calcStars: Quiz.calcStars,
    isNewRecord: Quiz.isNewRecord,
    elapsedMs: Quiz.elapsedMs,
  };
});
