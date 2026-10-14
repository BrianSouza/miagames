/**
 * Regras do "Quantos tem?" — funções puras, sem DOM, timers ou ponte.
 *
 * Aparecem alguns objetos e a criança conta (tocar em cada um fala o número,
 * um por objeto) e escolhe quantos são. Roda no navegador (window.HowManyLogic)
 * e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../_shared/symbols.js'), require('../_shared/quiz.js'));
  } else {
    root.HowManyLogic = factory(root.GameSymbols, root.GameQuiz);
  }
})(this, function (Symbols, Quiz) {
  'use strict';

  // max: quantos objetos no máximo; options: quantas figuras de resposta
  var DIFFICULTY = {
    easy:   { rounds: 8, max: 5,  options: 3 },
    medium: { rounds: 8, max: 10, options: 4 },
    hard:   { rounds: 8, max: 20, options: 4 },
  };

  /** Quantos objetos cabem numa fileira: fácil de contar de 5 em 5 */
  var PER_ROW = 5;

  // Os objetos têm gênero: "Quantas estrelas" mas "Quantos peixes".
  // `say` é o que a voz fala (plural); `name` o rótulo para leitores de tela.
  var OBJECTS = [
    { id: 'star',   name: 'Estrela', plural: 'estrelas', feminine: true },
    { id: 'ball',   name: 'Bola',    plural: 'bolas',    feminine: true },
    { id: 'apple',  name: 'Maçã',    plural: 'maçãs',    feminine: true },
    { id: 'fish',   name: 'Peixe',   plural: 'peixes',   feminine: false },
    { id: 'flower', name: 'Flor',    plural: 'flores',   feminine: true },
  ];

  function configFor(difficulty) {
    return DIFFICULTY[difficulty] || DIFFICULTY.easy;
  }

  /** O que a voz pergunta: "Quantas estrelas tem aqui?", "Quantos peixes tem aqui?" */
  function promptFor(object) {
    return (object.feminine ? 'Quantas ' : 'Quantos ') + object.plural + ' tem aqui?';
  }

  /** Quantas fileiras de PER_ROW ocupam `count` objetos */
  function rowsFor(count) {
    return Math.ceil(count / PER_ROW);
  }

  function range(from, to) {
    var list = [];
    for (var n = from; n <= to; n++) list.push(n);
    return list;
  }

  function hasAdjacentRepeat(list) {
    for (var i = 1; i < list.length; i++) if (list[i] === list[i - 1]) return true;
    return false;
  }

  /**
   * Embaralha até que nenhum par vizinho seja igual (as rodadas não repetem em
   * seguida). Com poucos repetidos, algumas tentativas bastam; o plano B, que
   * intercala as duas metades da lista ordenada, vale para qualquer lista em que
   * nenhum valor apareça mais que a metade das vezes.
   */
  function noAdjacentRepeats(list, random) {
    for (var attempt = 0; attempt < 200; attempt++) {
      var out = Symbols.shuffle(list, random);
      if (!hasAdjacentRepeat(out)) return out;
    }
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    var half = Math.ceil(sorted.length / 2);
    var woven = [];
    for (var i = 0; i < half; i++) {
      woven.push(sorted[i]);
      if (i + half < sorted.length) woven.push(sorted[i + half]);
    }
    return woven;
  }

  /**
   * As quantidades das rodadas. Fácil: todos os valores de 1 a 5 aparecem; médio e
   * difícil: valores diferentes (no difícil, metade acima de 10).
   */
  function pickCounts(cfg, random) {
    var all = range(1, cfg.max);
    if (cfg.max <= cfg.rounds) {
      var extras = Symbols.shuffle(all, random).slice(0, cfg.rounds - cfg.max);
      return noAdjacentRepeats(all.concat(extras), random);
    }
    if (cfg.max > 10) {
      var low = Symbols.shuffle(range(1, 10), random).slice(0, cfg.rounds / 2);
      var high = Symbols.shuffle(range(11, cfg.max), random).slice(0, cfg.rounds / 2);
      return Symbols.shuffle(low.concat(high), random);
    }
    return Symbols.shuffle(all, random).slice(0, cfg.rounds);
  }

  /** Os objetos das rodadas: variam, e nunca o mesmo duas vezes seguidas */
  function pickObjects(rounds, random) {
    var ids = OBJECTS.map(function (o) { return o.id; });
    var sequence = [];
    while (sequence.length < rounds) {
      var batch = Symbols.shuffle(ids, random);
      // o começo de um lote não pode repetir o fim do anterior
      if (sequence.length && batch[0] === sequence[sequence.length - 1]) batch.push(batch.shift());
      sequence = sequence.concat(batch);
    }
    return sequence.slice(0, rounds).map(function (id) {
      return OBJECTS.filter(function (o) { return o.id === id; })[0];
    });
  }

  /**
   * As figuras de resposta (números), em ordem crescente, como numa reta numérica.
   * Fora do fácil, uma delas é vizinha da certa (±1): errar por um é o engano
   * mais comum de quem está aprendendo a contar. (De 1 a 20 não há números com
   * algarismos invertidos, como 12 e 21, então nada se confunde.)
   */
  function pickOptions(count, cfg, random) {
    var others = range(1, cfg.max).filter(function (n) { return n !== count; });
    var chosen = [];

    if (cfg.options > 3) {
      var neighbors = others.filter(function (n) { return Math.abs(n - count) === 1; });
      if (neighbors.length) chosen.push(Symbols.shuffle(neighbors, random)[0]);
    }
    Symbols.shuffle(others, random).forEach(function (n) {
      if (chosen.length < cfg.options - 1 && chosen.indexOf(n) === -1) chosen.push(n);
    });

    return chosen.concat([count]).sort(function (a, b) { return a - b; });
  }

  /** Cria uma partida. `previousRound` identifica a partida (ver Quiz.next) */
  function createGame(difficulty, options) {
    var opts = options || {};
    var key = DIFFICULTY[difficulty] ? difficulty : 'easy';
    var cfg = DIFFICULTY[key];

    var counts = pickCounts(cfg, opts.random);
    var objects = pickObjects(cfg.rounds, opts.random);
    var rounds = counts.map(function (count, i) {
      var choices = pickOptions(count, cfg, opts.random);
      return {
        count: count,
        object: objects[i],
        options: choices,
        answerKey: String(count),
        optionKeys: choices.map(String),
      };
    });
    return Quiz.createState(key, rounds, opts.previousRound);
  }

  /**
   * A criança toca num objeto para contar: o primeiro toque fala "um", o segundo
   * "dois"... (um número por objeto, na ordem dos toques). Tocar de novo no mesmo
   * objeto não conta outra vez. Devolve { counted, number } (number: null se ignorado).
   */
  function tapObject(counted, index) {
    if (counted.indexOf(index) !== -1) return { counted: counted, number: null };
    var next = counted.concat([index]);
    return { counted: next, number: next.length };
  }

  return {
    DIFFICULTY: DIFFICULTY,
    PER_ROW: PER_ROW,
    OBJECTS: OBJECTS,
    ADVANCE_DELAY_MS: Quiz.ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: Quiz.HINT_AFTER_MISSES,
    configFor: configFor,
    promptFor: promptFor,
    rowsFor: rowsFor,
    pickCounts: pickCounts,
    pickObjects: pickObjects,
    pickOptions: pickOptions,
    createGame: createGame,
    tapObject: tapObject,
    numberName: Symbols.numberName,
    currentRound: Quiz.currentRound,
    answer: Quiz.answer,
    shouldHint: Quiz.shouldHint,
    next: Quiz.next,
    calcStars: Quiz.calcStars,
    isNewRecord: Quiz.isNewRecord,
    elapsedMs: Quiz.elapsedMs,
  };
});
