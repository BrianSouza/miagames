// No "Quarto da Mia", o quarto, a bandeja de móveis e as setas precisam caber em qualquer tela, sem rolar
// e sem se sobrepor; os móveis da bandeja têm de ser grandes o bastante para o dedo, e tudo que está no
// quarto (móveis e a Mia) fica DENTRO dele.
const { test, expect } = require('./fixtures');
const Room = require('../../assets/games/mia-room/room-logic.js');

test.use({ gameId: 'mia-room' });

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

const MIN_SOURCE = 56;   // o móvel da bandeja: o dedo de uma criança de 5 anos
const MIN_ARROW = 48;

/** Um quarto cheio, com os móveis espalhados (a ordem e as posições variam, de um jeito previsível) */
const fullRoom = () =>
  Array.from({ length: Room.MAX_ITEMS }, (_, i) => ({
    id: ['bed', 'rug', 'plant', 'table', 'lamp', 'chest', 'frame', 'shelf', 'chair', 'yarn', 'bowl', 'clock', 'tent'][i % 13],
    x: ((i * 37) % 100) / 100,
    y: ((i * 53) % 100) / 100,
  }));

async function checkLayout(game, viewport, minSources = 4) {
  await game.settled();
  const header = await game.page.locator('#header').boundingBox();
  const room = await game.room().boundingBox();
  const tray = await game.page.locator('#tray-area').boundingBox();
  const sources = await boxesOf(game.page.locator('#tray .source'));
  const cells = await boxesOf(game.page.locator('#tray .cell'));
  const arrows = await boxesOf(game.page.locator('.page-btn'));
  const trayInner = await game.page.locator('#tray').boundingBox();

  const inside = (box, what) => {
    expect(box.x, `${what} cortado à esquerda`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${what} cortado à direita`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y, `${what} debaixo do cabeçalho`).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(box.y + box.height, `${what} cortado embaixo`).toBeLessThanOrEqual(viewport.height + 0.5);
  };

  inside(room, 'quarto');
  inside(tray, 'bandeja');
  expect(overlaps(room, tray), 'o quarto e a bandeja se sobrepõem').toBe(false);
  expect(room.width, 'quarto estreito demais').toBeGreaterThanOrEqual(150);
  expect(room.height, 'quarto baixo demais').toBeGreaterThanOrEqual(150);

  // em pé, a bandeja fica embaixo do quarto; deitado, ao lado (à direita)
  if (viewport.width > viewport.height) expect(tray.x).toBeGreaterThanOrEqual(room.x + room.width - 1);
  else expect(tray.y).toBeGreaterThanOrEqual(room.y + room.height - 1);

  // há móveis na página, do tamanho do dedo, dentro da bandeja e sem se sobrepor
  expect(sources.length, 'bandeja vazia').toBeGreaterThanOrEqual(minSources);
  for (const s of sources) {
    expect(s.width, 'móvel da bandeja pequeno demais').toBeGreaterThanOrEqual(MIN_SOURCE);
    expect(s.height).toBeGreaterThanOrEqual(MIN_SOURCE);
    expect(s.x).toBeGreaterThanOrEqual(trayInner.x - 1);
    expect(s.x + s.width).toBeLessThanOrEqual(trayInner.x + trayInner.width + 1);
    expect(s.y).toBeGreaterThanOrEqual(trayInner.y - 1);
    expect(s.y + s.height).toBeLessThanOrEqual(trayInner.y + trayInner.height + 1);
    inside(s, 'móvel da bandeja');
  }
  for (const list of [sources, cells]) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i], list[j]), `itens ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }

  // as setas: do tamanho do dedo, dentro da tela e fora da bandeja e do quarto
  expect(arrows).toHaveLength(2);
  for (const a of arrows) {
    expect(a.width, 'seta pequena').toBeGreaterThanOrEqual(MIN_ARROW);
    expect(a.height).toBeGreaterThanOrEqual(MIN_ARROW);
    inside(a, 'seta');
    expect(overlaps(a, room), 'seta em cima do quarto').toBe(false);
    for (const s of sources) expect(overlaps(a, s), 'seta em cima de um móvel').toBe(false);
  }

  // tudo que está no quarto está DENTRO dele
  for (const box of await boxesOf(game.page.locator('#room .actor'))) {
    expect(box.x, 'ator fora do quarto (esquerda)').toBeGreaterThanOrEqual(room.x - 1);
    expect(box.y, 'ator fora do quarto (em cima)').toBeGreaterThanOrEqual(room.y - 1);
    expect(box.x + box.width, 'ator fora do quarto (direita)').toBeLessThanOrEqual(room.x + room.width + 1);
    expect(box.y + box.height, 'ator fora do quarto (embaixo)').toBeLessThanOrEqual(room.y + room.height + 1);
    expect(box.width, 'ator pequeno demais para ver').toBeGreaterThanOrEqual(24);
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

    test('o quarto arrumado da primeira vez: tudo cabe, sem rolar e sem se sobrepor', async ({ game }) => {
      await game.open();
      await checkLayout(game, viewport);
    });

    test('o quarto cheio (24 peças) e todos os móveis abertos: tudo continua dentro do quarto', async ({ game }) => {
      await game.open({ totalStars: 999, state: { items: fullRoom() } });
      await expect(game.items()).toHaveCount(Room.MAX_ITEMS);
      await checkLayout(game, viewport);
    });

    test('cada página da bandeja cabe, e a última também', async ({ game }) => {
      await game.open({ totalStars: 999 });
      const next = game.page.locator('#page-next');
      await checkLayout(game, viewport);
      while (await next.isEnabled()) {
        await next.click();
        await checkLayout(game, viewport, 1);   // a última página pode ter só um móvel (13 não divide por 4)
      }
    });

    test('dá para pôr um móvel de cada tamanho e ele fica dentro do quarto', async ({ game }) => {
      await game.open({ totalStars: 999, state: { items: [] } });
      for (const id of ['bed', 'tent', 'yarn']) {
        await game.dragToRoom(await game.reveal(id), 0.5, 0.95);
        await game.dragToRoom(await game.reveal(id), 0.02, 0.05);
      }
      await expect(game.items()).toHaveCount(6);
      await checkLayout(game, viewport);
    });
  });
}

test('o jogo se refaz ao girar o aparelho, e ainda dá para arrastar', async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await game.open({ totalStars: 999 });
  const portrait = await game.room().boundingBox();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await game.room().boundingBox()).width).not.toBe(portrait.width);
  await checkLayout(game, { width: 844, height: 390 });

  const before = await game.items().count();
  await game.dragToRoom(await game.reveal('lamp'), 0.5, 0.5);
  await expect(game.items()).toHaveCount(before + 1);
});
