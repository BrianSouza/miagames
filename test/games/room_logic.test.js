// Regras do "Quarto da Mia" (assets/games/mia-room/): jogo livre, sem erro, estrela nem fim.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Logic = require('../../assets/games/mia-room/room-logic.js');

const ROOT = path.join(__dirname, '../..');

/** O catálogo do Flutter (lib/modules/furniture.dart): é de lá que vêm os ids, os nomes e as estrelas */
const FURNITURE = [
  ...fs
    .readFileSync(path.join(ROOT, 'lib/modules/furniture.dart'), 'utf8')
    .matchAll(/Furniture\(id: '(\w+)', name: '([^']+)', stars: (\d+)\)/g),
].map((m) => ({ id: m[1], name: m[2], stars: Number(m[3]) }));

/** O que o INIT manda: os móveis, com o que está aberto para `total` estrelas */
const initFor = (total) => FURNITURE.map((f) => ({ ...f, open: f.stars <= total }));
const ALL_OPEN = initFor(999);
const FREE_ONLY = initFor(0);

const ids = (state) => state.items.map((i) => i.id);

describe('o catálogo e o jogo concordam', () => {
  test('o catálogo do Flutter foi lido (13 móveis) e os 3 primeiros são livres', () => {
    assert.equal(FURNITURE.length, 13);
    assert.deepEqual(FURNITURE.filter((f) => f.stars === 0).map((f) => f.id), ['bed', 'rug', 'plant']);
  });

  test('todo móvel tem tamanho definido e desenho em img/<id>.svg', () => {
    for (const f of FURNITURE) {
      assert.ok(Logic.SIZES[f.id] > 0 && Logic.SIZES[f.id] < 1, `tamanho de ${f.id}`);
      assert.ok(fs.existsSync(path.join(ROOT, `assets/games/mia-room/img/${f.id}.svg`)), `desenho de ${f.id}`);
    }
    // e não há tamanho de móvel que não existe
    assert.deepEqual(Object.keys(Logic.SIZES).sort(), FURNITURE.map((f) => f.id).sort());
  });

  test('o quarto da primeira vez só usa móveis que já vêm abertos (senão ficaria vazio)', () => {
    const free = new Set(FURNITURE.filter((f) => f.stars === 0).map((f) => f.id));
    for (const item of Logic.STARTER) assert.ok(free.has(item.id), `${item.id} não é livre`);
    assert.ok(Logic.STARTER.length >= 3);
  });
});

describe('create', () => {
  test('primeira vez (sem quarto salvo): já vem arrumado, com a Mia', () => {
    const s = Logic.create(FREE_ONLY, null);
    assert.deepEqual(ids(s).sort(), ['bed', 'plant', 'rug']);
    assert.deepEqual(s.mia, Logic.STARTER_MIA);
    assert.deepEqual(s.history, []);
  });

  test('o quarto salvo vale, inclusive vazio (a criança tirou tudo: não volta a arrumar sozinho)', () => {
    const s = Logic.create(ALL_OPEN, { items: [], mia: { x: 0.3, y: 0.4 } });
    assert.deepEqual(s.items, []);
    assert.deepEqual(s.mia, { x: 0.3, y: 0.4 });
  });

  test('restaura móveis e posições, com uids únicos', () => {
    const s = Logic.create(ALL_OPEN, {
      items: [
        { id: 'lamp', x: 0.1, y: 0.2 },
        { id: 'lamp', x: 0.8, y: 0.9 },
        { id: 'tent', x: 0.5, y: 0.5 },
      ],
      mia: { x: 0.7, y: 0.6 },
    });
    assert.deepEqual(ids(s), ['lamp', 'lamp', 'tent']);
    assert.equal(new Set(s.items.map((i) => i.uid)).size, 3);
    assert.deepEqual([s.items[1].x, s.items[1].y], [0.8, 0.9]);
  });

  test('móveis fechados, ids estranhos e posições inválidas são ignorados', () => {
    const s = Logic.create(FREE_ONLY, {
      items: [
        { id: 'bed', x: 0.5, y: 0.5 },
        { id: 'tent', x: 0.5, y: 0.5 },          // fechado
        { id: 'fantasma', x: 0.5, y: 0.5 },      // não existe
        { id: '../bed', x: 0.5, y: 0.5 },
        { id: 'Bed', x: 0.5, y: 0.5 },
        { id: 42, x: 0.5, y: 0.5 },
        { id: 'rug', x: 'meio', y: 0.5 },
        { id: 'rug', x: NaN, y: 0.5 },
        { id: 'rug', x: Infinity, y: 0.5 },
        { id: 'rug', x: 0.5 },
        null,
        'bed',
        [1, 2],
      ],
    });
    assert.deepEqual(ids(s), ['bed']);
  });

  test('posições fora do quarto vão para dentro (0 a 1)', () => {
    const s = Logic.create(FREE_ONLY, { items: [{ id: 'bed', x: -5, y: 9 }], mia: { x: 7, y: -7 } });
    assert.deepEqual([s.items[0].x, s.items[0].y], [0, 1]);
    assert.deepEqual(s.mia, { x: 1, y: 0 });
  });

  test(`no máximo ${Logic.MAX_ITEMS} peças`, () => {
    const many = Array.from({ length: 100 }, () => ({ id: 'bed', x: 0.5, y: 0.5 }));
    assert.equal(Logic.create(FREE_ONLY, { items: many }).items.length, Logic.MAX_ITEMS);
  });

  test('um quarto salvo que não é um quarto cai no quarto da primeira vez; a Mia sem posição fica no lugar padrão', () => {
    for (const bad of [undefined, 42, 'x', [], {}, { items: 'x' }]) {
      assert.deepEqual(ids(Logic.create(FREE_ONLY, bad)).sort(), ['bed', 'plant', 'rug'], JSON.stringify(bad));
    }
    assert.deepEqual(Logic.create(FREE_ONLY, { items: [], mia: { x: 'a' } }).mia, Logic.STARTER_MIA);
  });

  test('uma lista de móveis estranha não derruba (e nada abre)', () => {
    for (const bad of [null, undefined, 'x', 42, [null, 7, {}, { id: 'bed' }, { id: 'bed', open: 'sim' }]]) {
      const s = Logic.create(bad, { items: [{ id: 'bed', x: 0.5, y: 0.5 }] });
      assert.deepEqual(s.items, [], JSON.stringify(bad));
    }
  });
});

describe('add', () => {
  test('põe uma cópia nova no lugar, com uid novo, e a lista de móveis abertos não muda', () => {
    const s = Logic.create(ALL_OPEN, { items: [] });
    const a = Logic.add(s, 'lamp', 0.3, 0.4);
    assert.equal(a.result, 'added');
    assert.deepEqual(a.state.items, [{ uid: a.uid, id: 'lamp', x: 0.3, y: 0.4 }]);
    const b = Logic.add(a.state, 'lamp', 0.6, 0.4);
    assert.equal(b.state.items.length, 2, 'dá para pôr o mesmo móvel mais de uma vez');
    assert.notEqual(a.uid, b.uid);
  });

  test('móvel fechado: não entra', () => {
    const s = Logic.create(FREE_ONLY, { items: [] });
    const out = Logic.add(s, 'tent', 0.5, 0.5);
    assert.equal(out.result, 'closed');
    assert.equal(out.state, s);
  });

  test('o quarto cheio não aceita mais', () => {
    let s = Logic.create(ALL_OPEN, { items: [] });
    for (let i = 0; i < Logic.MAX_ITEMS; i++) s = Logic.add(s, 'plant', 0.5, 0.5).state;
    assert.equal(s.items.length, Logic.MAX_ITEMS);
    const out = Logic.add(s, 'plant', 0.5, 0.5);
    assert.equal(out.result, 'full');
    assert.equal(out.state, s);
    // tirar um abre espaço de novo
    const freed = Logic.remove(s, s.items[0].uid).state;
    assert.equal(Logic.add(freed, 'plant', 0.5, 0.5).result, 'added');
  });

  test('entradas inválidas são ignoradas', () => {
    const s = Logic.create(ALL_OPEN, { items: [] });
    for (const [id, x, y] of [[42, 0.5, 0.5], ['../x', 0.5, 0.5], ['Bed', 0.5, 0.5], ['bed', 'a', 0.5], ['bed', 0.5, NaN], ['bed', undefined, 0.5], [null, 0.5, 0.5]]) {
      const out = Logic.add(s, id, x, y);
      assert.equal(out.result, null, `${id} ${x} ${y}`);
      assert.equal(out.state, s);
    }
  });

  test('a posição é trazida para dentro do quarto', () => {
    const s = Logic.create(ALL_OPEN, { items: [] });
    const out = Logic.add(s, 'bed', 4, -4);
    assert.deepEqual([out.state.items[0].x, out.state.items[0].y], [1, 0]);
  });
});

describe('move e remove', () => {
  const base = () => Logic.add(Logic.create(ALL_OPEN, { items: [] }), 'bed', 0.2, 0.2);

  test('muda o móvel de lugar, sem mexer nos outros', () => {
    const { state, uid } = base();
    const withLamp = Logic.add(state, 'lamp', 0.9, 0.9).state;
    const out = Logic.move(withLamp, uid, 0.7, 0.8);
    assert.equal(out.result, 'moved');
    assert.deepEqual([out.state.items[0].x, out.state.items[0].y], [0.7, 0.8]);
    assert.deepEqual([out.state.items[1].x, out.state.items[1].y], [0.9, 0.9]);
  });

  test('move um móvel que não existe, ou para uma posição inválida: ignora', () => {
    const { state, uid } = base();
    assert.equal(Logic.move(state, 'u999', 0.5, 0.5).result, null);
    assert.equal(Logic.move(state, uid, 'a', 0.5).result, null);
    assert.equal(Logic.move(state, uid, 0.5, NaN).result, null);
    assert.equal(Logic.move(state, uid, 0.5, NaN).state, state);
  });

  test('a posição nova é trazida para dentro do quarto', () => {
    const { state, uid } = base();
    const out = Logic.move(state, uid, -2, 5);
    assert.deepEqual([out.state.items[0].x, out.state.items[0].y], [0, 1]);
  });

  test('remove tira só aquele móvel', () => {
    const { state, uid } = base();
    const two = Logic.add(state, 'lamp', 0.5, 0.5).state;
    const out = Logic.remove(two, uid);
    assert.equal(out.result, 'removed');
    assert.deepEqual(ids(out.state), ['lamp']);
    assert.equal(Logic.remove(out.state, uid).result, null, 'não remove duas vezes');
    assert.equal(Logic.remove(two, 'u999').result, null);
  });

  test('moveMia muda só a Mia', () => {
    const { state } = base();
    const out = Logic.moveMia(state, 0.1, 0.9);
    assert.equal(out.result, 'moved');
    assert.deepEqual(out.state.mia, { x: 0.1, y: 0.9 });
    assert.deepEqual(out.state.items, state.items);
    assert.equal(Logic.moveMia(state, 'a', 1).result, null);
    assert.deepEqual(Logic.moveMia(state, 9, -9).state.mia, { x: 1, y: 0 });
  });

  test('cada mudança devolve um estado novo e não mexe no antigo', () => {
    const { state, uid } = base();
    const before = JSON.stringify(state);
    Logic.move(state, uid, 0.9, 0.9);
    Logic.remove(state, uid);
    Logic.add(state, 'lamp', 0.5, 0.5);
    Logic.moveMia(state, 0.1, 0.1);
    Logic.undo(state);
    assert.equal(JSON.stringify(state), before);
  });
});

describe('desfazer', () => {
  test('desfaz uma mudança de cada vez, na ordem inversa', () => {
    let s = Logic.create(ALL_OPEN, { items: [], mia: { x: 0.5, y: 0.5 } });
    const a = Logic.add(s, 'bed', 0.2, 0.2);
    s = Logic.moveMia(a.state, 0.9, 0.9).state;
    s = Logic.move(s, a.uid, 0.4, 0.4).state;

    let out = Logic.undo(s);
    assert.equal(out.undone, true);
    assert.deepEqual([out.state.items[0].x, out.state.items[0].y], [0.2, 0.2]);
    assert.deepEqual(out.state.mia, { x: 0.9, y: 0.9 });

    out = Logic.undo(out.state);
    assert.deepEqual(out.state.mia, { x: 0.5, y: 0.5 });
    assert.equal(out.state.items.length, 1);

    out = Logic.undo(out.state);
    assert.deepEqual(out.state.items, []);
    assert.equal(Logic.undo(out.state).undone, false, 'nada mais para desfazer');
  });

  test('desfazer uma remoção traz o móvel de volta, no mesmo lugar e com o mesmo uid', () => {
    const a = Logic.add(Logic.create(ALL_OPEN, { items: [] }), 'chair', 0.3, 0.6);
    const removed = Logic.remove(a.state, a.uid).state;
    const back = Logic.undo(removed).state;
    assert.deepEqual(back.items, [{ uid: a.uid, id: 'chair', x: 0.3, y: 0.6 }]);
  });

  test('um uid nunca se repete, nem depois de desfazer', () => {
    const s0 = Logic.create(ALL_OPEN, { items: [] });
    const a = Logic.add(s0, 'bed', 0.1, 0.1);
    const undone = Logic.undo(a.state).state;
    const b = Logic.add(undone, 'bed', 0.1, 0.1);
    assert.notEqual(a.uid, b.uid);
  });

  test(`guarda no máximo ${Logic.MAX_HISTORY} passos`, () => {
    let s = Logic.create(ALL_OPEN, { items: [] });
    for (let i = 0; i < Logic.MAX_HISTORY + 20; i++) s = Logic.moveMia(s, (i % 10) / 10, 0.5).state;
    assert.equal(s.history.length, Logic.MAX_HISTORY);
  });

  test('o que ainda não mudou não tem o que desfazer (o quarto recém-aberto)', () => {
    assert.equal(Logic.undo(Logic.create(ALL_OPEN, null)).undone, false);
  });
});

describe('serialize', () => {
  test('só ids e posições (sem uid nem histórico), prontos para o Flutter', () => {
    let s = Logic.create(ALL_OPEN, { items: [], mia: { x: 0.4, y: 0.6 } });
    s = Logic.add(s, 'lamp', 0.25, 0.75).state;
    assert.deepEqual(Logic.serialize(s), {
      items: [{ id: 'lamp', x: 0.25, y: 0.75 }],
      mia: { x: 0.4, y: 0.6 },
    });
  });

  test('ida e volta: o que se salva é o que se restaura', () => {
    let s = Logic.create(ALL_OPEN, null);
    s = Logic.add(s, 'tent', 0.5, 0.4).state;
    s = Logic.moveMia(s, 0.2, 0.2).state;
    const again = Logic.create(ALL_OPEN, Logic.serialize(s));
    assert.deepEqual(Logic.serialize(again), Logic.serialize(s));
  });

  test(`cabe sempre nos limites que o Flutter aceita: no máximo ${Logic.MAX_ITEMS} (ele aceita 40) e ids a-z`, () => {
    let s = Logic.create(ALL_OPEN, { items: [] });
    for (let i = 0; i < 60; i++) s = Logic.add(s, FURNITURE[i % FURNITURE.length].id, 0.5, 0.5).state;
    const saved = Logic.serialize(s);
    assert.ok(saved.items.length <= 40);
    assert.ok(JSON.stringify(saved).length < 8192);
    for (const item of saved.items) assert.match(item.id, /^[a-z]+$/);
  });
});

describe('ordem de desenho e tamanho', () => {
  test('quem está mais embaixo no quarto aparece na frente', () => {
    assert.ok(Logic.zIndexFor(0.9, 'bed') > Logic.zIndexFor(0.2, 'bed'));
    assert.ok(Logic.zIndexFor(0.9) > Logic.zIndexFor(0.2), 'a Mia também');
  });

  test('o z-index fica entre 10 e 90 (o móvel arrastado, do kit, fica acima: 100)', () => {
    for (const y of [-5, 0, 0.5, 1, 9]) {
      const z = Logic.zIndexFor(y, 'bed');
      assert.ok(z >= 10 && z <= 90, `y=${y} → ${z}`);
    }
  });

  test('o tapete fica sempre por baixo de todo mundo, mesmo mais embaixo no quarto', () => {
    assert.ok(Logic.zIndexFor(1, 'rug') < Logic.zIndexFor(0, 'bed'));
    assert.ok(Logic.zIndexFor(1, 'rug') < Logic.zIndexFor(0));
  });

  test('sizeOf: o tamanho do móvel, ou o padrão para um que não conhece', () => {
    assert.equal(Logic.sizeOf('bed'), Logic.SIZES.bed);
    assert.equal(Logic.sizeOf('nao-existe'), Logic.DEFAULT_SIZE);
    assert.ok(Logic.sizeOf('bed') > Logic.sizeOf('yarn'));
  });
});

describe('estrelas que faltam', () => {
  test('mostra quantas estrelas faltam para abrir um móvel fechado', () => {
    const lamp = FURNITURE.find((f) => f.id === 'lamp');
    assert.equal(Logic.starsMissing(FURNITURE, 'lamp', 0), lamp.stars);
    assert.equal(Logic.starsMissing(FURNITURE, 'lamp', lamp.stars - 1), 1);
    assert.equal(Logic.starsMissing(FURNITURE, 'lamp', lamp.stars), 0);
    assert.equal(Logic.starsMissing(FURNITURE, 'lamp', 999), 0);
  });

  test('móvel que não existe, ou estrelas inválidas: 0 / tratadas como 0', () => {
    assert.equal(Logic.starsMissing(FURNITURE, 'nada', 5), 0);
    assert.equal(Logic.starsMissing(null, 'lamp', 5), 0);
    assert.equal(Logic.starsMissing(FURNITURE, 'lamp', 'x'), FURNITURE.find((f) => f.id === 'lamp').stars);
  });
});
