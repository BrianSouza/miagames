// O kit visual dos jogos: cabeçalho sem cronômetro, estrelas de progresso,
// retorno sem castigo e a tela de parabéns (Mia, estrelas, confete).
const { test, expect, CHECK_DELAY_MS } = require('./fixtures');

test.describe('cabeçalho', () => {
  test('não mostra cronômetro nem contagem de jogadas para a criança', async ({ game }) => {
    await game.open();
    await game.cards().first().click();

    await expect(game.page.locator('#timer')).toHaveCount(0);
    // as jogadas continuam no DOM, mas só para leitores de tela
    await expect(game.page.locator('#moves')).toHaveText('0 jogadas');
    const box = await game.page.locator('.sr-only').boundingBox();
    expect(box.width * box.height).toBeLessThanOrEqual(1);
    await expect(game.page.locator('#header')).not.toContainText('jogada');
  });

  test('tem uma estrela de progresso por par, e elas acendem ao acertar', async ({ game }) => {
    await game.open({ difficulty: 'easy' });
    const dots = game.page.locator('#progress .dot');
    await expect(dots).toHaveCount(6);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);

    const [[a, b]] = await game.pairs();
    await game.flipPair(a, b);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);

    await game.solve();
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(6);
  });

  test('o número de estrelas acompanha a dificuldade e zera ao reiniciar', async ({ game }) => {
    await game.open({ difficulty: 'hard' });
    await expect(game.page.locator('#progress .dot')).toHaveCount(10);

    const [[a, b]] = await game.pairs();
    await game.flipPair(a, b);
    await game.page.click('#btn-reset');
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
  });

  test('os botões do cabeçalho são redondos e grandes', async ({ game }) => {
    await game.open();
    for (const id of ['#btn-back', '#btn-reset']) {
      const size = await game.page
        .locator(id)
        .evaluate((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));
      expect(size.w, id).toBeGreaterThanOrEqual(60);
      expect(size.h, id).toBe(size.w);
    }
  });
});

test.describe('retorno sem castigo', () => {
  test('errar balança as cartas, sem cor de erro, e o balanço termina sozinho', async ({ game }) => {
    await game.open();
    const [a, b] = await game.mismatch();
    await game.cards().nth(a).click();
    await game.cards().nth(b).click();
    await game.tick(CHECK_DELAY_MS);

    await expect(game.page.locator('.card.shake')).toHaveCount(2);
    await game.tick(500);
    await expect(game.page.locator('.card.shake')).toHaveCount(0);
  });

  test('acertar faz o par "pular"', async ({ game }) => {
    await game.open();
    const [[a, b]] = await game.pairs();
    await game.flipPair(a, b);

    await expect(game.page.locator('.card.matched.pop')).toHaveCount(2);
  });
});

test.describe('tela de parabéns', () => {
  test('mostra a Mia comemorando, as estrelas e dois botões, sem estatísticas', async ({ game }) => {
    await game.open();
    await game.solve();

    const modal = game.page.locator('#result-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('img.mia')).toBeVisible();
    await expect(modal).not.toContainText('jogadas');
    await expect(modal).not.toContainText(':'); // nada de "00:04"

    // a imagem da Mia carregou de verdade
    const loaded = await modal
      .locator('img.mia')
      .evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);
  });

  test('as estrelas conquistadas aparecem uma a uma', async ({ game }) => {
    await game.open();
    await game.solve();

    const delays = await game.page
      .locator('.star.earned')
      .evaluateAll((stars) => stars.map((s) => parseFloat(getComputedStyle(s).animationDelay)));
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBeLessThan(delays[1]);
    expect(delays[1]).toBeLessThan(delays[2]);
  });

  test('solta confete, que termina sozinho', async ({ game }) => {
    await game.open();
    await game.solve();

    await expect.poll(() => game.page.evaluate(() => window.Confetti.active())).toBeGreaterThan(0);
    await game.tick(4000);
    expect(await game.page.evaluate(() => window.Confetti.active())).toBe(0);
  });

  test('sem confete para quem pede menos movimento', async ({ game, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await game.open();
    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    expect(await game.page.evaluate(() => window.Confetti.active())).toBe(0);
  });

  test('os botões são grandes e têm nome para leitores de tela', async ({ game }) => {
    await game.open();
    await game.solve();

    await expect(game.page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible();
    await expect(game.page.getByRole('button', { name: 'Início' })).toBeVisible();
    for (const id of ['#btn-play-again', '#btn-home']) {
      const size = await game.page.locator(id).evaluate((el) => el.offsetWidth);
      expect(size, id).toBeGreaterThanOrEqual(72);
    }
  });
});
