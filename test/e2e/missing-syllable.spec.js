// "Qual sílaba falta?": o desenho de uma palavra e a palavra com uma sílaba faltando.
// O sorteio usa semente: o teste sabe a resposta certa de cada rodada.
const { test, expect, ADVANCE_DELAY_MS } = require('./fixtures');
const Logic = require('../../assets/games/missing-syllable/missing-syllable-logic.js');

test.use({ gameId: 'missing-syllable' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

/** O que a tela mostra da palavra: ['BO', '_'] */
const shownWord = (game) =>
  game.page.locator('#word .syl').evaluateAll((els) =>
    els.map((e) => (e.classList.contains('blank') ? '_' : e.textContent)),
  );

test.describe('rodada', () => {
  test('mostra o desenho, a palavra com a lacuna e as figuras do nível', async ({ game }) => {
    for (const [level, options, syllables] of [[1, 3, 2], [2, 3, 2], [3, 4, 2], [4, 3, 3], [5, 4, 3], [6, 5, 3]]) {
      await game.open({ level });
      const round = game.plan.rounds[0];

      await expect(game.page.locator('#word .syl'), `nível ${level}`).toHaveCount(syllables);
      await expect(game.page.locator('#word .blank')).toHaveCount(1);
      expect(await shownWord(game), `nível ${level}`).toEqual(
        Logic.displayFor(round).map((p) => (p.blank ? '_' : p.text)),
      );
      await expect(game.options(), `nível ${level}`).toHaveCount(options);
      await expect(game.page.locator('#picture')).toHaveAttribute('src', `img/${round.id}.svg`);
      await expect(game.page.locator('#progress .dot')).toHaveCount(8);
      expect(await game.spoken(), `nível ${level}`).toEqual([Logic.promptFor(round)]);
      await game.page.reload();
    }
  });

  test('as figuras de resposta são sílabas em maiúsculas, com a certa entre elas', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.plan.rounds[0];
    const texts = await game.options().evaluateAll((els) => els.map((e) => e.textContent));
    expect(texts).toEqual(round.optionKeys.map((k) => k.toUpperCase()));
    await expect(game.options().first()).toHaveAttribute('aria-label', /^Sílaba [A-Z]{2}$/);
  });

  test('o desenho de TODAS as palavras da partida carrega', async ({ game }) => {
    for (const level of [1, 4, 6]) {
      await game.open({ level });
      for (let i = 0; i < 8; i++) {
        const ok = await game.page.locator('#picture').evaluate((img) => img.complete && img.naturalWidth > 0);
        expect(ok, `nível ${level}: desenho da rodada ${i + 1}`).toBe(true);
        await game.answerRight();
      }
      await game.page.reload();
    }
  });
});

test.describe('responder', () => {
  test('acertar preenche a lacuna, a voz soletra e fala a palavra, e a rodada seguinte começa', async ({ game }) => {
    await game.open();
    const first = game.plan.rounds[0];

    await game.option(first.answerKey).click();

    await expect(game.page.locator('#word .blank')).toHaveCount(0);
    const filled = game.page.locator('#word .filled');
    await expect(filled).toHaveText(first.answerKey.toUpperCase());
    await expect(filled).toHaveClass(/pop/);
    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(first));
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
    await expect(game.option(first.answerKey)).toHaveClass(/correct/);

    await game.tick(ADVANCE_DELAY_MS);
    const second = game.plan.rounds[1];
    await expect(game.page.locator('#picture')).toHaveAttribute('src', `img/${second.id}.svg`);
    await expect(game.page.locator('#word .blank')).toHaveCount(1);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second));
  });

  test('errar: a voz fala a sílaba escolhida e incentiva; a figura balança e some de leve', async ({ game }) => {
    await game.open();
    const round = game.plan.rounds[0];
    const wrong = await game.wrongSymbol();

    await game.option(wrong).click();

    await expect(game.option(wrong)).toHaveClass(/shake/);
    await expect(game.option(wrong)).toHaveClass(/wrong/);
    expect((await game.spoken()).at(-1)).toBe(Logic.wrongSpeechFor(round, wrong));
    await expect(game.page.locator('#word .blank')).toHaveCount(1); // a lacuna continua aberta
  });

  test('depois de 2 erros a certa respira, a Mia pensa e a pergunta se repete', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.plan.rounds[0];

    await game.option(await game.wrongSymbol(0)).click();
    await expect(game.option(round.answerKey)).not.toHaveClass(/pulse/);
    await game.option(await game.wrongSymbol(1)).click();

    await expect(game.option(round.answerKey)).toHaveClass(/pulse/);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_think\.svg$/);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(round));
  });

  test('uma partida perfeita termina com 3 estrelas e envia o resultado', async ({ game }) => {
    await game.open({ level: 1 });
    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('.star.earned')).toHaveCount(3);
    const [msg, ...others] = await complete(game);
    expect(others).toHaveLength(0);
    expect(msg).toMatchObject({
      gameId: 'missing-syllable',
      level: 1,
      moves: 0,
      matches: 8,
      stars: 3,
    });
  });

  test('erros viram o "moves" do resultado', async ({ game }) => {
    await game.open({ level: 6 });
    for (let i = 0; i < 8; i++) {
      if (i < 3) await game.option(await game.wrongSymbol()).click();
      await game.answerRight();
    }
    const [msg] = await complete(game);
    expect(msg).toMatchObject({ gameId: 'missing-syllable', level: 6, moves: 3, stars: 1 });
  });

  test('a palavra da tela é sempre a do desenho, em todas as rodadas', async ({ game }) => {
    await game.open({ level: 6 });
    for (let i = 0; i < 8; i++) {
      const round = game.plan.rounds[i];
      const shown = await shownWord(game);
      expect(shown.length).toBe(3);
      round.syllables.forEach((s, n) => {
        if (n !== round.blankIndex) expect(shown[n]).toBe(s.toUpperCase());
        else expect(shown[n]).toBe('_');
      });
      await game.answerRight();
    }
  });

  test('"Ouvir de novo" e a Mia repetem a pergunta', async ({ game }) => {
    await game.open();
    const prompt = Logic.promptFor(game.plan.rounds[0]);
    await game.page.click('#btn-listen');
    await game.page.click('#asker');
    expect(await game.spoken()).toEqual([prompt, prompt, prompt]);
  });

  test('reiniciar durante a pausa não pula a primeira rodada do jogo novo', async ({ game }) => {
    await game.open();
    await game.option(await game.correctSymbol()).click();
    await game.page.click('#btn-reset');
    await game.tick(ADVANCE_DELAY_MS + 100);

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('#word .blank')).toHaveCount(1);
    await expect(game.page.locator('#word .filled')).toHaveCount(0);
  });
});
