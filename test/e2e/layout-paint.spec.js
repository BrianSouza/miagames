// No Colorir, a forma, o desenho da palavra, a Mia e a paleta precisam caber em qualquer tela,
// sem rolar e sem se sobrepor; e a letra tem de ficar grande o bastante para pintar com o dedo.
const { test, expect } = require('./fixtures');

test.use({ gameId: 'paint' });

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

/** O retângulo (em px de tela) que a letra ocupa de verdade, lido da máscara */
function letterBox(page) {
  return page.evaluate(() => {
    const mask = document.getElementById('mask');
    const d = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
    let minX = mask.width, maxX = 0, minY = mask.height, maxY = 0;
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        if (d[(y * mask.width + x) * 4 + 3] > 127) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const r = document.getElementById('outline').getBoundingClientRect();
    const s = r.width / mask.width;
    return { x: r.left + minX * s, y: r.top + minY * s, width: (maxX - minX) * s, height: (maxY - minY) * s };
  });
}

// Altura mínima da letra (px): letras soltas, 60; palavras de 6 letras em tela estreita ficam menores
// (~50 px em 320–360 px de largura), o que é inerente a caber numa linha só.
const MIN_LETTER = { letter: 60, word: 44 };

async function checkLayout(game, viewport) {
  // as animações (CSS) rodam em tempo real: mede com tudo parado
  await game.page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  const header = await game.page.locator('#header').boundingBox();
  const mia = await game.page.locator('#mia').boundingBox();
  const wrap = await game.page.locator('#canvas-wrap').boundingBox();
  const swatches = await boxesOf(game.page.locator('.swatch'));
  const picture = (await game.page.locator('#picture').isVisible())
    ? await game.page.locator('#picture').boundingBox()
    : null;
  const letter = await letterBox(game.page);

  const inside = (box, what, min) => {
    expect(box.x, `${what} cortado à esquerda`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${what} cortado à direita`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y, `${what} debaixo do cabeçalho`).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(box.y + box.height, `${what} cortado embaixo`).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(box.width, `${what} pequeno demais`).toBeGreaterThanOrEqual(min);
    expect(overlaps(box, mia), `${what} em cima da Mia`).toBe(false);
  };

  inside(wrap, 'área de pintura', 100);
  const kind = (await game.page.locator('#picture').isVisible()) ? 'word' : 'letter';
  expect(letter.height, 'a letra é pequena para pintar com o dedo').toBeGreaterThanOrEqual(MIN_LETTER[kind]);
  expect(letter.width).toBeGreaterThanOrEqual(40);
  // a letra fica dentro da área de pintura
  expect(letter.x).toBeGreaterThanOrEqual(wrap.x - 1);
  expect(letter.x + letter.width).toBeLessThanOrEqual(wrap.x + wrap.width + 1);
  expect(letter.y).toBeGreaterThanOrEqual(wrap.y - 1);
  expect(letter.y + letter.height).toBeLessThanOrEqual(wrap.y + wrap.height + 1);

  for (const box of swatches) {
    inside(box, 'cor', 56);
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
    expect(overlaps(box, wrap), 'cor em cima da área de pintura').toBe(false);
  }
  for (let i = 0; i < swatches.length; i++) {
    for (let j = i + 1; j < swatches.length; j++) {
      expect(overlaps(swatches[i], swatches[j]), `cores ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }
  if (picture) {
    inside(picture, 'desenho', 40);
    expect(overlaps(picture, wrap), 'desenho em cima da área de pintura').toBe(false);
    for (const box of swatches) expect(overlaps(picture, box)).toBe(false);
  }

  const overflow = await game.page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(0);
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(name, () => {
    test.use({ viewport });

    for (const level of [1, 2, 3, 4, 5, 6]) {
      test(`nível ${level}: tudo cabe, sem rolar e sem se sobrepor`, async ({ game }) => {
        await game.open({ level });
        await checkLayout(game, viewport);

        // nas palavras, cada uma tem um tamanho: confere todas as 5 da partida
        if (level >= 5) {
          for (let i = 1; i < game.plan.total; i++) {
            await game.finishItem();
            await checkLayout(game, viewport);
          }
        }
      });
    }
  });
}

test('a forma se refaz ao girar o aparelho', async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await game.open({ level: 3 });
  const portrait = await page.locator('#canvas-wrap').boundingBox();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await page.locator('#canvas-wrap').boundingBox()).height).not.toBe(portrait.height);
  await game.ready();
  await checkLayout(game, { width: 844, height: 390 });
});
