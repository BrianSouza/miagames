// Regras do "Quantos tem?" (assets/games/how-many/how-many-logic.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../../assets/games/how-many/how-many-logic.js');
const Symbols = require('../../assets/games/_shared/symbols.js');

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

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const LEVELS = { easy: { max: 5, options: 3 }, medium: { max: 10, options: 4 }, hard: { max: 20, options: 4 } };

describe('createGame', () => {
  test('8 rodadas, e a quantidade máxima e as figuras crescem com o nível', () => {
    for (const [difficulty, { max, options }] of Object.entries(LEVELS)) {
      for (const seed of SEEDS) {
        const game = Logic.createGame(difficulty, { random: prng(seed) });
        assert.equal(game.total, 8);
        for (const round of game.rounds) {
          assert.ok(round.count >= 1 && round.count <= max, `${difficulty}: ${round.count}`);
          assert.equal(round.options.length, options, difficulty);
        }
      }
    }
  });

  test('dificuldade desconhecida vira fácil', () => {
    assert.equal(Logic.createGame('x').difficulty, 'easy');
  });

  test('cada rodada tem uma só resposta certa, entre números diferentes, em ordem crescente', () => {
    for (const difficulty of Object.keys(LEVELS)) {
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          assert.equal(new Set(round.options).size, round.options.length);
          assert.equal(round.options.filter((n) => n === round.count).length, 1);
          assert.deepEqual(round.options, [...round.options].sort((a, b) => a - b));
          assert.equal(round.answerKey, String(round.count));
          assert.deepEqual(round.optionKeys, round.options.map(String));
        }
      }
    }
  });

  test('todas as figuras ficam dentro do alcance do nível', () => {
    for (const [difficulty, { max }] of Object.entries(LEVELS)) {
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          assert.ok(round.options.every((n) => n >= 1 && n <= max), `${difficulty}: ${round.options}`);
        }
      }
    }
  });

  test('fácil: todas as quantidades de 1 a 5 aparecem, sem repetir em seguida', () => {
    for (const seed of SEEDS) {
      const counts = Logic.createGame('easy', { random: prng(seed) }).rounds.map((r) => r.count);
      for (let n = 1; n <= 5; n++) assert.ok(counts.includes(n), `seed ${seed}: falta ${n} em ${counts}`);
      for (let i = 1; i < counts.length; i++) assert.notEqual(counts[i], counts[i - 1], `seed ${seed}: ${counts}`);
    }
  });

  test('médio e difícil: 8 quantidades diferentes', () => {
    for (const difficulty of ['medium', 'hard']) {
      for (const seed of SEEDS) {
        const counts = Logic.createGame(difficulty, { random: prng(seed) }).rounds.map((r) => r.count);
        assert.equal(new Set(counts).size, 8, `${difficulty} seed ${seed}: ${counts}`);
      }
    }
  });

  test('difícil: metade das rodadas passa de 10 (é aí que contar fica difícil)', () => {
    for (const seed of SEEDS) {
      const counts = Logic.createGame('hard', { random: prng(seed) }).rounds.map((r) => r.count);
      assert.equal(counts.filter((c) => c > 10).length, 4, `seed ${seed}: ${counts}`);
    }
  });

  test('médio e difícil: uma das figuras é vizinha da resposta (errar por um)', () => {
    for (const difficulty of ['medium', 'hard']) {
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          assert.ok(
            round.options.some((n) => Math.abs(n - round.count) === 1),
            `${difficulty} seed ${seed}: ${round.count} em ${round.options}`,
          );
        }
      }
    }
  });

  test('os objetos variam e nunca se repetem em seguida', () => {
    for (const difficulty of Object.keys(LEVELS)) {
      for (const seed of SEEDS) {
        const ids = Logic.createGame(difficulty, { random: prng(seed) }).rounds.map((r) => r.object.id);
        for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1], `seed ${seed}: ${ids}`);
        assert.ok(new Set(ids).size >= 4, `seed ${seed}: pouca variedade ${ids}`);
      }
    }
  });

  test('a posição da resposta certa varia entre as figuras', () => {
    const positions = new Set();
    for (const seed of SEEDS) {
      for (const round of Logic.createGame('medium', { random: prng(seed) }).rounds) {
        positions.add(round.options.indexOf(round.count));
      }
    }
    assert.equal(positions.size, 4);
  });
});

describe('promptFor', () => {
  test('usa o gênero certo: quantas estrelas, quantos peixes', () => {
    const by = (id) => Logic.OBJECTS.find((o) => o.id === id);
    assert.equal(Logic.promptFor(by('star')), 'Quantas estrelas tem aqui?');
    assert.equal(Logic.promptFor(by('ball')), 'Quantas bolas tem aqui?');
    assert.equal(Logic.promptFor(by('apple')), 'Quantas maçãs tem aqui?');
    assert.equal(Logic.promptFor(by('flower')), 'Quantas flores tem aqui?');
    assert.equal(Logic.promptFor(by('fish')), 'Quantos peixes tem aqui?');
  });

  test('todo objeto tem nome, plural e gênero definidos', () => {
    assert.equal(Logic.OBJECTS.length, 5);
    for (const o of Logic.OBJECTS) {
      assert.ok(o.id && o.name && o.plural, o.id);
      assert.equal(typeof o.feminine, 'boolean', o.id);
    }
  });
});

describe('fileiras', () => {
  test('os objetos ficam em fileiras de 5', () => {
    assert.equal(Logic.PER_ROW, 5);
    assert.equal(Logic.rowsFor(1), 1);
    assert.equal(Logic.rowsFor(5), 1);
    assert.equal(Logic.rowsFor(6), 2);
    assert.equal(Logic.rowsFor(15), 3);
    assert.equal(Logic.rowsFor(20), 4);
  });
});

describe('tapObject (contar tocando)', () => {
  test('cada objeto novo fala o próximo número, na ordem dos toques', () => {
    let counted = [];
    const spoken = [];
    for (const index of [3, 0, 4]) {
      const out = Logic.tapObject(counted, index);
      counted = out.counted;
      spoken.push(Logic.numberName(out.number));
    }
    assert.deepEqual(spoken, ['Um', 'Dois', 'Três']);
    assert.deepEqual(counted, [3, 0, 4]);
  });

  test('tocar de novo num objeto já contado não conta outra vez', () => {
    const first = Logic.tapObject([], 2);
    const again = Logic.tapObject(first.counted, 2);
    assert.equal(again.number, null);
    assert.equal(again.counted, first.counted);
  });

  test('conta até 20 por extenso', () => {
    let counted = [];
    let last;
    for (let i = 0; i < 20; i++) ({ counted, number: last } = Logic.tapObject(counted, i));
    assert.equal(Logic.numberName(last), 'Vinte');
  });
});

describe('partida', () => {
  test('o motor de rodadas funciona com as chaves em texto', () => {
    let game = Logic.createGame('easy', { random: prng(9) });
    const right = Logic.currentRound(game).answerKey;
    const out = Logic.answer(game, right, 1000);
    assert.equal(out.result, 'correct');
    game = Logic.next(out.state, out.state.round, 2500).state;
    assert.equal(game.index, 1);
  });

  test('uma figura errada conta erro; a dica vem depois de 2', () => {
    let game = Logic.createGame('medium', { random: prng(9) });
    const round = Logic.currentRound(game);
    const wrongs = round.optionKeys.filter((k) => k !== round.answerKey);
    game = Logic.answer(game, wrongs[0], 1).state;
    assert.equal(Logic.shouldHint(game), false);
    game = Logic.answer(game, wrongs[1], 2).state;
    assert.equal(Logic.shouldHint(game), true);
    assert.equal(game.errors, 2);
  });
});
