// Regras do "Na caixa certa" (assets/games/sort-box/): separar peças em caixas e dar a quantidade pedida.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../../assets/games/sort-box/sort-box-logic.js');
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

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const LEVELS = [1, 2, 3, 4, 5, 6];
const SORT_LEVELS = [1, 2, 4, 6];
const GIVE_LEVELS = [3, 5];
const games = (level) => SEEDS.map((seed) => Logic.createGame(level, { random: prng(seed) }));
const NOW = 1000;
const VOWELS = ['A', 'E', 'I', 'O', 'U'];

/** Uma peça da rodada atual que vai na caixa `targetId` e ainda não foi colocada */
const itemFor = (state, targetId) =>
  Logic.currentRound(state).items.find((i) => i.target === targetId && state.placed[i.id] === undefined);

/** Uma peça solta que NÃO vai na caixa `targetId` */
const wrongItemFor = (state, targetId) =>
  Logic.currentRound(state).items.find((i) => i.target !== targetId && state.placed[i.id] === undefined);

/** Coloca todas as peças da rodada atual nas caixas certas; devolve { state, result } do último passo */
function solveRound(state) {
  let out = { state, result: null };
  const round = Logic.currentRound(state);
  for (const item of round.items) {
    if (!item.target || out.state.phase !== 'sorting') continue;
    out = Logic.place(out.state, item.id, item.target, NOW);
  }
  return out;
}

describe('níveis', () => {
  test('são 6, intercalando separar e dar', () => {
    assert.equal(Logic.LEVELS.length, 6);
    assert.deepEqual(Logic.LEVELS.map((l) => l.kind), ['sort', 'sort', 'give', 'sort', 'give', 'sort']);
    assert.deepEqual(Logic.LEVELS.map((l) => l.boxes), [2, 2, 1, 3, 1, 3]);
  });

  test('o que cresce: peças para separar, caixas, pedidos maiores e mais objetos sobrando', () => {
    const sortItems = SORT_LEVELS.map((l) => Logic.LEVELS[l - 1].items);
    assert.deepEqual(sortItems, [...sortItems].sort((a, b) => a - b), 'peças crescem');
    assert.ok(sortItems[3] > sortItems[0]);
    assert.ok(Logic.LEVELS[4].most > Logic.LEVELS[2].most, 'o maior pedido cresce');
    assert.ok(Logic.LEVELS[4].extra >= Logic.LEVELS[2].extra, 'sobram mais objetos');
    assert.ok(Logic.LEVELS[5].maxNumber > Logic.LEVELS[3].maxNumber, 'os números crescem');
    // o primeiro nível de separar tem só 2 caixas e o último, 3
    assert.ok(Logic.LEVELS[5].boxes > Logic.LEVELS[0].boxes);
  });

  test('as estrelas: erros permitidos para 3★ e 2★, sempre possível ganhar 2★ sem errar nada', () => {
    for (const [i, l] of Logic.LEVELS.entries()) {
      assert.ok(l.three >= 0 && l.three < l.two, `nível ${i + 1}`);
      assert.ok(l.two >= 1, `nível ${i + 1}`);
    }
    // a tolerância não aumenta com o nível
    for (let i = 1; i < 6; i++) {
      assert.ok(Logic.LEVELS[i].two <= Logic.LEVELS[i - 1].two + 1, `2★ não afrouxa no nível ${i + 1}`);
      assert.ok(Logic.LEVELS[i].three <= Logic.LEVELS[i - 1].three, `3★ não afrouxa no nível ${i + 1}`);
    }
  });

  test('a pilha cabe na tela: no máximo 12 peças e 12 estrelas de progresso', () => {
    assert.equal(Logic.MAX_UNITS, 12);
    for (const level of LEVELS) {
      for (const g of games(level)) {
        assert.ok(g.total <= Logic.MAX_UNITS, `nível ${level}: ${g.total} estrelas de progresso`);
        for (const r of g.rounds) assert.ok(r.items.length <= 12, `nível ${level}: ${r.items.length} peças`);
      }
    }
  });

  test('configFor usa o nível e um nível inválido vira o 1', () => {
    assert.equal(Logic.configFor(4), Logic.LEVELS[3]);
    for (const bad of [0, 7, null, undefined, 'x', NaN]) assert.equal(Logic.configFor(bad), Logic.LEVELS[0]);
  });
});

describe('createGame: separar', () => {
  test('uma rodada, com as peças e as caixas do nível', () => {
    for (const level of SORT_LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      for (const g of games(level)) {
        assert.equal(g.kind, 'sort');
        assert.equal(g.rounds.length, 1);
        const r = g.rounds[0];
        assert.equal(r.items.length, cfg.items, `nível ${level}`);
        assert.equal(r.targets.length, cfg.boxes);
        assert.equal(r.goal, cfg.items);
        assert.equal(g.total, cfg.items);
      }
    }
  });

  test('cada peça tem caixa, as caixas ficam com a mesma quantidade (ou uma a mais) e os ids são únicos', () => {
    for (const level of SORT_LEVELS) {
      for (const g of games(level)) {
        const r = g.rounds[0];
        const ids = r.targets.map((t) => t.id);
        for (const item of r.items) assert.ok(ids.includes(item.target), `peça ${item.key}`);
        const counts = ids.map((id) => r.items.filter((i) => i.target === id).length);
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `nível ${level}: ${counts}`);
        assert.equal(new Set(r.items.map((i) => i.id)).size, r.items.length);
        assert.equal(new Set(r.items.map((i) => i.key)).size, r.items.length, 'peças repetidas');
      }
    }
  });

  test('letras × números: a caixa de letras só tem letras e a de números só números (de 1 a 9)', () => {
    for (const g of games(1)) {
      for (const item of g.rounds[0].items) {
        if (item.target === 'letter') assert.match(item.key, /^[A-Z]$/);
        else {
          assert.equal(item.target, 'number');
          assert.ok(Number(item.key) >= 1 && Number(item.key) <= 9, item.key);
        }
      }
    }
  });

  test('vogais × consoantes: as vogais são A E I O U e as consoantes são as outras letras', () => {
    for (const level of [2, 4, 6]) {
      for (const g of games(level)) {
        for (const item of g.rounds[0].items) {
          if (item.target === 'vowel') assert.ok(VOWELS.includes(item.key), item.key);
          if (item.target === 'consonant') {
            assert.match(item.key, /^[A-Z]$/);
            assert.ok(!VOWELS.includes(item.key), item.key);
          }
          if (item.target === 'number') assert.match(item.key, /^\d+$/);
        }
      }
    }
  });

  test('os níveis de 3 caixas têm as 3 categorias, e o nível 6 chega ao número 20', () => {
    let sawTwoDigits = false;
    for (const g of games(6)) {
      const targets = new Set(g.rounds[0].items.map((i) => i.target));
      assert.deepEqual([...targets].sort(), ['consonant', 'number', 'vowel']);
      for (const item of g.rounds[0].items) {
        if (item.target === 'number') {
          assert.ok(Number(item.key) >= 1 && Number(item.key) <= 20, item.key);
          if (item.key.length === 2) sawTwoDigits = true;
        }
      }
    }
    assert.ok(sawTwoDigits, 'o nível 6 deve ter números de dois algarismos');
    for (const g of games(4)) {
      for (const item of g.rounds[0].items) if (item.target === 'number') assert.ok(Number(item.key) <= 9);
    }
  });

  test('nunca há símbolos que se confundem na mesma pilha (O e 0, I e 1)', () => {
    for (const level of SORT_LEVELS) {
      for (const g of games(level)) {
        const keys = g.rounds[0].items.map((i) => i.key);
        for (let i = 0; i < keys.length; i++) {
          for (let j = i + 1; j < keys.length; j++) {
            assert.ok(!Symbols.looksAlike(keys[i], keys[j]), `${keys[i]} e ${keys[j]}`);
          }
        }
      }
    }
  });

  test('cada peça sabe como a voz a fala (nome da letra, número por extenso)', () => {
    for (const g of games(4)) {
      for (const item of g.rounds[0].items) {
        const expected = item.kind === 'number' ? Symbols.numberName(Number(item.key)) : Symbols.findSymbol(item.key).name;
        assert.equal(item.say, expected);
      }
    }
  });

  test('o pedido da voz explica a separação do nível', () => {
    assert.match(Logic.createGame(1, { random: prng(1) }).rounds[0].prompt, /Letras .* números/);
    assert.match(Logic.createGame(2, { random: prng(1) }).rounds[0].prompt, /Vogais .* consoantes/);
    assert.match(Logic.createGame(4, { random: prng(1) }).rounds[0].prompt, /Vogais, consoantes e números/);
  });
});

describe('createGame: dar', () => {
  test('3 pedidos diferentes, de 1 até o maior do nível, com objetos diferentes', () => {
    for (const level of GIVE_LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      for (const g of games(level)) {
        assert.equal(g.kind, 'give');
        assert.equal(g.rounds.length, cfg.rounds);
        const goals = g.rounds.map((r) => r.goal);
        assert.equal(new Set(goals).size, goals.length, 'pedidos repetidos');
        for (const goal of goals) assert.ok(goal >= 1 && goal <= cfg.most, `nível ${level}: ${goal}`);
        assert.equal(new Set(g.rounds.map((r) => r.object.id)).size, g.rounds.length, 'objetos repetidos');
        assert.equal(g.total, goals.reduce((a, b) => a + b, 0));
      }
    }
  });

  test('a pilha tem o pedido, os que sobram e os de outro tipo', () => {
    for (const level of GIVE_LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      for (const g of games(level)) {
        for (const r of g.rounds) {
          const asked = r.items.filter((i) => i.target === 'plate');
          const wrong = r.items.filter((i) => i.target === null);
          assert.equal(asked.length, r.goal + cfg.extra, `nível ${level}`);
          assert.equal(wrong.length, cfg.distract);
          for (const item of asked) assert.equal(item.key, r.object.id);
          for (const item of wrong) assert.notEqual(item.key, r.object.id);
          assert.equal(r.items.length, r.goal + cfg.extra + cfg.distract);
        }
      }
    }
  });

  test('o prato mostra o número pedido e o pedido da voz diz a quantidade com o gênero certo', () => {
    for (const g of games(3)) {
      for (const r of g.rounds) {
        assert.equal(r.targets.length, 1);
        assert.equal(r.targets[0].id, 'plate');
        assert.equal(r.targets[0].label, String(r.goal));
        assert.equal(r.prompt, `Dê ${Logic.quantityFor(r.object, r.goal)} para a Mia!`);
      }
    }
  });

  test('quantityFor: uma/duas para as femininas, um/dois para os masculinos, singular e plural', () => {
    const maca = { name: 'Maçã', plural: 'maçãs', feminine: true };
    const peixe = { name: 'Peixe', plural: 'peixes', feminine: false };
    assert.equal(Logic.quantityFor(maca, 1), 'uma maçã');
    assert.equal(Logic.quantityFor(maca, 2), 'duas maçãs');
    assert.equal(Logic.quantityFor(maca, 3), 'três maçãs');
    assert.equal(Logic.quantityFor(maca, 8), 'oito maçãs');
    assert.equal(Logic.quantityFor(peixe, 1), 'um peixe');
    assert.equal(Logic.quantityFor(peixe, 2), 'dois peixes');
    assert.equal(Logic.quantityFor(peixe, 5), 'cinco peixes');
  });
});

describe('createGame: comum', () => {
  test('a mesma semente dá a mesma partida; sementes diferentes dão partidas diferentes', () => {
    for (const level of LEVELS) {
      const a = JSON.stringify(Logic.createGame(level, { random: prng(7) }));
      const b = JSON.stringify(Logic.createGame(level, { random: prng(7) }));
      const c = JSON.stringify(Logic.createGame(level, { random: prng(8) }));
      assert.equal(a, b, `nível ${level}`);
      assert.notEqual(a, c, `nível ${level}`);
    }
  });

  test('começa na primeira rodada, sem nada no lugar e sem erros', () => {
    const g = Logic.createGame(3, { random: prng(1) });
    assert.equal(g.index, 0);
    assert.equal(g.phase, 'sorting');
    assert.deepEqual(g.placed, {});
    assert.equal(g.placedCount, 0);
    assert.equal(g.doneUnits, 0);
    assert.equal(g.errors, 0);
    assert.equal(g.startedAt, null);
  });

  test('previousRound identifica a partida; nível inválido vira o 1', () => {
    assert.equal(Logic.createGame(1, { random: prng(1) }).round, 1);
    assert.equal(Logic.createGame(1, { random: prng(1), previousRound: 4 }).round, 5);
    assert.equal(Logic.createGame(99, { random: prng(1) }).level, 1);
  });
});

describe('place: separar', () => {
  test('a peça certa na caixa certa fica no lugar', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const item = itemFor(g, 'letter');
    const out = Logic.place(g, item.id, 'letter', NOW);
    assert.equal(out.result, 'correct');
    assert.equal(out.state.placed[item.id], 'letter');
    assert.equal(out.state.placedCount, 1);
    assert.equal(out.state.doneUnits, 1);
    assert.equal(out.state.errors, 0);
  });

  test('a peça na caixa errada é erro: nada muda de lugar e os contadores sobem', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const item = itemFor(g, 'letter');
    const out = Logic.place(g, item.id, 'number', NOW);
    assert.equal(out.result, 'wrong');
    assert.deepEqual(out.state.placed, {});
    assert.equal(out.state.errors, 1);
    assert.equal(out.state.misses, 1);
    assert.equal(out.state.lastWrong, item.id);
    assert.equal(out.state.doneUnits, 0);
  });

  test('a última peça completa a rodada', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const out = solveRound(g);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.phase, 'celebrating');
    assert.equal(out.state.placedCount, 6);
    assert.equal(out.state.doneUnits, 6);
    assert.equal(out.state.errors, 0);
  });

  test('a ordem das peças não importa e os erros no caminho não impedem de terminar', () => {
    let g = Logic.createGame(4, { random: prng(2) });
    g = Logic.place(g, wrongItemFor(g, 'vowel').id, 'vowel', NOW).state;
    const out = solveRound(g);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.errors, 1);
  });

  test('toques ignorados: fora da vez, peça ou caixa inexistente, peça já no lugar', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const item = itemFor(g, 'letter');
    const placed = Logic.place(g, item.id, 'letter', NOW).state;
    const other = itemFor(placed, 'letter');

    for (const [state, itemId, targetId, why] of [
      [placed, 'nao-existe', 'letter', 'peça inexistente'],
      [placed, other.id, 'nao-existe', 'caixa inexistente'],
      [placed, other.id, 'plate', 'caixa que não é desta rodada'],
      [placed, other.id, undefined, 'caixa indefinida'],
      [placed, item.id, 'letter', 'peça que já está no lugar'],
      [placed, item.id, 'number', 'peça no lugar solta em outra caixa'],
      [Object.assign({}, placed, { phase: 'celebrating' }), other.id, 'letter', 'fora da vez'],
      [Object.assign({}, placed, { phase: 'completed' }), other.id, 'letter', 'partida terminada'],
    ]) {
      const out = Logic.place(state, itemId, targetId, NOW);
      assert.equal(out.result, null, why);
      assert.equal(out.state, state, `${why}: o estado não muda`);
    }
  });

  test('place devolve um estado novo e não mexe no antigo', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const before = JSON.stringify(g);
    Logic.place(g, itemFor(g, 'letter').id, 'letter', NOW);
    Logic.place(g, itemFor(g, 'letter').id, 'number', NOW);
    assert.equal(JSON.stringify(g), before);
  });

  test('o relógio começa no primeiro toque e não volta a mudar', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const first = Logic.place(g, itemFor(g, 'letter').id, 'number', 500);
    assert.equal(first.state.startedAt, 500);
    const second = Logic.place(first.state, itemFor(first.state, 'letter').id, 'letter', 900);
    assert.equal(second.state.startedAt, 500);
    assert.equal(Logic.start(g, 300).startedAt, 300);
    assert.equal(Logic.start(Logic.start(g, 300), 800).startedAt, 300);
  });
});

describe('place: dar', () => {
  test('cada objeto pedido no prato é um passo; no número pedido a rodada termina', () => {
    const g = Logic.createGame(3, { random: prng(2) });
    const goal = Logic.currentRound(g).goal;
    let state = g;
    for (let i = 1; i <= goal; i++) {
      const out = Logic.place(state, itemFor(state, 'plate').id, 'plate', NOW);
      assert.equal(out.result, i < goal ? 'correct' : 'complete', `passo ${i}`);
      assert.equal(out.state.placedCount, i);
      state = out.state;
    }
    assert.equal(state.phase, 'celebrating');
  });

  test('os objetos que sobram não entram depois do pedido (rodada pronta: ignorados)', () => {
    const g = Logic.createGame(3, { random: prng(2) });
    const done = solveRound(g).state;
    const spare = itemFor(done, 'plate');
    assert.ok(spare, 'sobrou um objeto pedido na pilha');
    const out = Logic.place(done, spare.id, 'plate', NOW);
    assert.equal(out.result, null);
    assert.equal(out.state.errors, 0);
  });

  test('um objeto de outro tipo no prato é um erro (e o prato continua como estava)', () => {
    const g = Logic.createGame(3, { random: prng(2) });
    const intruder = Logic.currentRound(g).items.find((i) => i.target === null);
    const out = Logic.place(g, intruder.id, 'plate', NOW);
    assert.equal(out.result, 'wrong');
    assert.equal(out.state.errors, 1);
    assert.equal(out.state.placedCount, 0);
  });

  test('pedir 1 termina com um objeto só', () => {
    let g = Logic.createGame(3, { random: prng(1) });
    for (let seed = 1; seed < 200 && Logic.currentRound(g).goal !== 1; seed++) g = Logic.createGame(3, { random: prng(seed) });
    assert.equal(Logic.currentRound(g).goal, 1);
    assert.equal(Logic.place(g, itemFor(g, 'plate').id, 'plate', NOW).result, 'complete');
  });
});

describe('dica', () => {
  test('só depois de 2 erros na rodada, e só enquanto se joga', () => {
    let g = Logic.createGame(1, { random: prng(1) });
    assert.equal(Logic.shouldHint(g), false);
    g = Logic.place(g, itemFor(g, 'letter').id, 'number', NOW).state;
    assert.equal(Logic.shouldHint(g), false);
    g = Logic.place(g, itemFor(g, 'letter').id, 'number', NOW).state;
    assert.equal(Logic.shouldHint(g), true);
    assert.equal(Logic.shouldHint(Object.assign({}, g, { phase: 'celebrating' })), false);
  });

  test('aponta a última peça que errou e a caixa dela', () => {
    let g = Logic.createGame(1, { random: prng(1) });
    const item = itemFor(g, 'number');
    g = Logic.place(g, item.id, 'letter', NOW).state;
    assert.deepEqual(Logic.hintFor(g), { itemId: item.id, targetId: 'number' });
  });

  test('se a última que errou foi um objeto que não serve, aponta um objeto pedido e o prato', () => {
    let g = Logic.createGame(3, { random: prng(2) });
    const intruder = Logic.currentRound(g).items.find((i) => i.target === null);
    g = Logic.place(g, intruder.id, 'plate', NOW).state;
    const hint = Logic.hintFor(g);
    assert.equal(hint.targetId, 'plate');
    assert.equal(Logic.currentRound(g).items.find((i) => i.id === hint.itemId).target, 'plate');
  });

  test('a dica não aponta uma peça que já está no lugar', () => {
    let g = Logic.createGame(1, { random: prng(1) });
    const item = itemFor(g, 'letter');
    g = Logic.place(g, item.id, 'number', NOW).state;      // erra...
    g = Logic.place(g, item.id, 'letter', NOW).state;      // ...e acerta a mesma
    const hint = Logic.hintFor(g);
    assert.notEqual(hint.itemId, item.id);
  });

  test('sem peças pedidas na pilha não há dica', () => {
    const g = solveRound(Logic.createGame(1, { random: prng(1) })).state;
    assert.equal(Logic.hintFor(g), null);
  });
});

describe('next', () => {
  test('uma rodada de dar termina e vem a seguinte, com o prato vazio e sem erros da rodada', () => {
    let g = Logic.createGame(3, { random: prng(2) });
    g = Logic.place(g, Logic.currentRound(g).items.find((i) => i.target === null).id, 'plate', NOW).state;
    g = solveRound(g).state;
    const out = Logic.next(g, g.round, 2000);
    assert.equal(out.result, 'next');
    assert.equal(out.state.index, 1);
    assert.equal(out.state.phase, 'sorting');
    assert.deepEqual(out.state.placed, {});
    assert.equal(out.state.placedCount, 0);
    assert.equal(out.state.misses, 0);
    assert.equal(out.state.errors, 1, 'os erros da partida continuam');
    assert.equal(out.state.doneUnits, Logic.currentRound(g).goal, 'as peças já colocadas continuam contando');
  });

  test('uma pausa de outra partida (o jogo foi reiniciado) não faz nada', () => {
    const g = solveRound(Logic.createGame(1, { random: prng(1) })).state;
    const out = Logic.next(g, g.round + 1, 2000);
    assert.equal(out.result, null);
    assert.equal(out.state, g);
  });

  test('só avança depois de comemorar', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    assert.equal(Logic.next(g, g.round, 2000).result, null);
  });

  test('depois da última rodada a partida termina, com a hora', () => {
    for (const level of LEVELS) {
      let g = Logic.createGame(level, { random: prng(3) });
      for (let i = 0; i < g.rounds.length - 1; i++) {
        g = solveRound(g).state;
        g = Logic.next(g, g.round, NOW).state;
      }
      g = solveRound(g).state;
      const out = Logic.next(g, g.round, 7777);
      assert.equal(out.result, 'complete', `nível ${level}`);
      assert.equal(out.state.phase, 'completed');
      assert.equal(out.state.completedAt, 7777);
      assert.equal(out.state.doneUnits, g.total, `nível ${level}: todas as estrelas de progresso`);
    }
  });
});

describe('estrelas', () => {
  test('uma partida sem erros vale 3 estrelas em qualquer nível', () => {
    for (const level of LEVELS) assert.equal(Logic.starsFor(level, 0), 3, `nível ${level}`);
  });

  test('os limites de cada nível: até `three` erros 3★, até `two` 2★, mais que isso 1★', () => {
    for (const level of LEVELS) {
      const { two, three } = Logic.LEVELS[level - 1];
      assert.equal(Logic.starsFor(level, three), 3, `nível ${level}: exato 3★`);
      assert.equal(Logic.starsFor(level, three + 1), 2, `nível ${level}: um a mais que 3★`);
      assert.equal(Logic.starsFor(level, two), 2, `nível ${level}: exato 2★`);
      assert.equal(Logic.starsFor(level, two + 1), 1, `nível ${level}: um a mais que 2★`);
      assert.equal(Logic.starsFor(level, 999), 1, `nível ${level}: terminar vale uma estrela`);
    }
  });

  test('calcStars lê os erros do estado', () => {
    const g = Object.assign(Logic.createGame(4, { random: prng(1) }), { errors: 2 });
    assert.equal(Logic.calcStars(g), Logic.starsFor(4, 2));
  });
});

describe('textos da voz', () => {
  const round = (level, seed = 1) => Logic.currentRound(Logic.createGame(level, { random: prng(seed) }));

  test('peça no lugar: o nome dela e o que ela é; na última, o elogio', () => {
    const r = round(2);
    const vowel = r.items.find((i) => i.target === 'vowel');
    const consonant = r.items.find((i) => i.target === 'consonant');
    assert.equal(Logic.correctSpeechFor(r, vowel.id, false), `${vowel.say}. Vogal!`);
    assert.equal(Logic.correctSpeechFor(r, consonant.id, false), `${consonant.say}. Consoante!`);
    assert.equal(Logic.correctSpeechFor(r, consonant.id, true), `${consonant.say}. Consoante! Tudo no lugar. Muito bem!`);
  });

  test('um número diz "Número!" e uma letra, "Letra!"', () => {
    const r = round(1);
    const number = r.items.find((i) => i.target === 'number');
    const letter = r.items.find((i) => i.target === 'letter');
    assert.equal(Logic.correctSpeechFor(r, number.id, false), `${number.say}. Número!`);
    assert.equal(Logic.correctSpeechFor(r, letter.id, false), `${letter.say}. Letra!`);
  });

  test('peça na caixa errada: diz o que é e que não é daquela caixa, com o artigo certo', () => {
    const r = round(1);
    const letter = r.items.find((i) => i.target === 'letter');
    const number = r.items.find((i) => i.target === 'number');
    assert.equal(Logic.wrongSpeechFor(r, letter.id, 'number'), `${letter.say}. Não é um número. Tente de novo!`);
    assert.equal(Logic.wrongSpeechFor(r, number.id, 'letter'), `${number.say}. Não é uma letra. Tente de novo!`);
    const r2 = round(2);
    const vowel = r2.items.find((i) => i.target === 'vowel');
    assert.equal(Logic.wrongSpeechFor(r2, vowel.id, 'consonant'), `${vowel.say}. Não é uma consoante. Tente de novo!`);
  });

  test('dar: a voz conta um por um e, no último, diz a quantidade', () => {
    const r = round(3, 2);
    const apples = { name: 'Maçã', plural: 'maçãs', feminine: true };
    const fake = Object.assign({}, r, { object: apples });
    assert.equal(Logic.countSpeechFor(fake, 1, false), 'Um');
    assert.equal(Logic.countSpeechFor(fake, 2, false), 'Dois');
    assert.equal(Logic.countSpeechFor(fake, 3, true), 'Três maçãs! Muito bem!');
    assert.equal(Logic.countSpeechFor(fake, 1, true), 'Uma maçã! Muito bem!');
    assert.equal(Logic.countSpeechFor(Object.assign({}, r, { object: { name: 'Peixe', plural: 'peixes', feminine: false } }), 2, true), 'Dois peixes! Muito bem!');
  });

  test('dar: um objeto de outro tipo — "Essa é uma bola. Procure as maçãs!"', () => {
    const r = round(3, 2);
    const intruder = r.items.find((i) => i.target === null);
    const text = Logic.wrongSpeechFor(r, intruder.id, 'plate');
    assert.match(text, /^(Essa é uma|Esse é um) .*\. Procure (as|os) .*!$/);
    assert.ok(text.includes(r.object.plural), text);
    assert.ok(!text.includes(`é ${r.object.feminine ? 'uma' : 'um'} ${r.object.name.toLowerCase()}.`), 'não diz que o intruso é o objeto pedido');
  });

  test('o pedido da voz é o texto da rodada', () => {
    const r = round(3, 2);
    assert.equal(Logic.promptFor(r), r.prompt);
  });
});
