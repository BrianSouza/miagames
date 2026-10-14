// Nos jogos de responder, a Mia e as figuras precisam caber em qualquer tela
// (celular pequeno, retrato, paisagem e tablet), sem rolar e sem se sobrepor.
const { test, expect } = require('./fixtures');

const QUIZ_GAMES = ['which-letter'];

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

for (const gameId of QUIZ_GAMES) {
  test.describe(gameId, () => {
    test.use({ gameId });

    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test.describe(name, () => {
        test.use({ viewport });

        for (const difficulty of ['easy', 'medium', 'hard']) {
          test(`${difficulty}: as figuras e a Mia cabem, sem rolar e sem se sobrepor`, async ({ game }) => {
            await game.open({ difficulty });

            const header = await game.page.locator('#header').boundingBox();
            const mia = await game.page.locator('#mia').boundingBox();
            const options = await game.options().evaluateAll((els) =>
              els.map((e) => {
                const r = e.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              }),
            );
            expect(options.length).toBeGreaterThanOrEqual(3);

            for (const box of options) {
              expect(box.x, 'figura cortada à esquerda').toBeGreaterThanOrEqual(0);
              expect(box.x + box.width, 'figura cortada à direita').toBeLessThanOrEqual(viewport.width);
              expect(box.y, 'figura debaixo do cabeçalho').toBeGreaterThanOrEqual(header.y + header.height - 1);
              expect(box.y + box.height, 'figura cortada embaixo').toBeLessThanOrEqual(viewport.height);
              expect(box.width, 'figura pequena demais para um dedo de 5 anos').toBeGreaterThanOrEqual(72);
              expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
              expect(overlaps(box, mia), 'figura em cima da Mia').toBe(false);
            }
            // todas do mesmo tamanho e sem se sobrepor entre si
            expect(new Set(options.map((o) => Math.round(o.width))).size).toBe(1);
            for (let i = 0; i < options.length; i++) {
              for (let j = i + 1; j < options.length; j++) {
                expect(overlaps(options[i], options[j]), `figuras ${i} e ${j} se sobrepõem`).toBe(false);
              }
            }

            const overflow = await game.page.evaluate(() => ({
              x: document.documentElement.scrollWidth - window.innerWidth,
              y: document.documentElement.scrollHeight - window.innerHeight,
            }));
            expect(overflow.x).toBeLessThanOrEqual(0);
            expect(overflow.y).toBeLessThanOrEqual(0);
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
