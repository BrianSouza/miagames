// "Colorir": a criança escolhe a cor e pinta DENTRO da letra (ou palavra). A tinta nunca sai do
// contorno; cada vez que o dedo sai conta uma saída. Os testes pintam de verdade com o mouse.
const { test, expect } = require('./fixtures');
const Logic = require('../../assets/games/paint/paint-logic.js');

test.use({ gameId: 'paint' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

test.describe('a forma', () => {
  test('mostra a forma do nível, 8 cores, 5 estrelas de progresso e a voz pede para pintar', async ({ game }) => {
    await game.open({ level: 1 });
    const first = game.plan.items[0];

    await expect(game.page.locator('#canvas-wrap')).toHaveAttribute('data-item', first.text);
    await expect(game.page.locator('.swatch')).toHaveCount(8);
    await expect(game.page.locator('#progress .dot')).toHaveCount(5);
    await expect(game.page.locator('#picture')).toBeHidden();
    expect(await game.spoken()).toEqual([Logic.promptFor(first)]);
  });

  test('cada nível mostra o seu tipo de forma', async ({ game }) => {
    for (const [level, pattern] of [[1, /^[AEIOU]$/], [2, /^[EFHILT]$/], [3, /^[A-Z]$/], [4, /^[a-z]$/], [5, /^[A-Z]{4}$/], [6, /^[a-z]{6}$/]]) {
      await game.open({ level });
      expect(await game.page.locator('#canvas-wrap').getAttribute('data-item'), `nível ${level}`).toMatch(pattern);
      await game.page.reload();
    }
  });

  test('a forma usa a fonte Andika e tem o tamanho que cabe na área', async ({ game }) => {
    await game.open({ level: 3 });
    const size = await game.page.evaluate(() => {
      const mask = document.getElementById('mask');
      const d = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
      let minX = mask.width, maxX = 0, minY = mask.height, maxY = 0;
      for (let y = 0; y < mask.height; y++) {
        for (let x = 0; x < mask.width; x++) {
          if (d[(y * mask.width + x) * 4 + 3] > 127) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      return { w: maxX - minX, h: maxY - minY, cw: mask.width, ch: mask.height };
    });
    expect(size.h, 'a letra ocupa boa parte da altura').toBeGreaterThan(size.ch * 0.5);
    expect(size.w).toBeLessThanOrEqual(size.cw);
    expect(await game.page.evaluate(() => document.fonts.check('700 40px Andika'))).toBe(true);
  });

  test('nas palavras (nível 5), o desenho da palavra aparece em cima, e carrega', async ({ game }) => {
    await game.open({ level: 5 });
    const item = game.plan.items[0];

    await expect(game.page.locator('#picture')).toBeVisible();
    await expect(game.page.locator('#picture')).toHaveAttribute('src', `../missing-syllable/img/${item.id}.svg`);
    const loaded = await game.page.locator('#picture').evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);
    expect(await game.spoken()).toEqual([`Vamos pintar a palavra ${item.say}!`]);
  });
});

test.describe('a paleta', () => {
  test('escolher uma cor a marca (só uma por vez) e a voz fala o nome', async ({ game }) => {
    await game.open();
    await expect(game.swatch('red')).toHaveClass(/selected/);

    await game.swatch('blue').click();

    await expect(game.swatch('blue')).toHaveClass(/selected/);
    await expect(game.swatch('blue')).toHaveAttribute('aria-checked', 'true');
    await expect(game.page.locator('.swatch.selected')).toHaveCount(1);
    expect((await game.spoken()).at(-1)).toBe('Azul');
  });

  test('as bolas de cor são grandes e têm nome para leitores de tela', async ({ game }) => {
    await game.open();
    for (const swatch of await game.page.locator('.swatch').all()) {
      const size = await swatch.evaluate((el) => el.offsetWidth);
      expect(size).toBeGreaterThanOrEqual(56);
      await expect(swatch).toHaveAttribute('aria-label', /.+/);
    }
    await expect(game.page.getByRole('radiogroup', { name: 'Cores' })).toBeVisible();
  });
});

test.describe('pintar', () => {
  test('a tinta aparece na cor escolhida', async ({ game }) => {
    await game.open();
    await game.swatch('green').click();

    await game.paintInside(0.3);

    // #2ED573 = 46,213,115 (as bordas variam 1 ou 2 níveis por arredondamento da transparência)
    const colors = await game.paintedColor();
    const near = ([r, g, b]) => Math.abs(r - 46) <= 3 && Math.abs(g - 213) <= 3 && Math.abs(b - 115) <= 3;
    const keys = Object.keys(colors);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(near(key.split(',').map(Number)), key).toBe(true);
  });

  test('a tinta NUNCA sai do contorno, mesmo arrastando o dedo por toda a tela', async ({ game }) => {
    await game.open({ level: 3 });
    const rect = await game.page.locator('#outline').boundingBox();

    // risca a tela inteira, de ponta a ponta, por dentro e por fora da letra
    await game.page.mouse.move(rect.x + 5, rect.y + 5);
    await game.page.mouse.down();
    for (let y = 5; y < rect.height; y += 18) {
      await game.page.mouse.move(rect.x + rect.width - 5, rect.y + y);
      await game.page.mouse.move(rect.x + 5, rect.y + y + 9);
    }
    await game.page.mouse.up();

    const { painted, outside } = await game.paintOutsideMask();
    expect(painted, 'pintou alguma coisa dentro').toBeGreaterThan(100);
    expect(outside, 'pixels pintados fora da letra').toBe(0);
  });

  test('pintar só um pedaço não termina a forma', async ({ game }) => {
    await game.open();

    await game.paintInside(0.4);
    await game.tick(2000);

    expect(await game.doneCount()).toBe(0);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
  });

  test('pintar quase tudo termina: a Mia comemora, a voz elogia e o resto se completa', async ({ game }) => {
    await game.open();
    const first = game.plan.items[0];

    await game.paintInside(1);

    await expect.poll(() => game.doneCount()).toBe(1);
    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(first));
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_cheer\.svg$/);
    await expect(game.page.locator('#canvas-wrap')).toHaveClass(/pop/);
    // a forma fica toda colorida (o que faltava se completa), e ainda assim nada fora do contorno
    const { outside } = await game.paintOutsideMask();
    expect(outside).toBe(0);
  });

  test('depois da pausa vem a próxima forma, com a tela limpa', async ({ game }) => {
    await game.open();
    const second = game.plan.items[1];
    await game.paintInside(1);
    await expect.poll(() => game.doneCount()).toBe(1);

    await game.tick(Logic.ADVANCE_DELAY_MS);
    await game.ready();

    await expect(game.page.locator('#canvas-wrap')).toHaveAttribute('data-item', second.text);
    expect((await game.paintOutsideMask()).painted).toBe(0);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second));
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
  });

  test('"ouvir de novo" e a Mia repetem o pedido', async ({ game }) => {
    await game.open();
    const prompt = Logic.promptFor(game.plan.items[0]);
    await game.page.click('#btn-listen');
    await game.page.click('#asker');
    expect(await game.spoken()).toEqual([prompt, prompt, prompt]);
  });
});

test.describe('sair do contorno', () => {
  test('sair do contorno balança a forma de leve, sem pintar fora', async ({ game }) => {
    await game.open();

    await game.leaveOnce();

    await expect(game.page.locator('#canvas-wrap')).toHaveClass(/wobble/);
    expect((await game.paintOutsideMask()).outside).toBe(0);
    await game.tick(500);
    await expect(game.page.locator('#canvas-wrap')).not.toHaveClass(/wobble/);
  });

  test('ficar fora do contorno por vários movimentos conta UMA saída só', async ({ game }) => {
    await game.open();
    const { inside, outside } = await game.insideAndOutside();

    await game.page.mouse.move(inside.x, inside.y);
    await game.page.mouse.down();
    await game.page.mouse.move(outside.x, outside.y);
    for (let i = 1; i <= 6; i++) await game.page.mouse.move(outside.x + i * 4, outside.y + i * 3);
    await game.page.mouse.move(inside.x, inside.y);
    await game.page.mouse.up();
    await game.paintInside(1);
    await game.tick(1500);
    for (let i = 1; i < 5; i++) await game.finishItem();

    expect((await complete(game))[0].moves).toBe(1);
  });

  test('começar o toque fora e entrar na letra não conta saída', async ({ game }) => {
    await game.open();
    const { inside, outside } = await game.insideAndOutside();

    await game.page.mouse.move(outside.x, outside.y);
    await game.page.mouse.down();
    // anda por fora do contorno antes de entrar: nenhuma dessas saídas conta (o dedo ainda não tinha entrado)
    await game.page.mouse.move(outside.x + 6, outside.y + 6);
    await game.page.mouse.move(outside.x + 12, outside.y + 4);
    await game.page.mouse.move(inside.x, inside.y);
    await game.page.mouse.move(inside.x + 2, inside.y + 2);
    await game.page.mouse.up();
    await game.paintInside(1);
    await game.tick(1500);
    for (let i = 1; i < 5; i++) await game.finishItem();

    expect((await complete(game))[0].moves).toBe(0);
  });

  test('a voz pede para ir devagar depois de 3 saídas na mesma forma, uma vez só', async ({ game }) => {
    await game.open();

    for (let i = 0; i < 2; i++) await game.leaveOnce();
    expect(await game.spoken()).not.toContain('Devagarinho, dentro da letra.');
    for (let i = 0; i < 3; i++) await game.leaveOnce();

    expect((await game.spoken()).filter((t) => t === 'Devagarinho, dentro da letra.')).toHaveLength(1);
  });

  test('ao terminar, as saídas viram o "moves" do resultado', async ({ game }) => {
    await game.open({ level: 1 });
    for (let i = 0; i < 4; i++) await game.leaveOnce();
    await game.solve();

    const [msg, ...others] = await complete(game);
    expect(others).toHaveLength(0);
    expect(msg).toMatchObject({ gameId: 'paint', level: 1, moves: 4, matches: 5, stars: 3 });
  });

  test('o mesmo número de saídas rende menos estrelas num nível mais alto', async ({ game }) => {
    // 6 saídas: nível 1 aceita até 10 para 3 estrelas; o nível 6 só até 5
    await game.open({ level: 1 });
    for (let i = 0; i < 6; i++) await game.leaveOnce();
    await game.solve();
    expect((await complete(game))[0]).toMatchObject({ level: 1, moves: 6, stars: 3 });

    await game.page.reload();
    await game.open({ level: 6 });
    for (let i = 0; i < 6; i++) await game.leaveOnce();
    await game.solve();
    expect((await complete(game)).at(-1)).toMatchObject({ level: 6, moves: 6, stars: 2 });
  });
});

test.describe('fim da partida', () => {
  test('uma partida perfeita: 5 formas, 3 estrelas, tela de parabéns e resultado enviado', async ({ game }) => {
    await game.open({ level: 1 });

    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('.star.earned')).toHaveCount(3);
    const [msg, ...others] = await complete(game);
    expect(others).toHaveLength(0);
    expect(msg).toMatchObject({ gameId: 'paint', level: 1, moves: 0, matches: 5, stars: 3 });
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Que incrível!');
  });

  test('bater o recorde mostra "Novo recorde!"', async ({ game }) => {
    await game.open({ best: { stars: 2, moves: 3 } });
    await game.solve();
    await expect(game.page.locator('#new-record')).toBeVisible();
  });

  test('reiniciar durante a pausa não pula a primeira forma do jogo novo', async ({ game }) => {
    await game.open();
    await game.paintInside(1);
    await expect.poll(() => game.doneCount()).toBe(1);
    await game.page.click('#btn-reset');
    await game.ready();

    await game.tick(Logic.ADVANCE_DELAY_MS + 100);

    expect(await game.doneCount()).toBe(0);
    expect((await game.paintOutsideMask()).painted).toBe(0);
  });

  test('segurar o voltar sai; um toque só mostra a dica', async ({ game }) => {
    await game.open();
    await game.page.click('#btn-back');
    await expect(game.page.locator('#exit-hint')).toBeVisible();
    expect((await game.messages()).filter((m) => m.type === 'NAVIGATE_BACK')).toHaveLength(0);
  });
});
