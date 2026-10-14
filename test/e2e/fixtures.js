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

const GAME_URL = pathToFileURL(
  path.join(__dirname, '../../assets/games/memory/index.html'),
).href;

/** Tempo que o jogo espera antes de verificar as duas cartas (CHECK_DELAY_MS) */
const CHECK_DELAY_MS = 800;

class MemoryGame {
  constructor(page, problems) {
    this.page = page;
    this.problems = problems;
  }

  /** Abre o jogo e envia o INIT, como o Flutter faz quando a página carrega. */
  async open({ difficulty = 'easy', sound = true, best = null } = {}) {
    await this.page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
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
    await this.page.goto(GAME_URL);
    // Pausa o relógio: depois de install() o tempo ainda corre sozinho, o que
    // deixaria os cronômetros e prazos dependentes da velocidade da máquina.
    await this.page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
    await this.page.evaluate(
      (init) =>
        window.handleFlutterMessage({ type: 'INIT', gameId: 'memory', ...init }),
      { difficulty, sound, best },
    );
    return this;
  }

  cards() {
    return this.page.locator('.card');
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

const test = base.extend({
  game: async ({ page }, use) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`erro na página: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`falhou ao carregar: ${r.url()}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    });

    await use(new MemoryGame(page, problems));

    expect(problems, 'erros de página ou recursos que não carregaram').toEqual([]);
  },
});

module.exports = { test, expect, CHECK_DELAY_MS };
