// Regras do "Qual é a letra?" (assets/games/which-letter/which-letter-logic.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../../assets/games/which-letter/which-letter-logic.js');
const Symbols = require('../../assets/games/_shared/symbols.js');

/** Gerador pseudoaleatório com semente (o mesmo de test/e2e/fixtures.js) */
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

describe('createGame', () => {
  test('8 rodadas por nível, e o número de figuras cresce com a dificuldade', () => {
    const sizes = { easy: 3, medium: 4, hard: 6 };
    for (const [difficulty, options] of Object.entries(sizes)) {
      const game = Logic.createGame(difficulty, { random: prng(1) });
      assert.equal(game.total, 8, difficulty);
      for (const round of game.rounds) assert.equal(round.options.length, options, difficulty);
    }
  });

  test('dificuldade desconhecida vira fácil', () => {
    assert.equal(Logic.createGame('x').difficulty, 'easy');
  });

  test('cada rodada tem uma só resposta certa entre figuras diferentes', () => {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          const symbols = round.options.map((o) => o.symbol);
          assert.equal(new Set(symbols).size, symbols.length, 'figuras repetidas');
          assert.equal(symbols.filter((s) => s === round.answer.symbol).length, 1);
        }
      }
    }
  });

  test('as respostas das rodadas não se repetem', () => {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (const seed of SEEDS) {
        const answers = Logic.createGame(difficulty, { random: prng(seed) }).rounds.map((r) => r.answer.symbol);
        assert.equal(new Set(answers).size, answers.length, `${difficulty} seed ${seed}`);
      }
    }
  });

  test('fácil só pergunta letras; médio e difícil misturam números (3 de 8)', () => {
    for (const seed of SEEDS) {
      const easy = Logic.createGame('easy', { random: prng(seed) });
      assert.ok(easy.rounds.every((r) => r.answer.kind === 'letter'));
      for (const difficulty of ['medium', 'hard']) {
        const kinds = Logic.createGame(difficulty, { random: prng(seed) }).rounds.map((r) => r.answer.kind);
        assert.equal(kinds.filter((k) => k === 'number').length, 3, difficulty);
        assert.equal(kinds.filter((k) => k === 'letter').length, 5, difficulty);
      }
    }
  });

  test('o alcance dos números segue o nível: até 20 no médio, até 50 no difícil', () => {
    for (const [difficulty, max] of [['medium', 20], ['hard', 50]]) {
      let highest = 0;
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          for (const o of round.options.filter((o) => o.kind === 'number')) {
            assert.ok(Number(o.symbol) <= max, `${difficulty}: ${o.symbol}`);
            highest = Math.max(highest, Number(o.symbol));
          }
        }
      }
      assert.ok(highest > max / 2, `${difficulty} deveria chegar perto de ${max}`);
    }
  });

  test('as figuras são do mesmo tipo da resposta (letra com letras, número com números)', () => {
    for (const difficulty of ['medium', 'hard']) {
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          assert.ok(round.options.every((o) => o.kind === round.answer.kind));
        }
      }
    }
  });

  test('nenhuma figura se parece com a resposta (12 e 21)', () => {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (const seed of SEEDS) {
        for (const round of Logic.createGame(difficulty, { random: prng(seed) }).rounds) {
          for (const o of round.options) {
            if (o.symbol === round.answer.symbol) continue;
            assert.ok(!Symbols.looksAlike(round.answer.symbol, o.symbol), `${round.answer.symbol} x ${o.symbol}`);
          }
        }
      }
    }
  });

  test('a posição da resposta certa varia entre as rodadas', () => {
    const positions = new Set();
    for (const seed of SEEDS) {
      for (const round of Logic.createGame('hard', { random: prng(seed) }).rounds) {
        positions.add(round.options.findIndex((o) => o.symbol === round.answer.symbol));
      }
    }
    assert.equal(positions.size, 6);
  });

  test('a rodada da partida seguinte é outra', () => {
    const first = Logic.createGame('easy');
    assert.equal(Logic.createGame('easy', { previousRound: first.round }).round, first.round + 1);
  });
});

describe('promptFor', () => {
  test('letra: "Qual é a letra Bê?"', () => {
    assert.equal(Logic.promptFor(Symbols.findSymbol('B')), 'Qual é a letra Bê?');
    assert.equal(Logic.promptFor(Symbols.findSymbol('H')), 'Qual é a letra Agá?');
  });

  test('número por extenso: "Qual é o número treze?"', () => {
    assert.equal(Logic.promptFor(Symbols.findSymbol('13')), 'Qual é o número treze?');
    assert.equal(Logic.promptFor(Symbols.findSymbol('37')), 'Qual é o número trinta e sete?');
  });
});

describe('answer', () => {
  const game = () => Logic.createGame('easy', { random: prng(7) });
  const rightOf = (state) => Logic.currentRound(state).answer.symbol;
  const wrongOf = (state) =>
    Logic.currentRound(state).options.find((o) => o.symbol !== rightOf(state)).symbol;

  test('acertar de primeira conta como acerto de primeira e libera a pausa', () => {
    const { state, result } = Logic.answer(game(), rightOf(game()), 1000);
    assert.equal(result, 'correct');
    assert.equal(state.phase, 'celebrating');
    assert.equal(state.firstTry, 1);
    assert.equal(state.errors, 0);
    assert.equal(state.startedAt, 1000);
  });

  test('errar conta o erro e elimina a figura, sem avançar', () => {
    const start = game();
    const wrong = wrongOf(start);
    const { state, result } = Logic.answer(start, wrong, 1000);
    assert.equal(result, 'wrong');
    assert.equal(state.phase, 'asking');
    assert.equal(state.errors, 1);
    assert.deepEqual(state.eliminated, [wrong]);
    assert.equal(state.index, 0);
  });

  test('tocar de novo numa figura já eliminada é ignorado (não conta outro erro)', () => {
    const start = game();
    const once = Logic.answer(start, wrongOf(start), 1000).state;
    const again = Logic.answer(once, once.eliminated[0], 2000);
    assert.equal(again.result, null);
    assert.equal(again.state, once);
  });

  test('acertar depois de errar não conta como acerto de primeira', () => {
    const start = game();
    let s = Logic.answer(start, wrongOf(start), 1000).state;
    s = Logic.answer(s, rightOf(s), 2000).state;
    assert.equal(s.firstTry, 0);
    assert.equal(s.solved, 1);
    assert.equal(s.errors, 1);
  });

  test('figura que não está na rodada é ignorada', () => {
    const start = game();
    assert.equal(Logic.answer(start, '?', 1).result, null);
  });

  test('durante a pausa de comemoração os toques são ignorados', () => {
    const start = game();
    const celebrating = Logic.answer(start, rightOf(start), 1).state;
    const tap = Logic.answer(celebrating, wrongOf(celebrating), 2);
    assert.equal(tap.result, null);
    assert.equal(tap.state, celebrating);
  });

  test('a dica aparece depois de 2 erros na mesma rodada, e some na seguinte', () => {
    let s = game();
    assert.equal(Logic.shouldHint(s), false);
    const wrongs = Logic.currentRound(s).options.filter((o) => o.symbol !== rightOf(s));
    s = Logic.answer(s, wrongs[0].symbol, 1).state;
    assert.equal(Logic.shouldHint(s), false);
    s = Logic.answer(s, wrongs[1].symbol, 2).state;
    assert.equal(Logic.shouldHint(s), true);

    s = Logic.answer(s, rightOf(s), 3).state;
    s = Logic.next(s, s.round, 4).state;
    assert.equal(Logic.shouldHint(s), false);
    assert.equal(s.misses, 0);
    assert.deepEqual(s.eliminated, []);
  });
});

describe('next', () => {
  test('avança para a rodada seguinte', () => {
    const start = Logic.createGame('easy', { random: prng(3) });
    const solved = Logic.answer(start, Logic.currentRound(start).answer.symbol, 1).state;
    const out = Logic.next(solved, solved.round, 2);
    assert.equal(out.result, 'next');
    assert.equal(out.state.index, 1);
    assert.equal(out.state.phase, 'asking');
  });

  test('uma pausa agendada antes de reiniciar é ignorada', () => {
    const start = Logic.createGame('easy', { random: prng(3) });
    const solved = Logic.answer(start, Logic.currentRound(start).answer.symbol, 1).state;
    const restarted = Logic.createGame('easy', { random: prng(3), previousRound: solved.round });
    const out = Logic.next(restarted, solved.round, 2);
    assert.equal(out.result, null);
    assert.equal(out.state, restarted);
  });

  test('uma pausa velha não avança o jogo novo, mesmo que ele também esteja comemorando', () => {
    const start = Logic.createGame('easy', { random: prng(3) });
    const solved = Logic.answer(start, Logic.currentRound(start).answer.symbol, 1).state;
    // reinicia e acerta a primeira rodada do jogo novo antes da pausa antiga terminar
    const restarted = Logic.createGame('easy', { random: prng(3), previousRound: solved.round });
    const celebratingAgain = Logic.answer(restarted, Logic.currentRound(restarted).answer.symbol, 2).state;

    const stale = Logic.next(celebratingAgain, solved.round, 3);
    assert.equal(stale.result, null);
    assert.equal(stale.state.index, 0);
    // a pausa do jogo novo, sim, avança
    assert.equal(Logic.next(celebratingAgain, celebratingAgain.round, 4).result, 'next');
  });

  test('sem acertar a rodada, não avança', () => {
    const start = Logic.createGame('easy');
    assert.equal(Logic.next(start, start.round, 1).result, null);
  });

  test('a oitava rodada termina o jogo e marca o tempo', () => {
    let s = Logic.createGame('easy', { random: prng(5) });
    let result;
    for (let i = 0; i < 8; i++) {
      s = Logic.answer(s, Logic.currentRound(s).answer.symbol, 1000 + i * 100).state;
      ({ state: s, result } = Logic.next(s, s.round, 1000 + i * 100 + 50));
    }
    assert.equal(result, 'complete');
    assert.equal(s.phase, 'completed');
    assert.equal(Logic.elapsedMs(s, 99_999), 750);
  });
});

describe('estrelas e recorde', () => {
  const stars = (firstTry) => Logic.calcStars({ firstTry, total: 8 });

  test('7 ou 8 de primeira: 3 estrelas', () => {
    assert.equal(stars(8), 3);
    assert.equal(stars(7), 3);
  });

  test('5 ou 6 de primeira: 2 estrelas', () => {
    assert.equal(stars(6), 2);
    assert.equal(stars(5), 2);
  });

  test('menos de 5: 1 estrela, nunca zero', () => {
    assert.equal(stars(4), 1);
    assert.equal(stars(0), 1);
  });

  test('o recorde considera estrelas e, depois, menos erros', () => {
    assert.equal(Logic.isNewRecord(null, 3, 0), false);
    assert.equal(Logic.isNewRecord({ stars: 2, moves: 1 }, 3, 5), true);
    assert.equal(Logic.isNewRecord({ stars: 3, moves: 2 }, 3, 1), true);
    assert.equal(Logic.isNewRecord({ stars: 3, moves: 2 }, 3, 2), false);
  });
});
