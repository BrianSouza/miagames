// A roupa da Mia: o Flutter manda os ids dos acessórios em INIT.outfit e os jogos os empilham sobre a Mia
// (na pergunta e na tela de parabéns), em qualquer pose.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./fixtures');

const IMG_DIR = path.join(__dirname, '../../assets/games/_shared/img');
const OUTFIT_IDS = fs
  .readdirSync(IMG_DIR)
  .filter((f) => f.startsWith('outfit_'))
  .map((f) => f.replace('outfit_', '').replace('.svg', ''));

const boxOf = (locator) => locator.boundingBox();
const sameBox = (a, b) =>
  Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1;

test.describe('os desenhos', () => {
  test.use({ gameId: 'which-letter' });

  test('há acessórios e todos carregam no navegador', async ({ game }) => {
    expect(OUTFIT_IDS.length).toBeGreaterThanOrEqual(9);
    await game.open();

    await game.page.evaluate((ids) => window.GameKit.setOutfit(ids), OUTFIT_IDS);

    const imgs = game.page.locator('#asker img.outfit');
    await expect(imgs).toHaveCount(OUTFIT_IDS.length);
    await expect.poll(() => imgs.evaluateAll((els) => els.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
  });
});

for (const gameId of ['which-letter', 'how-many', 'missing-syllable', 'paint', 'build-word']) {
  test.describe(`${gameId}: a Mia vestida na pergunta`, () => {
    test.use({ gameId });

    test('sem roupa, nada é empilhado sobre a Mia', async ({ game }) => {
      await game.open();
      await expect(game.page.locator('#asker img.outfit')).toHaveCount(0);
    });

    test('os acessórios ficam exatamente sobre a Mia, na ordem, e carregam', async ({ game }) => {
      await game.open({ outfit: ['crown', 'glasses'] });

      const outfits = game.page.locator('#asker img.outfit');
      await expect(outfits).toHaveCount(2);
      await expect(outfits.nth(0)).toHaveAttribute('src', /outfit_crown\.svg$/);
      await expect(outfits.nth(1)).toHaveAttribute('src', /outfit_glasses\.svg$/);
      await expect.poll(() => outfits.evaluateAll((els) => els.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);

      const mia = await boxOf(game.page.locator('#mia'));
      for (const outfit of await outfits.all()) {
        expect(sameBox(await boxOf(outfit), mia), 'o acessório não cobre a Mia exatamente').toBe(true);
        expect(await outfit.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
        await expect(outfit).toHaveAttribute('aria-hidden', 'true');
      }
    });

    test('tocar na Mia vestida ainda repete a pergunta', async ({ game }) => {
      await game.open({ outfit: ['crown'] });
      const before = (await game.spoken()).length;

      await game.page.click('#asker');

      expect((await game.spoken()).length).toBe(before + 1);
    });
  });
}

test.describe('as poses', () => {
  test.use({ gameId: 'which-letter' });

  test('a Mia muda de pose e continua vestida', async ({ game }) => {
    await game.open({ outfit: ['party'] });
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);

    await game.option(await game.correctSymbol()).click();

    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_cheer\.svg$/);
    await expect(game.page.locator('#asker img.outfit')).toHaveCount(1);
    await expect(game.page.locator('#asker img.outfit')).toHaveAttribute('src', /outfit_party\.svg$/);
  });
});

test.describe('a segurança dos nomes', () => {
  test.use({ gameId: 'which-letter' });

  test('só ids simples (a-z) viram arquivo: o resto é ignorado', async ({ game }) => {
    await game.open({ outfit: ['../evil', 'crown', 'Crown', 'x y', 42, null, 'a/b'] });

    const srcs = await game.page.locator('#asker img.outfit').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toMatch(/outfit_crown\.svg$/);
  });

  test('um INIT sem "outfit" deixa a Mia sem roupa', async ({ game }) => {
    await game.open({ outfit: undefined });
    await expect(game.page.locator('#asker img.outfit')).toHaveCount(0);
  });
});

test.describe('na tela de parabéns', () => {
  test.use({ gameId: 'which-letter' });

  test('a Mia que comemora está vestida, e os acessórios cobrem a Mia', async ({ game }) => {
    await game.open({ outfit: ['tiara', 'medal'] });

    await game.solve();

    const modal = game.page.locator('#result-modal');
    await expect(modal).toBeVisible();
    const outfits = modal.locator('img.outfit');
    await expect(outfits).toHaveCount(2);
    await expect.poll(() => outfits.evaluateAll((els) => els.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
    // a Mia pula (animação): mede com tudo parado
    await game.page.evaluate(() => Promise.all(document.getAnimations().map((a) => (a.effect.getTiming().iterations === Infinity ? null : a.finished.catch(() => {})))));
    const mia = await boxOf(modal.locator('img.mia:not(.outfit)'));
    for (const outfit of await outfits.all()) {
      const box = await boxOf(outfit);
      expect(Math.abs(box.width - mia.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.height - mia.height)).toBeLessThanOrEqual(1);
    }
  });

  test('sem roupa, a tela de parabéns também fica sem acessórios', async ({ game }) => {
    await game.open();
    await game.solve();
    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('#result-modal img.outfit')).toHaveCount(0);
  });
});

test.describe('Jogo da Memória', () => {
  test.use({ gameId: 'memory' });

  test('a Mia da tela de parabéns também se veste', async ({ game }) => {
    await game.open({ outfit: ['flower'] });
    await game.solve();

    await expect(game.page.locator('#result-modal img.outfit')).toHaveCount(1);
    await expect(game.page.locator('#result-modal img.outfit')).toHaveAttribute('src', /outfit_flower\.svg$/);
  });
});
