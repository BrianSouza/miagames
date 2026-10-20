// "Quantos tem?": a criança conta tocando em cada objeto (a voz fala um número por
// toque) e escolhe quantos são. O sorteio usa semente: o teste sabe a resposta certa.
const { test, expect, ADVANCE_DELAY_MS } = require('./fixtures');
const Logic = require('../../assets/games/how-many/how-many-logic.js');

test.use({ gameId: 'how-many' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

test.describe('rodada', () => {
  test('mostra a quantidade certa de objetos, as figuras do nível e a pergunta falada', async ({ game }) => {
    for (const [level, options] of [[1, 3], [2, 3], [3, 4], [4, 4], [5, 4], [6, 5]]) {
      await game.open({ level });
      const round = game.plan.rounds[0];
      await expect(game.page.locator('.obj'), `nível ${level}`).toHaveCount(round.count);
      await expect(game.options(), `nível ${level}`).toHaveCount(options);
      await expect(game.page.locator('#progress .dot')).toHaveCount(8);
      expect(await game.spoken(), `nível ${level}`).toEqual([Logic.promptFor(round.object)]);
      await game.page.reload();
    }
  });

  test('os objetos ficam em fileiras de 5', async ({ game }) => {
    await game.open({ level: 6 });
    // anda até uma rodada com mais de 5 objetos
    for (let i = 0; i < 8; i++) {
      const round = await game.currentRound();
      if (round.count > 5) {
        const rows = await game.page.locator('.obj').evaluateAll((els) => {
          const byY = {};
          els.forEach((e) => {
            const y = Math.round(e.getBoundingClientRect().y);
            byY[y] = (byY[y] || 0) + 1;
          });
          return Object.entries(byY)
            .sort((a, b) => a[0] - b[0])
            .map(([, n]) => n);
        });
        const full = Math.floor(round.count / 5);
        expect(rows).toEqual([...Array(full).fill(5), ...(round.count % 5 ? [round.count % 5] : [])]);
        return;
      }
      await game.answerRight();
    }
    throw new Error('nenhuma rodada com mais de 5 objetos');
  });

  test('os desenhos carregam e o objeto da rodada é o que a voz pergunta', async ({ game }) => {
    await game.open();
    const round = game.plan.rounds[0];
    const loaded = await game.page.locator('.obj img').evaluateAll((imgs) =>
      imgs.map((i) => i.complete && i.naturalWidth > 0),
    );
    expect(loaded.every(Boolean)).toBe(true);
    await expect(game.page.locator('.obj img').first()).toHaveAttribute('src', `img/${round.object.id}.svg`);
    await expect(game.page.locator('.obj').first()).toHaveAttribute('aria-label', round.object.name);
  });

  test('as figuras de resposta são números em ordem crescente', async ({ game }) => {
    await game.open({ level: 3 });
    const symbols = await game.options().evaluateAll((els) => els.map((e) => Number(e.dataset.symbol)));
    expect(symbols).toEqual([...symbols].sort((a, b) => a - b));
    expect(symbols).toContain(game.plan.rounds[0].count);
  });
});

test.describe('contar tocando', () => {
  test('cada objeto novo fala o próximo número e ganha o número ao lado', async ({ game }) => {
    await game.open({ level: 6 });
    const prompt = Logic.promptFor(game.plan.rounds[0].object);
    const objects = game.page.locator('.obj');

    // toca fora de ordem: o número segue a ordem dos toques
    await objects.nth(2).click();
    await objects.nth(0).click();
    await objects.nth(1).click();

    expect(await game.spoken()).toEqual([prompt, 'Um', 'Dois', 'Três']);
    await expect(objects.nth(2).locator('.badge')).toHaveText('1');
    await expect(objects.nth(0).locator('.badge')).toHaveText('2');
    await expect(objects.nth(1).locator('.badge')).toHaveText('3');
  });

  test('tocar de novo no mesmo objeto não conta outra vez', async ({ game }) => {
    await game.open();
    const first = game.page.locator('.obj').first();
    await first.click();
    await first.click();
    await first.click();

    expect((await game.spoken()).filter((t) => t === 'Um')).toHaveLength(1);
    await expect(first.locator('.badge')).toHaveCount(1);
  });

  test('contar não é responder: nenhum toque nos objetos conta erro nem acerto', async ({ game }) => {
    await game.open();
    for (const obj of await game.page.locator('.obj').all()) await obj.click();

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.option.wrong, .option.correct')).toHaveCount(0);
  });

  test('a contagem recomeça na rodada seguinte', async ({ game }) => {
    await game.open();
    await game.page.locator('.obj').first().click();
    await game.answerRight();

    await expect(game.page.locator('.badge')).toHaveCount(0);
    await game.page.locator('.obj').first().click();
    expect((await game.spoken()).filter((t) => t === 'Um')).toHaveLength(2);
  });

  test('conta até 20 por extenso', async ({ game }) => {
    await game.open({ level: 6 });
    for (let i = 0; i < 8; i++) {
      const round = await game.currentRound();
      if (round.count === Math.max(...game.plan.rounds.map((r) => r.count))) {
        for (const obj of await game.page.locator('.obj').all()) await obj.click();
        const spoken = await game.spoken();
        expect(spoken.slice(-round.count)).toEqual(
          Array.from({ length: round.count }, (_, n) => Logic.numberName(n + 1)),
        );
        return;
      }
      await game.answerRight();
    }
  });
});

test.describe('responder', () => {
  test('acertar fala o número, acende uma estrela e passa para a próxima', async ({ game }) => {
    await game.open();
    const first = game.plan.rounds[0];

    await game.option(String(first.count)).click();

    await expect(game.option(String(first.count))).toHaveClass(/correct/);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
    expect((await game.spoken()).at(-1)).toBe(`${Logic.numberName(first.count)}! Muito bem!`);

    await game.tick(ADVANCE_DELAY_MS);
    const second = game.plan.rounds[1];
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second.object));
    await expect(game.page.locator('.obj')).toHaveCount(second.count);
  });

  test('errar balança e some de leve; depois de 2 erros a certa respira', async ({ game }) => {
    await game.open({ level: 3 });
    const right = await game.correctSymbol();

    const wrong0 = await game.wrongSymbol(0);
    await game.option(wrong0).click();
    await expect(game.option(wrong0)).toHaveClass(/shake/);
    await expect(game.option(wrong0)).toHaveClass(/wrong/);
    expect((await game.spoken()).at(-1)).toBe('Tente de novo!');

    await game.option(await game.wrongSymbol(1)).click();
    await expect(game.option(right)).toHaveClass(/pulse/);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(game.plan.rounds[0].object));
  });

  test('uma partida perfeita termina com 3 estrelas e envia o resultado', async ({ game }) => {
    await game.open({ level: 1 });
    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('.star.earned')).toHaveCount(3);
    const [msg, ...others] = await complete(game);
    expect(others).toHaveLength(0);
    expect(msg).toMatchObject({ gameId: 'how-many', level: 1, moves: 0, matches: 8, stars: 3 });
  });

  test('erros viram o "moves" do resultado e baixam as estrelas', async ({ game }) => {
    await game.open({ level: 3 });
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) await game.option(await game.wrongSymbol()).click();
      await game.answerRight();
    }
    const [msg] = await complete(game);
    expect(msg).toMatchObject({ moves: 4, stars: 1 });
  });

  test('todos os cinco objetos aparecem numa partida', async ({ game }) => {
    await game.open({ level: 3 });
    expect(new Set(game.plan.rounds.map((r) => r.object.id)).size).toBeGreaterThanOrEqual(4);
    const seen = new Set();
    for (let i = 0; i < 8; i++) {
      seen.add(await game.page.locator('.obj img').first().getAttribute('src'));
      await game.answerRight();
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  test('reiniciar durante a pausa não pula a primeira rodada do jogo novo', async ({ game }) => {
    await game.open();
    await game.option(await game.correctSymbol()).click();
    await game.page.click('#btn-reset');
    await game.tick(ADVANCE_DELAY_MS + 100);

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.option.correct')).toHaveCount(0);
  });

  test('"Ouvir de novo" e a Mia repetem a pergunta', async ({ game }) => {
    await game.open();
    const prompt = Logic.promptFor(game.plan.rounds[0].object);
    await game.page.click('#btn-listen');
    await game.page.click('#asker');
    expect(await game.spoken()).toEqual([prompt, prompt, prompt]);
  });
});
