// O tabuleiro precisa caber em qualquer tela: celular pequeno, retrato,
// paisagem e tablet. O tamanho das cartas considera largura E altura.
const { test, expect } = require('./fixtures');

const VIEWPORTS = {
  'celular pequeno (320×568)': { width: 320, height: 568 },
  'celular (360×640)': { width: 360, height: 640 },
  'celular alto (412×915)': { width: 412, height: 915 },
  'celular paisagem (844×390)': { width: 844, height: 390 },
  'tablet (800×1280)': { width: 800, height: 1280 },
  'tablet paisagem (1280×800)': { width: 1280, height: 800 },
};

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(name, () => {
    test.use({ viewport });

    for (const level of [1, 2, 3, 4, 5, 6]) {
      test(`nível ${level}: o tabuleiro cabe, sem rolar e sem cortar cartas`, async ({ game }) => {
        await game.open({ level });

        const container = await game.page.locator('#board-container').boundingBox();
        const board = await game.page.locator('#board').boundingBox();
        expect(board.x).toBeGreaterThanOrEqual(0);
        expect(board.x + board.width).toBeLessThanOrEqual(viewport.width);
        expect(board.y).toBeGreaterThanOrEqual(container.y - 1);
        expect(board.y + board.height).toBeLessThanOrEqual(container.y + container.height + 1);

        const card = await game.cards().first().boundingBox();
        expect(card.width, 'cartas com tamanho de toque razoável').toBeGreaterThanOrEqual(40);

        const overflow = await game.page.evaluate(() => ({
          x: document.documentElement.scrollWidth - window.innerWidth,
          y: document.documentElement.scrollHeight - window.innerHeight,
        }));
        expect(overflow.x).toBeLessThanOrEqual(0);
        expect(overflow.y).toBeLessThanOrEqual(0);
      });
    }

    test('as cartas têm o mesmo tamanho e são quadradas', async ({ game }) => {
      await game.open({ level: 6 });

      const sizes = new Set();
      for (const card of await game.cards().all()) {
        const box = await card.boundingBox();
        expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
        sizes.add(Math.round(box.width));
      }
      expect(sizes.size).toBe(1);
    });
  });
}

test.describe('tela redimensionada', () => {
  test('o tabuleiro se ajusta ao girar o aparelho', async ({ game, page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await game.open({ level: 6 });
    const portrait = (await game.cards().first().boundingBox()).width;

    await page.setViewportSize({ width: 844, height: 390 });
    await expect
      .poll(async () => (await game.cards().first().boundingBox()).width)
      .not.toBe(portrait);

    const board = await page.locator('#board').boundingBox();
    expect(board.y + board.height).toBeLessThanOrEqual(390);
  });
});
