// Regras do "Colorir" (assets/games/paint/paint-logic.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../../assets/games/paint/paint-logic.js');
const Words = require('../../assets/games/_shared/words.js');

function prng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const LEVELS = [1, 2, 3, 4, 5, 6];
const games = (level) => SEEDS.map((seed) => Logic.createGame(level, { random: prng(seed) }));

describe('createGame', () => {
  test('5 formas por partida, em todos os níveis', () => {
    for (const level of LEVELS) {
      for (const game of games(level)) {
        assert.equal(game.total, 5);
        assert.equal(game.level, level);
        assert.equal(game.items.length, 5);
        assert.equal(game.phase, 'painting');
      }
    }
  });

  test('nível desconhecido vira o 1', () => {
    for (const bad of ['x', 0, 7, undefined, null, NaN]) assert.equal(Logic.createGame(bad).level, 1, String(bad));
  });

  test('as formas da partida não se repetem', () => {
    for (const level of LEVELS) {
      for (const game of games(level)) {
        const texts = game.items.map((i) => i.text);
        assert.equal(new Set(texts).size, texts.length, `nível ${level}: ${texts}`);
      }
    }
  });

  test('nível 1: as 5 vogais maiúsculas, em ordem sorteada', () => {
    const orders = new Set();
    for (const game of games(1)) {
      const texts = game.items.map((i) => i.text);
      assert.deepEqual([...texts].sort(), ['A', 'E', 'I', 'O', 'U']);
      orders.add(texts.join(''));
    }
    assert.ok(orders.size > 5, 'a ordem das vogais nunca muda');
  });

  test('nível 2: letras de traços retos (E F H I L T)', () => {
    for (const game of games(2)) {
      for (const item of game.items) assert.ok('EFHILT'.includes(item.text), item.text);
    }
  });

  test('nível 3: maiúsculas de todo o alfabeto; nível 4: minúsculas', () => {
    const upper = new Set();
    const lower = new Set();
    for (const game of games(3)) game.items.forEach((i) => upper.add(i.text));
    for (const game of games(4)) game.items.forEach((i) => lower.add(i.text));
    assert.ok([...upper].every((t) => /^[A-Z]$/.test(t)));
    assert.ok([...lower].every((t) => /^[a-z]$/.test(t)));
    assert.equal(upper.size, 26);
    assert.equal(lower.size, 26);
  });

  test('nível 5: palavras de 4 letras em maiúsculas; nível 6: de 6 letras em minúsculas', () => {
    for (const game of games(5)) {
      for (const item of game.items) {
        assert.equal(item.kind, 'word');
        assert.match(item.text, /^[A-Z]{4}$/);
        assert.equal(item.text.toLowerCase(), item.say);
      }
    }
    for (const game of games(6)) {
      for (const item of game.items) {
        assert.equal(item.kind, 'word');
        assert.match(item.text, /^[a-z]{6}$/);
      }
    }
  });

  test('as palavras vêm do banco do Qual sílaba falta?, com o desenho certo', () => {
    const ids = new Set(Words.WORDS.map((w) => w.id));
    for (const level of [5, 6]) {
      for (const game of games(level)) {
        for (const item of game.items) {
          assert.ok(ids.has(item.id), item.id);
          const word = Words.WORDS.find((w) => w.id === item.id);
          assert.equal(item.say, word.word);
        }
      }
    }
  });

  test('letras: a voz fala o nome da letra em português, não o símbolo', () => {
    const Symbols = require('../../assets/games/_shared/symbols.js');
    for (const game of games(3).concat(games(4))) {
      for (const item of game.items) {
        assert.equal(item.kind, 'letter');
        assert.equal(item.say, Symbols.findSymbol(item.text.toUpperCase()).name, item.text);
      }
    }
    const b = Logic.poolFor('letters').find((i) => i.text === 'B');
    assert.equal(b.say, 'Bê');
    assert.equal(Logic.poolFor('lower').find((i) => i.text === 'b').say, 'Bê');
  });

  test('a mesma partida se repete com a mesma semente', () => {
    assert.deepEqual(
      Logic.createGame(3, { random: prng(9) }).items,
      Logic.createGame(3, { random: prng(9) }).items,
    );
  });

  test('a rodada da partida seguinte é outra', () => {
    const first = Logic.createGame(1);
    assert.equal(Logic.createGame(1, { previousRound: first.round }).round, first.round + 1);
  });
});

describe('os níveis ficam mais exigentes', () => {
  const cfgs = Logic.LEVELS;

  test('o pincel afina, a tolerância encolhe e a cobertura exigida cresce', () => {
    for (let i = 1; i < 6; i++) {
      assert.ok(cfgs[i].brush <= cfgs[i - 1].brush, `pincel ${i}`);
      assert.ok(cfgs[i].tolerance <= cfgs[i - 1].tolerance, `tolerância ${i}`);
      assert.ok(cfgs[i].coverage >= cfgs[i - 1].coverage, `cobertura ${i}`);
    }
    assert.ok(cfgs[5].brush < cfgs[0].brush);
    assert.ok(cfgs[5].coverage > cfgs[0].coverage);
  });

  test('cabem menos saídas para as estrelas a cada nível', () => {
    for (let i = 1; i < 6; i++) {
      assert.ok(cfgs[i].three <= cfgs[i - 1].three, `3 estrelas ${i}`);
      assert.ok(cfgs[i].two <= cfgs[i - 1].two, `2 estrelas ${i}`);
    }
    for (const c of cfgs) assert.ok(c.three < c.two);
  });

  test('o pincel e a tolerância têm um mínimo em px (dedo não é preciso)', () => {
    const tiny = Logic.sizesFor(6, 30);
    assert.equal(tiny.brush, 14);
    assert.equal(tiny.tolerance, 10);
    const big = Logic.sizesFor(1, 300);
    assert.equal(big.brush, 66);
    assert.equal(big.tolerance, 30);
  });
});

describe('pintar', () => {
  const fresh = () => Logic.createGame(3, { random: prng(2) });

  test('o tempo só começa no primeiro toque, e uma vez só', () => {
    const state = fresh();
    assert.equal(state.startedAt, null);
    const started = Logic.start(state, 1000);
    assert.equal(started.startedAt, 1000);
    assert.equal(Logic.start(started, 5000), started);
  });

  test('cada saída do contorno conta, na forma e na partida', () => {
    let state = fresh();
    state = Logic.recordExit(Logic.recordExit(state));
    assert.equal(state.exits, 2);
    assert.equal(state.itemExits, 2);
  });

  test('saídas depois de terminar a forma não contam', () => {
    let state = Logic.finishItem(fresh());
    state = Logic.recordExit(state);
    assert.equal(state.exits, 0);
  });

  test('a forma termina com a cobertura do nível', () => {
    const state = fresh(); // nível 3: 85%
    assert.equal(Logic.isComplete(state, 849, 1000), false);
    assert.equal(Logic.isComplete(state, 850, 1000), true);
    assert.equal(Logic.isComplete(state, 0, 0), false, 'forma vazia nunca termina');
  });

  test('cada nível usa a sua cobertura', () => {
    for (const [i, { coverage }] of Logic.LEVELS.entries()) {
      const state = Logic.createGame(i + 1);
      assert.equal(Logic.isComplete(state, Math.ceil(coverage * 1000), 1000), true, `nível ${i + 1}`);
      assert.equal(Logic.isComplete(state, Math.floor(coverage * 1000) - 5, 1000), false, `nível ${i + 1}`);
    }
  });

  test('terminar a forma comemora; só então avança', () => {
    let state = Logic.finishItem(fresh());
    assert.equal(state.phase, 'celebrating');
    assert.equal(state.solved, 1);
    const out = Logic.next(state, state.round, 2000);
    assert.equal(out.result, 'next');
    assert.equal(out.state.index, 1);
    assert.equal(out.state.phase, 'painting');
    assert.equal(out.state.itemExits, 0, 'as saídas da forma zeram');
  });

  test('uma pausa agendada antes de reiniciar é ignorada', () => {
    const old = Logic.finishItem(fresh());
    const restarted = Logic.finishItem(Logic.createGame(3, { random: prng(2), previousRound: old.round }));
    const out = Logic.next(restarted, old.round, 5);
    assert.equal(out.result, null);
    assert.equal(out.state.index, 0);
  });

  test('sem terminar a forma, não avança', () => {
    const state = fresh();
    assert.equal(Logic.next(state, state.round, 1).result, null);
  });

  test('a quinta forma termina o jogo e marca o tempo', () => {
    let state = Logic.start(fresh(), 1000);
    let result;
    for (let i = 0; i < 5; i++) {
      state = Logic.finishItem(state);
      ({ state, result } = Logic.next(state, state.round, 2000 + i * 100));
    }
    assert.equal(result, 'complete');
    assert.equal(state.phase, 'completed');
    assert.equal(Logic.elapsedMs(state, 99_999), 1400);
  });
});

describe('estrelas', () => {
  const stars = (level, exits) => Logic.calcStars({ level, exits });

  test('menos saídas, mais estrelas, com os limites de cada nível', () => {
    for (const [i, { three, two }] of Logic.LEVELS.entries()) {
      const level = i + 1;
      assert.equal(stars(level, 0), 3);
      assert.equal(stars(level, three), 3, `nível ${level}`);
      assert.equal(stars(level, three + 1), 2, `nível ${level}`);
      assert.equal(stars(level, two), 2, `nível ${level}`);
      assert.equal(stars(level, two + 1), 1, `nível ${level}`);
    }
  });

  test('o mesmo número de saídas rende menos estrelas num nível mais alto', () => {
    assert.equal(stars(1, 9), 3);
    assert.equal(stars(6, 9), 2);
    assert.equal(stars(1, 12), 2);
    assert.equal(stars(6, 12), 1);
  });

  test('nunca menos de 1 estrela', () => {
    for (const level of LEVELS) assert.equal(stars(level, 999), 1);
  });
});

describe('falas e cores', () => {
  test('pede para pintar a letra ou a palavra', () => {
    assert.equal(Logic.promptFor({ kind: 'letter', say: 'Bê' }), 'Vamos pintar a letra Bê!');
    assert.equal(Logic.promptFor({ kind: 'word', say: 'bola' }), 'Vamos pintar a palavra bola!');
  });

  test('ao terminar, a voz diz o nome e elogia', () => {
    assert.equal(Logic.correctSpeechFor({ say: 'Bê' }), 'Bê! Muito bem!');
    assert.equal(Logic.correctSpeechFor({ say: 'bola' }), 'Bola! Muito bem!');
  });

  test('a paleta tem 8 cores distintas, com nome falado', () => {
    assert.equal(Logic.COLORS.length, 8);
    assert.equal(new Set(Logic.COLORS.map((c) => c.value)).size, 8);
    assert.equal(new Set(Logic.COLORS.map((c) => c.id)).size, 8);
    for (const c of Logic.COLORS) {
      assert.match(c.value, /^#[0-9A-F]{6}$/i);
      assert.ok(c.name.length > 2);
    }
  });
});
