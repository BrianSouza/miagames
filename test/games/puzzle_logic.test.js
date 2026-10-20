// Regras do "Quebra-cabeça" (assets/games/puzzle/): arrastar as peças de um desenho para a grade.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Logic = require('../../assets/games/puzzle/puzzle-logic.js');
const Data = require('../../assets/games/_shared/words.js');

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
const NOW = 1000;

/** Coloca a peça `i` do desenho atual no lugar certo */
const placeRight = (state, pieceId) => {
  const piece = Logic.currentRound(state).pieces.find((p) => p.id === pieceId);
  return Logic.place(state, pieceId, piece.cell, NOW);
};

/** Uma peça solta e um lugar vazio que NÃO é o dela */
function wrongMove(state) {
  const round = Logic.currentRound(state);
  const loose = round.pieces.find((p) => state.placed[p.id] === undefined);
  const cell = round.pieces.find((p) => p.cell !== loose.cell && !Object.values(state.placed).includes(p.cell)).cell;
  return { pieceId: loose.id, cell };
}

/** Monta o desenho atual sem erro; devolve { state, result } do último passo */
function solveRound(state) {
  let out = { state, result: null };
  for (const piece of Logic.currentRound(state).order.map((id) => Logic.currentRound(state).pieces.find((p) => p.id === id))) {
    out = Logic.place(out.state, piece.id, piece.cell, NOW);
  }
  return out;
}

describe('níveis', () => {
  test('são 6: a grade cresce e o guia some nos últimos níveis', () => {
    assert.equal(Logic.LEVELS.length, 6);
    const pieces = Logic.LEVELS.map((l) => l.cols * l.rows);
    assert.deepEqual(pieces, [2, 4, 6, 9, 12, 16]);
    assert.deepEqual(Logic.LEVELS.map((l) => l.guide), [true, true, true, true, false, false]);
  });

  test('uma partida tem no máximo 16 peças a colocar (as estrelas de progresso cabem no cabeçalho)', () => {
    for (const level of LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      assert.ok(cfg.rounds * cfg.cols * cfg.rows <= 16, `nível ${level}`);
    }
  });

  test('as estrelas: erros permitidos para 3★ e 2★, sempre possível ganhar 2★ sem errar nada', () => {
    for (const [i, l] of Logic.LEVELS.entries()) {
      assert.ok(l.three >= 0 && l.three < l.two, `nível ${i + 1}`);
      assert.ok(l.two >= 1, `nível ${i + 1}`);
    }
    // o nível mais alto não pede mais do que o primeiro em erros por peça
    const ratio = (l) => l.two / (l.cols * l.rows * l.rounds);
    assert.ok(ratio(Logic.LEVELS[5]) < ratio(Logic.LEVELS[0]), 'a tolerância por peça diminui');
  });

  test('configFor usa o nível e um nível inválido vira o 1', () => {
    assert.equal(Logic.configFor(4), Logic.LEVELS[3]);
    for (const bad of [0, 7, null, undefined, 'x', NaN]) assert.equal(Logic.configFor(bad), Logic.LEVELS[0]);
    assert.equal(Logic.piecesIn(Logic.LEVELS[5]), 16);
  });
});

describe('createGame', () => {
  test('cada partida tem os desenhos do nível, todos diferentes e com desenho existente', () => {
    const dir = path.join(__dirname, '../../assets/games/missing-syllable/img');
    for (const level of LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      for (const g of games(level)) {
        assert.equal(g.rounds.length, cfg.rounds);
        assert.equal(g.total, cfg.rounds * cfg.cols * cfg.rows);
        assert.equal(new Set(g.rounds.map((r) => r.id)).size, cfg.rounds, 'desenhos repetidos');
        for (const r of g.rounds) {
          assert.ok(Data.WORDS.some((w) => w.id === r.id), r.id);
          assert.ok(fs.existsSync(path.join(dir, `${r.id}.svg`)), `falta o desenho de ${r.id}`);
          assert.equal(r.syllables.join(''), r.word);
        }
      }
    }
  });

  test('cada desenho tem uma peça para cada lugar da grade, com coluna e linha certas', () => {
    for (const level of LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      for (const g of games(level)) {
        for (const r of g.rounds) {
          assert.equal(r.cols, cfg.cols);
          assert.equal(r.rows, cfg.rows);
          assert.equal(r.guide, cfg.guide);
          assert.equal(r.pieces.length, cfg.cols * cfg.rows);
          r.pieces.forEach((p, i) => {
            assert.equal(p.id, `p${i}`);
            assert.equal(p.cell, i);
            assert.equal(p.col, i % cfg.cols);
            assert.equal(p.row, Math.floor(i / cfg.cols));
          });
        }
      }
    }
  });

  test('a bandeja tem todas as peças, embaralhadas (e quase nunca na ordem da grade)', () => {
    let inOrder = 0;
    let total = 0;
    for (const level of [2, 3, 4, 5, 6]) {
      for (const g of games(level)) {
        for (const r of g.rounds) {
          assert.deepEqual([...r.order].sort(), r.pieces.map((p) => p.id).sort());
          total++;
          if (r.order.every((id, i) => id === `p${i}`)) inOrder++;
        }
      }
    }
    assert.ok(inOrder / total < 0.05, `${inOrder} de ${total} bandejas na ordem da grade`);
  });

  test('a mesma semente dá a mesma partida; sementes diferentes dão partidas diferentes', () => {
    for (const level of LEVELS) {
      const a = JSON.stringify(Logic.createGame(level, { random: prng(7) }));
      const b = JSON.stringify(Logic.createGame(level, { random: prng(7) }));
      const c = JSON.stringify(Logic.createGame(level, { random: prng(8) }));
      assert.equal(a, b, `nível ${level}`);
      assert.notEqual(a, c, `nível ${level}`);
    }
  });

  test('começa no primeiro desenho, com a grade vazia e sem erros', () => {
    const g = Logic.createGame(3, { random: prng(1) });
    assert.equal(g.index, 0);
    assert.equal(g.phase, 'building');
    assert.deepEqual(g.placed, {});
    assert.equal(g.placedCount, 0);
    assert.equal(g.errors, 0);
    assert.equal(g.startedAt, null);
  });

  test('previousRound identifica a partida; nível inválido vira o 1', () => {
    assert.equal(Logic.createGame(1, { random: prng(1) }).round, 1);
    assert.equal(Logic.createGame(1, { random: prng(1), previousRound: 4 }).round, 5);
    assert.equal(Logic.createGame(99, { random: prng(1) }).level, 1);
  });
});

describe('place', () => {
  test('a peça certa no lugar certo encaixa', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const out = placeRight(g, 'p2');
    assert.equal(out.result, 'correct');
    assert.equal(out.state.placed.p2, 2);
    assert.equal(out.state.placedCount, 1);
    assert.equal(out.state.doneUnits, 1);
    assert.equal(out.state.errors, 0);
  });

  test('a peça num lugar que não é o dela é erro: nada encaixa e os contadores sobem', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const move = wrongMove(g);
    const out = Logic.place(g, move.pieceId, move.cell, NOW);
    assert.equal(out.result, 'wrong');
    assert.deepEqual(out.state.placed, {});
    assert.equal(out.state.errors, 1);
    assert.equal(out.state.misses, 1);
    assert.equal(out.state.lastWrong, move.pieceId);
  });

  test('a última peça completa o desenho', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const out = solveRound(g);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.phase, 'celebrating');
    assert.equal(out.state.placedCount, 4);
    assert.equal(out.state.doneUnits, 4);
  });

  test('a ordem das peças não importa e erros no caminho não impedem de terminar', () => {
    let g = Logic.createGame(3, { random: prng(4) });
    const move = wrongMove(g);
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    const out = solveRound(g);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.errors, 2);
  });

  test('toques ignorados: fora da vez, peça ou lugar inexistente, peça já encaixada, lugar ocupado', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const placed = placeRight(g, 'p0').state;

    for (const [state, pieceId, cell, why] of [
      [placed, 'nao-existe', 1, 'peça inexistente'],
      [placed, 'p1', 9, 'lugar que não existe'],
      [placed, 'p1', -1, 'lugar negativo'],
      [placed, 'p1', 0.5, 'lugar fracionário'],
      [placed, 'p1', '1', 'lugar em texto'],
      [placed, 'p1', NaN, 'lugar NaN'],
      [placed, 'p1', undefined, 'lugar indefinido'],
      [placed, 'p0', 1, 'peça que já está encaixada'],
      [placed, 'p1', 0, 'lugar já ocupado'],
      [Object.assign({}, placed, { phase: 'celebrating' }), 'p1', 1, 'fora da vez'],
      [Object.assign({}, placed, { phase: 'completed' }), 'p1', 1, 'partida terminada'],
    ]) {
      const out = Logic.place(state, pieceId, cell, NOW);
      assert.equal(out.result, null, why);
      assert.equal(out.state, state, `${why}: o estado não muda`);
    }
  });

  test('soltar numa grade com um lugar ocupado não é erro (a criança só errou a mira)', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const placed = placeRight(g, 'p0').state;
    assert.equal(Logic.place(placed, 'p1', 0, NOW).state.errors, 0);
  });

  test('place devolve um estado novo e não mexe no antigo', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const before = JSON.stringify(g);
    placeRight(g, 'p0');
    const move = wrongMove(g);
    Logic.place(g, move.pieceId, move.cell, NOW);
    assert.equal(JSON.stringify(g), before);
  });

  test('o relógio começa no primeiro toque e não volta a mudar', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const first = Logic.place(g, 'p0', 1, 500);
    assert.equal(first.state.startedAt, 500);
    const second = Logic.place(first.state, 'p0', 0, 900);
    assert.equal(second.state.startedAt, 500);
    assert.equal(Logic.start(g, 300).startedAt, 300);
    assert.equal(Logic.start(Logic.start(g, 300), 800).startedAt, 300);
  });
});

describe('dica', () => {
  test('só depois de 2 erros no desenho, e só enquanto se monta', () => {
    let g = Logic.createGame(2, { random: prng(1) });
    assert.equal(Logic.shouldHint(g), false);
    let move = wrongMove(g);
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    assert.equal(Logic.shouldHint(g), false);
    move = wrongMove(g);
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    assert.equal(Logic.shouldHint(g), true);
    assert.equal(Logic.shouldHint(Object.assign({}, g, { phase: 'celebrating' })), false);
  });

  test('aponta a última peça que errou e o lugar dela', () => {
    let g = Logic.createGame(2, { random: prng(1) });
    const move = wrongMove(g);
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    const piece = Logic.currentRound(g).pieces.find((p) => p.id === move.pieceId);
    assert.deepEqual(Logic.hintFor(g), { pieceId: move.pieceId, cell: piece.cell });
  });

  test('se essa peça já foi encaixada, aponta a primeira solta da bandeja', () => {
    let g = Logic.createGame(2, { random: prng(1) });
    const move = wrongMove(g);
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    g = placeRight(g, move.pieceId).state;
    const hint = Logic.hintFor(g);
    assert.notEqual(hint.pieceId, move.pieceId);
    assert.equal(g.placed[hint.pieceId], undefined, 'a dica é uma peça solta');
    const round = Logic.currentRound(g);
    const first = round.order.find((id) => g.placed[id] === undefined);
    assert.equal(hint.pieceId, first);
  });

  test('sem peças soltas não há dica', () => {
    assert.equal(Logic.hintFor(solveRound(Logic.createGame(1, { random: prng(1) })).state), null);
  });
});

describe('next', () => {
  test('depois de um desenho montado, vem o seguinte, com a grade vazia e sem erros do desenho', () => {
    let g = Logic.createGame(1, { random: prng(1) });
    const move = wrongMove(g);
    g = Logic.place(g, move.pieceId, move.cell, NOW).state;
    g = solveRound(g).state;
    const out = Logic.next(g, g.round, 2000);
    assert.equal(out.result, 'next');
    assert.equal(out.state.index, 1);
    assert.equal(out.state.phase, 'building');
    assert.deepEqual(out.state.placed, {});
    assert.equal(out.state.placedCount, 0);
    assert.equal(out.state.misses, 0);
    assert.equal(out.state.lastWrong, null);
    assert.equal(out.state.errors, 1, 'os erros da partida continuam');
    assert.equal(out.state.doneUnits, 2, 'as peças já colocadas continuam contando');
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

  test('depois do último desenho a partida termina, com a hora', () => {
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
  test('o pedido diz a palavra e o que fazer', () => {
    assert.equal(Logic.promptFor({ word: 'gato' }), 'Gato. Monte o quebra-cabeça!');
  });

  test('ao terminar, a voz soletra as sílabas e diz a palavra', () => {
    assert.equal(Logic.correctSpeechFor({ word: 'bola', syllables: ['bo', 'la'] }), 'bô, lá, bola! Muito bem!');
  });

  test('ao errar, incentiva', () => {
    assert.equal(Logic.wrongSpeech(), 'Tente de novo!');
  });
});
