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

const LEVELS = [1, 2, 3, 4, 5, 6];
const levelGames = (level) => SEEDS.map((seed) => Logic.createGame(level, { random: prng(seed) }));

describe('createGame', () => {
  test('8 rodadas por nível, e o número de figuras cresce: 3, 3, 4, 4, 5 e 6', () => {
    const sizes = { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 6 };
    for (const [level, options] of Object.entries(sizes)) {
      const game = Logic.createGame(Number(level), { random: prng(1) });
      assert.equal(game.total, 8);
      assert.equal(game.level, Number(level));
      for (const round of game.rounds) assert.equal(round.options.length, options, `nível ${level}`);
    }
  });

  test('nível desconhecido vira o 1', () => {
    for (const bad of ['x', 0, 7, undefined, null, NaN]) assert.equal(Logic.createGame(bad).level, 1, String(bad));
  });

  test('cada rodada tem uma só resposta certa entre figuras diferentes', () => {
    for (const level of LEVELS) {
      for (const game of levelGames(level)) {
        for (const round of game.rounds) {
          const symbols = round.options.map((o) => o.symbol);
          assert.equal(new Set(symbols).size, symbols.length, 'figuras repetidas');
          assert.equal(symbols.filter((s) => s === round.answer.symbol).length, 1);
        }
      }
    }
  });

  test('as respostas das rodadas não se repetem', () => {
    for (const level of LEVELS) {
      for (const game of levelGames(level)) {
        const answers = game.rounds.map((r) => r.answer.symbol);
        assert.equal(new Set(answers).size, answers.length, `nível ${level}`);
      }
    }
  });

  test('níveis 1 e 2: só letras. A partir do 3: 3 rodadas de número e 5 de letra', () => {
    for (const seed of SEEDS) {
      for (const level of [1, 2]) {
        const game = Logic.createGame(level, { random: prng(seed) });
        assert.ok(game.rounds.every((r) => r.answer.kind === 'letter'), `nível ${level}`);
      }
      for (const level of [3, 4, 5, 6]) {
        const kinds = Logic.createGame(level, { random: prng(seed) }).rounds.map((r) => r.answer.kind);
        assert.equal(kinds.filter((k) => k === 'number').length, 3, `nível ${level}`);
        assert.equal(kinds.filter((k) => k === 'letter').length, 5, `nível ${level}`);
      }
    }
  });

  test('nível 1 usa só as primeiras letras (A a M); do 2 em diante, o alfabeto todo', () => {
    const letters = new Set();
    for (const game of levelGames(1)) {
      for (const round of game.rounds) round.options.forEach((o) => letters.add(o.symbol));
    }
    assert.ok([...letters].every((l) => l <= 'M'), [...letters].join(''));
    assert.equal(letters.size, 13);

    const all = new Set();
    for (const game of levelGames(2)) {
      for (const round of game.rounds) round.options.forEach((o) => all.add(o.symbol));
    }
    assert.equal(all.size, 26);
  });

  test('o alcance dos números cresce: até 10, 20, 30 e 50 (níveis 3 a 6)', () => {
    for (const [level, max] of [[3, 10], [4, 20], [5, 30], [6, 50]]) {
      let highest = 0;
      for (const game of levelGames(level)) {
        for (const round of game.rounds) {
          for (const o of round.options.filter((o) => o.kind === 'number')) {
            assert.ok(Number(o.symbol) <= max, `nível ${level}: ${o.symbol}`);
            highest = Math.max(highest, Number(o.symbol));
          }
        }
      }
      assert.ok(highest > max * 0.7, `nível ${level} deveria chegar perto de ${max} (chegou a ${highest})`);
    }
  });

  test('as figuras são do mesmo tipo da resposta (letra com letras, número com números)', () => {
    for (const level of LEVELS) {
      for (const game of levelGames(level)) {
        for (const round of game.rounds) {
          assert.ok(round.options.every((o) => o.kind === round.answer.kind));
        }
      }
    }
  });

  test('nenhuma figura é a resposta invertida ou trocada por outra igual (O/0, 12/21)', () => {
    for (const level of LEVELS) {
      for (const game of levelGames(level)) {
        for (const round of game.rounds) {
          for (const o of round.options) {
            if (o.symbol === round.answer.symbol) continue;
            assert.ok(!Symbols.looksAlike(round.answer.symbol, o.symbol), `${round.answer.symbol} x ${o.symbol}`);
          }
        }
      }
    }
  });

  test('níveis 4 a 6: uma figura errada é parecida com a certa (E/F, M/N; 13/23)', () => {
    for (const level of [4, 5, 6]) {
      let withSimilar = 0;
      let total = 0;
      for (const game of levelGames(level)) {
        for (const round of game.rounds) {
          const wrongs = round.options.filter((o) => o.symbol !== round.answer.symbol);
          const similar = wrongs.some((o) =>
            round.answer.kind === 'letter'
              ? (Symbols.CONFUSABLE_LETTERS[round.answer.symbol] || []).includes(o.symbol)
              : round.answer.symbol.length === 1
                ? Math.abs(Number(round.answer.symbol) - Number(o.symbol)) === 1
                : Symbols.sharesDigit(round.answer.symbol, o.symbol),
          );
          total++;
          if (similar) withSimilar++;
        }
      }
      // letras sem parecida (Z, S, A...) não têm o que sortear: ainda assim quase todas têm
      assert.ok(withSimilar / total > 0.7, `nível ${level}: só ${withSimilar} de ${total} rodadas`);
    }
  });

  test('níveis 1 a 3 não forçam figuras parecidas (E/F aparecem só por acaso)', () => {
    let forced = 0;
    let total = 0;
    for (const game of levelGames(1)) {
      for (const round of game.rounds) {
        const wrongs = round.options.filter((o) => o.symbol !== round.answer.symbol);
        total++;
        if (wrongs.some((o) => (Symbols.CONFUSABLE_LETTERS[round.answer.symbol] || []).includes(o.symbol))) forced++;
      }
    }
    assert.ok(forced / total < 0.5, `${forced} de ${total}`);
  });

  test('a posição da resposta certa varia entre as rodadas', () => {
    const positions = new Set();
    for (const game of levelGames(6)) {
      for (const round of game.rounds) {
        positions.add(round.options.findIndex((o) => o.symbol === round.answer.symbol));
      }
    }
    assert.equal(positions.size, 6);
  });

  test('a rodada da partida seguinte é outra', () => {
    const first = Logic.createGame(1);
    assert.equal(Logic.createGame(1, { previousRound: first.round }).round, first.round + 1);
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
  const game = () => Logic.createGame(1, { random: prng(7) });
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
    const start = Logic.createGame(1, { random: prng(3) });
    const solved = Logic.answer(start, Logic.currentRound(start).answer.symbol, 1).state;
    const out = Logic.next(solved, solved.round, 2);
    assert.equal(out.result, 'next');
    assert.equal(out.state.index, 1);
    assert.equal(out.state.phase, 'asking');
  });

  test('uma pausa agendada antes de reiniciar é ignorada', () => {
    const start = Logic.createGame(1, { random: prng(3) });
    const solved = Logic.answer(start, Logic.currentRound(start).answer.symbol, 1).state;
    const restarted = Logic.createGame(1, { random: prng(3), previousRound: solved.round });
    const out = Logic.next(restarted, solved.round, 2);
    assert.equal(out.result, null);
    assert.equal(out.state, restarted);
  });

  test('uma pausa velha não avança o jogo novo, mesmo que ele também esteja comemorando', () => {
    const start = Logic.createGame(1, { random: prng(3) });
    const solved = Logic.answer(start, Logic.currentRound(start).answer.symbol, 1).state;
    // reinicia e acerta a primeira rodada do jogo novo antes da pausa antiga terminar
    const restarted = Logic.createGame(1, { random: prng(3), previousRound: solved.round });
    const celebratingAgain = Logic.answer(restarted, Logic.currentRound(restarted).answer.symbol, 2).state;

    const stale = Logic.next(celebratingAgain, solved.round, 3);
    assert.equal(stale.result, null);
    assert.equal(stale.state.index, 0);
    // a pausa do jogo novo, sim, avança
    assert.equal(Logic.next(celebratingAgain, celebratingAgain.round, 4).result, 'next');
  });

  test('sem acertar a rodada, não avança', () => {
    const start = Logic.createGame(1);
    assert.equal(Logic.next(start, start.round, 1).result, null);
  });

  test('a oitava rodada termina o jogo e marca o tempo', () => {
    let s = Logic.createGame(1, { random: prng(5) });
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
  const stars = (firstTry, level) => Logic.calcStars({ firstTry, total: 8, level });

  test('a exigência cresce com o nível: 2 estrelas pedem 4, 5, 5, 6, 6 e 7 acertos de primeira', () => {
    const two = [4, 5, 5, 6, 6, 7];
    const three = [6, 7, 7, 7, 8, 8];
    for (const level of LEVELS) {
      assert.equal(stars(two[level - 1], level), 2, `nível ${level}: ${two[level - 1]} acertos`);
      assert.equal(stars(two[level - 1] - 1, level), 1, `nível ${level}: um a menos`);
      assert.equal(stars(three[level - 1], level), 3, `nível ${level}: ${three[level - 1]} acertos`);
      assert.equal(stars(three[level - 1] - 1, level) , 2, `nível ${level}: um a menos para 3`);
    }
  });

  test('o mesmo desempenho rende menos estrelas num nível mais alto', () => {
    assert.equal(stars(5, 1), 2);
    assert.equal(stars(5, 4), 1);
    assert.equal(stars(7, 1), 3);
    assert.equal(stars(7, 5), 2);
    assert.equal(stars(7, 6), 2);
    assert.equal(stars(8, 6), 3);
  });

  test('nunca menos de 1 estrela', () => {
    for (const level of LEVELS) assert.equal(stars(0, level), 1);
  });

  test('a exigência nunca diminui de um nível para o outro', () => {
    const rules = Logic.QUIZ_STAR_RULES || require('../../assets/games/_shared/game-utils.js').QUIZ_STAR_RULES;
    for (const key of ['two', 'three']) {
      for (let i = 1; i < 6; i++) assert.ok(rules[key][i] >= rules[key][i - 1], `${key}[${i}]`);
    }
  });

  test('o recorde considera estrelas e, depois, menos erros', () => {
    assert.equal(Logic.isNewRecord(null, 3, 0), false);
    assert.equal(Logic.isNewRecord({ stars: 2, moves: 1 }, 3, 5), true);
    assert.equal(Logic.isNewRecord({ stars: 3, moves: 2 }, 3, 1), true);
    assert.equal(Logic.isNewRecord({ stars: 3, moves: 2 }, 3, 2), false);
  });
});
