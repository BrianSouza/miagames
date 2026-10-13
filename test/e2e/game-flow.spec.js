const { test, expect, CHECK_DELAY_MS } = require('./fixtures');

test.describe('partida', () => {
  test('mostra o tabuleiro com todas as cartas escondidas e acessíveis', async ({ game }) => {
    await game.open({ difficulty: 'easy' });

    await expect(game.cards()).toHaveCount(12);
    await expect(game.page.locator('#matches')).toHaveText('0/6');
    for (const card of await game.cards().all()) {
      await expect(card).toHaveAttribute('aria-label', 'Carta escondida');
      await expect(card).toHaveAttribute('role', 'button');
    }
  });

  for (const [difficulty, cards] of [['easy', 12], ['medium', 16], ['hard', 20]]) {
    test(`${difficulty}: ${cards} cartas, todas as ilustrações carregam`, async ({ game }) => {
      await game.open({ difficulty });

      await expect(game.cards()).toHaveCount(cards);
      const loaded = await game.page.evaluate(() =>
        Promise.all(
          [...document.querySelectorAll('.card-back img')].map((img) =>
            img.decode().then(() => img.naturalWidth > 0, () => false),
          ),
        ),
      );
      expect(loaded).toHaveLength(cards);
      expect(loaded.every(Boolean)).toBe(true);
    });
  }

  test('virar uma carta fala o animal e atualiza o rótulo para leitores de tela', async ({ game }) => {
    await game.open();

    await game.cards().first().click();

    const [name] = await game.spoken();
    expect(name).toMatch(/^[A-ZÀ-Ú][a-zà-ú]+$/);
    await expect(game.cards().first()).toHaveAttribute('aria-label', name);
  });

  test('par errado volta a esconder as cartas; par certo fica aberto', async ({ game }) => {
    await game.open();
    const [a, b] = await game.mismatch();
    const [[c, d]] = await game.pairs();

    await game.flipPair(a, b);
    await expect(game.page.locator('.card-inner.flipped')).toHaveCount(0);
    await expect(game.page.locator('#moves')).toHaveText('1 jogada');

    await game.flipPair(c, d);
    await expect(game.page.locator('.card.matched')).toHaveCount(2);
    await expect(game.page.locator('#matches')).toHaveText('1/6');
    expect(await game.spoken()).toContain('Muito bem!');
  });

  test('não deixa virar uma terceira carta durante a verificação', async ({ game }) => {
    await game.open();
    const [a, b] = await game.mismatch();
    const third = (await game.pairs()).flat().find((i) => i !== a && i !== b);

    await game.cards().nth(a).click();
    await game.cards().nth(b).click();
    await game.cards().nth(third).click({ force: true });

    await expect(game.page.locator('.card-inner.flipped')).toHaveCount(2);
    await game.tick(CHECK_DELAY_MS);
    await expect(game.page.locator('.card-inner.flipped')).toHaveCount(0);
  });

  test('uma partida perfeita termina com 3 estrelas e envia o resultado ao Flutter', async ({ game }) => {
    await game.open({ difficulty: 'easy' });

    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('.star.earned')).toHaveCount(3);
    await expect(game.page.locator('#stars')).toHaveAttribute('aria-label', '3 estrelas');
    await expect(game.page.locator('#result-stats')).toContainText('6 jogadas');

    const complete = (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');
    expect(complete).toHaveLength(1);
    expect(complete[0]).toMatchObject({ difficulty: 'easy', moves: 6, matches: 6, stars: 3 });
    expect(await game.spoken()).toContain('Parabéns! Você encontrou todos os pares!');
  });

  test('muitos erros rendem menos estrelas', async ({ game }) => {
    await game.open({ difficulty: 'easy' });
    const [a, b] = await game.mismatch();

    for (let i = 0; i < 20; i++) await game.flipPair(a, b);
    await game.solve();

    await expect(game.page.locator('.star.earned')).toHaveCount(1);
    await expect(game.page.locator('#stars')).toHaveAttribute('aria-label', '1 estrela');
  });

  test('"Jogar novamente" começa uma partida nova', async ({ game }) => {
    await game.open();
    await game.solve();

    await game.page.click('#btn-play-again');

    await expect(game.page.locator('#result-modal')).toBeHidden();
    await expect(game.page.locator('#matches')).toHaveText('0/6');
    await expect(game.page.locator('.card.matched')).toHaveCount(0);
  });
});

test.describe('cronômetro', () => {
  test('só começa no primeiro toque, não quando o tabuleiro aparece', async ({ game }) => {
    await game.open();
    await game.tick(60_000); // um minuto olhando o tabuleiro

    await expect(game.page.locator('#timer')).toHaveText('00:00');

    await game.solve(); // 6 pares × 800 ms de verificação
    await expect(game.page.locator('#result-stats')).toContainText('00:04');
  });
});
