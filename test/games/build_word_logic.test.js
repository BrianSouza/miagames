// Regras do "Montar a palavra" (assets/games/build-word/): arrastar sílabas para as lacunas.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../../assets/games/build-word/build-word-logic.js');
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

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const LEVELS = [1, 2, 3, 4, 5, 6];
const games = (level) => SEEDS.map((seed) => Logic.createGame(level, { random: prng(seed) }));
const NOW = 1000;

/** O id da peça (ainda solta) que serve na lacuna `slot` */
function tileFor(state, slot) {
  const round = Logic.currentRound(state);
  return round.tiles.find((t) => t.syllable === round.syllables[slot] && !state.slots.includes(t.id)).id;
}

/** Uma peça solta que NÃO serve na lacuna `slot` */
function wrongTileFor(state, slot) {
  const round = Logic.currentRound(state);
  return round.tiles.find((t) => t.syllable !== round.syllables[slot] && !state.slots.includes(t.id)).id;
}

/** Monta a palavra atual sem erro; devolve o estado e o resultado da última peça */
function solveRound(state) {
  let out = { state, result: null };
  for (let slot = 0; slot < state.slots.length; slot++) {
    out = Logic.place(out.state, tileFor(out.state, slot), slot, NOW);
  }
  return out;
}

describe('níveis', () => {
  test('são 6, com a mesma forma, e a exigência cresce', () => {
    assert.equal(Logic.LEVELS.length, 6);
    for (const row of Logic.LEVELS) {
      assert.deepEqual(Object.keys(row).sort(), ['extra', 'rounds', 'similar', 'syllables', 'three', 'two']);
    }
    // 2 sílabas nos níveis 1 a 3, 3 sílabas nos 4 a 6
    assert.deepEqual(Logic.LEVELS.map((l) => l.syllables), [2, 2, 2, 3, 3, 3]);
    // dentro de cada grupo de sílabas, há cada vez mais peças a mais
    assert.ok(Logic.LEVELS[0].extra < Logic.LEVELS[1].extra && Logic.LEVELS[1].extra < Logic.LEVELS[2].extra);
    assert.ok(Logic.LEVELS[3].extra < Logic.LEVELS[4].extra && Logic.LEVELS[4].extra < Logic.LEVELS[5].extra);
    // as peças parecidas só aparecem no fim de cada grupo
    assert.deepEqual(Logic.LEVELS.map((l) => l.similar), [false, false, true, false, false, true]);
  });

  test('as estrelas ficam mais exigentes e nunca pedem mais do que há de palavras', () => {
    Logic.LEVELS.forEach((l, i) => {
      assert.ok(l.two >= 1 && l.two < l.three, `nível ${i + 1}`);
      assert.ok(l.three <= l.rounds, `nível ${i + 1}`);
      if (i > 0) {
        assert.ok(l.two >= Logic.LEVELS[i - 1].two, `2★ não afrouxa no nível ${i + 1}`);
        assert.ok(l.three >= Logic.LEVELS[i - 1].three, `3★ não afrouxa no nível ${i + 1}`);
      }
    });
    // o último nível pede mais do que o primeiro
    assert.ok(Logic.LEVELS[5].two > Logic.LEVELS[0].two);
    assert.ok(Logic.LEVELS[5].three > Logic.LEVELS[0].three);
  });

  test('configFor usa o nível e um nível inválido vira o 1', () => {
    assert.equal(Logic.configFor(4), Logic.LEVELS[3]);
    for (const bad of [0, 7, -1, null, undefined, 'x', NaN]) assert.equal(Logic.configFor(bad), Logic.LEVELS[0]);
  });
});

describe('createGame', () => {
  test('cada partida tem as palavras do nível, sem repetir', () => {
    for (const level of LEVELS) {
      for (const g of games(level)) {
        const cfg = Logic.LEVELS[level - 1];
        assert.equal(g.total, cfg.rounds);
        assert.equal(new Set(g.rounds.map((r) => r.id)).size, cfg.rounds, 'palavras repetidas');
        for (const r of g.rounds) {
          assert.equal(r.syllables.length, cfg.syllables, `nível ${level}: ${r.word}`);
          assert.equal(r.syllables.join(''), r.word);
        }
      }
    }
  });

  test('a rodada tem as sílabas da palavra mais as peças a mais do nível', () => {
    for (const level of LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      for (const g of games(level)) {
        for (const r of g.rounds) {
          assert.equal(r.tiles.length, cfg.syllables + cfg.extra, `nível ${level}: ${r.word}`);
          // as peças contêm todas as sílabas da palavra (com a repetição: ba-na-na tem duas "na")
          const have = r.tiles.map((t) => t.syllable);
          for (const s of r.syllables) {
            have.splice(have.indexOf(s), 1);
          }
          assert.equal(have.length, cfg.extra);
        }
      }
    }
  });

  test('as peças a mais nunca são sílabas da palavra nem formam outra palavra conhecida', () => {
    for (const level of LEVELS) {
      for (const g of games(level)) {
        for (const r of g.rounds) {
          const extras = r.tiles.map((t) => t.syllable).filter((s) => !r.syllables.includes(s));
          for (const extra of extras) {
            assert.ok(Logic.isUsableExtra(r.syllables, extra), `${r.word}: ${extra}`);
            r.syllables.forEach((_, i) => {
              const copy = r.syllables.slice();
              copy[i] = extra;
              assert.ok(!Data.isKnownWord(copy.join('')), `${r.word} com ${extra} em ${i} forma ${copy.join('')}`);
            });
          }
          assert.equal(new Set(extras).size, extras.length, `${r.word}: peças a mais repetidas`);
        }
      }
    }
  });

  test('peças a mais "parecidas" repartem a consoante ou a vogal com a palavra; as outras, não', () => {
    const looks = (r, s) => r.syllables.some((x) => x[0] === s[0] || x[1] === s[1]);
    let similarChecked = 0;
    let differentChecked = 0;
    for (const level of LEVELS) {
      const cfg = Logic.LEVELS[level - 1];
      if (!cfg.extra) continue;
      for (const g of games(level)) {
        for (const r of g.rounds) {
          const extras = r.tiles.map((t) => t.syllable).filter((s) => !r.syllables.includes(s));
          for (const e of extras) {
            if (cfg.similar) { assert.ok(looks(r, e), `nível ${level}: ${e} não parece com ${r.word}`); similarChecked++; }
            else { assert.ok(!looks(r, e), `nível ${level}: ${e} parece com ${r.word}`); differentChecked++; }
          }
        }
      }
    }
    assert.ok(similarChecked > 100 && differentChecked > 100, 'o teste precisa ter olhado peças dos dois tipos');
  });

  test('os ids das peças são únicos na rodada', () => {
    for (const g of games(6)) {
      for (const r of g.rounds) assert.equal(new Set(r.tiles.map((t) => t.id)).size, r.tiles.length);
    }
  });

  test('cada peça sabe como a voz a fala', () => {
    for (const r of games(3)[0].rounds) {
      for (const t of r.tiles) assert.equal(t.say, Data.sayFor(t.syllable));
    }
  });

  test('a mesma semente dá a mesma partida; sementes diferentes dão partidas diferentes', () => {
    const a = JSON.stringify(Logic.createGame(2, { random: prng(7) }));
    const b = JSON.stringify(Logic.createGame(2, { random: prng(7) }));
    const c = JSON.stringify(Logic.createGame(2, { random: prng(8) }));
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  test('começa na primeira palavra, com todas as lacunas vazias', () => {
    const g = Logic.createGame(5, { random: prng(1) });
    assert.equal(g.index, 0);
    assert.equal(g.phase, 'building');
    assert.deepEqual(g.slots, [null, null, null]);
    assert.equal(g.errors, 0);
    assert.equal(g.startedAt, null);
  });

  test('previousRound identifica a partida', () => {
    assert.equal(Logic.createGame(1, { random: prng(1) }).round, 1);
    assert.equal(Logic.createGame(1, { random: prng(1), previousRound: 4 }).round, 5);
  });

  test('um nível inválido vira o 1', () => {
    assert.equal(Logic.createGame(99, { random: prng(1) }).level, 1);
  });
});

describe('place', () => {
  test('uma peça certa na lacuna certa encaixa', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const out = Logic.place(g, tileFor(g, 0), 0, NOW);
    assert.equal(out.result, 'correct');
    assert.equal(out.state.slots[0], tileFor(g, 0));
    assert.equal(out.state.slots[1], null);
    assert.equal(out.state.errors, 0);
    assert.equal(out.state.phase, 'building');
  });

  test('uma peça errada é um erro: nada encaixa e os contadores sobem', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    const out = Logic.place(g, wrongTileFor(g, 0), 0, NOW);
    assert.equal(out.result, 'wrong');
    assert.deepEqual(out.state.slots, g.slots);
    assert.equal(out.state.errors, 1);
    assert.equal(out.state.misses, 1);
  });

  test('a peça da outra lacuna também é erro (a sílaba certa no lugar errado)', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const round = Logic.currentRound(g);
    // a peça da lacuna 1, solta na lacuna 0 (as duas sílabas são diferentes nesta palavra)
    assert.notEqual(round.syllables[0], round.syllables[1]);
    assert.equal(Logic.place(g, tileFor(g, 1), 0, NOW).result, 'wrong');
  });

  test('a última peça completa a palavra: comemora e conta a palavra', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const out = solveRound(g);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.phase, 'celebrating');
    assert.equal(out.state.solved, 1);
    assert.equal(out.state.firstTry, 1);
  });

  test('uma palavra com erro no caminho conta como resolvida, mas não de primeira', () => {
    let g = Logic.createGame(2, { random: prng(1) });
    g = Logic.place(g, wrongTileFor(g, 0), 0, NOW).state;
    const out = solveRound(g);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.solved, 1);
    assert.equal(out.state.firstTry, 0);
    assert.equal(out.state.errors, 1);
  });

  test('a ordem das lacunas não importa', () => {
    const g = Logic.createGame(4, { random: prng(3) });
    let out = Logic.place(g, tileFor(g, 2), 2, NOW);
    out = Logic.place(out.state, tileFor(out.state, 0), 0, NOW);
    assert.equal(out.result, 'correct');
    out = Logic.place(out.state, tileFor(out.state, 1), 1, NOW);
    assert.equal(out.result, 'complete');
  });

  test('palavra com a mesma sílaba duas vezes (ba-na-na): qualquer "na" serve em qualquer lacuna "na"', () => {
    const g = Logic.createGame(4, { random: prng(1) });
    // monta uma partida em que a rodada atual é "banana"
    const banana = g.rounds.find((r) => r.id === 'banana') || Logic.createGame(4, { random: prng(2) }).rounds.find((r) => r.id === 'banana');
    const state = Object.assign({}, g, { rounds: [banana], total: 1, slots: [null, null, null] });
    const nas = banana.tiles.filter((t) => t.syllable === 'na');
    assert.equal(nas.length, 2);

    // a primeira "na" vai para a lacuna 2, a segunda para a lacuna 1
    let out = Logic.place(state, nas[0].id, 2, NOW);
    assert.equal(out.result, 'correct');
    out = Logic.place(out.state, nas[1].id, 1, NOW);
    assert.equal(out.result, 'correct');
    // a mesma peça não encaixa duas vezes
    assert.equal(Logic.place(out.state, nas[0].id, 0, NOW).result, null);
    // e o "ba" completa
    const ba = banana.tiles.find((t) => t.syllable === 'ba').id;
    assert.equal(Logic.place(out.state, ba, 0, NOW).result, 'complete');
  });

  test('toques ignorados: fora da vez, peça ou lacuna inexistente, peça já usada, lacuna cheia', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const placed = Logic.place(g, tileFor(g, 0), 0, NOW).state;
    const usedTile = placed.slots[0];

    for (const [state, tile, slot, why] of [
      [placed, 'nao-existe', 1, 'peça inexistente'],
      [placed, tileFor(placed, 1), 7, 'lacuna que não existe'],
      [placed, tileFor(placed, 1), -1, 'lacuna negativa'],
      [placed, tileFor(placed, 1), 0.5, 'lacuna fracionária'],
      [placed, tileFor(placed, 1), '1', 'lacuna em texto'],
      [placed, tileFor(placed, 1), NaN, 'lacuna NaN'],
      [placed, usedTile, 1, 'peça que já está encaixada'],
      [Object.assign({}, placed, { phase: 'celebrating' }), tileFor(placed, 1), 1, 'fora da vez'],
      [Object.assign({}, placed, { phase: 'completed' }), tileFor(placed, 1), 1, 'partida terminada'],
    ]) {
      const out = Logic.place(state, tile, slot, NOW);
      assert.equal(out.result, null, why);
      assert.equal(out.state, state, `${why}: o estado não muda`);
    }
    // lacuna já cheia
    const full = Logic.place(placed, wrongTileFor(placed, 0), 0, NOW);
    assert.equal(full.result, null, 'lacuna cheia');
    assert.equal(full.state.errors, 0, 'soltar numa lacuna cheia não é erro');
  });

  test('place devolve um estado novo e não mexe no antigo', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const before = JSON.stringify(g);
    Logic.place(g, tileFor(g, 0), 0, NOW);
    Logic.place(g, wrongTileFor(g, 0) || tileFor(g, 1), 0, NOW);
    assert.equal(JSON.stringify(g), before);
  });

  test('o relógio começa no primeiro toque e não volta a mudar', () => {
    const g = Logic.createGame(2, { random: prng(1) });
    assert.equal(g.startedAt, null);
    const first = Logic.place(g, wrongTileFor(g, 0), 0, 500);
    assert.equal(first.state.startedAt, 500);
    const second = Logic.place(first.state, tileFor(first.state, 0), 0, 900);
    assert.equal(second.state.startedAt, 500);
  });

  test('start() marca o início uma vez só', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    const a = Logic.start(g, 300);
    assert.equal(a.startedAt, 300);
    assert.equal(Logic.start(a, 800).startedAt, 300);
  });
});

describe('fits', () => {
  test('uma peça serve na lacuna que pede a sílaba dela', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    assert.equal(Logic.fits(g, tileFor(g, 0), 0), true);
    assert.equal(Logic.fits(g, tileFor(g, 0), 1), false);
    assert.equal(Logic.fits(g, 'x', 0), false);
    assert.equal(Logic.fits(g, tileFor(g, 0), 9), false);
  });
});

describe('dica', () => {
  test('só depois de 2 erros na mesma palavra, e só enquanto se monta', () => {
    let g = Logic.createGame(2, { random: prng(1) });
    assert.equal(Logic.shouldHint(g), false);
    g = Logic.place(g, wrongTileFor(g, 0), 0, NOW).state;
    assert.equal(Logic.shouldHint(g), false);
    g = Logic.place(g, wrongTileFor(g, 0), 0, NOW).state;
    assert.equal(Logic.shouldHint(g), true);
    assert.equal(Logic.shouldHint(Object.assign({}, g, { phase: 'celebrating' })), false);
  });

  test('aponta a primeira lacuna vazia e uma peça solta que serve nela', () => {
    let g = Logic.createGame(4, { random: prng(3) });
    let hint = Logic.hintFor(g);
    assert.equal(hint.slotIndex, 0);
    assert.ok(Logic.fits(g, hint.tileId, 0));

    g = Logic.place(g, tileFor(g, 0), 0, NOW).state;
    hint = Logic.hintFor(g);
    assert.equal(hint.slotIndex, 1);
    assert.ok(Logic.fits(g, hint.tileId, 1));
    assert.ok(!g.slots.includes(hint.tileId), 'a dica não é uma peça já encaixada');
  });

  test('ba-na-na: depois de encaixar um "na", a dica usa o OUTRO "na"', () => {
    const base = Logic.createGame(4, { random: prng(1) });
    const banana = base.rounds.find((r) => r.id === 'banana') || Logic.createGame(4, { random: prng(2) }).rounds.find((r) => r.id === 'banana');
    let state = Object.assign({}, base, { rounds: [banana], total: 1, slots: [null, null, null] });
    const nas = banana.tiles.filter((t) => t.syllable === 'na');
    const ba = banana.tiles.find((t) => t.syllable === 'ba');
    state = Logic.place(state, ba.id, 0, NOW).state;
    state = Logic.place(state, nas[0].id, 1, NOW).state;
    assert.deepEqual(Logic.hintFor(state), { slotIndex: 2, tileId: nas[1].id });
  });

  test('sem lacunas vazias não há dica', () => {
    const g = Logic.createGame(1, { random: prng(1) });
    assert.equal(Logic.hintFor(solveRound(g).state), null);
  });
});

describe('next', () => {
  test('depois de uma palavra montada, vem a seguinte, de lacunas vazias e sem erros', () => {
    let g = Logic.createGame(2, { random: prng(1) });
    g = Logic.place(g, wrongTileFor(g, 0), 0, NOW).state;
    g = solveRound(g).state;
    const out = Logic.next(g, g.round, 2000);
    assert.equal(out.result, 'next');
    assert.equal(out.state.index, 1);
    assert.equal(out.state.phase, 'building');
    assert.deepEqual(out.state.slots, [null, null]);
    assert.equal(out.state.misses, 0);
    assert.equal(out.state.errors, 1, 'os erros da partida continuam');
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

  test('depois da última palavra a partida termina, com a hora', () => {
    let g = Logic.createGame(1, { random: prng(1) });
    for (let i = 0; i < g.total - 1; i++) {
      g = solveRound(g).state;
      g = Logic.next(g, g.round, NOW).state;
    }
    g = solveRound(g).state;
    const out = Logic.next(g, g.round, 7777);
    assert.equal(out.result, 'complete');
    assert.equal(out.state.phase, 'completed');
    assert.equal(out.state.completedAt, 7777);
    assert.equal(out.state.solved, g.total);
    assert.equal(out.state.firstTry, g.total);
  });
});

describe('estrelas', () => {
  test('uma partida perfeita vale 3 estrelas em qualquer nível', () => {
    for (const level of LEVELS) {
      assert.equal(Logic.starsFor(level, Logic.LEVELS[level - 1].rounds), 3, `nível ${level}`);
    }
  });

  test('os limites de cada nível: abaixo de 2★ é 1, entre 2★ e 3★ é 2', () => {
    for (const level of LEVELS) {
      const { two, three } = Logic.LEVELS[level - 1];
      assert.equal(Logic.starsFor(level, 0), 1, `nível ${level}: 0`);
      assert.equal(Logic.starsFor(level, two - 1), 1, `nível ${level}: um a menos que 2★`);
      assert.equal(Logic.starsFor(level, two), 2, `nível ${level}: exato 2★`);
      assert.equal(Logic.starsFor(level, three - 1), 2, `nível ${level}: um a menos que 3★`);
      assert.equal(Logic.starsFor(level, three), 3, `nível ${level}: exato 3★`);
    }
  });

  test('o mesmo resultado vale menos estrelas nos níveis altos', () => {
    // 4 palavras de primeira: 2★ no nível 1, mas só 1★ no nível 6
    assert.equal(Logic.starsFor(1, 4), 2);
    assert.equal(Logic.starsFor(6, 4), 1);
    // 5 de primeira: 3★ no nível 1, 2★ no nível 6
    assert.equal(Logic.starsFor(1, 5), 3);
    assert.equal(Logic.starsFor(6, 5), 2);
  });

  test('é sempre possível ganhar 2 estrelas (e abrir o próximo nível) sem ser perfeito', () => {
    for (const level of LEVELS) {
      assert.ok(Logic.LEVELS[level - 1].two < Logic.LEVELS[level - 1].rounds, `nível ${level}`);
    }
  });

  test('calcStars lê as palavras certas de primeira do estado', () => {
    const g = Object.assign(Logic.createGame(3, { random: prng(1) }), { firstTry: 4 });
    assert.equal(Logic.calcStars(g), Logic.starsFor(3, 4));
  });
});

describe('textos da voz', () => {
  test('o pedido diz a palavra e o que fazer', () => {
    const round = { word: 'bola', syllables: ['bo', 'la'] };
    assert.equal(Logic.promptFor(round), 'Bola. Monte a palavra!');
  });

  test('ao terminar, a voz soletra as sílabas e diz a palavra', () => {
    assert.equal(Logic.correctSpeechFor({ word: 'bola', syllables: ['bo', 'la'] }), 'bô, lá, bola! Muito bem!');
    assert.equal(Logic.correctSpeechFor({ word: 'tomate', syllables: ['to', 'ma', 'te'] }), 'tô, má, tê, tomate! Muito bem!');
  });

  test('ao errar, fala a sílaba escolhida (com a pronúncia certa) e incentiva', () => {
    assert.equal(Logic.wrongSpeechFor('to'), 'tô. Tente de novo!');
  });
});
