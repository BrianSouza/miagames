const { test, expect } = require('./fixtures');

// Notas por som (sounds.js): virar=1, acertar=2, errar=2, vencer=4
const NOTES = { flip: 1, match: 2, mismatch: 2, win: 4 };

test.describe('efeitos sonoros', () => {
  test('uma partida perfeita toca virar, acertar e vencer', async ({ game }) => {
    await game.open({ difficulty: 'easy', sound: true });

    await game.solve();

    // 12 viradas, 5 acertos e, no último par, o som de vitória no lugar do de acerto
    expect(await game.notes()).toBe(12 * NOTES.flip + 5 * NOTES.match + NOTES.win);
  });

  test('errar toca o som de erro', async ({ game }) => {
    await game.open({ sound: true });
    const [a, b] = await game.mismatch();

    await game.flipPair(a, b);

    expect(await game.notes()).toBe(2 * NOTES.flip + NOTES.mismatch);
  });

  test('com o som desligado pelos pais, nenhuma nota toca', async ({ game }) => {
    await game.open({ difficulty: 'easy', sound: false });

    await game.solve();
    await expect(game.page.locator('#result-modal')).toBeVisible();

    expect(await game.notes()).toBe(0);
  });

  test('a voz continua mesmo com os efeitos desligados', async ({ game }) => {
    await game.open({ sound: false });

    await game.solve();

    expect(await game.spoken()).toContain('Muito bem!');
  });
});

test.describe('recorde', () => {
  const novoRecorde = (game) => game.page.locator('#new-record');

  test('primeira partida (sem recorde) não mostra "Novo recorde!"', async ({ game }) => {
    await game.open({ best: null });

    await game.solve();

    await expect(novoRecorde(game)).toBeHidden();
    expect(await game.spoken()).toContain('Parabéns! Você encontrou todos os pares!');
  });

  test('bater o recorde mostra o selo e fala', async ({ game }) => {
    await game.open({ best: { stars: 2, moves: 10 } });

    await game.solve(); // 3 estrelas, 6 jogadas

    await expect(novoRecorde(game)).toBeVisible();
    await expect(novoRecorde(game)).toHaveText('Novo recorde!');
    expect(await game.spoken()).toContain('Parabéns! Novo recorde!');
  });

  test('empatar ou piorar o recorde não mostra o selo', async ({ game }) => {
    await game.open({ best: { stars: 3, moves: 6 } });

    await game.solve(); // 3 estrelas, 6 jogadas: igual

    await expect(novoRecorde(game)).toBeHidden();
  });

  test('o recorde batido vale para o "Jogar novamente"', async ({ game }) => {
    await game.open({ best: { stars: 1, moves: 40 } });
    await game.solve();
    await expect(novoRecorde(game)).toBeVisible();

    await game.page.click('#btn-play-again');
    await game.solve(); // mesma pontuação do recorde que acabou de ser batido

    await expect(novoRecorde(game)).toBeHidden();
  });
});
