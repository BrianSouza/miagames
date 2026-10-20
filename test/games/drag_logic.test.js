// Contas dos jogos de arrastar (assets/games/_shared/drag-logic.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Drag = require('../../assets/games/_shared/drag-logic.js');

const box = (id, left, top, right, bottom) => ({ id, left, top, right, bottom });

describe('centro e distância', () => {
  test('o centro de um retângulo', () => {
    assert.deepEqual(Drag.centerOf(box('a', 10, 20, 50, 100)), { x: 30, y: 60 });
  });

  test('distância entre dois pontos', () => {
    assert.equal(Drag.distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  });
});

describe('hitTarget', () => {
  const a = box('a', 0, 0, 100, 100);
  const b = box('b', 120, 0, 220, 100);

  test('o ponto dentro de um alvo acerta esse alvo', () => {
    assert.equal(Drag.hitTarget({ x: 50, y: 50 }, [a, b], 0).id, 'a');
    assert.equal(Drag.hitTarget({ x: 170, y: 50 }, [a, b], 0).id, 'b');
  });

  test('a borda conta como dentro', () => {
    assert.equal(Drag.hitTarget({ x: 100, y: 100 }, [a], 0).id, 'a');
    assert.equal(Drag.hitTarget({ x: 0, y: 0 }, [a], 0).id, 'a');
  });

  test('fora de todos, sem folga: nenhum', () => {
    assert.equal(Drag.hitTarget({ x: 110, y: 50 }, [a, b], 0), null);
    assert.equal(Drag.hitTarget({ x: 50, y: 150 }, [a, b], 0), null);
  });

  test('a folga alarga cada alvo, nos quatro lados', () => {
    assert.equal(Drag.hitTarget({ x: 110, y: 50 }, [a], 20).id, 'a');
    assert.equal(Drag.hitTarget({ x: -15, y: 50 }, [a], 20).id, 'a');
    assert.equal(Drag.hitTarget({ x: 50, y: -15 }, [a], 20).id, 'a');
    assert.equal(Drag.hitTarget({ x: 50, y: 115 }, [a], 20).id, 'a');
    // e acaba onde a folga acaba
    assert.equal(Drag.hitTarget({ x: 121, y: 50 }, [a], 20), null);
  });

  test('sem folga informada (ou negativa), vale 0', () => {
    assert.equal(Drag.hitTarget({ x: 110, y: 50 }, [a]), null);
    assert.equal(Drag.hitTarget({ x: 110, y: 50 }, [a], -50), null);
    assert.equal(Drag.hitTarget({ x: 50, y: 50 }, [a], -50).id, 'a');
  });

  test('entre dois alvos que a folga alcança, vence o de centro mais próximo', () => {
    // x = 110 está entre a (centro 50) e b (centro 170): 60 de a, 60 de b → empate; 105 é de a
    assert.equal(Drag.hitTarget({ x: 105, y: 50 }, [a, b], 20).id, 'a');
    assert.equal(Drag.hitTarget({ x: 115, y: 50 }, [a, b], 20).id, 'b');
  });

  test('quem contém o ponto de verdade vence quem só o alcança pela folga', () => {
    const big = box('big', 0, 0, 300, 300);          // centro longe
    const small = box('small', 140, 200, 160, 220);   // centro em (150, 210)
    // o ponto está dentro dos dois: o de centro mais próximo
    assert.equal(Drag.hitTarget({ x: 150, y: 210 }, [big, small], 10).id, 'small');
    // o ponto está dentro de `big` e só perto de `small` (pela folga): vence `big`, que o contém
    assert.equal(Drag.hitTarget({ x: 130, y: 190 }, [small, big], 20).id, 'big');
  });

  test('a ordem dos alvos não muda o resultado', () => {
    const p = { x: 107, y: 50 };   // a folga alcança os dois; está mais perto de `a`
    assert.equal(Drag.hitTarget(p, [a, b], 20).id, 'a');
    assert.equal(Drag.hitTarget(p, [b, a], 20).id, 'a');
  });

  test('sem alvos: nenhum', () => {
    assert.equal(Drag.hitTarget({ x: 1, y: 1 }, [], 50), null);
  });

  test('devolve o próprio alvo, com o que o jogo guardou nele', () => {
    const target = Object.assign(box('x', 0, 0, 10, 10), { el: 'elemento' });
    assert.equal(Drag.hitTarget({ x: 5, y: 5 }, [target], 0), target);
  });
});

describe('clamp e clampPoint', () => {
  test('clamp limita nos dois extremos', () => {
    assert.equal(Drag.clamp(5, 0, 10), 5);
    assert.equal(Drag.clamp(-3, 0, 10), 0);
    assert.equal(Drag.clamp(30, 0, 10), 10);
  });

  test('clampPoint traz o ponto para dentro, com margem', () => {
    const rect = box('r', 100, 100, 300, 200);
    assert.deepEqual(Drag.clampPoint({ x: 0, y: 0 }, rect, 0), { x: 100, y: 100 });
    assert.deepEqual(Drag.clampPoint({ x: 999, y: 999 }, rect, 20), { x: 280, y: 180 });
    assert.deepEqual(Drag.clampPoint({ x: 150, y: 150 }, rect, 20), { x: 150, y: 150 });
  });

  test('margem maior que o retângulo: o ponto cai no canto, sem sair do retângulo ao contrário', () => {
    const p = Drag.clampPoint({ x: 50, y: 50 }, box('r', 0, 0, 30, 30), 40);
    assert.deepEqual(p, { x: 40, y: 40 });
  });
});

describe('posições normalizadas (sobrevivem a girar a tela)', () => {
  const rect = box('r', 100, 50, 500, 250);   // 400 x 200

  test('ida e volta devolve o mesmo ponto', () => {
    const point = { x: 300, y: 100 };
    const norm = Drag.toNormalized(point, rect);
    assert.deepEqual(norm, { x: 0.5, y: 0.25 });
    assert.deepEqual(Drag.fromNormalized(norm, rect), point);
  });

  test('a mesma fração vale em outro tamanho de tela', () => {
    const norm = Drag.toNormalized({ x: 300, y: 100 }, rect);
    const rotated = box('r2', 0, 0, 200, 400);
    assert.deepEqual(Drag.fromNormalized(norm, rotated), { x: 100, y: 100 });
  });

  test('fora do retângulo é trazido para 0..1', () => {
    assert.deepEqual(Drag.toNormalized({ x: -500, y: 9999 }, rect), { x: 0, y: 1 });
    assert.deepEqual(Drag.fromNormalized({ x: -3, y: 7 }, rect), { x: 100, y: 250 });
  });

  test('retângulo sem tamanho não vira NaN', () => {
    const flat = box('f', 10, 10, 10, 10);
    const norm = Drag.toNormalized({ x: 10, y: 10 }, flat);
    assert.ok(Number.isFinite(norm.x) && Number.isFinite(norm.y));
  });
});
