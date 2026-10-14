// Nos jogos de responder, a Mia, os objetos e as figuras precisam caber em qualquer
// tela (celular pequeno, retrato, paisagem e tablet), sem rolar e sem se sobrepor.
const { test, expect } = require('./fixtures');

const QUIZ_GAMES = ['which-letter', 'how-many'];

const VIEWPORTS = {
  'celular pequeno (320×568)': { width: 320, height: 568 },
  'celular (360×640)': { width: 360, height: 640 },
  'celular alto (412×915)': { width: 412, height: 915 },
  'celular paisagem (844×390)': { width: 844, height: 390 },
  'tablet (800×1280)': { width: 800, height: 1280 },
  'tablet paisagem (1280×800)': { width: 1280, height: 800 },
};

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const boxesOf = (locator) =>
  locator.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );

/** Confere a tela da rodada atual */
async function checkLayout(game, viewport) {
  const header = await game.page.locator('#header').boundingBox();
  const mia = await game.page.locator('#mia').boundingBox();
  const options = await boxesOf(game.options());
  const objects = await boxesOf(game.page.locator('.obj')); // só no Quantos tem?
  expect(options.length).toBeGreaterThanOrEqual(3);

  const inside = (box, what, minSize) => {
    expect(box.x, `${what} cortado à esquerda`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${what} cortado à direita`).toBeLessThanOrEqual(viewport.width);
    expect(box.y, `${what} debaixo do cabeçalho`).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(box.y + box.height, `${what} cortado embaixo`).toBeLessThanOrEqual(viewport.height);
    expect(box.width, `${what} pequeno demais`).toBeGreaterThanOrEqual(minSize);
    expect(overlaps(box, mia), `${what} em cima da Mia`).toBe(false);
  };

  for (const box of options) {
    inside(box, 'figura de resposta', 72); // dedo de 5 anos
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  }
  expect(new Set(options.map((o) => Math.round(o.width))).size, 'figuras de tamanhos diferentes').toBe(1);
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      expect(overlaps(options[i], options[j]), `figuras ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }

  for (const box of objects) {
    inside(box, 'objeto', 40);
    for (const option of options) {
      expect(overlaps(box, option), 'objeto em cima de uma resposta').toBe(false);
    }
  }
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      expect(overlaps(objects[i], objects[j]), `objetos ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }

  const overflow = await game.page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(0);
}

for (const gameId of QUIZ_GAMES) {
  test.describe(gameId, () => {
    test.use({ gameId });

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test.describe(name, () => {
        test.use({ viewport });

        for (const difficulty of ['easy', 'medium', 'hard']) {
          test(`${difficulty}: tudo cabe, sem rolar e sem se sobrepor`, async ({ game }) => {
            await game.open({ difficulty });
            await checkLayout(game, viewport);

            // o pior caso: a rodada com mais objetos para contar (no Quantos tem?, até 20)
            const counts = game.plan.rounds.map((r) => r.count || 0);
            const most = Math.max(...counts);
            if (most > 0) {
              await game.goToRound(counts.indexOf(most));
              await checkLayout(game, viewport);
            }
          });
        }
      });
    }

    test('as figuras se reajustam ao girar o aparelho', async ({ game, page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await game.open({ difficulty: 'hard' });
      const portrait = (await game.options().first().boundingBox()).width;

      await page.setViewportSize({ width: 844, height: 390 });
      await expect
        .poll(async () => (await game.options().first().boundingBox()).width)
        .not.toBe(portrait);
    });
  });
}
