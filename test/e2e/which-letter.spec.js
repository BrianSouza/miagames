// "Qual é a letra?": a voz pergunta, a criança toca na figura certa.
// O sorteio usa semente: o teste sabe a resposta certa de cada rodada.
const { test, expect, ADVANCE_DELAY_MS } = require('./fixtures');
const Logic = require('../../assets/games/which-letter/which-letter-logic.js');
const Symbols = require('../../assets/games/_shared/symbols.js');

test.use({ gameId: 'which-letter' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

test.describe('partida', () => {
  test('mostra as figuras do nível, uma estrela por rodada, e a voz faz a pergunta', async ({ game }) => {
    for (const [difficulty, count] of [['easy', 3], ['medium', 4], ['hard', 6]]) {
      await game.open({ difficulty });
      await expect(game.options(), difficulty).toHaveCount(count);
      await expect(game.page.locator('#progress .dot')).toHaveCount(8);
      const first = game.plan.rounds[0].answer;
      expect(await game.spoken(), difficulty).toEqual([Logic.promptFor(first)]);
      await game.page.reload();
    }
  });

  test('a pergunta é falada pelo nome da letra, não pelo símbolo', async ({ game }) => {
    await game.open();
    const [prompt] = await game.spoken();
    expect(prompt).toMatch(/^Qual é a letra \S+\?$/);
    expect(prompt).not.toContain(game.plan.rounds[0].answer.symbol + '?');
  });

  test('acertar fala o nome, acende uma estrela e passa para a próxima pergunta', async ({ game }) => {
    await game.open();
    const first = game.plan.rounds[0].answer;

    await game.option(first.symbol).click();

    await expect(game.option(first.symbol)).toHaveClass(/correct/);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
    expect((await game.spoken()).at(-1)).toBe(`${first.name}! Muito bem!`);
    await expect(game.page.locator('#options')).toHaveClass(/locked/);

    await game.tick(ADVANCE_DELAY_MS);
    const second = game.plan.rounds[1].answer;
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second));
    await expect(game.page.locator('#options')).not.toHaveClass(/locked/);
    await expect(game.page.locator('.option.correct')).toHaveCount(0);
  });

  test('a Mia comemora ao acertar e volta ao normal na pergunta seguinte', async ({ game }) => {
    await game.open();
    const mia = game.page.locator('#mia');
    await expect(mia).toHaveAttribute('src', /mia_happy\.svg$/);

    await game.option(await game.correctSymbol()).click();
    await expect(mia).toHaveAttribute('src', /mia_cheer\.svg$/);

    await game.tick(ADVANCE_DELAY_MS);
    await expect(mia).toHaveAttribute('src', /mia_happy\.svg$/);
  });

  test('uma partida perfeita termina com 3 estrelas e envia o resultado', async ({ game }) => {
    await game.open({ difficulty: 'easy' });

    await game.solve();

    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('.star.earned')).toHaveCount(3);
    const [msg, ...others] = await complete(game);
    expect(others).toHaveLength(0);
    expect(msg).toMatchObject({
      gameId: 'which-letter',
      difficulty: 'easy',
      moves: 0, // erros
      matches: 8,
      stars: 3,
    });
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Você acertou tudo!');
  });

  test('o tempo só começa no primeiro toque', async ({ game }) => {
    await game.open();
    await game.tick(60_000); // um minuto ouvindo a pergunta

    await game.solve(); // 8 rodadas × 1500 ms de pausa

    const [msg] = await complete(game);
    expect(msg.timeSeconds).toBe(12); // 8 pausas de 1500 ms, contadas a partir do primeiro toque
  });
});

test.describe('errar sem castigo', () => {
  test('a figura errada balança e some de leve, a voz incentiva e o erro é contado', async ({ game }) => {
    await game.open();
    const wrong = await game.wrongSymbol();

    await game.option(wrong).click();

    await expect(game.option(wrong)).toHaveClass(/shake/);
    await expect(game.option(wrong)).toHaveClass(/wrong/);
    expect((await game.spoken()).at(-1)).toBe('Tente de novo!');
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);

    await game.tick(500);
    await expect(game.option(wrong)).not.toHaveClass(/shake/);
    await expect(game.options()).toHaveCount(3); // continua tudo na tela
  });

  test('tocar de novo na figura errada não conta outro erro', async ({ game }) => {
    await game.open();
    const wrong = await game.wrongSymbol();
    await game.option(wrong).click();
    await game.option(wrong).click({ force: true });
    await game.option(wrong).click({ force: true });

    await game.solve();

    const [msg] = await complete(game);
    expect(msg.moves).toBe(1);
  });

  test('depois de 2 erros a resposta certa "respira" e a pergunta se repete', async ({ game }) => {
    await game.open({ difficulty: 'medium' });
    const right = await game.correctSymbol();
    const prompt = Logic.promptFor(game.plan.rounds[0].answer);

    await game.option(await game.wrongSymbol(0)).click();
    await expect(game.option(right)).not.toHaveClass(/pulse/);
    await game.option(await game.wrongSymbol(1)).click();

    await expect(game.option(right)).toHaveClass(/pulse/);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_think\.svg$/);
    expect((await game.spoken()).at(-1)).toBe(prompt);

    // a dica ajuda a acertar; a próxima rodada começa sem ela
    await game.option(right).click({ force: true }); // pulsa sem parar: o Playwright esperaria
    await game.tick(ADVANCE_DELAY_MS);
    await expect(game.page.locator('.option.pulse')).toHaveCount(0);
  });

  test('quem erra em metade das rodadas ganha 1 estrela e os erros vão para o Flutter', async ({ game }) => {
    await game.open({ difficulty: 'easy' });

    // 4 rodadas com um erro antes de acertar, 4 perfeitas: 4 acertos de primeira de 8
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) await game.option(await game.wrongSymbol()).click();
      await game.answerRight();
    }

    const [msg] = await complete(game);
    expect(msg).toMatchObject({ moves: 4, stars: 1, matches: 8 });
    await expect(game.page.locator('.star.earned')).toHaveCount(1);
  });

  test('2 erros em uma rodada só contam como 2 erros (a rodada não vale de primeira)', async ({ game }) => {
    await game.open({ difficulty: 'easy' });
    await game.option(await game.wrongSymbol(0)).click();
    await game.option(await game.wrongSymbol(1)).click();
    await game.answerRight();
    for (let i = 1; i < 8; i++) await game.answerRight();

    const [msg] = await complete(game);
    expect(msg).toMatchObject({ moves: 2, stars: 3 }); // 7 de 8 de primeira ainda são 3 estrelas
  });
});

test.describe('ouvir de novo', () => {
  test('o botão de alto-falante repete a pergunta', async ({ game }) => {
    await game.open();
    const prompt = Logic.promptFor(game.plan.rounds[0].answer);

    await game.page.click('#btn-listen');

    expect(await game.spoken()).toEqual([prompt, prompt]);
  });

  test('tocar na Mia também repete a pergunta', async ({ game }) => {
    await game.open();
    const prompt = Logic.promptFor(game.plan.rounds[0].answer);

    await game.page.click('#asker');

    expect(await game.spoken()).toEqual([prompt, prompt]);
  });

  test('o botão tem tamanho de toque e nome para leitores de tela', async ({ game }) => {
    await game.open();
    await expect(game.page.getByRole('button', { name: 'Ouvir de novo' })).toBeVisible();
    const size = await game.page.locator('#btn-listen').evaluate((el) => el.offsetWidth);
    expect(size).toBeGreaterThanOrEqual(60);
  });
});

test.describe('reiniciar', () => {
  test('reiniciar durante a pausa de comemoração não pula a primeira rodada do jogo novo', async ({ game }) => {
    await game.open();
    await game.option(await game.correctSymbol()).click(); // pausa de 1500 ms em andamento
    await game.page.click('#btn-reset');

    await game.tick(ADVANCE_DELAY_MS + 100);

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.options()).toHaveCount(3);
    await expect(game.page.locator('.option.correct')).toHaveCount(0);
  });

  test('o jogo novo continua jogável e completa normalmente', async ({ game }) => {
    await game.open();
    await game.option(await game.correctSymbol()).click();
    await game.page.click('#btn-reset');
    await game.tick(ADVANCE_DELAY_MS);

    // o sorteio do jogo novo é outro (a semente continua): descobre a resposta pela voz
    for (let i = 0; i < 8; i++) {
      const prompt = (await game.spoken()).filter((t) => t.startsWith('Qual é')).at(-1);
      const name = prompt.replace(/^Qual é a letra /, '').replace(/\?$/, '');
      const item = Symbols.LETTERS.find((l) => l.name === name);
      await game.option(item.symbol).click();
      await game.tick(ADVANCE_DELAY_MS);
    }

    await expect(game.page.locator('#result-modal')).toBeVisible();
    expect(await complete(game)).toHaveLength(1);
  });

  test('"Jogar de novo" começa uma partida nova', async ({ game }) => {
    await game.open();
    await game.solve();

    await game.page.click('#btn-play-again');

    await expect(game.page.locator('#result-modal')).toBeHidden();
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.options()).toHaveCount(3);
  });
});

test.describe('recorde, som e saída', () => {
  test('bater o recorde mostra "Novo recorde!" e fala', async ({ game }) => {
    await game.open({ best: { stars: 2, moves: 3 } });
    await game.solve();

    await expect(game.page.locator('#new-record')).toBeVisible();
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Novo recorde!');
  });

  test('a primeira partida não é "novo recorde"', async ({ game }) => {
    await game.open({ best: null });
    await game.solve();
    await expect(game.page.locator('#new-record')).toBeHidden();
  });

  test('toca sons, e fica em silêncio quando os sons estão desligados', async ({ game }) => {
    await game.open({ sound: false });
    await game.option(await game.wrongSymbol()).click();
    await game.answerRight();
    expect(await game.notes()).toBe(0);
  });

  test('um toque no voltar só mostra a dica; segurar sai', async ({ game }) => {
    await game.open();
    await game.page.click('#btn-back');
    await expect(game.page.locator('#exit-hint')).toBeVisible();
    expect((await game.messages()).filter((m) => m.type === 'NAVIGATE_BACK')).toHaveLength(0);

    const box = await game.page.locator('#btn-back').boundingBox();
    await game.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await game.page.mouse.down();
    await game.tick(800);
    await game.page.mouse.up();
    expect((await game.messages()).filter((m) => m.type === 'NAVIGATE_BACK')).toHaveLength(1);
  });

  test('o botão início da tela de parabéns volta', async ({ game }) => {
    await game.open();
    await game.solve();
    await game.page.click('#btn-home');
    expect((await game.messages()).filter((m) => m.type === 'NAVIGATE_BACK')).toHaveLength(1);
  });
});

test.describe('figuras', () => {
  test('letras e números têm cores diferentes, e o número de dois algarismos cabe', async ({ game }) => {
    await game.open({ difficulty: 'hard', seed: 3 });
    // anda até uma rodada de número (sempre há 3 por partida)
    for (let i = 0; i < 8; i++) {
      const round = await game.currentRound();
      if (round.answer.kind === 'number') {
        const colors = await game.page.locator('.option').evaluateAll((els) =>
          els.map((e) => getComputedStyle(e).color),
        );
        expect(new Set(colors).size).toBe(1); // todas as figuras da rodada são números
        for (const option of await game.options().all()) {
          const fits = await option.evaluate((el) => {
            const g = el.querySelector('.glyph');
            return g.getClientRects().length === 1 && g.scrollWidth <= el.clientWidth;
          });
          expect(fits).toBe(true);
        }
        return;
      }
      await game.answerRight();
    }
    throw new Error('nenhuma rodada de número encontrada');
  });

  test('as figuras são botões com nome para leitores de tela', async ({ game }) => {
    await game.open();
    for (const option of await game.options().all()) {
      await expect(option).toHaveAttribute('aria-label', /^Letra [A-Z]$/);
    }
  });
});
