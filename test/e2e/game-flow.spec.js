const { test, expect, CHECK_DELAY_MS } = require('./fixtures');
const Logic = require('../../assets/games/memory/memory-logic.js');

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

  for (const [difficulty, cards, letters, numbers] of [
    ['easy', 12, 4, 2],
    ['medium', 16, 5, 3],
    ['hard', 20, 6, 4],
  ]) {
    test(`${difficulty}: ${cards} cartas, ${letters} letras e ${numbers} números`, async ({ game }) => {
      await game.open({ difficulty });

      await expect(game.cards()).toHaveCount(cards);
      const symbols = [...new Set(await game.symbols())];
      expect(symbols.filter((s) => /[A-Z]/.test(s))).toHaveLength(letters);
      expect(symbols.filter((s) => /\d/.test(s))).toHaveLength(numbers);
    });
  }

  test('as cartas usam a fonte Andika, feita para quem está aprendendo a ler', async ({ game }) => {
    await game.open();

    await game.page.evaluate(() => document.fonts.ready);
    expect(await game.page.evaluate(() => document.fonts.check('700 40px Andika'))).toBe(true);
    const family = await game.page
      .locator('.glyph')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain('Andika');
  });

  test('letras e números têm cores diferentes, mas o par não é entregue pela cor', async ({ game }) => {
    await game.open({ difficulty: 'hard' });

    const colors = await game.page.evaluate(() =>
      [...document.querySelectorAll('.card-back')].map((el) => ({
        kind: el.dataset.kind,
        color: getComputedStyle(el).color,
      })),
    );
    const byKind = (kind) => new Set(colors.filter((c) => c.kind === kind).map((c) => c.color));
    expect(byKind('letter').size).toBe(1);
    expect(byKind('number').size).toBe(1);
    expect([...byKind('letter')][0]).not.toBe([...byKind('number')][0]);
  });

  test('as cartas viradas mostram o símbolo grande o bastante para ler', async ({ game }) => {
    await game.open({ difficulty: 'hard' });

    // Números de dois algarismos têm fonte menor de propósito: mede um símbolo de 1 caractere
    const card = await game.cards().first().boundingBox();
    const fontSize = await game.page
      .locator('.glyph[data-len="1"]')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(card.width * 0.55);
  });

  test('virar uma carta fala o nome da letra ou do número e atualiza o rótulo', async ({ game }) => {
    await game.open();
    const [symbol] = await game.symbols();
    const item = Logic.findSymbol(symbol);

    await game.cards().first().click();

    expect(await game.spoken()).toEqual([item.name]);
    await expect(game.cards().first()).toHaveAttribute(
      'aria-label',
      (item.kind === 'letter' ? 'Letra ' : 'Número ') + symbol,
    );
  });

  test('cada letra é falada pelo nome em português, não pelo que o motor de voz leria', async ({ game }) => {
    // Joga todas as cartas de um tabuleiro difícil e confere o que foi falado
    await game.open({ difficulty: 'hard' });
    const symbols = await game.symbols();
    const [first] = (await game.pairs())[0];

    await game.cards().nth(first).click();

    const [spoken] = await game.spoken();
    const expected = Logic.findSymbol(symbols[first]).name;
    expect(spoken).toBe(expected);
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
    const symbol = (await game.symbols())[c];
    const item = Logic.findSymbol(symbol);
    expect(await game.spoken()).toContain(`${item.name}! Muito bem!`);
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

test.describe('tempo da partida', () => {
  // O tempo não aparece para a criança, mas vai para a Área dos pais (GAME_COMPLETE)
  test('só começa no primeiro toque, não quando o tabuleiro aparece', async ({ game }) => {
    await game.open();
    await game.tick(60_000); // um minuto olhando o tabuleiro

    await game.solve(); // 6 pares × 800 ms de verificação

    const complete = (await game.messages()).find((m) => m.type === 'GAME_COMPLETE');
    expect(complete.timeSeconds).toBe(4);
  });
});
