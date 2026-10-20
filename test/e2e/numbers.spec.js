// Números até 50: o alcance cresce com o nível (0–5, 0–9, 0–15, 0–20, 0–30 e 0–50) e os números de dois algarismos precisam caber na carta e ser
// falados por extenso.
const { test, expect, prng } = require('./fixtures');
const Logic = require('../../assets/games/memory/memory-logic.js');

/** Primeira semente cujo tabuleiro (calculado no Node) satisfaz o predicado */
function findSeed(level, predicate) {
  for (let seed = 1; seed < 20000; seed++) {
    const state = Logic.createGame(level, { random: prng(seed) });
    if (predicate(state.cards.map((c) => c.symbol))) return seed;
  }
  throw new Error(`nenhuma semente produz o tabuleiro pedido (nível ${level})`);
}

const numbersOf = (symbols) => symbols.filter((x) => /^\d+$/.test(x)).map(Number);

test.describe('alcance dos números', () => {
  test('o tabuleiro da página é o mesmo que o Node calcula com a semente', async ({ game }) => {
    await game.open({ level: 6, seed: 123 });

    const expected = Logic.createGame(6, { random: prng(123) }).cards.map((c) => c.symbol);
    expect(await game.symbols()).toEqual(expected);
  });

  test('nível 2: só algarismos soltos (0 a 9)', async ({ game }) => {
    const seed = findSeed(2, (s) => numbersOf(s).length > 0);
    await game.open({ level: 2, seed });

    const numbers = numbersOf(await game.symbols());
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(n).toBeLessThanOrEqual(9);
  });

  test('nível 4: chega a números de dois algarismos, até 20', async ({ game }) => {
    const seed = findSeed(4, (s) => numbersOf(s).some((n) => n >= 10));
    await game.open({ level: 4, seed });

    const numbers = numbersOf(await game.symbols());
    expect(numbers.some((n) => n >= 10)).toBe(true);
    for (const n of numbers) expect(n).toBeLessThanOrEqual(20);
  });

  test('nível 6: chega ao 50', async ({ game }) => {
    const seed = findSeed(6, (s) => s.includes('50'));
    await game.open({ level: 6, seed });

    expect(await game.symbols()).toContain('50');
    for (const n of numbersOf(await game.symbols())) expect(n).toBeLessThanOrEqual(50);
  });
});

test.describe('números de dois algarismos na carta', () => {
  test('cabem na carta, em uma linha, nos menores tamanhos de tela', async ({ game, page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const seed = findSeed(6, (s) => s.includes('50') && numbersOf(s).filter((n) => n >= 10).length >= 2);
    await game.open({ level: 6, seed });

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
    const seed = findSeed(6, (s) => numbersOf(s).some((n) => n >= 10) && numbersOf(s).some((n) => n < 10));
    await game.open({ level: 6, seed });

    const size = (len) =>
      game.page.locator(`.glyph[data-len="${len}"]`).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size(2)).toBeLessThan(await size(1));
  });

  test('o 50 é falado por extenso e anunciado como "Número 50"', async ({ game }) => {
    const seed = findSeed(6, (s) => s.includes('50'));
    await game.open({ level: 6, seed });
    const index = (await game.symbols()).indexOf('50');

    await game.cards().nth(index).click();

    expect(await game.spoken()).toEqual(['Cinquenta']);
    await expect(game.cards().nth(index)).toHaveAttribute('aria-label', 'Número 50');
  });

  test('um número composto é falado com "e": 37 é "Trinta e sete"', async ({ game }) => {
    const seed = findSeed(6, (s) => s.some((x) => /^[2-5][1-9]$/.test(x)));
    await game.open({ level: 6, seed });
    const symbols = await game.symbols();
    const index = symbols.findIndex((x) => /^[2-5][1-9]$/.test(x));

    await game.cards().nth(index).click();

    expect(await game.spoken()).toEqual([Logic.numberName(Number(symbols[index]))]);
    expect((await game.spoken())[0]).toContain(' e ');
  });

  test('ao achar o par de um número, a voz repete o nome e elogia', async ({ game }) => {
    const seed = findSeed(6, (s) => s.includes('50'));
    await game.open({ level: 6, seed });
    const symbols = await game.symbols();
    const indexes = symbols.map((x, i) => (x === '50' ? i : -1)).filter((i) => i >= 0);

    await game.flipPair(indexes[0], indexes[1]);

    expect(await game.spoken()).toContain('Cinquenta! Muito bem!');
  });

  test('uma partida do nível 6 com números até 50 pode ser concluída', async ({ game }) => {
    const seed = findSeed(6, (s) => s.includes('50'));
    await game.open({ level: 6, seed });

    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('#matches')).toHaveText('14/14');
  });
});
