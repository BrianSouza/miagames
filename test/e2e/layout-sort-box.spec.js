// No "Na caixa certa", as caixas (ou o prato), a pilha de peças, a fileira de estrelas e a Mia precisam
// caber em qualquer tela, sem rolar e sem se sobrepor; e as peças têm de ser grandes o bastante para o dedo.
const { test, expect } = require('./fixtures');

test.use({ gameId: 'sort-box' });

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

// Lado mínimo (px) de uma peça na pilha: o dedo de uma criança de 5 anos
const MIN_ITEM = 56;
const MIN_BOX = 72;

async function checkLayout(game, viewport) {
  await game.settled();
  const header = await game.page.locator('#header').boundingBox();
  const mia = await game.page.locator('#mia').boundingBox();
  const boxes = await boxesOf(game.page.locator('.box'));
  const items = await boxesOf(game.looseItems());
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

  for (const box of boxes) inside(box, 'caixa', MIN_BOX);
  for (const item of items) {
    inside(item, 'peça', MIN_ITEM);
    expect(Math.abs(item.width - item.height)).toBeLessThanOrEqual(1);
    for (const box of boxes) expect(overlaps(item, box), 'peça em cima de uma caixa').toBe(false);
  }
  for (const list of [items, boxes, cells]) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i], list[j]), `itens ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }

  // a fileira de estrelas de progresso cabe no cabeçalho, sem invadir os botões
  const dots = await boxesOf(game.page.locator('#progress .dot'));
  const progress = await game.page.locator('#progress').boundingBox();
  for (const dot of dots) {
    expect(dot.x, 'estrela de progresso fora da fileira (esquerda)').toBeGreaterThanOrEqual(progress.x - 1);
    expect(dot.x + dot.width, 'estrela de progresso fora da fileira (direita)').toBeLessThanOrEqual(progress.x + progress.width + 1);
  }
  for (const button of await boxesOf(game.page.locator('#header .icon-btn'))) {
    for (const dot of dots) expect(overlaps(dot, button), 'estrela de progresso em cima de um botão').toBe(false);
  }

  const overflow = await game.page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(0);
}

/** As peças já colocadas ficam dentro da caixa delas, sem sair da tela */
async function checkChips(game, viewport) {
  await game.settled();
  for (const box of await game.page.locator('.box').all()) {
    const b = await box.boundingBox();
    for (const chip of await box.locator('.item.placed').all()) {
      const c = await chip.boundingBox();
      expect(c.x, 'peça fora da caixa (esquerda)').toBeGreaterThanOrEqual(b.x - 0.5);
      expect(c.x + c.width, 'peça fora da caixa (direita)').toBeLessThanOrEqual(b.x + b.width + 0.5);
      expect(c.y, 'peça fora da caixa (em cima)').toBeGreaterThanOrEqual(b.y - 0.5);
      expect(c.y + c.height, 'peça fora da caixa (embaixo)').toBeLessThanOrEqual(b.y + b.height + 0.5);
      expect(c.width, 'peça encaixada pequena demais para ver').toBeGreaterThanOrEqual(22);
    }
  }
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(name, () => {
    test.use({ viewport });

    for (const level of [1, 2, 3, 4, 5, 6]) {
      test(`nível ${level}: tudo cabe, sem rolar e sem se sobrepor`, async ({ game }) => {
        await game.open({ level });
        await checkLayout(game, viewport);

        // nos níveis de dar, cada pedido tem uma pilha diferente: confere todas
        if (level === 3 || level === 5) {
          for (let i = 1; i < game.plan.rounds.length; i++) {
            await game.solveRound();
            await checkLayout(game, viewport);
          }
        }
      });
    }

    for (const level of [1, 4, 5, 6]) {
      test(`nível ${level}: com tudo no lugar, as peças ficam dentro das caixas`, async ({ game }) => {
        await game.open({ level });
        const round = game.round();
        for (const item of game.wanted().slice(0, round.goal)) await game.placeRight(item);
        await checkChips(game, viewport);
      });
    }
  });
}

test('o jogo se refaz ao girar o aparelho, e ainda dá para arrastar', async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await game.open({ level: 4 });
  const portrait = await page.locator('#boxes').boundingBox();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await page.locator('#boxes').boundingBox()).x).not.toBe(portrait.x);
  await checkLayout(game, { width: 844, height: 390 });

  const item = game.wanted()[0];
  await game.placeRight(item);
  await expect(game.box(item.target).locator(`.item[data-item="${item.id}"]`)).toHaveCount(1);
});
