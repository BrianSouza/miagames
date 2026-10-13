// Crianças pequenas tocam em tudo: um toque acidental no "voltar" não pode
// encerrar a partida. É preciso segurar o botão.
const { test, expect } = require('./fixtures');

const navigateBack = (game) =>
  game.messages().then((all) => all.filter((m) => m.type === 'NAVIGATE_BACK'));

test.describe('voltar', () => {
  test('um toque rápido só mostra a dica, sem sair', async ({ game }) => {
    await game.open();
    await expect(game.page.locator('#exit-hint')).toBeHidden();

    await game.page.click('#btn-back');

    await expect(game.page.locator('#exit-hint')).toBeVisible();
    await expect(game.page.locator('#exit-hint')).toHaveText('Segure ← para sair');
    expect(await navigateBack(game)).toHaveLength(0);
  });

  test('a dica some sozinha depois de 2 segundos', async ({ game }) => {
    await game.open();
    await game.page.click('#btn-back');

    await game.tick(2100);

    await expect(game.page.locator('#exit-hint')).toBeHidden();
  });

  test('segurar o botão sai do jogo', async ({ game }) => {
    await game.open();
    const box = await game.page.locator('#btn-back').boundingBox();

    await game.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await game.page.mouse.down();
    await game.tick(800);
    await game.page.mouse.up();

    expect(await navigateBack(game)).toHaveLength(1);
  });

  test('soltar antes do tempo não sai', async ({ game }) => {
    await game.open();
    const box = await game.page.locator('#btn-back').boundingBox();

    await game.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await game.page.mouse.down();
    await game.tick(300);
    await game.page.mouse.up();
    await game.tick(1000);

    expect(await navigateBack(game)).toHaveLength(0);
  });

  test('o botão "Início" do resultado sai direto', async ({ game }) => {
    await game.open();
    await game.solve();

    await game.page.click('#btn-home');

    expect(await navigateBack(game)).toHaveLength(1);
  });

  test('os botões têm pelo menos 56px, para dedos pequenos', async ({ game }) => {
    await game.open();
    await game.solve();

    // Tamanho de layout (offset*): o modal de resultado entra com uma animação
    // de escala, e boundingBox() mediria a caixa no meio dela.
    for (const selector of ['#btn-back', '#btn-reset', '#btn-play-again', '#btn-home']) {
      const size = await game.page
        .locator(selector)
        .evaluate((el) => ({ width: el.offsetWidth, height: el.offsetHeight }));
      expect(size.height, selector).toBeGreaterThanOrEqual(56);
      expect(size.width, selector).toBeGreaterThanOrEqual(56);
    }
  });
});
