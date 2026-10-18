/**
 * Regras do "Qual é a letra?" — funções puras, sem DOM, timers ou ponte.
 *
 * A voz diz o nome de uma letra (ou número) e a criança toca na figura certa.
 * Roda no navegador (window.WhichLetterLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../_shared/symbols.js'), require('../_shared/quiz.js'), require('../_shared/game-utils.js'));
  } else {
    root.WhichLetterLogic = factory(root.GameSymbols, root.GameQuiz, root.GameUtils);
  }
})(this, function (Symbols, Quiz, Utils) {
  'use strict';

  // Os 6 níveis (do 1 ao 6). options: quantas figuras aparecem. maxNumber: null = só letras; senão
  // entram números de 0 até esse valor. firstLetters: só as primeiras letras do alfabeto (A–M).
  // confusable: uma das figuras erradas é parecida com a certa (E/F, M/N; 13/23 nos números).
  var LEVELS = [
    { rounds: 8, options: 3, maxNumber: null, firstLetters: true,  confusable: false },
    { rounds: 8, options: 3, maxNumber: null, firstLetters: false, confusable: false },
    { rounds: 8, options: 4, maxNumber: 10,   firstLetters: false, confusable: false },
    { rounds: 8, options: 4, maxNumber: 20,   firstLetters: false, confusable: true  },
    { rounds: 8, options: 5, maxNumber: 30,   firstLetters: false, confusable: true  },
    { rounds: 8, options: 6, maxNumber: 50,   firstLetters: false, confusable: true  },
  ];

  /** Fração das rodadas que perguntam um número; o resto são letras (alfabetização) */
  var NUMBER_SHARE = 0.4;

  /** As primeiras letras (A–M), só para o nível 1 */
  var FIRST_LETTERS = Symbols.LETTERS.slice(0, 13);

  function configFor(level) {
    return LEVELS[Utils.clampLevel(level) - 1];
  }

  /** As letras que podem ser resposta (e figura) neste nível */
  function lettersFor(cfg) {
    return cfg.firstLetters ? FIRST_LETTERS : Symbols.LETTERS;
  }

  /** O que a voz pergunta: "Qual é a letra Bê?", "Qual é o número treze?" */
  function promptFor(item) {
    var name = item.name.charAt(0).toLowerCase() + item.name.slice(1);
    return item.kind === 'letter' ? 'Qual é a letra ' + item.name + '?' : 'Qual é o número ' + name + '?';
  }

  /** As respostas das rodadas: sem repetir, com cerca de 60% de letras */
  function pickAnswers(cfg, random) {
    var numberCount = cfg.maxNumber === null ? 0 : Math.round(cfg.rounds * NUMBER_SHARE);
    var letters = Symbols.shuffle(lettersFor(cfg), random).slice(0, cfg.rounds - numberCount);
    var numbers = Symbols.shuffle(Symbols.numbersUpTo(cfg.maxNumber || 0), random).slice(0, numberCount);
    return Symbols.shuffle(letters.concat(numbers), random);
  }

  /** Esta figura é parecida com a resposta? (E/F, M/N entre letras; 13/23 entre números) */
  function isConfusableWith(answer, item) {
    if (answer.kind === 'letter') {
      return (Symbols.CONFUSABLE_LETTERS[answer.symbol] || []).indexOf(item.symbol) !== -1;
    }
    if (answer.symbol.length === 1) return Math.abs(Number(answer.symbol) - Number(item.symbol)) === 1;
    return Symbols.sharesDigit(answer.symbol, item.symbol);
  }

  /**
   * As figuras de uma rodada: a resposta mais distratores do MESMO tipo (letra
   * com letras, número com números), para a criança distinguir de verdade, e
   * nunca um que se pareça demais com a resposta (12 e 21: a mesma figura invertida).
   * Do nível 4 em diante, uma das erradas é parecida de propósito (E/F, 13/23).
   */
  function pickOptions(answer, cfg, random) {
    var pool = answer.kind === 'letter' ? lettersFor(cfg) : Symbols.numbersUpTo(cfg.maxNumber);
    var candidates = pool.filter(function (item) {
      return item.symbol !== answer.symbol && !Symbols.looksAlike(answer.symbol, item.symbol);
    });
    var shuffled = Symbols.shuffle(candidates, random);
    var distractors = [];

    if (cfg.confusable) {
      var similar = shuffled.filter(function (item) { return isConfusableWith(answer, item); });
      if (similar.length) distractors.push(similar[0]);
    }
    shuffled.forEach(function (item) {
      if (distractors.length < cfg.options - 1 && distractors.indexOf(item) === -1) distractors.push(item);
    });
    return Symbols.shuffle([answer].concat(distractors), random);
  }

  /** Cria uma partida. `round` identifica a partida (ver Quiz.next) */
  function createGame(level, options) {
    var opts = options || {};
    var key = Utils.clampLevel(level);
    var cfg = LEVELS[key - 1];

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
    LEVELS: LEVELS,
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
