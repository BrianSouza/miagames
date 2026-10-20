/**
 * Regras do "Colorir" — funções puras, sem DOM, timers ou ponte.
 *
 * A criança escolhe uma cor e passa o dedo dentro de uma letra (ou palavra): a tinta só aparece
 * dentro do contorno, então ela aprende o desenho da letra sem "errar". Cada vez que o dedo
 * SAI do contorno conta uma saída (vira o "moves" do Flutter: quanto menos, melhor).
 *
 * Roda no navegador (window.PaintLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../_shared/symbols.js'),
      require('../_shared/game-utils.js'),
      require('../_shared/words.js'),
    );
  } else {
    root.PaintLogic = factory(root.GameSymbols, root.GameUtils, root.SyllableWords);
  }
})(this, function (Symbols, Utils, Words) {
  'use strict';

  // Os 6 níveis (do 1 ao 6). items: quantas letras/palavras por partida. pool: o que pode sair.
  // coverage: a fração da forma que precisa estar pintada. tolerance: o quanto o dedo pode passar
  // do contorno sem contar uma saída (fração do tamanho da letra). brush: a grossura do pincel
  // (fração do tamanho da letra). three/two: o máximo de saídas na partida inteira para 3 e 2
  // estrelas. A exigência CRESCE: o pincel afina, a tolerância encolhe e cabem menos saídas.
  var LEVELS = [
    { items: 5, pool: 'vowels',   coverage: 0.80, tolerance: 0.10, brush: 0.22, three: 10, two: 20 },
    { items: 5, pool: 'straight', coverage: 0.82, tolerance: 0.09, brush: 0.20, three: 9,  two: 18 },
    { items: 5, pool: 'letters',  coverage: 0.85, tolerance: 0.08, brush: 0.18, three: 8,  two: 15 },
    { items: 5, pool: 'lower',    coverage: 0.87, tolerance: 0.07, brush: 0.16, three: 7,  two: 13 },
    { items: 5, pool: 'words4',   coverage: 0.88, tolerance: 0.06, brush: 0.14, three: 6,  two: 11 },
    { items: 5, pool: 'words6',   coverage: 0.90, tolerance: 0.06, brush: 0.12, three: 5,  two: 9 },
  ];

  /** Pausa depois de terminar uma forma, para a criança curtir antes da próxima */
  var ADVANCE_DELAY_MS = 1500;

  /** O pincel e a tolerância nunca ficam menores que isto (px): um dedo não é tão preciso */
  var MIN_BRUSH_PX = 14;
  var MIN_TOLERANCE_PX = 10;

  function configFor(level) {
    return LEVELS[Utils.clampLevel(level) - 1];
  }

  function letterItem(letter, lower) {
    return {
      kind: 'letter',
      text: lower ? letter.symbol.toLowerCase() : letter.symbol,
      say: letter.name,
      id: null,
    };
  }

  function wordItem(entry, upper) {
    var fix = function (t) { return upper ? t.toUpperCase() : t; };
    return {
      kind: 'word',
      text: fix(entry.word),
      say: entry.word,
      id: entry.id,
      syllables: entry.syllables.map(fix),
    };
  }

  /** Tudo que pode sair em cada tipo de nível */
  function poolFor(name) {
    var letters = Symbols.LETTERS;
    var byLetter = function (list) {
      return letters.filter(function (l) { return list.indexOf(l.symbol) !== -1; });
    };
    switch (name) {
      case 'vowels':   return byLetter(['A', 'E', 'I', 'O', 'U']).map(function (l) { return letterItem(l, false); });
      // letras de traços retos, as mais fáceis de contornar
      case 'straight': return byLetter(['E', 'F', 'H', 'I', 'L', 'T']).map(function (l) { return letterItem(l, false); });
      case 'letters':  return letters.map(function (l) { return letterItem(l, false); });
      case 'lower':    return letters.map(function (l) { return letterItem(l, true); });
      case 'words4':
        return Words.WORDS.filter(function (w) { return w.syllables.length === 2; })
          .map(function (w) { return wordItem(w, true); });
      case 'words6':
        return Words.WORDS.filter(function (w) { return w.syllables.length === 3; })
          .map(function (w) { return wordItem(w, false); });
      default: return [];
    }
  }

  /**
   * Como a palavra pode ser escrita: numa linha, ou em duas quebrando entre sílabas ("ba" / "nana").
   * O jogo escolhe, pela tela, a que deixa as letras maiores. Letras sozinhas têm uma linha só.
   */
  function layoutsFor(item) {
    var options = [[item.text]];
    if (item.kind === 'word' && item.syllables.length > 1) {
      for (var cut = 1; cut < item.syllables.length; cut++) {
        options.push([item.syllables.slice(0, cut).join(''), item.syllables.slice(cut).join('')]);
      }
    }
    return options;
  }

  /** O que a voz pede: "Vamos pintar a letra Bê!" / "Vamos pintar a palavra bola!" */
  function promptFor(item) {
    return item.kind === 'letter' ? 'Vamos pintar a letra ' + item.say + '!' : 'Vamos pintar a palavra ' + item.say + '!';
  }

  /** O que a voz diz ao terminar uma forma */
  function correctSpeechFor(item) {
    return item.say.charAt(0).toUpperCase() + item.say.slice(1) + '! Muito bem!';
  }

  /** Cria uma partida. `previousRound` identifica a partida (ver next) */
  function createGame(level, options) {
    var opts = options || {};
    var key = Utils.clampLevel(level);
    var cfg = LEVELS[key - 1];
    var items = Symbols.shuffle(poolFor(cfg.pool), opts.random).slice(0, cfg.items);

    return {
      level: key,
      items: items,
      total: items.length,
      index: 0,
      phase: 'painting',     // painting | celebrating | completed
      exits: 0,              // saídas do contorno na partida toda (vira "moves" no Flutter)
      itemExits: 0,          // saídas na forma atual
      solved: 0,
      startedAt: null,       // primeiro toque — o tempo não corre antes disso
      completedAt: null,
      round: (opts.previousRound || 0) + 1,
    };
  }

  function currentItem(state) {
    return state.items[state.index];
  }

  /** A criança encostou o dedo na tela: o tempo começa a contar */
  function start(state, now) {
    return state.startedAt === null ? Object.assign({}, state, { startedAt: now }) : state;
  }

  /** O dedo saiu do contorno (só conta enquanto se pinta) */
  function recordExit(state) {
    if (state.phase !== 'painting') return state;
    return Object.assign({}, state, { exits: state.exits + 1, itemExits: state.itemExits + 1 });
  }

  /** Quanto da forma já está pintado vale como "terminou"? (painted/total em pixels) */
  function isComplete(state, painted, total) {
    if (total <= 0) return false;
    return painted / total >= configFor(state.level).coverage;
  }

  /** A forma foi pintada: hora de comemorar */
  function finishItem(state) {
    if (state.phase !== 'painting') return state;
    return Object.assign({}, state, { phase: 'celebrating', solved: state.solved + 1 });
  }

  /**
   * Passa para a próxima forma (ou termina). `round` é a rodada em que a pausa foi agendada:
   * se o jogo foi reiniciado no meio, nada muda. Devolve { state, result } com result:
   * 'next' | 'complete' | null.
   */
  function next(state, round, now) {
    if (round !== state.round || state.phase !== 'celebrating') return { state: state, result: null };
    if (state.index + 1 >= state.total) {
      return { state: Object.assign({}, state, { phase: 'completed', completedAt: now }), result: 'complete' };
    }
    return {
      state: Object.assign({}, state, { phase: 'painting', index: state.index + 1, itemExits: 0 }),
      result: 'next',
    };
  }

  /** 1 a 3 estrelas pelo total de saídas, com a exigência do nível */
  function calcStars(state) {
    var cfg = configFor(state.level);
    if (state.exits <= cfg.three) return 3;
    if (state.exits <= cfg.two) return 2;
    return 1;
  }

  /** Tamanhos em px do pincel e da tolerância para uma letra de `fontSize` px */
  function sizesFor(level, fontSize) {
    var cfg = configFor(level);
    return {
      brush: Math.max(MIN_BRUSH_PX, Math.round(fontSize * cfg.brush)),
      tolerance: Math.max(MIN_TOLERANCE_PX, Math.round(fontSize * cfg.tolerance)),
    };
  }

  // As cores da paleta: o que a voz fala e o valor
  var COLORS = [
    { id: 'red',    name: 'Vermelho', value: '#FF4D4D' },
    { id: 'orange', name: 'Laranja',  value: '#FF9F43' },
    { id: 'yellow', name: 'Amarelo',  value: '#FFD93B' },
    { id: 'green',  name: 'Verde',    value: '#2ED573' },
    { id: 'blue',   name: 'Azul',     value: '#54A0FF' },
    { id: 'purple', name: 'Roxo',     value: '#A78BFA' },
    { id: 'pink',   name: 'Rosa',     value: '#FF9FF3' },
    { id: 'brown',  name: 'Marrom',   value: '#A0693B' },
  ];

  return {
    LEVELS: LEVELS,
    COLORS: COLORS,
    ADVANCE_DELAY_MS: ADVANCE_DELAY_MS,
    configFor: configFor,
    poolFor: poolFor,
    layoutsFor: layoutsFor,
    promptFor: promptFor,
    correctSpeechFor: correctSpeechFor,
    createGame: createGame,
    currentItem: currentItem,
    start: start,
    recordExit: recordExit,
    isComplete: isComplete,
    finishItem: finishItem,
    next: next,
    calcStars: calcStars,
    sizesFor: sizesFor,
    isNewRecord: Utils.isNewRecord,
    elapsedMs: Utils.elapsedMs,
  };
});
