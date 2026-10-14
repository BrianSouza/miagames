// Base dos testes: abre o Jogo da Memória como a WebView do Flutter abriria.
//
// - A ponte `MiaGamesFlutter` é simulada: tudo que o jogo envia ao Flutter
//   (SPEAK, GAME_COMPLETE, NAVIGATE_BACK) fica em `game.messages()`.
// - O relógio é falso e pausado (page.clock): o tempo só avança quando o teste
//   manda (game.tick), então os testes são rápidos e deterministas.
// - A Web Audio é espiada: `game.notes()` conta as notas tocadas.
// - Qualquer erro de página ou recurso que falhar ao carregar derruba o teste.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test: base, expect } = require('@playwright/test');

const LOGICS = {
  'which-letter': require('../../assets/games/which-letter/which-letter-logic.js'),
  'how-many': require('../../assets/games/how-many/how-many-logic.js'),
  'missing-syllable': require('../../assets/games/missing-syllable/missing-syllable-logic.js'),
};

const gameUrl = (id) =>
  pathToFileURL(path.join(__dirname, `../../assets/games/${id}/index.html`)).href;

/** Tempo que o jogo espera antes de verificar as duas cartas (CHECK_DELAY_MS) */
const CHECK_DELAY_MS = 800;

/** Pausa de comemoração dos jogos de responder, antes da próxima rodada */
const ADVANCE_DELAY_MS = 1500;

/**
 * Gerador pseudoaleatório com semente (mulberry32). O mesmo código roda na página
 * (substituindo Math.random) e no Node, então um teste pode escolher uma semente
 * que produz o tabuleiro que quer verificar.
 */
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

/** O que todo jogo tem: abrir como a WebView do Flutter, ouvir a ponte e avançar o relógio */
class Game {
  constructor(page, problems, id) {
    this.page = page;
    this.problems = problems;
    this.id = id;
  }

  /** Abre o jogo e envia o INIT, como o Flutter faz quando a página carrega. */
  async open({ difficulty = 'easy', sound = true, best = null, seed = null } = {}) {
    await this.page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
    if (seed !== null) {
      // Tabuleiro previsível: o sorteio da página usa o mesmo gerador que o Node
      await this.page.addInitScript({
        content: `Math.random = (${prng.toString()})(${Number(seed)});`,
      });
    }
    await this.page.addInitScript(() => {
      window.__messages = [];
      window.__notes = 0;
      window.MiaGamesFlutter = {
        postMessage: (m) => window.__messages.push(JSON.parse(m)),
      };
      const Real = window.AudioContext;
      window.AudioContext = class extends Real {
        createOscillator() {
          window.__notes++;
          return super.createOscillator();
        }
      };
    });
    await this.page.goto(gameUrl(this.id));
    // Pausa o relógio: depois de install() o tempo ainda corre sozinho, o que
    // deixaria os cronômetros e prazos dependentes da velocidade da máquina.
    await this.page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
    await this.page.evaluate(
      (init) =>
        window.handleFlutterMessage({ type: 'INIT', ...init }),
      { gameId: this.id, difficulty, sound, best },
    );
    return this;
  }

  /** Mensagens enviadas ao Flutter (acumuladas desde o início) */
  messages() {
    return this.page.evaluate(() => window.__messages);
  }

  spoken() {
    return this.messages().then((all) =>
      all.filter((m) => m.type === 'SPEAK').map((m) => m.text),
    );
  }

  notes() {
    return this.page.evaluate(() => window.__notes);
  }

  /** Avança o relógio do jogo */
  tick(ms) {
    return this.page.clock.runFor(ms);
  }
}

class MemoryGame extends Game {
  constructor(page, problems) {
    super(page, problems, 'memory');
  }

  cards() {
    return this.page.locator('.card');
  }

  /** Símbolo (letra ou número) de cada carta, na ordem do tabuleiro */
  symbols() {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('.glyph')].map((g) => g.dataset.symbol),
    );
  }

  /** Índices das cartas agrupados por símbolo: [[a, b], [c, d], ...] */
  async pairs() {
    const groups = {};
    (await this.symbols()).forEach((symbol, i) => (groups[symbol] ??= []).push(i));
    return Object.values(groups);
  }

  /** Vira duas cartas e espera a verificação */
  async flipPair(a, b) {
    await this.cards().nth(a).click();
    await this.cards().nth(b).click();
    await this.tick(CHECK_DELAY_MS);
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (const [a, b] of await this.pairs()) {
      await this.flipPair(a, b);
    }
  }

  /** Dois índices de cartas de pares diferentes */
  async mismatch() {
    const [[a], [b]] = await this.pairs();
    return [a, b];
  }
}

/**
 * Jogos de responder (Qual é a letra?, Quantos tem?...): sabem a resposta certa de
 * cada rodada porque o sorteio da página usa a mesma semente que o Node.
 */
class QuizGame extends Game {
  constructor(page, problems, id) {
    super(page, problems, id);
    this.logic = LOGICS[id];
  }

  async open({ difficulty = 'easy', seed = 1, ...rest } = {}) {
    await super.open({ difficulty, seed, ...rest });
    this.plan = this.logic.createGame(difficulty, { random: prng(seed) });
    return this;
  }

  options() {
    return this.page.locator('.option');
  }

  option(symbol) {
    return this.page.locator(`.option[data-symbol="${symbol}"]`);
  }

  /** Quantas rodadas já foram acertadas */
  solvedCount() {
    return this.page.locator('#progress .dot.done').count();
  }

  /** A rodada em que a criança está, segundo o sorteio com semente */
  async currentRound() {
    return this.plan.rounds[await this.solvedCount()];
  }

  /** A chave da figura certa da rodada atual ("B", "7"...) */
  async correctSymbol() {
    return (await this.currentRound()).answerKey;
  }

  /** A chave de uma figura errada da rodada atual (a n-ésima) */
  async wrongSymbol(n = 0) {
    const round = await this.currentRound();
    return round.optionKeys.filter((k) => k !== round.answerKey)[n];
  }

  /**
   * Acerta a rodada atual e espera a pausa de comemoração. `force`: depois de 2 erros
   * a resposta certa pulsa sem parar, e o Playwright esperaria ela "ficar parada".
   */
  async answerRight() {
    await this.option(await this.correctSymbol()).click({ force: true });
    await this.tick(ADVANCE_DELAY_MS);
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (let i = 0; i < this.plan.total; i++) await this.answerRight();
  }

  /** Acerta as rodadas até chegar à de índice `index` (0 = a primeira) */
  async goToRound(index) {
    while ((await this.solvedCount()) < index) await this.answerRight();
  }
}

const CLASSES = {
  memory: (page, problems) => new MemoryGame(page, problems),
  'which-letter': (page, problems) => new QuizGame(page, problems, 'which-letter'),
  'how-many': (page, problems) => new QuizGame(page, problems, 'how-many'),
  'missing-syllable': (page, problems) => new QuizGame(page, problems, 'missing-syllable'),
};

const test = base.extend({
  // Qual jogo abrir: `test.use({ gameId: 'which-letter' })` (o padrão é a Memória)
  gameId: ['memory', { option: true }],

  game: async ({ page, gameId }, use) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`erro na página: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`falhou ao carregar: ${r.url()}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    });

    await use(CLASSES[gameId](page, problems));

    expect(problems, 'erros de página ou recursos que não carregaram').toEqual([]);
  },
});

module.exports = { test, expect, CHECK_DELAY_MS, ADVANCE_DELAY_MS, prng };
