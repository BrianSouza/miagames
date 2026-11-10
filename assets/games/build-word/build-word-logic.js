/**
 * Regras do "Montar a palavra" — funções puras, sem DOM, timers ou ponte.
 *
 * Aparece o desenho de uma palavra e, embaixo, uma lacuna para cada sílaba; a criança arrasta as
 * sílabas (peças) para o lugar certo. Soltar uma peça numa lacuna que não é dela é um erro (a peça
 * volta); soltar fora de todas as lacunas não conta nada.
 *
 * Roda no navegador (window.BuildWordLogic) e no Node (module.exports).
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
    root.BuildWordLogic = factory(root.GameSymbols, root.SyllableWords, root.GameUtils);
  }
})(this, function (Symbols, Data, Utils) {
  'use strict';

  // Os 6 níveis (do 1 ao 6). rounds: quantas palavras por partida. syllables: quantas sílabas têm as
  // palavras (e quantas lacunas). extra: quantas peças a mais, que não servem na palavra.
  // similar: as peças a mais se parecem com as da palavra (mesma consoante ou mesma vogal); senão
  // são bem diferentes. two/three: quantas palavras montadas sem nenhum erro valem 2 e 3 estrelas.
  // A exigência CRESCE: mais peças, peças parecidas e menos erros permitidos. No nível 1 só há as
  // peças da palavra (acertar no palpite já dá 2 estrelas e abre o nível 2).
  var LEVELS = [
    { rounds: 6, syllables: 2, extra: 0, similar: false, two: 3, three: 5 },
    { rounds: 6, syllables: 2, extra: 1, similar: false, two: 3, three: 5 },
    { rounds: 6, syllables: 2, extra: 2, similar: true,  two: 4, three: 5 },
    { rounds: 6, syllables: 3, extra: 0, similar: false, two: 4, three: 6 },
    { rounds: 6, syllables: 3, extra: 2, similar: false, two: 5, three: 6 },
    { rounds: 6, syllables: 3, extra: 3, similar: true,  two: 5, three: 6 },
  ];

  /** Pausa depois de montar uma palavra, para a criança curtir antes da próxima */
  var ADVANCE_DELAY_MS = 1500;

  /** Depois de tantos erros na mesma palavra, a lacuna e a peça certas "respiram" como dica */
  var HINT_AFTER_MISSES = 2;

  function configFor(level) {
    return LEVELS[Utils.clampLevel(level) - 1];
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** O que a voz pede: "Bola. Monte a palavra!" */
  function promptFor(round) {
    return capitalize(round.word) + '. Monte a palavra!';
  }

  /** O que a voz diz ao terminar: "bô, lá, bola! Muito bem!" */
  function correctSpeechFor(round) {
    return round.syllables.map(Data.sayFor).join(', ') + ', ' + round.word + '! Muito bem!';
  }

  /** O que a voz diz ao errar: fala a sílaba escolhida, para a criança aprender o som dela */
  function wrongSpeechFor(syllable) {
    return Data.sayFor(syllable) + '. Tente de novo!';
  }

  /**
   * Peça que NÃO serve na palavra: não é nenhuma das sílabas dela e, no lugar de qualquer sílaba
   * dela, não formaria outra palavra que a criança conhece (BO_A com CA = BOCA).
   */
  function isUsableExtra(syllables, candidate) {
    if (syllables.indexOf(candidate) !== -1) return false;
    return syllables.every(function (_, i) {
      var copy = syllables.slice();
      copy[i] = candidate;
      return !Data.isKnownWord(copy.join(''));
    });
  }

  /** A peça se parece com alguma sílaba da palavra? (mesma consoante ou mesma vogal) */
  function looksLikeOne(syllables, candidate) {
    return syllables.some(function (s) {
      return Data.consonantOf(s) === Data.consonantOf(candidate) || Data.vowelOf(s) === Data.vowelOf(candidate);
    });
  }

  /**
   * As peças a mais de uma palavra. `similar`: parecidas com as da palavra; senão, diferentes
   * entre si e das dela. Se faltarem peças desse tipo, completa com quaisquer outras que sirvam.
   */
  function pickExtras(syllables, cfg, random) {
    var usable = Symbols.shuffle(Data.SYLLABLES.filter(function (s) { return isUsableExtra(syllables, s); }), random);
    var chosen = [];

    function take(predicate) {
      for (var i = 0; i < usable.length && chosen.length < cfg.extra; i++) {
        var s = usable[i];
        if (chosen.indexOf(s) === -1 && predicate(s)) { chosen.push(s); return; }
      }
    }

    if (cfg.similar) {
      while (chosen.length < cfg.extra) {
        var before = chosen.length;
        take(function (s) { return looksLikeOne(syllables, s); });
        if (chosen.length === before) break;
      }
    } else {
      while (chosen.length < cfg.extra) {
        var was = chosen.length;
        take(function (s) {
          return !looksLikeOne(syllables, s) &&
            chosen.every(function (c) { return Data.consonantOf(c) !== Data.consonantOf(s); });
        });
        if (chosen.length === was) break;
      }
    }
    while (chosen.length < cfg.extra) {
      var last = chosen.length;
      take(function () { return true; });
      if (chosen.length === last) break;
    }
    return chosen;
  }

  /** Cria uma partida. `previousRound` identifica a partida (ver next) */
  function createGame(level, options) {
    var opts = options || {};
    var key = Utils.clampLevel(level);
    var cfg = LEVELS[key - 1];

    var pool = Data.WORDS.filter(function (w) { return w.syllables.length === cfg.syllables; });
    var words = Symbols.shuffle(pool, opts.random).slice(0, cfg.rounds);

    var rounds = words.map(function (entry) {
      var pieces = entry.syllables.concat(pickExtras(entry.syllables, cfg, opts.random));
      var tiles = Symbols.shuffle(pieces, opts.random).map(function (syllable, i) {
        return { id: 't' + i, syllable: syllable, say: Data.sayFor(syllable) };
      });
      return { id: entry.id, word: entry.word, syllables: entry.syllables, tiles: tiles };
    });

    return {
      level: key,
      rounds: rounds,
      total: rounds.length,
      index: 0,
      phase: 'building',       // building | celebrating | completed
      slots: emptySlots(rounds[0]),   // para cada lacuna, o id da peça que está nela (ou null)
      misses: 0,               // erros na palavra atual
      errors: 0,               // erros na partida toda (vira "moves" no Flutter)
      firstTry: 0,             // palavras montadas sem nenhum erro
      solved: 0,
      startedAt: null,         // primeiro toque — o tempo não corre antes disso
      completedAt: null,
      round: (opts.previousRound || 0) + 1,
    };
  }

  function emptySlots(round) {
    return round.syllables.map(function () { return null; });
  }

  function currentRound(state) {
    return state.rounds[state.index];
  }

  function tileById(round, tileId) {
    for (var i = 0; i < round.tiles.length; i++) if (round.tiles[i].id === tileId) return round.tiles[i];
    return null;
  }

  function isPlaced(state, tileId) {
    return state.slots.indexOf(tileId) !== -1;
  }

  /** A criança encostou o dedo numa peça: o tempo começa a contar */
  function start(state, now) {
    return state.startedAt === null ? Object.assign({}, state, { startedAt: now }) : state;
  }

  /** A peça serve nessa lacuna? (é a sílaba que a lacuna pede) */
  function fits(state, tileId, slotIndex) {
    var round = currentRound(state);
    var tile = tileById(round, tileId);
    return !!tile && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < round.syllables.length &&
      round.syllables[slotIndex] === tile.syllable;
  }

  /**
   * A criança soltou a peça `tileId` na lacuna `slotIndex`. Devolve { state, result } com result:
   * 'correct' (encaixou) | 'complete' (encaixou a última: a palavra está montada) | 'wrong' |
   * null (ignorado: fora da vez, peça ou lacuna inexistentes, peça já encaixada, lacuna já cheia).
   */
  function place(state, tileId, slotIndex, now) {
    if (state.phase !== 'building') return { state: state, result: null };
    var round = currentRound(state);
    if (!tileById(round, tileId) || isPlaced(state, tileId)) return { state: state, result: null };
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= state.slots.length ||
        state.slots[slotIndex] !== null) {
      return { state: state, result: null };
    }

    var startedAt = state.startedAt === null ? now : state.startedAt;

    if (!fits(state, tileId, slotIndex)) {
      return {
        state: Object.assign({}, state, {
          misses: state.misses + 1,
          errors: state.errors + 1,
          startedAt: startedAt,
        }),
        result: 'wrong',
      };
    }

    var slots = state.slots.slice();
    slots[slotIndex] = tileId;
    var done = slots.every(function (id) { return id !== null; });
    if (!done) {
      return { state: Object.assign({}, state, { slots: slots, startedAt: startedAt }), result: 'correct' };
    }
    return {
      state: Object.assign({}, state, {
        slots: slots,
        phase: 'celebrating',
        solved: state.solved + 1,
        firstTry: state.firstTry + (state.misses === 0 ? 1 : 0),
        startedAt: startedAt,
      }),
      result: 'complete',
    };
  }

  /** Depois de HINT_AFTER_MISSES erros na palavra, a próxima lacuna e a peça dela pulsam */
  function shouldHint(state) {
    return state.phase === 'building' && state.misses >= HINT_AFTER_MISSES;
  }

  /** A primeira lacuna vazia e uma peça (ainda solta) que serve nela: { slotIndex, tileId } */
  function hintFor(state) {
    var round = currentRound(state);
    for (var slotIndex = 0; slotIndex < state.slots.length; slotIndex++) {
      if (state.slots[slotIndex] !== null) continue;
      for (var i = 0; i < round.tiles.length; i++) {
        var tile = round.tiles[i];
        if (!isPlaced(state, tile.id) && tile.syllable === round.syllables[slotIndex]) {
          return { slotIndex: slotIndex, tileId: tile.id };
        }
      }
    }
    return null;
  }

  /**
   * Passa para a próxima palavra (ou termina). `round` é a partida em que a pausa foi agendada:
   * se o jogo foi reiniciado no meio, nada muda. Devolve { state, result } com result:
   * 'next' | 'complete' | null.
   */
  function next(state, round, now) {
    if (round !== state.round || state.phase !== 'celebrating') return { state: state, result: null };
    if (state.index + 1 >= state.total) {
      return {
        state: Object.assign({}, state, { phase: 'completed', completedAt: now }),
        result: 'complete',
      };
    }
    return {
      state: Object.assign({}, state, {
        phase: 'building',
        index: state.index + 1,
        slots: emptySlots(state.rounds[state.index + 1]),
        misses: 0,
      }),
      result: 'next',
    };
  }

  /** Estrelas pelas palavras montadas sem nenhum erro; terminar já vale ao menos uma */
  function starsFor(level, firstTry) {
    var cfg = configFor(level);
    if (firstTry >= cfg.three) return 3;
    if (firstTry >= cfg.two) return 2;
    return 1;
  }

  function calcStars(state) {
    return starsFor(state.level, state.firstTry);
  }

  return {
    LEVELS: LEVELS,
    WORDS: Data.WORDS,
    ADVANCE_DELAY_MS: ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: HINT_AFTER_MISSES,
    configFor: configFor,
    promptFor: promptFor,
    correctSpeechFor: correctSpeechFor,
    wrongSpeechFor: wrongSpeechFor,
    isUsableExtra: isUsableExtra,
    pickExtras: pickExtras,
    createGame: createGame,
    currentRound: currentRound,
    start: start,
    fits: fits,
    place: place,
    shouldHint: shouldHint,
    hintFor: hintFor,
    next: next,
    starsFor: starsFor,
    calcStars: calcStars,
    sayFor: Data.sayFor,
    isNewRecord: Utils.isNewRecord,
    elapsedMs: Utils.elapsedMs,
  };
});
