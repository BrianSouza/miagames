// Testes das regras do Jogo da Memória (assets/games/memory/memory-logic.js).
// Como rodar: node --test test/games/
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../../assets/games/memory/memory-logic.js');

/** Duas cartas do mesmo par, sem depender da ordem aleatória */
function findPair(state) {
  const a = state.cards[0];
  const b = state.cards.find(c => c.pairId === a.pairId && c.id !== a.id);
  return [a, b];
}

/** Duas cartas de pares diferentes */
function findMismatch(state) {
  const a = state.cards[0];
  const b = state.cards.find(c => c.pairId !== a.pairId);
  return [a, b];
}

function flipTwo(state, a, b, now = 1000) {
  return Logic.flip(Logic.flip(state, a.id, now), b.id, now);
}

describe('createGame', () => {
  for (const [difficulty, { pairs }] of Object.entries(Logic.DIFFICULTY)) {
    test(`${difficulty}: ${pairs} pares, todas as cartas escondidas`, () => {
      const state = Logic.createGame(difficulty);

      assert.equal(state.cards.length, pairs * 2);
      assert.equal(new Set(state.cards.map(c => c.id)).size, pairs * 2);
      assert.ok(state.cards.every(c => c.state === 'hidden'));
      for (let pairId = 0; pairId < pairs; pairId++) {
        const pair = state.cards.filter(c => c.pairId === pairId);
        assert.equal(pair.length, 2);
        assert.equal(pair[0].emoji, pair[1].emoji);
        assert.ok(pair[0].name, 'cada carta tem o nome falado do animal');
      }
    });
  }

  test('dificuldade desconhecida cai no fácil', () => {
    assert.equal(Logic.createGame('impossivel').totalPairs, 6);
  });

  test('cada partida nova recebe uma rodada nova', () => {
    const first = Logic.createGame('easy');
    const second = Logic.createGame('easy', { previousRound: first.round });
    assert.notEqual(first.round, second.round);
  });
});

describe('flip', () => {
  test('o cronômetro começa no primeiro toque, não ao criar o tabuleiro', () => {
    const state = Logic.createGame('easy');
    assert.equal(state.startedAt, null);
    assert.equal(Logic.elapsedMs(state, 99_999), 0);

    const next = Logic.flip(state, state.cards[0].id, 5000);
    assert.equal(next.startedAt, 5000);
    assert.equal(Logic.elapsedMs(next, 8000), 3000);
  });

  test('a segunda carta conta uma jogada e entra em verificação', () => {
    const state = Logic.createGame('easy');
    const [a, b] = findMismatch(state);

    const next = flipTwo(state, a, b);

    assert.equal(next.moves, 1);
    assert.equal(next.phase, 'checking');
    assert.deepEqual(next.flipped, [a.id, b.id]);
  });

  test('toques ignorados devolvem o mesmo estado', () => {
    const state = Logic.createGame('easy');
    const [a, b] = findMismatch(state);
    const one = Logic.flip(state, a.id, 0);

    assert.equal(Logic.flip(one, a.id, 0), one, 'mesma carta duas vezes');
    assert.equal(Logic.flip(state, 999, 0), state, 'carta inexistente');

    const checking = Logic.flip(one, b.id, 0);
    const third = checking.cards.find(c => c.state === 'hidden');
    assert.equal(Logic.flip(checking, third.id, 0), checking, 'terceira carta durante a verificação');
  });

  test('não altera o estado anterior', () => {
    const state = Logic.createGame('easy');
    const snapshot = JSON.stringify(state);
    Logic.flip(state, state.cards[0].id, 0);
    assert.equal(JSON.stringify(state), snapshot);
  });
});

describe('resolve', () => {
  test('par certo fica marcado como matched', () => {
    const state = Logic.createGame('easy');
    const [a, b] = findPair(state);

    const { state: next, result } = Logic.resolve(flipTwo(state, a, b), state.round, 2000);

    assert.equal(result, 'match');
    assert.equal(next.matches, 1);
    assert.equal(next.phase, 'playing');
    assert.deepEqual(next.flipped, []);
    assert.ok(next.cards.filter(c => c.pairId === a.pairId).every(c => c.state === 'matched'));
  });

  test('par errado volta a ficar escondido', () => {
    const state = Logic.createGame('easy');
    const [a, b] = findMismatch(state);

    const { state: next, result } = Logic.resolve(flipTwo(state, a, b), state.round, 2000);

    assert.equal(result, 'mismatch');
    assert.equal(next.matches, 0);
    assert.ok(next.cards.every(c => c.state === 'hidden'));
  });

  test('verificação agendada antes de reiniciar não afeta o jogo novo', () => {
    const old = Logic.createGame('easy');
    const [a, b] = findPair(old);
    flipTwo(old, a, b); // verificação agendada com old.round

    // Reinício: o jogo novo reaproveita os mesmos ids de carta
    const fresh = Logic.createGame('easy', { previousRound: old.round });
    const freshFlipped = flipTwo(fresh, ...findMismatch(fresh));

    const outcome = Logic.resolve(freshFlipped, old.round, 2000);

    assert.equal(outcome.result, null);
    assert.equal(outcome.state, freshFlipped);
  });

  test('completa o jogo no último par, com tempo desde o primeiro toque', () => {
    let state = Logic.createGame('easy');
    let result;
    for (let pairId = 0; pairId < state.totalPairs; pairId++) {
      const [a, b] = state.cards.filter(c => c.pairId === pairId);
      ({ state, result } = Logic.resolve(flipTwo(state, a, b, 10_000 + pairId), state.round, 20_000));
    }

    assert.equal(result, 'complete');
    assert.equal(state.phase, 'completed');
    assert.equal(state.moves, 6);
    assert.equal(Logic.elapsedMs(state, 99_999), 10_000);
    assert.equal(Logic.calcStars(state), 3);
  });
});

describe('calcStars', () => {
  test('menos jogadas = mais estrelas', () => {
    const base = Logic.createGame('easy');
    assert.equal(Logic.calcStars({ ...base, moves: 6 }), 3);
    assert.equal(Logic.calcStars({ ...base, moves: 10 }), 2);
    assert.equal(Logic.calcStars({ ...base, moves: 30 }), 1);
    assert.equal(Logic.calcStars({ ...base, moves: 0 }), 3);
  });
});

describe('cardSize', () => {
  test('em celular retrato, a largura é o limite', () => {
    assert.equal(Logic.cardSize(340, 600, 3, 4, 10), Math.floor((340 - 20) / 3));
  });

  test('em tela baixa, a altura é o limite e o grid cabe', () => {
    const size = Logic.cardSize(800, 500, 4, 5, 10);
    assert.ok(size * 5 + 10 * 4 <= 500);
  });

  test('nunca é negativo', () => {
    assert.equal(Logic.cardSize(5, 5, 4, 5, 10), 0);
  });
});
