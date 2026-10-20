/**
 * Regras do "Qual sílaba falta?" — funções puras, sem DOM, timers ou ponte.
 *
 * Aparece o desenho de uma palavra e a palavra com uma sílaba faltando ("BO _");
 * a voz diz a palavra e a criança escolhe a sílaba que completa.
 * Roda no navegador (window.MissingSyllableLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../_shared/symbols.js'),
      require('../_shared/quiz.js'),
      require('../_shared/words.js'),
      require('../_shared/game-utils.js'),
    );
  } else {
    root.MissingSyllableLogic = factory(root.GameSymbols, root.GameQuiz, root.SyllableWords, root.GameUtils);
  }
})(this, function (Symbols, Quiz, Data, Utils) {
  'use strict';

  // Os 6 níveis (do 1 ao 6). syllables: quantas sílabas têm as palavras. options: quantas figuras.
  // similar: as figuras erradas se parecem com a certa (mesma consoante ou mesma vogal); senão são
  // bem diferentes. blank: 'last' = a lacuna é sempre a última sílaba (completar o fim da palavra,
  // o mais fácil); 'any' = pode ser qualquer uma.
  var LEVELS = [
    { rounds: 8, syllables: 2, options: 3, similar: false, blank: 'last' },
    { rounds: 8, syllables: 2, options: 3, similar: false, blank: 'any' },
    { rounds: 8, syllables: 2, options: 4, similar: true,  blank: 'any' },
    { rounds: 8, syllables: 3, options: 3, similar: false, blank: 'any' },
    { rounds: 8, syllables: 3, options: 4, similar: true,  blank: 'any' },
    { rounds: 8, syllables: 3, options: 5, similar: true,  blank: 'any' },
  ];

  function configFor(level) {
    return LEVELS[Utils.clampLevel(level) - 1];
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** O que a voz pergunta: "Bola. Qual sílaba falta?" */
  function promptFor(round) {
    return capitalize(round.word) + '. Qual sílaba falta?';
  }

  /** O que a voz diz ao acertar: "bô, lá, bola! Muito bem!" */
  function correctSpeechFor(round) {
    return round.syllables.map(Data.sayFor).join(', ') + ', ' + round.word + '! Muito bem!';
  }

  /** O que a voz diz ao errar: fala a sílaba escolhida, para a criança aprender o som dela */
  function wrongSpeechFor(round, key) {
    return Data.sayFor(key) + '. Tente de novo!';
  }

  /** A palavra como aparece na tela: [{ text: 'BO', blank: false }, { text: 'LA', blank: true }] */
  function displayFor(round) {
    return round.syllables.map(function (syllable, i) {
      return { text: syllable.toUpperCase(), blank: i === round.blankIndex };
    });
  }

  /**
   * A sílaba `candidate` no lugar da que falta formaria uma palavra que a criança
   * conhece? Se sim, seria uma resposta certa "escondida" (BO_A com CA = BOCA).
   */
  function formsKnownWord(syllables, blankIndex, candidate) {
    var copy = syllables.slice();
    copy[blankIndex] = candidate;
    return Data.isKnownWord(copy.join(''));
  }

  /** Sílabas que servem de figura errada: diferentes da certa e que não formam outra palavra */
  function candidatesFor(round) {
    var answer = round.syllables[round.blankIndex];
    return Data.SYLLABLES.filter(function (s) {
      return s !== answer && !formsKnownWord(round.syllables, round.blankIndex, s);
    });
  }

  /**
   * As figuras de uma rodada. Fácil: bem diferentes da certa (outra consoante E outra vogal,
   * e consoantes diferentes entre si). Médio e difícil: parecidas — uma com a mesma consoante
   * (BO → BA), uma com a mesma vogal (BO → LO) e uma qualquer —, que é onde a criança
   * realmente precisa ler a sílaba.
   */
  function pickOptions(round, cfg, random) {
    var answer = round.syllables[round.blankIndex];
    var all = Symbols.shuffle(candidatesFor(round), random);
    var wanted = cfg.options - 1;
    var chosen = [];

    function take(predicate) {
      for (var i = 0; i < all.length && chosen.length < wanted; i++) {
        var s = all[i];
        if (chosen.indexOf(s) === -1 && predicate(s)) { chosen.push(s); return; }
      }
    }

    var consonant = Data.consonantOf(answer);
    var vowel = Data.vowelOf(answer);
    var different = function (s) { return Data.consonantOf(s) !== consonant && Data.vowelOf(s) !== vowel; };

    if (cfg.similar) {
      take(function (s) { return Data.consonantOf(s) === consonant; });
      take(function (s) { return Data.vowelOf(s) === vowel; });
      take(different);
    } else {
      while (chosen.length < wanted) {
        var before = chosen.length;
        take(function (s) {
          return different(s) && chosen.every(function (c) { return Data.consonantOf(c) !== Data.consonantOf(s); });
        });
        if (chosen.length === before) break;
      }
    }
    // se faltou (muitas sílabas descartadas por formarem palavras), completa com quaisquer outras
    take(function () { return true; });
    while (chosen.length < wanted && chosen.length < all.length) take(function () { return true; });

    return Symbols.shuffle(chosen.concat([answer]), random);
  }

  /**
   * Onde fica a lacuna em cada rodada. Nos níveis em que pode ser qualquer sílaba, todas as
   * posições aparecem, por igual; no nível 1 é sempre a última.
   */
  function pickBlankPositions(cfg, random) {
    var positions = [];
    for (var i = 0; i < cfg.rounds; i++) {
      positions.push(cfg.blank === 'last' ? cfg.syllables - 1 : i % cfg.syllables);
    }
    return Symbols.shuffle(positions, random);
  }

  /** Cria uma partida. `previousRound` identifica a partida (ver Quiz.next) */
  function createGame(level, options) {
    var opts = options || {};
    var key = Utils.clampLevel(level);
    var cfg = LEVELS[key - 1];

    var pool = Data.WORDS.filter(function (w) { return w.syllables.length === cfg.syllables; });
    var words = Symbols.shuffle(pool, opts.random).slice(0, cfg.rounds);
    var positions = pickBlankPositions(cfg, opts.random);

    var rounds = words.map(function (entry, i) {
      var round = {
        id: entry.id,
        word: entry.word,
        syllables: entry.syllables,
        blankIndex: positions[i],
      };
      var choices = pickOptions(round, cfg, opts.random);
      round.options = choices.map(function (s) { return { syllable: s, say: Data.sayFor(s) }; });
      round.answerKey = entry.syllables[positions[i]];
      round.optionKeys = choices;
      return round;
    });
    return Quiz.createState(key, rounds, opts.previousRound);
  }

  return {
    LEVELS: LEVELS,
    WORDS: Data.WORDS,
    ADVANCE_DELAY_MS: Quiz.ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: Quiz.HINT_AFTER_MISSES,
    configFor: configFor,
    promptFor: promptFor,
    correctSpeechFor: correctSpeechFor,
    wrongSpeechFor: wrongSpeechFor,
    displayFor: displayFor,
    formsKnownWord: formsKnownWord,
    candidatesFor: candidatesFor,
    pickOptions: pickOptions,
    createGame: createGame,
    sayFor: Data.sayFor,
    currentRound: Quiz.currentRound,
    answer: Quiz.answer,
    shouldHint: Quiz.shouldHint,
    next: Quiz.next,
    calcStars: Quiz.calcStars,
    isNewRecord: Quiz.isNewRecord,
    elapsedMs: Quiz.elapsedMs,
  };
});
