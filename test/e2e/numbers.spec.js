// Números até 50: o alcance cresce com a dificuldade (fácil 0–9, médio 0–20,
// difícil 0–50) e os números de dois algarismos precisam caber na carta e ser
// falados por extenso.
const { test, expect, prng } = require('./fixtures');
const Logic = require('../../assets/games/memory/memory-logic.js');

/** Primeira semente cujo tabuleiro (calculado no Node) satisfaz o predicado */
function findSeed(difficulty, predicate) {
  for (let seed = 1; seed < 20000; seed++) {
    const state = Logic.createGame(difficulty, { random: prng(seed) });
    if (predicate(state.cards.map((c) => c.symbol))) return seed;
  }
  throw new Error(`nenhuma semente produz o tabuleiro pedido (${difficulty})`);
}

const numbersOf = (symbols) => symbols.filter((x) => /^\d+$/.test(x)).map(Number);

test.describe('alcance dos números', () => {
  test('o tabuleiro da página é o mesmo que o Node calcula com a semente', async ({ game }) => {
    await game.open({ difficulty: 'hard', seed: 123 });

    const expected = Logic.createGame('hard', { random: prng(123) }).cards.map((c) => c.symbol);
    expect(await game.symbols()).toEqual(expected);
  });

  test('fácil: só algarismos soltos (0 a 9)', async ({ game }) => {
    const seed = findSeed('easy', (s) => numbersOf(s).length > 0);
    await game.open({ difficulty: 'easy', seed });

    const numbers = numbersOf(await game.symbols());
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(n).toBeLessThanOrEqual(9);
  });

  test('médio: chega a números de dois algarismos, até 20', async ({ game }) => {
    const seed = findSeed('medium', (s) => numbersOf(s).some((n) => n >= 10));
    await game.open({ difficulty: 'medium', seed });

    const numbers = numbersOf(await game.symbols());
    expect(numbers.some((n) => n >= 10)).toBe(true);
    for (const n of numbers) expect(n).toBeLessThanOrEqual(20);
  });

  test('difícil: chega ao 50', async ({ game }) => {
    const seed = findSeed('hard', (s) => s.includes('50'));
    await game.open({ difficulty: 'hard', seed });

    expect(await game.symbols()).toContain('50');
    for (const n of numbersOf(await game.symbols())) expect(n).toBeLessThanOrEqual(50);
  });
});

test.describe('números de dois algarismos na carta', () => {
  test('cabem na carta, em uma linha, nos menores tamanhos de tela', async ({ game, page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const seed = findSeed('hard', (s) => s.includes('50') && numbersOf(s).filter((n) => n >= 10).length >= 2);
    await game.open({ difficulty: 'hard', seed });

    const glyphs = await game.page.locator('.glyph[data-len="2"]').all();
    expect(glyphs.length).toBeGreaterThan(0);
    for (const glyph of glyphs) {
      const card = await glyph.locator('xpath=ancestor::*[contains(@class,"card")][1]').boundingBox();
      const text = await glyph.evaluate((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return { width: r.getBoundingClientRect().width, lines: r.getClientRects().length };
      });
      expect(text.width, 'largura do número').toBeLessThan(card.width * 0.9);
      expect(text.lines, 'o número ocupa uma linha só').toBe(1);
    }
  });

  test('o número de dois algarismos tem fonte menor que o de um algarismo', async ({ game }) => {
    const seed = findSeed('hard', (s) => numbersOf(s).some((n) => n >= 10) && numbersOf(s).some((n) => n < 10));
    await game.open({ difficulty: 'hard', seed });

    const size = (len) =>
      game.page.locator(`.glyph[data-len="${len}"]`).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size(2)).toBeLessThan(await size(1));
  });

  test('o 50 é falado por extenso e anunciado como "Número 50"', async ({ game }) => {
    const seed = findSeed('hard', (s) => s.includes('50'));
    await game.open({ difficulty: 'hard', seed });
    const index = (await game.symbols()).indexOf('50');

    await game.cards().nth(index).click();

    expect(await game.spoken()).toEqual(['Cinquenta']);
    await expect(game.cards().nth(index)).toHaveAttribute('aria-label', 'Número 50');
  });

  test('um número composto é falado com "e": 37 é "Trinta e sete"', async ({ game }) => {
    const seed = findSeed('hard', (s) => s.some((x) => /^[2-5][1-9]$/.test(x)));
    await game.open({ difficulty: 'hard', seed });
    const symbols = await game.symbols();
    const index = symbols.findIndex((x) => /^[2-5][1-9]$/.test(x));

    await game.cards().nth(index).click();

    expect(await game.spoken()).toEqual([Logic.numberName(Number(symbols[index]))]);
    expect((await game.spoken())[0]).toContain(' e ');
  });

  test('ao achar o par de um número, a voz repete o nome e elogia', async ({ game }) => {
    const seed = findSeed('hard', (s) => s.includes('50'));
    await game.open({ difficulty: 'hard', seed });
    const symbols = await game.symbols();
    const indexes = symbols.map((x, i) => (x === '50' ? i : -1)).filter((i) => i >= 0);

    await game.flipPair(indexes[0], indexes[1]);

    expect(await game.spoken()).toContain('Cinquenta! Muito bem!');
  });

  test('uma partida difícil com números até 50 pode ser concluída', async ({ game }) => {
    const seed = findSeed('hard', (s) => s.includes('50'));
    await game.open({ difficulty: 'hard', seed });

    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('#matches')).toHaveText('10/10');
  });
});
