// No "Montar a palavra", o desenho, as lacunas, as peças e a Mia precisam caber em qualquer tela,
// sem rolar e sem se sobrepor; e as peças e lacunas têm de ser grandes o bastante para arrastar com o dedo.
const { test, expect } = require('./fixtures');

test.use({ gameId: 'build-word' });

const VIEWPORTS = {
  'celular pequeno (320×568)': { width: 320, height: 568 },
  'celular (360×640)': { width: 360, height: 640 },
  'celular alto (412×915)': { width: 412, height: 915 },
  'celular paisagem (844×390)': { width: 844, height: 390 },
  'tablet (800×1280)': { width: 800, height: 1280 },
  'tablet paisagem (1280×800)': { width: 1280, height: 800 },
};

const overlaps = (a, b) =>
  a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

const boxesOf = (locator) =>
  locator.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );

// Lado mínimo (px) de uma peça ou lacuna: o dedo de uma criança de 5 anos
const MIN_TILE = 56;

async function checkLayout(game, viewport) {
  // as animações (CSS) rodam em tempo real: mede com tudo parado
  await game.settled();
  const header = await game.page.locator('#header').boundingBox();
  const mia = await game.page.locator('#mia').boundingBox();
  const picture = await game.page.locator('#picture').boundingBox();
  const slots = await boxesOf(game.page.locator('.slot'));
  const tiles = await boxesOf(game.looseTiles());
  const cells = await boxesOf(game.page.locator('#tray .cell'));

  const inside = (box, what, min) => {
    expect(box.x, `${what} cortado à esquerda`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${what} cortado à direita`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y, `${what} debaixo do cabeçalho`).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(box.y + box.height, `${what} cortado embaixo`).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(box.width, `${what} pequeno demais`).toBeGreaterThanOrEqual(min);
    expect(box.height, `${what} baixo demais`).toBeGreaterThanOrEqual(min);
    expect(overlaps(box, mia), `${what} em cima da Mia`).toBe(false);
  };

  inside(picture, 'desenho', 60);
  for (const slot of slots) {
    inside(slot, 'lacuna', MIN_TILE);
    expect(overlaps(slot, picture), 'lacuna em cima do desenho').toBe(false);
  }
  for (const tile of tiles) {
    inside(tile, 'peça', MIN_TILE);
    expect(overlaps(tile, picture), 'peça em cima do desenho').toBe(false);
    for (const slot of slots) expect(overlaps(tile, slot), 'peça em cima de uma lacuna').toBe(false);
  }
  // a peça e a lacuna têm o mesmo tamanho (é para a peça caber certinho)
  for (const tile of tiles) {
    expect(Math.abs(tile.width - slots[0].width), 'peça e lacuna de tamanhos diferentes').toBeLessThanOrEqual(1);
    expect(Math.abs(tile.width - tile.height)).toBeLessThanOrEqual(1);
  }
  // uma peça não esconde a outra, nem uma lacuna a outra
  for (const list of [tiles, slots, cells]) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i], list[j]), `itens ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }
  // cada peça está na sua casa da bandeja
  expect(cells.length).toBeGreaterThanOrEqual(tiles.length);

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

        // os desenhos e as palavras mudam: confere todas as 6 da partida (no nível com mais peças de cada grupo)
        if (level === 3 || level === 6) {
          for (let i = 1; i < game.plan.total; i++) {
            await game.solveRound();
            await checkLayout(game, viewport);
          }
        }
      });
    }

    test('com as lacunas preenchidas, a palavra continua dentro da tela', async ({ game }) => {
      await game.open({ level: 4 });
      const round = game.plan.rounds[0];
      for (let slot = 0; slot < round.syllables.length; slot++) await game.placeRight(slot);
      await game.settled();
      const slots = await boxesOf(game.page.locator('.slot'));
      for (const slot of slots) {
        expect(slot.x).toBeGreaterThanOrEqual(-0.5);
        expect(slot.x + slot.width).toBeLessThanOrEqual(viewport.width + 0.5);
      }
      for (const tile of await boxesOf(game.page.locator('.slot .tile'))) {
        const owner = slots.find((s) => overlaps(s, tile));
        expect(owner, 'a peça encaixada está dentro de uma lacuna').toBeTruthy();
      }
    });
  });
}

test('o jogo se refaz ao girar o aparelho', async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await game.open({ level: 5 });
  const portrait = await page.locator('#picture').boundingBox();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await page.locator('#picture').boundingBox()).x).not.toBe(portrait.x);
  await checkLayout(game, { width: 844, height: 390 });

  // e ainda dá para arrastar depois de girar
  await game.placeRight(0);
  await expect(game.slot(0)).toHaveClass(/filled/);
});
