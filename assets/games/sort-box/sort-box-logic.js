/**
 * Regras do "Na caixa certa" — funções puras, sem DOM, timers ou ponte.
 *
 * Dois tipos de rodada, como a trilha pede:
 *  - 'sort' (separar): uma pilha de letras e números; cada um vai para a caixa certa
 *    (letras ou números; vogais ou consoantes; vogais, consoantes ou números).
 *  - 'give' (dar): "Dê 3 maçãs para a Mia!" — a criança arrasta, para o prato, a quantidade pedida
 *    de um objeto; entre as peças da pilha há objetos que não são os pedidos (soltar um deles é
 *    um erro). A voz conta cada um que cai ("um", "dois"...) e a rodada termina no número pedido.
 *
 * Soltar fora de todas as caixas não conta nada. Roda no navegador (window.SortBoxLogic) e no Node.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../_shared/symbols.js'),
      require('../_shared/game-utils.js'),
      require('../how-many/how-many-logic.js'),
    );
  } else {
    root.SortBoxLogic = factory(root.GameSymbols, root.GameUtils, root.HowManyLogic);
  }
})(this, function (Symbols, Utils, HowMany) {
  'use strict';

  // Os 6 níveis (do 1 ao 6). kind: 'sort' (separar) ou 'give' (dar a quantidade pedida).
  // Separar — pool: o que se separa; boxes: quantas caixas; items: quantas peças; maxNumber: o
  // maior número que aparece. Dar — most: o maior número pedido; rounds: quantos pedidos por partida;
  // extra: quantos objetos pedidos SOBRAM na pilha (além dos que se pedem); distract: quantos objetos
  // de outro tipo. two/three: o máximo de erros (peças soltas no lugar errado) na partida inteira
  // que ainda valem 2 e 3 estrelas. A exigência CRESCE: mais peças, mais caixas, menos erros permitidos.
  var LEVELS = [
    { kind: 'sort', pool: 'letters-numbers',          boxes: 2, items: 6,  maxNumber: 9,  rounds: 1, two: 4, three: 1 },
    { kind: 'sort', pool: 'vowels-consonants',        boxes: 2, items: 6,  maxNumber: 9,  rounds: 1, two: 3, three: 1 },
    { kind: 'give', pool: 'objects',                  boxes: 1, most: 5,   rounds: 3, extra: 1, distract: 2, two: 3, three: 1 },
    { kind: 'sort', pool: 'vowels-consonants-numbers', boxes: 3, items: 9, maxNumber: 9,  rounds: 1, two: 4, three: 1 },
    { kind: 'give', pool: 'objects',                  boxes: 1, most: 8,   rounds: 3, extra: 2, distract: 2, two: 3, three: 1 },
    { kind: 'sort', pool: 'vowels-consonants-numbers', boxes: 3, items: 12, maxNumber: 20, rounds: 1, two: 4, three: 1 },
  ];

  /** Pausa depois de terminar uma rodada, para a criança curtir antes da próxima */
  var ADVANCE_DELAY_MS = 1500;

  /** Quantas peças se colocam, no máximo, numa partida (= estrelas de progresso no cabeçalho) */
  var MAX_UNITS = 12;

  /** Depois de tantos erros na mesma rodada, a peça e a caixa certas "respiram" como dica */
  var HINT_AFTER_MISSES = 2;

  var VOWELS = ['A', 'E', 'I', 'O', 'U'];

  // As caixas. label: o que aparece nela; say: o que a voz fala ao tocar; one: o nome de UMA peça
  // ("Consoante!"); art: o artigo ("uma consoante", "um número").
  var BOXES = {
    letter:    { id: 'letter',    label: 'ABC',       say: 'Letras',     one: 'Letra',     art: 'uma' },
    number:    { id: 'number',    label: '123',       say: 'Números',    one: 'Número',    art: 'um' },
    vowel:     { id: 'vowel',     label: 'A E I O U', say: 'Vogais',     one: 'Vogal',     art: 'uma' },
    consonant: { id: 'consonant', label: 'B C D',     say: 'Consoantes', one: 'Consoante', art: 'uma' },
    plate:     { id: 'plate',     label: '',          say: 'Prato',      one: 'Prato',     art: 'um' },
  };

  var POOL_BOXES = {
    'letters-numbers':           ['letter', 'number'],
    'vowels-consonants':         ['vowel', 'consonant'],
    'vowels-consonants-numbers': ['vowel', 'consonant', 'number'],
  };

  var SORT_PROMPTS = {
    'letters-numbers':           'Letras de um lado, números do outro!',
    'vowels-consonants':         'Vogais de um lado, consoantes do outro!',
    'vowels-consonants-numbers': 'Vogais, consoantes e números: cada um na sua caixa!',
  };

  function configFor(level) {
    return LEVELS[Utils.clampLevel(level) - 1];
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // ── Separar ───────────────────────────────────────────────────────────────────
  function letterItem(letter) {
    return {
      key: letter.symbol, kind: 'letter', glyph: letter.symbol, say: letter.name,
      target: VOWELS.indexOf(letter.symbol) !== -1 ? 'vowel' : 'consonant',
    };
  }

  function numberItem(n) {
    return { key: String(n), kind: 'number', glyph: String(n), say: Symbols.numberName(n), target: 'number' };
  }

  function range(from, to) {
    var list = [];
    for (var n = from; n <= to; n++) list.push(n);
    return list;
  }

  /** Escolhe `count` peças de `candidates` (já embaralhadas) sem juntar símbolos que se confundem */
  function takeDistinct(candidates, count, chosenSoFar) {
    var out = [];
    for (var i = 0; i < candidates.length && out.length < count; i++) {
      var c = candidates[i];
      var clash = chosenSoFar.concat(out).some(function (o) {
        return o.key === c.key || Symbols.looksAlike(o.key, c.key);
      });
      if (!clash) out.push(c);
    }
    return out;
  }

  /** Quantas peças vão para cada caixa: reparte igual (as que sobram vão para as primeiras caixas) */
  function split(items, boxes) {
    var base = Math.floor(items / boxes);
    var rest = items - base * boxes;
    var counts = [];
    for (var i = 0; i < boxes; i++) counts.push(base + (i < rest ? 1 : 0));
    return counts;
  }

  function pickSortItems(cfg, random) {
    var ids = POOL_BOXES[cfg.pool];
    var counts = split(cfg.items, ids.length);
    var letters = Symbols.shuffle(Symbols.LETTERS, random).map(letterItem);
    var numbers = Symbols.shuffle(range(1, cfg.maxNumber), random).map(numberItem);
    var chosen = [];

    ids.forEach(function (boxId, i) {
      var pool = boxId === 'number' ? numbers
        : boxId === 'vowel' ? letters.filter(function (l) { return l.target === 'vowel'; })
        : boxId === 'consonant' ? letters.filter(function (l) { return l.target === 'consonant'; })
        : letters;   // 'letter': qualquer letra
      var picked = takeDistinct(pool, counts[i], chosen);
      if (boxId === 'letter') picked.forEach(function (p) { p.target = 'letter'; });
      chosen = chosen.concat(picked);
    });
    return Symbols.shuffle(chosen, random);
  }

  function sortRound(cfg, random) {
    var items = pickSortItems(cfg, random).map(function (item, i) {
      return Object.assign({ id: 'i' + i }, item);
    });
    return {
      kind: 'sort',
      prompt: SORT_PROMPTS[cfg.pool],
      targets: POOL_BOXES[cfg.pool].map(function (id) { return BOXES[id]; }),
      items: items,
      goal: items.length,
    };
  }

  // ── Dar ───────────────────────────────────────────────────────────────────────
  /** O número como a voz o diz com o objeto: "uma maçã", "duas flores", "um peixe", "dois peixes", "três bolas" */
  function quantityFor(object, count) {
    var word = count === 1 ? (object.feminine ? 'uma' : 'um')
      : count === 2 ? (object.feminine ? 'duas' : 'dois')
      : Symbols.numberName(count).toLowerCase();
    var noun = count === 1 ? object.name.toLowerCase() : object.plural;
    return word + ' ' + noun;
  }

  function giveRound(cfg, count, object, random) {
    var others = HowMany.OBJECTS.filter(function (o) { return o.id !== object.id; });
    var asked = [];
    for (var i = 0; i < count + cfg.extra; i++) asked.push({ key: object.id, object: object, target: 'plate' });
    var wrong = [];
    var shuffledOthers = Symbols.shuffle(others, random);
    for (var j = 0; j < cfg.distract; j++) {
      var other = shuffledOthers[j % shuffledOthers.length];
      wrong.push({ key: other.id, object: other, target: null });
    }
    var items = Symbols.shuffle(asked.concat(wrong), random).map(function (item, k) {
      return {
        id: 'i' + k, key: item.key, kind: 'object', glyph: null, img: item.object.id,
        say: item.object.name, target: item.target,
      };
    });
    return {
      kind: 'give',
      prompt: 'Dê ' + quantityFor(object, count) + ' para a Mia!',
      targets: [Object.assign({}, BOXES.plate, { label: String(count) })],
      items: items,
      goal: count,
      object: object,
    };
  }

  /**
   * Os pedidos de uma partida: números diferentes (1 a `most`), com pelo menos um grande (perto do
   * máximo do nível) e que somam no máximo MAX_UNITS (cada peça que se coloca acende uma estrela
   * de progresso, e a fileira de estrelas precisa caber no cabeçalho).
   */
  function pickCounts(cfg, random) {
    var all = range(1, cfg.most);
    for (var attempt = 0; attempt < 300; attempt++) {
      var counts = Symbols.shuffle(all, random).slice(0, cfg.rounds);
      var sum = counts.reduce(function (a, b) { return a + b; }, 0);
      if (sum <= MAX_UNITS && Math.max.apply(null, counts) >= cfg.most - 2) return counts;
    }
    return Symbols.shuffle([cfg.most].concat(range(1, cfg.rounds - 1)), random);
  }

  /** Cria uma partida. `previousRound` identifica a partida (ver next) */
  function createGame(level, options) {
    var opts = options || {};
    var key = Utils.clampLevel(level);
    var cfg = LEVELS[key - 1];
    var rounds = [];

    if (cfg.kind === 'sort') {
      rounds.push(sortRound(cfg, opts.random));
    } else {
      var counts = pickCounts(cfg, opts.random);
      // objetos diferentes de um pedido para o outro
      var objects = Symbols.shuffle(HowMany.OBJECTS, opts.random).slice(0, cfg.rounds);
      counts.forEach(function (count, i) { rounds.push(giveRound(cfg, count, objects[i], opts.random)); });
    }

    return {
      level: key,
      kind: cfg.kind,
      rounds: rounds,
      // uma estrela de progresso por peça que se coloca no lugar certo
      total: rounds.reduce(function (sum, r) { return sum + r.goal; }, 0),
      index: 0,
      phase: 'sorting',          // sorting | celebrating | completed
      placed: {},                // peça → caixa onde está (só a rodada atual)
      placedCount: 0,            // quantas peças já estão no lugar (rodada atual)
      doneUnits: 0,              // quantas peças já estão no lugar na partida toda
      misses: 0,                 // erros na rodada atual
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

  function itemById(round, itemId) {
    for (var i = 0; i < round.items.length; i++) if (round.items[i].id === itemId) return round.items[i];
    return null;
  }

  function targetById(round, targetId) {
    for (var i = 0; i < round.targets.length; i++) if (round.targets[i].id === targetId) return round.targets[i];
    return null;
  }

  /** A criança encostou o dedo numa peça: o tempo começa a contar */
  function start(state, now) {
    return state.startedAt === null ? Object.assign({}, state, { startedAt: now }) : state;
  }

  /**
   * A criança soltou a peça `itemId` na caixa `targetId`. Devolve { state, result } com result:
   * 'correct' (ficou no lugar) | 'complete' (era a última: a rodada está pronta) | 'wrong' |
   * null (ignorado: fora da vez, peça ou caixa inexistente, peça já no lugar, rodada já pronta).
   */
  function place(state, itemId, targetId, now) {
    if (state.phase !== 'sorting') return { state: state, result: null };
    var round = currentRound(state);
    var item = itemById(round, itemId);
    if (!item || !targetById(round, targetId) || state.placed[itemId] !== undefined) {
      return { state: state, result: null };
    }

    var startedAt = state.startedAt === null ? now : state.startedAt;

    if (item.target !== targetId) {
      return {
        state: Object.assign({}, state, {
          misses: state.misses + 1,
          errors: state.errors + 1,
          lastWrong: itemId,
          startedAt: startedAt,
        }),
        result: 'wrong',
      };
    }

    var placed = Object.assign({}, state.placed);
    placed[itemId] = targetId;
    var placedCount = state.placedCount + 1;
    var done = placedCount >= round.goal;
    return {
      state: Object.assign({}, state, {
        placed: placed,
        placedCount: placedCount,
        doneUnits: state.doneUnits + 1,
        phase: done ? 'celebrating' : 'sorting',
        startedAt: startedAt,
      }),
      result: done ? 'complete' : 'correct',
    };
  }

  /** Depois de HINT_AFTER_MISSES erros na rodada, a peça e a caixa certas pulsam */
  function shouldHint(state) {
    return state.phase === 'sorting' && state.misses >= HINT_AFTER_MISSES;
  }

  /**
   * Qual peça e qual caixa pulsam: a última que foi parar no lugar errado (se ela tem lugar certo)
   * ou, se ela era uma que não serve (um objeto a mais), a primeira peça pedida que ainda está na pilha.
   */
  function hintFor(state) {
    var round = currentRound(state);
    var last = state.lastWrong === null ? null : itemById(round, state.lastWrong);
    if (last && last.target && state.placed[last.id] === undefined) return { itemId: last.id, targetId: last.target };
    for (var i = 0; i < round.items.length; i++) {
      var item = round.items[i];
      if (item.target && state.placed[item.id] === undefined) return { itemId: item.id, targetId: item.target };
    }
    return null;
  }

  /**
   * Passa para a próxima rodada (ou termina). `round` é a partida em que a pausa foi agendada:
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
        phase: 'sorting',
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
  function promptFor(round) {
    return round.prompt;
  }

  /** Peça no lugar certo (separar): "Bê. Consoante!" — e, se foi a última, "Tudo no lugar. Muito bem!" */
  function correctSpeechFor(round, itemId, isLast) {
    var item = itemById(round, itemId);
    var box = targetById(round, item.target);
    return item.say + '. ' + box.one + '!' + (isLast ? ' Tudo no lugar. Muito bem!' : '');
  }

  /** Objeto no prato: a voz conta ("Um", "Dois"...); no último, diz a quantidade e elogia */
  function countSpeechFor(round, count, isLast) {
    if (!isLast) return Symbols.numberName(count);
    return capitalize(quantityFor(round.object, count)) + '! Muito bem!';
  }

  /** Peça no lugar errado: diz o que é e que não é daquela caixa (ou, no prato, o que se procura) */
  function wrongSpeechFor(round, itemId, targetId) {
    var item = itemById(round, itemId);
    if (round.kind === 'give') {
      // "Essa é uma bola. Procure as maçãs!"
      var dropped = HowMany.OBJECTS.filter(function (o) { return o.id === item.key; })[0];
      var asked = round.object;
      return (dropped.feminine ? 'Essa é uma ' : 'Esse é um ') + dropped.name.toLowerCase() + '. ' +
        'Procure ' + (asked.feminine ? 'as ' : 'os ') + asked.plural + '!';
    }
    var box = targetById(round, targetId);
    return item.say + '. Não é ' + box.art + ' ' + box.one.toLowerCase() + '. Tente de novo!';
  }

  return {
    LEVELS: LEVELS,
    BOXES: BOXES,
    MAX_UNITS: MAX_UNITS,
    ADVANCE_DELAY_MS: ADVANCE_DELAY_MS,
    HINT_AFTER_MISSES: HINT_AFTER_MISSES,
    configFor: configFor,
    createGame: createGame,
    quantityFor: quantityFor,
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
    countSpeechFor: countSpeechFor,
    wrongSpeechFor: wrongSpeechFor,
    isNewRecord: Utils.isNewRecord,
    elapsedMs: Utils.elapsedMs,
  };
});
