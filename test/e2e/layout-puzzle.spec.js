// No "Quebra-cabeça", o quadro, a palavra, as peças da bandeja, a fileira de estrelas e a Mia precisam
// caber em qualquer tela, sem rolar e sem se sobrepor; e as peças têm de ser grandes o bastante para o dedo.
const { test, expect } = require('./fixtures');

test.use({ gameId: 'puzzle' });

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

// Menor lado (px) de uma peça na bandeja. Em celular pequeno o quadro é pequeno (~140 px) e as peças
// da bandeja são maiores que os lugares da grade (até 1,5 vez): 16 peças numa bandeja de ~200 px de
// altura ficam com ~45 px de lado, o menor que o dedo ainda acerta bem.
const MIN_PIECE = { 1: 56, 2: 56, 3: 56, 4: 48, 5: 44, 6: 44 };

async function checkLayout(game, viewport, level) {
  await game.settled();
  const header = await game.page.locator('#header').boundingBox();
  const mia = await game.page.locator('#mia').boundingBox();
  const board = await game.page.locator('#board').boundingBox();
  const word = await game.page.locator('#word').boundingBox();
  const slots = await boxesOf(game.page.locator('.slot'));
  const pieces = await boxesOf(game.loosePieces());
  const cells = await boxesOf(game.page.locator('#tray .cell'));

  const inside = (box, what, min) => {
    expect(box.x, `${what} cortado à esquerda`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${what} cortado à direita`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y, `${what} debaixo do cabeçalho`).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(box.y + box.height, `${what} cortado embaixo`).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(Math.min(box.width, box.height), `${what} pequeno demais`).toBeGreaterThanOrEqual(min);
    expect(overlaps(box, mia), `${what} em cima da Mia`).toBe(false);
  };

  inside(board, 'quadro', 100);
  expect(Math.abs(board.width - board.height), 'o quadro não é quadrado').toBeLessThanOrEqual(1);
  inside(word, 'palavra', 20);
  expect(overlaps(word, board), 'palavra em cima do quadro').toBe(false);
  for (const slot of slots) {
    expect(slot.x).toBeGreaterThanOrEqual(board.x - 1);
    expect(slot.x + slot.width).toBeLessThanOrEqual(board.x + board.width + 1);
    expect(slot.y).toBeGreaterThanOrEqual(board.y - 1);
    expect(slot.y + slot.height).toBeLessThanOrEqual(board.y + board.height + 1);
  }
  for (const piece of pieces) {
    inside(piece, 'peça', MIN_PIECE[level]);
    expect(overlaps(piece, board), 'peça em cima do quadro').toBe(false);
    expect(overlaps(piece, word), 'peça em cima da palavra').toBe(false);
  }
  // as peças da bandeja têm a proporção do lugar na grade (o desenho não se deforma)
  for (const piece of pieces) {
    const ratio = piece.width / piece.height;
    const expected = slots[0].width / slots[0].height;
    expect(Math.abs(ratio - expected), 'a peça não tem a proporção do lugar').toBeLessThanOrEqual(0.08);
  }
  for (const list of [pieces, cells]) {
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

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(name, () => {
    test.use({ viewport });

    for (const level of [1, 2, 3, 4, 5, 6]) {
      test(`nível ${level}: tudo cabe, sem rolar e sem se sobrepor`, async ({ game }) => {
        await game.open({ level });
        await checkLayout(game, viewport, level);

        // cada desenho é uma grade nova: confere todos os da partida
        for (let i = 1; i < game.plan.rounds.length; i++) {
          await game.solveRound();
          await checkLayout(game, viewport, level);
        }
      });
    }

    for (const level of [3, 6]) {
      test(`nível ${level}: montado, a palavra aparece dentro da tela`, async ({ game }) => {
        await game.open({ level });
        for (const piece of game.tray()) await game.placeRight(piece);
        await game.settled();
        const word = await game.page.locator('#word').boundingBox();
        await expect(game.page.locator('#word')).toBeVisible();
        expect(word.x).toBeGreaterThanOrEqual(-0.5);
        expect(word.x + word.width).toBeLessThanOrEqual(viewport.width + 0.5);
        // o texto da palavra cabe na largura do quadro
        const fits = await game.page.evaluate(() => {
          const w = document.getElementById('word');
          return w.scrollWidth <= w.clientWidth + 1;
        });
        expect(fits, 'a palavra não cabe').toBe(true);
      });
    }
  });
}

test('o jogo se refaz ao girar o aparelho, e ainda dá para arrastar', async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await game.open({ level: 3 });
  const portrait = await page.locator('#board').boundingBox();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await page.locator('#board').boundingBox()).x).not.toBe(portrait.x);
  await checkLayout(game, { width: 844, height: 390 }, 3);

  await game.placeRight(game.tray()[0]);
  await expect(game.page.locator('.slot.filled')).toHaveCount(1);
});
