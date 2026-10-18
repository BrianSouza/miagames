// Regras e banco de palavras do "Qual sílaba falta?" (assets/games/missing-syllable/).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Logic = require('../../assets/games/missing-syllable/missing-syllable-logic.js');
const Data = require('../../assets/games/_shared/words.js');

const GAME_DIR = path.join(__dirname, '../../assets/games/missing-syllable');

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

const SEEDS = Array.from({ length: 80 }, (_, i) => i + 1);
const LEVELS = [1, 2, 3, 4, 5, 6];
const games = (level) => SEEDS.map((seed) => Logic.createGame(level, { random: prng(seed) }));
const syllablesOf = (level) => (level >= 4 ? 3 : 2);

describe('banco de palavras', () => {
  test('tem palavras de sobra: 2 sílabas para os níveis 1 a 3, 3 para os níveis 4 a 6', () => {
    const two = Data.WORDS.filter((w) => w.syllables.length === 2);
    const three = Data.WORDS.filter((w) => w.syllables.length === 3);
    assert.ok(Data.WORDS.length >= 30, `só ${Data.WORDS.length} palavras`);
    assert.ok(two.length >= 14, 'poucas palavras de 2 sílabas');
    assert.ok(three.length >= 12, 'poucas palavras de 3 sílabas (3 níveis sorteiam 8 de cada vez)');
    assert.equal(Data.WORDS.length, two.length + three.length, 'só palavras de 2 ou 3 sílabas');
  });

  test('as sílabas juntas formam a palavra', () => {
    for (const w of Data.WORDS) assert.equal(w.syllables.join(''), w.word, w.id);
  });

  test('ids e palavras não se repetem', () => {
    assert.equal(new Set(Data.WORDS.map((w) => w.id)).size, Data.WORDS.length);
    assert.equal(new Set(Data.WORDS.map((w) => w.word)).size, Data.WORDS.length);
  });

  test('todas as sílabas são "consoante + vogal" do inventário', () => {
    for (const w of Data.WORDS) {
      for (const s of w.syllables) assert.ok(Data.SYLLABLES.includes(s), `${w.id}: ${s}`);
    }
  });

  test('cada palavra tem um desenho (img/<id>.svg) sem <text>', () => {
    for (const w of Data.WORDS) {
      const file = path.join(GAME_DIR, 'img', `${w.id}.svg`);
      assert.ok(fs.existsSync(file), `falta o desenho de ${w.id}`);
      const svg = fs.readFileSync(file, 'utf8');
      assert.ok(svg.includes('<svg') && svg.includes('viewBox'), w.id);
      assert.ok(!svg.includes('<text'), `${w.id}: texto não aparece no flutter_svg`);
    }
  });

  test('não há desenho sobrando sem palavra', () => {
    const files = fs.readdirSync(path.join(GAME_DIR, 'img')).map((f) => f.replace('.svg', ''));
    assert.deepEqual(files.sort(), Data.WORDS.map((w) => w.id).sort());
  });

  test('o inventário de sílabas não tem ce, ci, ge, gi (outro som)', () => {
    for (const s of ['ce', 'ci', 'ge', 'gi']) assert.ok(!Data.SYLLABLES.includes(s), s);
    assert.ok(Data.SYLLABLES.includes('ca') && Data.SYLLABLES.includes('ja'));
  });

  test('toda sílaba tem uma pronúncia, com a vogal acentuada', () => {
    for (const s of Data.SYLLABLES) assert.ok(Data.sayFor(s).length === 2, s);
    assert.equal(Data.sayFor('to'), 'tô'); // sem acento o motor leria "tu"
    assert.equal(Data.sayFor('ne'), 'nê');
    assert.equal(Data.sayFor('la'), 'lá');
  });

  test('uma pronúncia ajustada (SAY_OVERRIDES) vence a padrão', () => {
    Data.SAY_OVERRIDES.xx = 'teste';
    assert.equal(Data.sayFor('xx'), 'teste');
    delete Data.SAY_OVERRIDES.xx;
  });
});

describe('formsKnownWord', () => {
  test('BO_A com CA vira "boca" (uma palavra do jogo): não serve de distrator', () => {
    assert.equal(Logic.formsKnownWord(['bo', 'la'], 1, 'ca'), true);
    assert.equal(Logic.formsKnownWord(['bo', 'la'], 1, 'ta'), true); // bota
    assert.equal(Logic.formsKnownWord(['bo', 'la'], 1, 'lo'), true); // bolo
  });

  test('conta também palavras que o jogo não desenha (BO + DA = "boda")', () => {
    assert.equal(Logic.formsKnownWord(['bo', 'la'], 1, 'da'), true);
  });

  test('uma combinação sem sentido pode ser distrator', () => {
    assert.equal(Logic.formsKnownWord(['bo', 'la'], 1, 'zu'), false);
    assert.equal(Logic.formsKnownWord(['ca', 'sa'], 0, 'zu'), false);
  });

  test('vale para a lacuna em qualquer posição', () => {
    assert.equal(Logic.formsKnownWord(['ba', 'na', 'na'], 0, 'ca'), false);
    assert.equal(Logic.formsKnownWord(['ca', 'sa'], 0, 'ma'), false);
    assert.equal(Logic.formsKnownWord(['ma', 'la'], 0, 'ca'), false);
    assert.equal(Logic.formsKnownWord(['ga', 'to'], 0, 'pa'), true); // pato
  });
});

describe('createGame', () => {
  test('8 rodadas, e as figuras: 3, 3, 4, 3, 4 e 5', () => {
    const options = { 1: 3, 2: 3, 3: 4, 4: 3, 5: 4, 6: 5 };
    for (const level of LEVELS) {
      for (const game of games(level)) {
        assert.equal(game.total, 8);
        assert.equal(game.level, level);
        for (const round of game.rounds) assert.equal(round.options.length, options[level], `nível ${level}`);
      }
    }
  });

  test('nível desconhecido vira o 1', () => {
    for (const bad of ['x', 0, 7, undefined, null, NaN]) assert.equal(Logic.createGame(bad).level, 1, String(bad));
  });

  test('níveis 1 a 3 sorteiam palavras de 2 sílabas; 4 a 6, de 3', () => {
    for (const level of LEVELS) {
      for (const game of games(level)) {
        for (const round of game.rounds) assert.equal(round.syllables.length, syllablesOf(level), `nível ${level}: ${round.word}`);
      }
    }
  });

  test('as palavras da partida não se repetem', () => {
    for (const level of LEVELS) {
      for (const game of games(level)) {
        const words = game.rounds.map((r) => r.word);
        assert.equal(new Set(words).size, words.length, `nível ${level}: ${words}`);
      }
    }
  });

  test('a palavra muda de uma partida para outra', () => {
    for (const level of [1, 4]) {
      const first = new Set(games(level).map((g) => g.rounds[0].word));
      assert.ok(first.size >= 5, `nível ${level}: sempre começa com as mesmas palavras: ${[...first]}`);
    }
  });

  test('nível 1: a lacuna é sempre a última sílaba (completar o fim da palavra)', () => {
    for (const game of games(1)) {
      for (const round of game.rounds) assert.equal(round.blankIndex, round.syllables.length - 1, round.word);
    }
  });

  test('níveis 2 a 6: todas as posições da lacuna aparecem, por igual', () => {
    for (const level of [2, 3, 4, 5, 6]) {
      const syllables = syllablesOf(level);
      for (const game of games(level)) {
        const counts = Array(syllables).fill(0);
        for (const round of game.rounds) counts[round.blankIndex]++;
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `nível ${level}: ${counts}`);
        assert.ok(Math.min(...counts) >= 2, `nível ${level}: ${counts}`);
      }
    }
  });

  test('cada rodada tem uma só figura certa, entre sílabas diferentes', () => {
    for (const level of LEVELS) {
      for (const game of games(level)) {
        for (const round of game.rounds) {
          assert.equal(new Set(round.optionKeys).size, round.optionKeys.length, round.word);
          assert.equal(round.optionKeys.filter((k) => k === round.answerKey).length, 1, round.word);
          assert.equal(round.answerKey, round.syllables[round.blankIndex]);
          assert.deepEqual(round.options.map((o) => o.syllable), round.optionKeys);
          for (const o of round.options) assert.equal(o.say, Data.sayFor(o.syllable));
        }
      }
    }
  });

  test('NENHUMA figura errada forma outra palavra que a criança conhece', () => {
    for (const level of LEVELS) {
      for (const game of games(level)) {
        for (const round of game.rounds) {
          for (const key of round.optionKeys) {
            if (key === round.answerKey) continue;
            const copy = [...round.syllables];
            copy[round.blankIndex] = key;
            assert.ok(!Data.isKnownWord(copy.join('')), `nível ${level}: ${round.word} com ${key} = ${copy.join('')}`);
          }
        }
      }
    }
  });

  test('só a sílaba certa completa a palavra', () => {
    // Confere por força bruta: das figuras da rodada, só a certa forma uma palavra do banco
    const bank = new Set(Data.WORDS.map((w) => w.word));
    for (const game of games(3).concat(games(6))) {
      for (const round of game.rounds) {
        const completing = round.optionKeys.filter((key) => {
          const copy = [...round.syllables];
          copy[round.blankIndex] = key;
          return bank.has(copy.join(''));
        });
        assert.deepEqual(completing, [round.answerKey], round.word);
      }
    }
  });

  test('níveis 1, 2 e 4: as erradas são bem diferentes (outra consoante e outra vogal, consoantes distintas)', () => {
    for (const game of [1, 2, 4].flatMap((level) => games(level))) {
      for (const round of game.rounds) {
        const wrongs = round.optionKeys.filter((k) => k !== round.answerKey);
        for (const w of wrongs) {
          assert.notEqual(Data.consonantOf(w), Data.consonantOf(round.answerKey), `${round.word}: ${w}`);
          assert.notEqual(Data.vowelOf(w), Data.vowelOf(round.answerKey), `${round.word}: ${w}`);
        }
        assert.equal(new Set(wrongs.map(Data.consonantOf)).size, wrongs.length, `${round.word}: ${wrongs}`);
      }
    }
  });

  test('níveis 3, 5 e 6: uma errada tem a mesma consoante e outra a mesma vogal da certa', () => {
    for (const level of [3, 5, 6]) {
      for (const game of games(level)) {
        for (const round of game.rounds) {
          const wrongs = round.optionKeys.filter((k) => k !== round.answerKey);
          assert.ok(
            wrongs.some((w) => Data.consonantOf(w) === Data.consonantOf(round.answerKey)),
            `nível ${level} ${round.word}: nenhuma com a mesma consoante em ${wrongs}`,
          );
          assert.ok(
            wrongs.some((w) => Data.vowelOf(w) === Data.vowelOf(round.answerKey)),
            `nível ${level} ${round.word}: nenhuma com a mesma vogal em ${wrongs}`,
          );
        }
      }
    }
  });

  test('a posição da figura certa varia', () => {
    const positions = new Set();
    for (const game of games(3)) {
      for (const round of game.rounds) positions.add(round.optionKeys.indexOf(round.answerKey));
    }
    assert.equal(positions.size, 4);
  });
});

describe('falas e tela', () => {
  const bola = { word: 'bola', syllables: ['bo', 'la'], blankIndex: 1 };

  test('pergunta: "Bola. Qual sílaba falta?"', () => {
    assert.equal(Logic.promptFor(bola), 'Bola. Qual sílaba falta?');
  });

  test('ao acertar, a voz soletra as sílabas e diz a palavra', () => {
    assert.equal(Logic.correctSpeechFor(bola), 'bô, lá, bola! Muito bem!');
    assert.equal(
      Logic.correctSpeechFor({ word: 'banana', syllables: ['ba', 'na', 'na'] }),
      'bá, ná, ná, banana! Muito bem!',
    );
  });

  test('ao errar, a voz fala a sílaba escolhida para a criança aprender o som', () => {
    assert.equal(Logic.wrongSpeechFor(bola, 'ca'), 'cá. Tente de novo!');
  });

  test('a palavra na tela tem a lacuna no lugar certo, em maiúsculas', () => {
    assert.deepEqual(Logic.displayFor(bola), [
      { text: 'BO', blank: false },
      { text: 'LA', blank: true },
    ]);
    assert.deepEqual(
      Logic.displayFor({ syllables: ['ba', 'na', 'na'], blankIndex: 0 }).map((d) => d.blank),
      [true, false, false],
    );
  });
});

describe('partida', () => {
  test('o motor de rodadas funciona com as sílabas como chave', () => {
    let game = Logic.createGame(1, { random: prng(4) });
    const round = Logic.currentRound(game);
    const wrong = round.optionKeys.find((k) => k !== round.answerKey);
    game = Logic.answer(game, wrong, 1).state;
    assert.equal(game.errors, 1);
    const out = Logic.answer(game, round.answerKey, 2);
    assert.equal(out.result, 'correct');
    assert.equal(out.state.firstTry, 0);
  });
});
