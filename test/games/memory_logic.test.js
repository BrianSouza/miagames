// Testes das regras do Jogo da Memória (assets/games/memory/memory-logic.js).
// Como rodar: node --test test/games/
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const fs = require('node:fs');
const path = require('node:path');

const Logic = require('../../assets/games/memory/memory-logic.js');
const GAME_DIR = path.join(__dirname, '../../assets/games/memory');

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
        assert.equal(pair[0].symbol, pair[1].symbol);
        assert.ok(pair[0].name, 'cada carta tem o nome falado');
        assert.match(pair[0].label, /^(Letra [A-Z]|Número \d)$/);
      }
    });
  }

  test('letras e números juntos: cerca de 60% letras', () => {
    for (const [difficulty, letters, numbers] of [['easy', 4, 2], ['medium', 5, 3], ['hard', 6, 4]]) {
      const state = Logic.createGame(difficulty);
      const symbols = [...new Set(state.cards.map(c => c.symbol))];
      assert.equal(symbols.filter(x => /[A-Z]/.test(x)).length, letters, `${difficulty}: letras`);
      assert.equal(symbols.filter(x => /\d/.test(x)).length, numbers, `${difficulty}: números`);
    }
  });

  test('o tipo de cada carta bate com o símbolo', () => {
    for (const card of Logic.createGame('hard').cards) {
      assert.equal(card.kind, /[A-Z]/.test(card.symbol) ? 'letter' : 'number');
    }
  });

  test('nunca junta símbolos parecidos (O e 0, I e 1) no mesmo tabuleiro', () => {
    for (let i = 0; i < 2000; i++) {
      const difficulty = ['easy', 'medium', 'hard'][i % 3];
      const symbols = new Set(Logic.createGame(difficulty).cards.map(c => c.symbol));
      for (const [a, b] of [['O', '0'], ['I', '1']]) {
        assert.ok(!(symbols.has(a) && symbols.has(b)), `${a} e ${b} juntos: ${[...symbols]}`);
      }
    }
  });

  test('a mesma partida se repete com o mesmo sorteio (seed)', () => {
    const seeded = () => { let n = 7; return () => (n = (n * 16807) % 2147483647) / 2147483647; };
    const a = Logic.createGame('medium', { random: seeded() });
    const b = Logic.createGame('medium', { random: seeded() });
    assert.deepEqual(a.cards, b.cards);
  });

  test('dificuldade desconhecida cai no fácil', () => {
    assert.equal(Logic.createGame('impossivel').totalPairs, 6);
  });

  test('cada partida nova recebe uma rodada nova', () => {
    const first = Logic.createGame('easy');
    const second = Logic.createGame('easy', { previousRound: first.round });
    assert.notEqual(first.round, second.round);
  });
});

describe('símbolos e nomes falados', () => {
  test('26 letras e 10 números, sem repetição', () => {
    assert.equal(Logic.LETTERS.length, 26);
    assert.equal(Logic.NUMBERS.length, 10);
    assert.deepEqual(Logic.LETTERS.map(l => l.symbol).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    assert.deepEqual(Logic.NUMBERS.map(n => n.symbol).join(''), '0123456789');
  });

  test('toda letra e número tem um nome falado em português', () => {
    for (const item of [...Logic.LETTERS, ...Logic.NUMBERS]) {
      assert.ok(item.name && item.name.length > 0, item.symbol);
      assert.match(item.name, /^[A-ZÁÉÍÓÚÂÊÔ][a-záéíóúâêôãõç]*$/, `nome de ${item.symbol}`);
    }
  });

  test('letras falam o NOME da letra, não o que o motor de voz leria sozinho', () => {
    const names = Object.fromEntries(Logic.LETTERS.map(l => [l.symbol, l.name]));
    assert.equal(names.B, 'Bê');
    assert.equal(names.E, 'Ê');   // sozinho, "E" seria lido como a palavra "e"
    assert.equal(names.H, 'Agá');
    assert.equal(names.W, 'Dáblio');
    assert.equal(names.Y, 'Ípsilon');
  });

  test('números falam por extenso', () => {
    assert.deepEqual(Logic.NUMBERS.map(n => n.name),
      ['Zero', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove']);
  });

  test('as letras e números de um jogo pequeno nunca se repetem', () => {
    for (let i = 0; i < 500; i++) {
      const symbols = Logic.pickSymbols(10).map(x => x.symbol);
      assert.equal(new Set(symbols).size, symbols.length);
    }
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

describe('isNewRecord', () => {
  test('primeira partida (sem recorde) não é novo recorde', () => {
    assert.equal(Logic.isNewRecord(null, 3, 6), false);
  });

  test('mais estrelas vencem, mesmo com mais jogadas', () => {
    assert.equal(Logic.isNewRecord({ stars: 2, moves: 8 }, 3, 9), true);
    assert.equal(Logic.isNewRecord({ stars: 3, moves: 6 }, 2, 6), false);
  });

  test('com as mesmas estrelas, só menos jogadas é recorde', () => {
    assert.equal(Logic.isNewRecord({ stars: 2, moves: 10 }, 2, 9), true);
    assert.equal(Logic.isNewRecord({ stars: 2, moves: 10 }, 2, 10), false);
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
