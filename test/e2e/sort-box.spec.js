// "Na caixa certa": a criança ARRASTA cada peça para a caixa certa (separar) ou os objetos pedidos
// para o prato (dar). O sorteio usa semente: o teste sabe o que cada peça é e onde ela vai.
const { test, expect, ADVANCE_DELAY_MS, shownDots, litDots } = require('./fixtures');
const Logic = require('../../assets/games/sort-box/sort-box-logic.js');

test.use({ gameId: 'sort-box' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

const centerOf = async (locator) => {
  const b = await locator.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test.describe('rodada', () => {
  test('mostra as caixas e a pilha de cada nível, e a voz diz o pedido', async ({ game }) => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      await game.open({ level });
      const round = game.plan.rounds[0];

      await expect(game.page.locator('.box'), `nível ${level}`).toHaveCount(round.targets.length);
      await expect(game.looseItems(), `nível ${level}`).toHaveCount(round.items.length);
      await expect(game.page.locator('#progress .dot'), `nível ${level}`).toHaveCount(shownDots(game.plan.total));
      expect(await game.spoken(), `nível ${level}`).toEqual([Logic.promptFor(round)]);
      await game.page.reload();
    }
  });

  test('cada caixa tem o seu nome e tocar nela a voz diz', async ({ game }) => {
    await game.open({ level: 4 });
    const round = game.plan.rounds[0];
    const labels = await game.page.locator('.box .box-label').evaluateAll((els) => els.map((e) => e.textContent));
    expect(labels).toEqual(round.targets.map((t) => t.label));

    await game.box('consonant').click();
    expect((await game.spoken()).at(-1)).toBe('Consoantes');
    await game.box('number').click();
    expect((await game.spoken()).at(-1)).toBe('Números');
  });

  test('todas as peças têm a mesma cor: a cor de uma letra ou de um número não entrega a caixa', async ({ game }) => {
    await game.open({ level: 4 });
    const colors = await game.looseItems().evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).color))]);
    expect(colors).toHaveLength(1);
  });

  test('as peças são as da rodada, com o nome certo para leitores de tela', async ({ game }) => {
    await game.open({ level: 2 });
    const round = game.plan.rounds[0];
    for (const item of round.items) {
      await expect(game.item(item.id)).toHaveAttribute('aria-label', item.say);
      await expect(game.item(item.id)).toHaveText(item.glyph);
    }
  });

  test('os desenhos dos objetos de TODOS os pedidos carregam', async ({ game }) => {
    for (const level of [3, 5]) {
      await game.open({ level });
      for (let i = 0; i < game.plan.rounds.length; i++) {
        const ok = await game.page.locator('#tray .item img').evaluateAll((imgs) => imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0));
        expect(ok, `nível ${level}: pedido ${i + 1}`).toBe(true);
        await game.solveRound();
      }
      await game.page.reload();
    }
  });
});

test.describe('separar', () => {
  test('a peça certa na caixa certa: vai para dentro dela, encolhe, trava e a voz diz o que é', async ({ game }) => {
    await game.open({ level: 1 });
    const item = game.wanted()[0];
    const before = await game.item(item.id).boundingBox();

    await game.placeRight(item);

    const placed = game.box(item.target).locator(`.item[data-item="${item.id}"]`);
    await expect(placed).toHaveCount(1);
    await expect(placed).toHaveClass(/placed/);
    await expect(placed).not.toHaveClass(/draggable/);
    const after = await placed.boundingBox();
    expect(after.width, 'a peça encolhe na caixa').toBeLessThan(before.width);
    const box = await game.box(item.target).boundingBox();
    expect(after.x).toBeGreaterThanOrEqual(box.x - 0.5);
    expect(after.x + after.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(after.y + after.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(game.round(), item.id, false));
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
    await expect(game.looseItems()).toHaveCount(game.round().items.length - 1);
  });

  test('a casa da peça fica na pilha: as outras peças não mudam de lugar', async ({ game }) => {
    await game.open({ level: 2 });
    const [first, second] = game.wanted();
    const before = await centerOf(game.item(second.id));

    await game.placeRight(first);

    const after = await centerOf(game.item(second.id));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test('a peça na caixa errada volta; a caixa balança e a voz diz que não é daquela caixa', async ({ game }) => {
    await game.open({ level: 1 });
    const { item, boxId } = await game.wrongDrop();
    const before = await centerOf(game.item(item.id));

    await game.dragTo(game.item(item.id), game.box(boxId));
    await expect(game.box(boxId)).toHaveClass(/shake/);
    await game.settled();

    await expect(game.looseItems()).toHaveCount(game.round().items.length);
    expect(await game.box(boxId).locator('.item').count()).toBe(0);
    const after = await centerOf(game.item(item.id));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect((await game.spoken()).at(-1)).toBe(Logic.wrongSpeechFor(game.round(), item.id, boxId));
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
  });

  test('soltar fora de todas as caixas: a peça volta e não conta erro', async ({ game }) => {
    await game.open({ level: 1 });
    const item = game.wanted()[0];
    const spokenBefore = (await game.spoken()).length;

    await game.dragToPoint(game.item(item.id), 20, 150);
    await game.settled();

    await expect(game.looseItems()).toHaveCount(game.round().items.length);
    expect((await game.spoken()).length).toBe(spokenBefore);
    await game.solve();
    const [done] = await complete(game);
    expect(done.moves).toBe(0);
    expect(done.stars).toBe(3);
  });

  test('nos níveis de 3 caixas, cada categoria vai para a sua', async ({ game }) => {
    await game.open({ level: 4 });
    for (const item of game.wanted()) await game.placeRight(item);

    await expect(game.page.locator('.box .item.placed')).toHaveCount(9);
    for (const target of game.round().targets) {
      const expected = game.round().items.filter((i) => i.target === target.id).length;
      await expect(game.box(target.id).locator('.item.placed')).toHaveCount(expected);
    }
  });

  test('as peças de todas as caixas cabem lá dentro (nível 6, 12 peças)', async ({ game }) => {
    await game.open({ level: 6 });
    for (const item of game.wanted()) await game.placeRight(item);
    await game.settled();

    for (const box of await game.page.locator('.box').all()) {
      const b = await box.boundingBox();
      for (const chip of await box.locator('.item.placed').all()) {
        const c = await chip.boundingBox();
        expect(c.x).toBeGreaterThanOrEqual(b.x - 0.5);
        expect(c.x + c.width).toBeLessThanOrEqual(b.x + b.width + 0.5);
        expect(c.y).toBeGreaterThanOrEqual(b.y - 0.5);
        expect(c.y + c.height).toBeLessThanOrEqual(b.y + b.height + 0.5);
      }
    }
  });

  test('funciona com o dedo: eventos de ponteiro de toque', async ({ game }) => {
    await game.open({ level: 1 });
    const item = game.wanted()[0];

    await game.touchDrag(game.item(item.id), game.box(item.target));
    await game.settled();

    await expect(game.box(item.target).locator(`.item[data-item="${item.id}"]`)).toHaveCount(1);
  });

  test('um toque curto numa peça diz o que ela é, e a peça não sai do lugar', async ({ game }) => {
    await game.open({ level: 1 });
    const item = game.wanted()[0];
    const before = await centerOf(game.item(item.id));

    await game.item(item.id).click();

    expect((await game.spoken()).at(-1)).toBe(item.say);
    const after = await centerOf(game.item(item.id));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await expect(game.page.locator('.box .item')).toHaveCount(0);
  });

  test('a última peça termina a rodada: a voz elogia, a Mia comemora e o jogo acaba', async ({ game }) => {
    await game.open({ level: 2 });
    const wanted = game.wanted();
    for (const item of wanted.slice(0, -1)) await game.placeRight(item);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
    expect(await complete(game)).toHaveLength(0);

    const last = wanted.at(-1);
    await game.placeRight(last);

    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(game.round(), last.id, true));
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_cheer\.svg$/);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(6);
    await game.tick(ADVANCE_DELAY_MS);
    await expect(game.page.locator('#result-modal')).toBeVisible();
  });
});

test.describe('dar', () => {
  test('mostra o prato com o número pedido, os objetos pedidos e os que não são', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.round();

    await expect(game.page.locator('.box')).toHaveCount(1);
    await expect(game.box('plate').locator('.box-label')).toHaveText(String(round.goal));
    await expect(game.looseItems()).toHaveCount(round.items.length);
    const keys = await game.looseItems().evaluateAll((els) => els.map((e) => e.dataset.key));
    expect(keys.filter((k) => k === round.object.id)).toHaveLength(round.goal + 1);
    expect(keys.filter((k) => k !== round.object.id)).toHaveLength(2);
    expect((await game.spoken()).at(-1)).toBe(`Dê ${Logic.quantityFor(round.object, round.goal)} para a Mia!`);
  });

  test('a voz conta cada objeto que cai no prato; no número pedido a rodada termina', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.round();
    const asked = game.wanted();

    for (let i = 0; i < round.goal; i++) {
      await game.placeRight(asked[i]);
      const last = i === round.goal - 1;
      expect((await game.spoken()).at(-1), `objeto ${i + 1}`).toBe(Logic.countSpeechFor(round, i + 1, last));
      await expect(game.page.locator('#progress .dot.done')).toHaveCount(litDots(i + 1, game.plan.total));
    }
    await expect(game.box('plate').locator('.item.placed')).toHaveCount(round.goal);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_cheer\.svg$/);
  });

  test('os objetos que sobram na pilha ficam parados depois do pedido', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.round();
    for (const item of game.wanted().slice(0, round.goal)) await game.placeRight(item);

    await expect(game.looseItems(), 'nenhuma peça segue arrastável').toHaveCount(0);
    const locked = game.page.locator('#tray .item.locked');
    expect(await locked.count()).toBeGreaterThan(0);

    // tentar arrastar uma que sobrou não faz nada
    const spare = locked.first();
    const spareCenter = await centerOf(spare);
    await game.dragTo(spare, game.box('plate'));
    await game.settled();
    await expect(game.box('plate').locator('.item.placed')).toHaveCount(round.goal);
    const after = await centerOf(spare);
    expect(Math.abs(after.x - spareCenter.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - spareCenter.y)).toBeLessThanOrEqual(1);
  });

  test('um objeto que não foi pedido: volta, e a voz diz o que é e o que procurar', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.round();
    const intruder = round.items.find((i) => i.target === null);

    await game.drop(intruder.id, 'plate');

    await expect(game.looseItems()).toHaveCount(round.items.length);
    await expect(game.box('plate').locator('.item')).toHaveCount(0);
    expect((await game.spoken()).at(-1)).toBe(Logic.wrongSpeechFor(round, intruder.id, 'plate'));
    expect((await game.spoken()).at(-1)).toMatch(/^(Essa é uma|Esse é um) .*\. Procure (as|os) .*!$/);
  });

  test('depois da pausa vem o pedido seguinte: prato vazio, pilha nova, estrelas de progresso mantidas', async ({ game }) => {
    await game.open({ level: 3 });
    const first = game.round();
    await game.solveRound();

    const second = game.round();
    await expect(game.box('plate').locator('.box-label')).toHaveText(String(second.goal));
    await expect(game.box('plate').locator('.item')).toHaveCount(0);
    await expect(game.looseItems()).toHaveCount(second.items.length);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(litDots(first.goal, game.plan.total));
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second));
  });

  test('os 3 pedidos de uma partida: a Flutter recebe o fim com todas as peças contadas', async ({ game }) => {
    await game.open({ level: 5 });
    await game.solve();

    const [done] = await complete(game);
    expect(done).toMatchObject({ gameId: 'sort-box', level: 5, moves: 0, matches: game.plan.total, stars: 3 });
    expect(game.plan.total).toBeLessThanOrEqual(12);
    await expect(game.page.locator('#result-modal')).toBeVisible();
  });
});

test.describe('estrelas de progresso', () => {
  test('com muitas peças, há no máximo 8 estrelas; cada uma vale mais de uma peça e a última só acende com a última peça', async ({ game }) => {
    await game.open({ level: 6 });   // 12 peças
    const total = game.plan.total;
    expect(total).toBe(12);
    await expect(game.page.locator('#progress .dot')).toHaveCount(8);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);

    const wanted = game.wanted();
    let previous = 0;
    for (const [i, item] of wanted.entries()) {
      await game.placeRight(item);
      const lit = await game.page.locator('#progress .dot.done').count();
      expect(lit, `depois de ${i + 1} peças`).toBe(litDots(i + 1, total));
      expect(lit).toBeGreaterThanOrEqual(previous);   // nunca apaga
      if (i < total - 1) expect(lit, 'a última estrela só acende no fim').toBeLessThan(8);
      previous = lit;
    }
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(8);
  });

  test('com poucas peças, uma estrela por peça (como nos outros jogos)', async ({ game }) => {
    await game.open({ level: 1 });   // 6 peças
    await expect(game.page.locator('#progress .dot')).toHaveCount(6);
    await game.placeRight(game.wanted()[0]);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
  });
});

test.describe('dica', () => {
  test('depois de 2 erros, a peça certa e a caixa dela pulsam; a peça que pulsa ainda acompanha o dedo', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.round();
    const first = game.wanted()[0];
    const wrongBox = round.targets.find((t) => t.id !== first.target).id;
    await game.drop(first.id, wrongBox);
    await expect(game.page.locator('.pulse')).toHaveCount(0);
    await game.drop(first.id, wrongBox);

    await expect(game.item(first.id)).toHaveClass(/pulse/);
    await expect(game.box(first.target)).toHaveClass(/pulse/);

    const before = await centerOf(game.item(first.id));
    await game.dragTo(game.item(first.id), game.box(first.target), { drop: false });
    const held = await centerOf(game.item(first.id));
    const box = await centerOf(game.box(first.target));
    expect(Math.hypot(held.x - before.x, held.y - before.y)).toBeGreaterThan(20);
    expect(Math.abs(held.x - box.x)).toBeLessThanOrEqual(2);
    await game.page.mouse.up();
    await game.settled();

    await expect(game.box(first.target).locator(`.item[data-item="${first.id}"]`)).toHaveCount(1);
  });
});

test.describe('fim da partida', () => {
  test('uma partida perfeita: 3 estrelas, sem erros, e o Flutter recebe tudo', async ({ game }) => {
    await game.open({ level: 4 });
    await game.solve();

    const [done] = await complete(game);
    expect(done).toMatchObject({ gameId: 'sort-box', level: 4, moves: 0, matches: 9, stars: 3 });
    expect(await complete(game)).toHaveLength(1);
    await expect(game.page.locator('#stars .star.earned')).toHaveCount(3);
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Que incrível!');
  });

  test('os erros viram "moves" e as estrelas seguem a tabela do nível', async ({ game }) => {
    await game.open({ level: 1 });
    // 2 erros: no nível 1, até 4 erros ainda valem 2 estrelas e só 1 vale 3
    await game.dropWrong();
    await game.dropWrong();
    await game.solve();

    const [done] = await complete(game);
    expect(done.moves).toBe(2);
    expect(done.stars).toBe(Logic.starsFor(1, 2));
    expect(done.stars).toBe(2);
  });

  test('o mesmo número de erros vale menos estrelas num nível mais alto', async ({ game }) => {
    await game.open({ level: 6 });
    await game.dropWrong();
    await game.dropWrong();
    await game.dropWrong();
    await game.dropWrong();
    await game.dropWrong();
    await game.solve();

    const [done] = await complete(game);
    expect(done.moves).toBe(5);
    expect(done.stars).toBe(Logic.starsFor(6, 5));
    expect(done.stars).toBe(1);
  });

  test('o tempo só corre depois do primeiro toque', async ({ game }) => {
    await game.open({ level: 1 });
    await game.tick(20000);   // parado, olhando a tela: não conta
    await game.solve();

    const [done] = await complete(game);
    expect(done.timeSeconds).toBeLessThan(10);
  });

  test('jogar de novo recomeça do zero, com a pilha nova', async ({ game }) => {
    await game.open({ level: 1 });
    await game.solve();

    await game.page.click('#btn-play-again');

    await expect(game.page.locator('#result-modal')).toBeHidden();
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.box .item')).toHaveCount(0);
    await expect(game.looseItems()).toHaveCount(6);
  });

  test('o recorde: uma partida melhor que a salva mostra "Novo recorde!"', async ({ game }) => {
    await game.open({ level: 1, best: { stars: 2, moves: 3 } });
    await game.solve();
    await expect(game.page.locator('#new-record')).toBeVisible();
  });
});

test.describe('reiniciar e girar', () => {
  test('reiniciar no meio da pausa: a pausa antiga não mexe na partida nova', async ({ game }) => {
    await game.open({ level: 3 });
    for (const item of game.wanted().slice(0, game.round().goal)) await game.placeRight(item);   // pedido pronto, pausa pendente
    await game.page.click('#btn-reset');

    await game.tick(ADVANCE_DELAY_MS * 2);

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.box .item')).toHaveCount(0);
    expect(await complete(game)).toHaveLength(0);
  });

  test('reiniciar e girar a tela no meio do arrasto: a peça volta e soltar o dedo depois não encaixa nada', async ({ game }) => {
    await game.open({ level: 1 });
    const item = game.wanted()[0];

    await game.dragTo(game.item(item.id), game.box(item.target), { drop: false });
    await expect(game.item(item.id)).toHaveClass(/dragging/);
    await game.page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(game.item(item.id)).not.toHaveClass(/dragging/);
    await game.page.mouse.up();
    await game.settled();
    await expect(game.page.locator('.box .item')).toHaveCount(0);

    await game.dragTo(game.item(item.id), game.box(item.target), { drop: false });
    await game.page.evaluate(() => document.getElementById('btn-reset').click());
    await game.page.mouse.up();
    await game.settled();
    await expect(game.page.locator('.box .item')).toHaveCount(0);
    await expect(game.looseItems()).toHaveCount(6);
  });
});

test.describe('sons', () => {
  test('pegar, encaixar e errar tocam sons', async ({ game }) => {
    await game.open({ level: 1 });
    expect(await game.notes()).toBe(0);
    await game.dropWrong();
    const afterWrong = await game.notes();
    expect(afterWrong).toBeGreaterThan(0);
    await game.placeRight(game.wanted()[0]);
    expect(await game.notes()).toBeGreaterThan(afterWrong);
  });

  test('com o som desligado nos ajustes, o jogo fica em silêncio', async ({ game }) => {
    await game.open({ level: 1, sound: false });
    await game.dropWrong();
    await game.solve();
    expect(await game.notes()).toBe(0);
  });
});
