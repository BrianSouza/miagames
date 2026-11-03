// "Quarto da Mia": jogo livre. A criança arrasta móveis da bandeja para o quarto, muda de lugar,
// guarda, desfaz, e o Flutter guarda o quarto (SAVE_STATE). Sem erro, estrela nem fim.
const { test, expect, FURNITURE } = require('./fixtures');
const Room = require('../../assets/games/mia-room/room-logic.js');

test.use({ gameId: 'mia-room' });

const SAVE_DELAY = 500;

/** O centro esperado de um ator: a fração pedida, empurrada para dentro do quarto (o ator inteiro cabe) */
async function expectedCenter(game, fx, fy, sizeFraction) {
  const r = await game.room().boundingBox();
  const side = Math.max(24, Math.round(Math.min(r.width, r.height) * sizeFraction));
  const half = side / 2;
  return {
    x: Math.min(Math.max(fx * r.width, half), r.width - half) / r.width,
    y: Math.min(Math.max(fy * r.height, half), r.height - half) / r.height,
  };
}

const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

/** Todo o ator está dentro do quarto? */
async function insideRoom(game, locator) {
  const r = await game.room().boundingBox();
  const b = await locator.boundingBox();
  return b.x >= r.x - 1 && b.y >= r.y - 1 && b.x + b.width <= r.x + r.width + 1 && b.y + b.height <= r.y + r.height + 1;
}

const ids = (game) => game.items().evaluateAll((els) => els.map((e) => e.dataset.id).sort());

test.describe('o quarto', () => {
  test('abre arrumado na primeira vez: caminha, tapete, vaso e a Mia, tudo dentro do quarto', async ({ game }) => {
    await game.open();

    expect(await ids(game)).toEqual(['bed', 'plant', 'rug']);
    for (const item of await game.items().all()) expect(await insideRoom(game, item)).toBe(true);
    await expect(game.mia()).toBeVisible();
    expect(await insideRoom(game, game.mia())).toBe(true);
    for (const id of ['bed', 'plant', 'rug']) {
      await expect(game.items().locator('img').first()).toHaveAttribute('src', /^img\/\w+\.svg$/);
      const loaded = await game.page.locator(`.item[data-id="${id}"] img`).evaluate((img) => img.complete && img.naturalWidth > 0);
      expect(loaded, `desenho de ${id}`).toBe(true);
    }
  });

  test('a Mia usa a roupa que o Flutter mandou, por cima dela', async ({ game }) => {
    await game.open({ outfit: ['crown', 'glasses'] });

    const outfits = game.mia().locator('img.outfit');
    await expect(outfits).toHaveCount(2);
    await expect(outfits.nth(0)).toHaveAttribute('src', /outfit_crown\.svg$/);
    expect(await outfits.evaluateAll((els) => els.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
    const mia = await game.mia().locator('img.mia:not(.outfit)').boundingBox();
    for (const o of await outfits.all()) {
      const b = await o.boundingBox();
      expect(Math.abs(b.width - mia.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(b.x - mia.x)).toBeLessThanOrEqual(1);
    }
  });

  test('sem roupa, a Mia fica sem acessórios', async ({ game }) => {
    await game.open();
    await expect(game.mia().locator('img.outfit')).toHaveCount(0);
  });

  test('é um jogo livre: sem estrelas de progresso e sem tela de resultado', async ({ game }) => {
    await game.open();
    await expect(game.page.locator('#progress .dot')).toHaveCount(0);
    await expect(game.page.locator('#result-modal')).toHaveCount(0);
  });

  test('o botão do cabeçalho é "Desfazer" e tem tamanho de toque', async ({ game }) => {
    await game.open();
    const button = game.page.locator('#btn-reset');
    await expect(button).toHaveAttribute('aria-label', 'Desfazer');
    const b = await button.boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(56);
  });

  test('o quarto salvo volta nos mesmos lugares, e quem está mais embaixo aparece na frente', async ({ game }) => {
    await game.open({
      totalStars: 999,
      state: {
        items: [
          { id: 'lamp', x: 0.3, y: 0.3 },
          { id: 'chair', x: 0.6, y: 0.8 },
        ],
        mia: { x: 0.45, y: 0.55 },
      },
    });

    expect(await ids(game)).toEqual(['chair', 'lamp']);
    for (const [id, fx, fy] of [['lamp', 0.3, 0.3], ['chair', 0.6, 0.8]]) {
      const want = await expectedCenter(game, fx, fy, Room.sizeOf(id));
      const got = await game.fractionOf(game.page.locator(`.item[data-id="${id}"]`));
      expect(near(got.x, want.x), `${id} x`).toBe(true);
      expect(near(got.y, want.y), `${id} y`).toBe(true);
    }
    const mia = await game.fractionOf(game.mia());
    const wantMia = await expectedCenter(game, 0.45, 0.55, Room.MIA_SIZE);
    expect(near(mia.x, wantMia.x) && near(mia.y, wantMia.y)).toBe(true);
    const z = (id) => game.page.locator(`.item[data-id="${id}"]`).evaluate((e) => Number(e.style.zIndex));
    expect(await z('chair')).toBeGreaterThan(await z('lamp'));
  });

  test('um quarto salvo VAZIO continua vazio (a criança tirou tudo)', async ({ game }) => {
    await game.open({ state: { items: [], mia: { x: 0.5, y: 0.5 } } });
    await expect(game.items()).toHaveCount(0);
    await expect(game.mia()).toBeVisible();
  });

  test('móveis fechados, que não existem, ids estranhos e o que passa do limite do quarto salvo são ignorados', async ({ game }) => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: 'plant', x: (i % 10) / 10 + 0.05, y: 0.5 }));
    await game.open({
      totalStars: 0,
      state: {
        items: [
          { id: 'tent', x: 0.5, y: 0.5 },
          { id: 'fantasma', x: 0.5, y: 0.5 },
          { id: '../bed', x: 0.5, y: 0.5 },
          ...many,
        ],
      },
    });

    expect(await ids(game)).toEqual(Array(Room.MAX_ITEMS).fill('plant'));
  });

  test('o tapete fica por baixo de todo mundo, mesmo mais embaixo no quarto', async ({ game }) => {
    await game.open({ state: { items: [{ id: 'rug', x: 0.5, y: 0.95 }, { id: 'bed', x: 0.5, y: 0.3 }] } });
    const z = (id) => game.page.locator(`.item[data-id="${id}"]`).evaluate((e) => Number(e.style.zIndex));
    expect(await z('rug')).toBeLessThan(await z('bed'));
    expect(await game.mia().evaluate((e) => Number(e.style.zIndex))).toBeGreaterThan(await z('rug'));
  });
});

test.describe('a bandeja', () => {
  test('mostra os móveis na ordem do catálogo; os abertos se arrastam e os fechados têm cadeado e as estrelas', async ({ game }) => {
    await game.open({ totalStars: 5 });

    const seen = [];
    do {
      for (const id of await game.trayIds()) seen.push(id);
      if (!(await game.page.locator('#page-next').isEnabled())) break;
      await game.page.locator('#page-next').click();
    } while (true);
    expect(seen).toEqual(FURNITURE.map((f) => f.id));

    await game.page.locator('#page-prev').evaluate(() => {});
    for (const f of FURNITURE) {
      const source = await game.reveal(f.id);
      if (f.stars <= 5) {
        await expect(source, f.id).toHaveClass(/draggable/);
        await expect(source.locator('.lock')).toHaveCount(0);
      } else {
        await expect(source, f.id).toHaveClass(/locked/);
        await expect(source, f.id).not.toHaveClass(/draggable/);
        await expect(source.locator('.lock')).toHaveCount(1);
        await expect(source.locator('.need')).toHaveText(`★ ${f.stars}`);
      }
    }
  });

  test('numa tela grande todos os móveis cabem numa página só (as setas ficam desligadas)', async ({ game, page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await game.open({ totalStars: 999 });
    expect(await game.trayIds()).toEqual(FURNITURE.map((f) => f.id));
    await expect(page.locator('#page-prev')).toBeDisabled();
    await expect(page.locator('#page-next')).toBeDisabled();
  });

  test('tocar num móvel fechado diz o nome e quantas estrelas faltam (singular e plural)', async ({ game }) => {
    await game.open({ totalStars: 7 });
    const lamp = FURNITURE.find((f) => f.id === 'lamp');
    const chest = FURNITURE.find((f) => f.id === 'chest');

    await (await game.reveal('lamp')).click();
    expect((await game.spoken()).at(-1)).toBe(`${lamp.name}. Faltam ${lamp.stars - 7} estrela${lamp.stars - 7 === 1 ? '' : 's'} para abrir!`);
    expect(lamp.stars - 7).toBe(1);

    await (await game.reveal('chest')).click();
    expect((await game.spoken()).at(-1)).toBe(`${chest.name}. Faltam ${chest.stars - 7} estrelas para abrir!`);
  });

  test('um móvel fechado não se arrasta: nada entra no quarto', async ({ game }) => {
    await game.open({ totalStars: 0 });
    const before = await game.items().count();
    const source = await game.reveal('tent');

    await game.dragToRoom(source, 0.5, 0.4);

    await expect(game.items()).toHaveCount(before);
    await expect(source).toHaveClass(/locked/);
  });

  test('um toque num móvel aberto diz o nome', async ({ game }) => {
    await game.open({ totalStars: 0 });
    await (await game.reveal('bed')).click();
    expect((await game.spoken()).at(-1)).toBe('Caminha');
  });

  test('mais estrelas abrem mais móveis', async ({ game }) => {
    await game.open({ totalStars: 8 });
    for (const id of ['bed', 'rug', 'plant', 'table', 'lamp']) {
      await expect(await game.reveal(id), id).toHaveClass(/draggable/);
    }
    await expect(await game.reveal('chest')).toHaveClass(/locked/);
  });

  test('as setas viram a página: a primeira não volta, a última não avança, e nada se perde', async ({ game, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });   // celular em pé: poucos móveis por página
    await game.open({ totalStars: 999 });
    const prev = game.page.locator('#page-prev');
    const next = game.page.locator('#page-next');

    await expect(prev).toBeDisabled();
    const pages = [await game.trayIds()];
    while (await next.isEnabled()) {
      await next.click();
      pages.push(await game.trayIds());
    }
    await expect(next).toBeDisabled();
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat()).toEqual(FURNITURE.map((f) => f.id));
    // cada página (menos a última) tem a mesma quantidade
    for (const page of pages.slice(0, -1)) expect(page.length).toBe(pages[0].length);

    await prev.click();
    expect(await game.trayIds()).toEqual(pages.at(-2));
  });

  test('as setas têm nome para leitores de tela', async ({ game }) => {
    await game.open();
    await expect(game.page.locator('#page-prev')).toHaveAttribute('aria-label', 'Móveis anteriores');
    await expect(game.page.locator('#page-next')).toHaveAttribute('aria-label', 'Mais móveis');
  });
});

test.describe('pôr móveis', () => {
  test('arrastar da bandeja para o quarto põe uma cópia, no ponto onde foi solto; o móvel continua na bandeja', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    const source = await game.reveal('lamp');
    const before = await source.boundingBox();

    await game.dragToRoom(source, 0.4, 0.4);

    await expect(game.items()).toHaveCount(1);
    const lamp = game.page.locator('.item[data-id="lamp"]');
    const at = await game.fractionOf(lamp);
    const want = await expectedCenter(game, 0.4, 0.4, Room.sizeOf('lamp'));
    expect(near(at.x, want.x, 0.012), 'x').toBe(true);
    expect(near(at.y, want.y, 0.012), 'y').toBe(true);
    // a bandeja continua com o abajur, no mesmo lugar
    const after = await game.source('lamp').boundingBox();
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await expect(game.source('lamp')).toHaveClass(/draggable/);
    expect((await game.spoken()).at(-1)).toBe('Abajur!');
    expect(await game.notes()).toBeGreaterThan(0);
  });

  test('dá para pôr o mesmo móvel várias vezes', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    for (const fx of [0.2, 0.5, 0.8]) await game.dragToRoom(await game.reveal('plant'), fx, 0.5);
    await expect(game.items()).toHaveCount(3);
    expect(await ids(game)).toEqual(['plant', 'plant', 'plant']);
    const uids = await game.items().evaluateAll((els) => els.map((e) => e.dataset.uid));
    expect(new Set(uids).size).toBe(3);
  });

  test('o móvel solto perto da borda é empurrado para dentro do quarto (cabe inteiro)', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    for (const [fx, fy] of [[0.995, 0.995], [0.005, 0.005], [0.995, 0.005], [0.005, 0.995]]) {
      await game.dragToRoom(await game.reveal('bed'), fx, fy);
    }
    await expect(game.items()).toHaveCount(4);
    for (const item of await game.items().all()) expect(await insideRoom(game, item)).toBe(true);
  });

  test('soltar fora do quarto e da bandeja não põe nada', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    const header = await game.page.locator('#header').boundingBox();
    await game.dragToPoint(await game.reveal('lamp'), header.x + header.width / 2, header.y + 20);
    await game.settled();
    await expect(game.items()).toHaveCount(0);
    expect(await game.saves()).toHaveLength(0);
  });

  test('soltar na bandeja de volta não põe nada', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await game.dragToTray(await game.reveal('lamp'));
    await expect(game.items()).toHaveCount(0);
  });

  test('um toque curto num móvel da bandeja não põe nada (só diz o nome)', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await (await game.reveal('lamp')).click();
    await expect(game.items()).toHaveCount(0);
  });

  test('o quarto cheio avisa e não aceita mais; tirar um abre espaço', async ({ game }) => {
    const full = Array.from({ length: Room.MAX_ITEMS }, (_, i) => ({ id: 'plant', x: ((i % 8) + 0.5) / 8, y: 0.3 + ((i % 3) * 0.2) }));
    await game.open({ totalStars: 999, state: { items: full } });
    await expect(game.items()).toHaveCount(Room.MAX_ITEMS);

    await game.dragToRoom(await game.reveal('lamp'), 0.5, 0.5);

    await expect(game.items()).toHaveCount(Room.MAX_ITEMS);
    expect((await game.spoken()).at(-1)).toBe('O quarto está cheio! Guarde algum móvel.');

    await game.dragToTray(game.items().first());
    await expect(game.items()).toHaveCount(Room.MAX_ITEMS - 1);
    await game.dragToRoom(await game.reveal('lamp'), 0.5, 0.5);
    await expect(game.items()).toHaveCount(Room.MAX_ITEMS);
  });

  test('funciona com o dedo: eventos de ponteiro de toque', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await game.touchDrag(await game.reveal('chest'), game.room());
    await game.settled();
    await expect(game.items()).toHaveCount(1);
  });
});

test.describe('mudar de lugar, guardar e a Mia', () => {
  test('arrastar um móvel do quarto o muda de lugar (sem criar outro) e a ordem de desenho acompanha a altura', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.3, y: 0.3 }, { id: 'chair', x: 0.7, y: 0.5 }] } });
    const lamp = game.page.locator('.item[data-id="lamp"]');
    const chair = game.page.locator('.item[data-id="chair"]');
    const z = (loc) => loc.evaluate((e) => Number(e.style.zIndex));
    expect(await z(lamp)).toBeLessThan(await z(chair));

    await game.dragToRoom(lamp, 0.3, 0.85);

    await expect(game.items()).toHaveCount(2);
    const at = await game.fractionOf(lamp);
    const want = await expectedCenter(game, 0.3, 0.85, Room.sizeOf('lamp'));
    expect(near(at.y, want.y, 0.012) && near(at.x, want.x, 0.012)).toBe(true);
    expect(await z(lamp), 'mais embaixo, na frente').toBeGreaterThan(await z(chair));
  });

  test('largado fora do quarto, o móvel não se perde: fica no quarto, na borda mais perto', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.5, y: 0.5 }] } });
    const header = await game.page.locator('#header').boundingBox();

    await game.dragToPoint(game.items().first(), header.x + header.width / 2, header.y + 10);
    await game.settled();

    await expect(game.items()).toHaveCount(1);
    expect(await insideRoom(game, game.items().first())).toBe(true);
    const at = await game.fractionOf(game.items().first());
    expect(at.y).toBeLessThan(0.3);
  });

  test('arrastar um móvel do quarto para a bandeja o guarda, e a voz diz "Guardei!"', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.5, y: 0.5 }, { id: 'bed', x: 0.2, y: 0.7 }] } });

    await game.dragToTray(game.page.locator('.item[data-id="lamp"]'));

    await expect(game.items()).toHaveCount(1);
    expect(await ids(game)).toEqual(['bed']);
    expect((await game.spoken()).at(-1)).toBe('Guardei!');
    // e o abajur continua na bandeja, pronto para ser usado de novo
    await expect(await game.reveal('lamp')).toHaveClass(/draggable/);
  });

  test('tocar num móvel do quarto diz o nome; tocar na Mia, ela cumprimenta', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.5, y: 0.5 }] } });

    await game.items().first().click();
    expect((await game.spoken()).at(-1)).toBe('Abajur');
    await game.mia().click();
    expect((await game.spoken()).at(-1)).toBe('Oi! Este é o meu quarto!');
    await expect(game.items()).toHaveCount(1);
  });

  test('a Mia se arrasta e nunca sai do quarto', async ({ game }) => {
    await game.open({ state: { items: [], mia: { x: 0.5, y: 0.5 } } });

    await game.dragToRoom(game.mia(), 0.2, 0.4);
    const at = await game.fractionOf(game.mia());
    const want = await expectedCenter(game, 0.2, 0.4, Room.MIA_SIZE);
    expect(near(at.x, want.x, 0.012) && near(at.y, want.y, 0.012)).toBe(true);

    await game.dragToRoom(game.mia(), 1.05, 1.05);
    expect(await insideRoom(game, game.mia())).toBe(true);
  });

  test('a Mia solta na bandeja não some: fica no quarto', async ({ game }) => {
    await game.open({ state: { items: [], mia: { x: 0.5, y: 0.5 } } });
    await game.dragToTray(game.mia());
    await expect(game.mia()).toBeVisible();
    expect(await insideRoom(game, game.mia())).toBe(true);
  });

  test('a Mia vestida continua vestida depois de arrastada', async ({ game }) => {
    await game.open({ outfit: ['tiara'], state: { items: [] } });
    await game.dragToRoom(game.mia(), 0.3, 0.5);
    await expect(game.mia().locator('img.outfit')).toHaveCount(1);
  });
});

test.describe('desfazer', () => {
  test('desfaz um passo de cada vez: o que se pôs some, o que se moveu volta, o que se guardou volta', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'bed', x: 0.3, y: 0.6 }] } });
    const undo = game.page.locator('#btn-reset');

    await game.dragToRoom(await game.reveal('lamp'), 0.7, 0.4);               // 1: pôs um abajur
    await game.dragToRoom(game.page.locator('.item[data-id="bed"]'), 0.5, 0.7);   // 2: moveu a cama
    await game.dragToTray(game.page.locator('.item[data-id="lamp"]'));            // 3: guardou o abajur
    expect(await ids(game)).toEqual(['bed']);

    await undo.click();                                                          // desfaz 3: o abajur volta
    expect(await ids(game)).toEqual(['bed', 'lamp']);
    expect((await game.spoken()).at(-1)).toBe('Desfeito!');

    await undo.click();                                                          // desfaz 2: a cama volta
    const bed = await game.fractionOf(game.page.locator('.item[data-id="bed"]'));
    const want = await expectedCenter(game, 0.3, 0.6, Room.sizeOf('bed'));
    expect(near(bed.x, want.x, 0.012) && near(bed.y, want.y, 0.012)).toBe(true);

    await undo.click();                                                          // desfaz 1: o abajur some
    expect(await ids(game)).toEqual(['bed']);
  });

  test('sem nada para desfazer, a voz avisa', async ({ game }) => {
    await game.open();
    await game.page.locator('#btn-reset').click();
    expect((await game.spoken()).at(-1)).toBe('Nada para desfazer.');
    expect(await ids(game)).toEqual(['bed', 'plant', 'rug']);
  });

  test('desfazer também é guardado: o Flutter recebe o quarto de antes', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await game.dragToRoom(await game.reveal('lamp'), 0.5, 0.5);
    await game.saveDelay();
    expect((await game.saves()).at(-1).items).toHaveLength(1);

    await game.page.locator('#btn-reset').click();
    await game.saveDelay();

    expect((await game.saves()).at(-1).items).toHaveLength(0);
  });
});

test.describe('guardar no Flutter', () => {
  test('depois de uma mudança manda SAVE_STATE com ids e frações (sem uid), só depois da espera', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [], mia: { x: 0.5, y: 0.5 } } });

    await game.dragToRoom(await game.reveal('lamp'), 0.4, 0.4);
    expect(await game.saves(), 'ainda não: o jogo espera um pouquinho').toHaveLength(0);
    await game.saveDelay();

    const saves = await game.saves();
    expect(saves).toHaveLength(1);
    expect(saves[0].items).toHaveLength(1);
    expect(saves[0].items[0].id).toBe('lamp');
    expect(Object.keys(saves[0].items[0]).sort()).toEqual(['id', 'x', 'y']);
    const want = await expectedCenter(game, 0.4, 0.4, Room.sizeOf('lamp'));
    expect(near(saves[0].items[0].x, want.x, 0.012) && near(saves[0].items[0].y, want.y, 0.012)).toBe(true);
    expect(saves[0].mia).toEqual({ x: 0.5, y: 0.5 });
  });

  test('várias mudanças seguidas viram um salvamento só, com o quarto final', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });

    await game.dragToRoom(await game.reveal('lamp'), 0.3, 0.4);
    await game.dragToRoom(await game.reveal('bed'), 0.6, 0.6);
    await game.dragToRoom(game.mia(), 0.2, 0.7);
    await game.saveDelay();

    const saves = await game.saves();
    expect(saves).toHaveLength(1);
    expect(saves[0].items.map((i) => i.id).sort()).toEqual(['bed', 'lamp']);
  });

  test('sem mudança, nada é salvo (abrir e olhar não manda nada)', async ({ game }) => {
    await game.open();
    await game.tick(5000);
    expect(await game.saves()).toHaveLength(0);
  });

  test('um toque, e arrastar sem mudar de lugar a nada, não mexem no salvo', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.5, y: 0.5 }] } });
    await game.items().first().click();
    await game.mia().click();
    await game.tick(2000);
    expect(await game.saves()).toHaveLength(0);
  });

  test('sair do jogo guarda o que estava pendente ANTES de voltar', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await game.dragToRoom(await game.reveal('lamp'), 0.4, 0.4);

    await game.page.evaluate(() => window.GameBridge.back());

    const types = (await game.messages()).map((m) => m.type).filter((t) => t === 'SAVE_STATE' || t === 'NAVIGATE_BACK');
    expect(types).toEqual(['SAVE_STATE', 'NAVIGATE_BACK']);
    // e a espera que sobrou não manda o mesmo quarto de novo
    await game.saveDelay();
    expect(await game.saves()).toHaveLength(1);
  });

  test('sair sem mudança não manda SAVE_STATE', async ({ game }) => {
    await game.open();
    await game.page.evaluate(() => window.GameBridge.back());
    expect(await game.saves()).toHaveLength(0);
    expect((await game.messages()).filter((m) => m.type === 'NAVIGATE_BACK')).toHaveLength(1);
  });

  test('fechar a página (pagehide) também guarda o que estava pendente', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await game.dragToRoom(await game.reveal('lamp'), 0.4, 0.4);

    await game.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));

    expect(await game.saves()).toHaveLength(1);
  });

  test('o que foi salvo volta igual na próxima vez (ida e volta)', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    await game.dragToRoom(await game.reveal('chair'), 0.3, 0.5);
    await game.dragToRoom(await game.reveal('bowl'), 0.7, 0.45);
    await game.dragToRoom(game.mia(), 0.5, 0.75);
    await game.saveDelay();
    const saved = (await game.saves()).at(-1);

    await game.page.reload();
    await game.open({ totalStars: 999, state: saved });

    expect(await ids(game)).toEqual(['bowl', 'chair']);
    const chair = await game.fractionOf(game.page.locator('.item[data-id="chair"]'));
    const savedChair = saved.items.find((i) => i.id === 'chair');
    expect(near(chair.x, savedChair.x, 0.012) && near(chair.y, savedChair.y, 0.012)).toBe(true);
    const mia = await game.fractionOf(game.mia());
    expect(near(mia.x, saved.mia.x, 0.012) && near(mia.y, saved.mia.y, 0.012)).toBe(true);
  });

  test('nunca manda GAME_COMPLETE (não há resultado nem recorde)', async ({ game }) => {
    await game.open({ totalStars: 999 });
    await game.dragToRoom(await game.reveal('lamp'), 0.5, 0.5);
    await game.dragToTray(game.items().last());
    await game.page.locator('#btn-reset').click();
    await game.saveDelay();
    expect((await game.messages()).filter((m) => m.type === 'GAME_COMPLETE')).toHaveLength(0);
  });

  test('o que se salva cabe nos limites que o Flutter aceita', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [] } });
    for (let i = 0; i < 8; i++) await game.dragToRoom(await game.reveal(FURNITURE[i % 4].id), 0.1 + i * 0.1, 0.5);
    await game.saveDelay();
    const saved = (await game.saves()).at(-1);
    expect(saved.items.length).toBeLessThanOrEqual(40);
    expect(JSON.stringify(saved).length).toBeLessThan(8192);
    for (const item of saved.items) expect(item.id).toMatch(/^[a-z]+$/);
  });
});

test.describe('girar e arrastar', () => {
  test('girar a tela mantém cada móvel no mesmo ponto do quarto (em fração)', async ({ game, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.3, y: 0.4 }, { id: 'chair', x: 0.7, y: 0.6 }] } });
    const before = await game.fractionOf(page.locator('.item[data-id="chair"]'));
    const w = (await game.room().boundingBox()).width;

    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await game.room().boundingBox()).width).not.toBe(w);

    const after = await game.fractionOf(page.locator('.item[data-id="chair"]'));
    // o móvel muda de tamanho junto com o quarto: a posição (em fração) fica, salvo o empurrão para caber
    expect(near(after.x, before.x, 0.06) && near(after.y, before.y, 0.12)).toBe(true);
    for (const item of await game.items().all()) expect(await insideRoom(game, item)).toBe(true);
    expect(await game.saves(), 'girar não é uma mudança do quarto').toHaveLength(0);
  });

  test('girar a tela no meio do arrasto cancela: o móvel volta e soltar o dedo depois não muda nada', async ({ game }) => {
    await game.open({ totalStars: 999, state: { items: [{ id: 'lamp', x: 0.3, y: 0.4 }] } });
    const lamp = game.items().first();
    const before = await game.fractionOf(lamp);

    await game.dragToRoom(lamp, 0.7, 0.7, { drop: false });
    await expect(lamp).toHaveClass(/dragging/);
    await game.page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(lamp).not.toHaveClass(/dragging/);
    await game.page.mouse.up();
    await game.settled();

    const after = await game.fractionOf(lamp);
    expect(near(after.x, before.x) && near(after.y, before.y)).toBe(true);
    expect(await game.saves()).toHaveLength(0);
  });
});
