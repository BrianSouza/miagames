// Regressão: reiniciar durante os 800 ms de verificação das duas cartas
// corrompia o jogo novo. O timer antigo atuava sobre as cartas novas (os ids
// se repetem entre partidas) e marcava como par cartas que não formavam par.
// No código original isso acontecia em 20 de 20 tentativas.
//
// O jogo atual tem três camadas contra isso (a verificação usa o estado, não
// ids guardados; reiniciar cancela o timer; cada partida tem um número de
// rodada). O primeiro teste cobre o resultado; o segundo cobre a janela em que
// as camadas de timer e de rodada ainda importam: virar duas cartas do jogo
// novo enquanto o timer do jogo antigo está pendente.
const { test, expect, CHECK_DELAY_MS } = require('./fixtures');

test.describe('reiniciar durante a verificação', () => {
  test('o jogo novo começa limpo, sem pares nem cartas viradas', async ({ game }) => {
    await game.open();
    const [[a, b]] = await game.pairs(); // um par certo: a verificação o marcaria

    await game.cards().nth(a).click();
    await game.cards().nth(b).click();
    await game.page.click('#btn-reset'); // antes dos 800 ms
    await game.tick(CHECK_DELAY_MS * 2);

    await expect(game.page.locator('#matches')).toHaveText('0/6');
    await expect(game.page.locator('#moves')).toHaveText('0 jogadas');
    await expect(game.page.locator('.card.matched')).toHaveCount(0);
    await expect(game.page.locator('.card-inner.flipped')).toHaveCount(0);
  });

  test('uma verificação antiga não resolve antes da hora as cartas do jogo novo', async ({ game }) => {
    await game.open();
    const [[a, b]] = await game.pairs();
    await game.cards().nth(a).click();
    await game.cards().nth(b).click(); // verificação antiga agendada para +800 ms

    await game.page.click('#btn-reset');
    await game.tick(300);
    const [c, d] = await game.mismatch(); // jogo novo: duas cartas, verificação para +1100 ms
    await game.cards().nth(c).click();
    await game.cards().nth(d).click();

    await game.tick(500); // +800 ms: é quando o timer antigo dispararia
    await expect(game.page.locator('.card-inner.flipped')).toHaveCount(2);
    await expect(game.page.locator('#moves')).toHaveText('1 jogada');

    await game.tick(300); // +1100 ms: agora sim, a verificação do jogo novo
    await expect(game.page.locator('.card-inner.flipped')).toHaveCount(0);
  });

  test('o jogo novo continua jogável e completa normalmente', async ({ game }) => {
    await game.open();
    const [a, b] = await game.mismatch();
    await game.cards().nth(a).click();
    await game.cards().nth(b).click();
    await game.page.click('#btn-reset');
    await game.tick(CHECK_DELAY_MS);

    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    const complete = (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');
    expect(complete).toHaveLength(1);
    expect(complete[0].moves).toBe(6);
  });

  test('reiniciar zera o tempo da partida', async ({ game }) => {
    await game.open();
    await game.cards().first().click();
    await game.tick(5000);

    await game.page.click('#btn-reset');
    await game.tick(10_000); // parado até o 1º toque da partida nova
    await game.solve();

    const complete = (await game.messages()).find((m) => m.type === 'GAME_COMPLETE');
    expect(complete.timeSeconds).toBe(4); // e não 19
  });
});
