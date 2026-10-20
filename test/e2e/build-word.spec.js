// "Montar a palavra": a criança ARRASTA as sílabas para as lacunas embaixo do desenho.
// O sorteio usa semente: o teste sabe a palavra de cada rodada. Arrasta-se com o mouse de verdade
// (e, num teste, com eventos de ponteiro de toque), nunca com um atalho que pule o gesto.
const { test, expect, ADVANCE_DELAY_MS } = require('./fixtures');
const Logic = require('../../assets/games/build-word/build-word-logic.js');
const Data = require('../../assets/games/_shared/words.js');

test.use({ gameId: 'build-word' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

const centerOf = async (locator) => {
  const b = await locator.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test.describe('rodada', () => {
  test('mostra o desenho, uma lacuna por sílaba e as peças do nível', async ({ game }) => {
    for (const [level, slots, tiles] of [[1, 2, 2], [2, 2, 3], [3, 2, 4], [4, 3, 3], [5, 3, 5], [6, 3, 6]]) {
      await game.open({ level });
      const round = game.plan.rounds[0];

      await expect(game.page.locator('.slot'), `nível ${level}`).toHaveCount(slots);
      await expect(game.looseTiles(), `nível ${level}`).toHaveCount(tiles);
      await expect(game.page.locator('#picture')).toHaveAttribute('src', `../missing-syllable/img/${round.id}.svg`);
      await expect(game.page.locator('#progress .dot')).toHaveCount(6);
      expect(await game.spoken(), `nível ${level}`).toEqual([Logic.promptFor(round)]);
      await game.page.reload();
    }
  });

  test('as peças são sílabas em maiúsculas, com as da palavra entre elas', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.plan.rounds[0];
    const syllables = await game.looseTiles().evaluateAll((els) => els.map((e) => e.dataset.syllable));
    expect(syllables.slice().sort()).toEqual(round.tiles.map((t) => t.syllable).sort());
    for (const s of round.syllables) expect(syllables).toContain(s);
    await expect(game.looseTiles().first()).toHaveAttribute('aria-label', /^Sílaba [A-Z]{2}$/);
    for (const tile of await game.looseTiles().all()) {
      expect(await tile.textContent()).toBe((await tile.getAttribute('data-syllable')).toUpperCase());
    }
  });

  test('as lacunas começam vazias e a peça tem o tamanho da lacuna', async ({ game }) => {
    await game.open({ level: 4 });
    for (const slot of await game.page.locator('.slot').all()) {
      expect(await slot.evaluate((e) => e.children.length)).toBe(0);
    }
    const slot = await game.slot(0).boundingBox();
    const tile = await game.looseTiles().first().boundingBox();
    expect(Math.abs(slot.width - tile.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(slot.height - tile.height)).toBeLessThanOrEqual(1);
  });

  test('o desenho de TODAS as palavras da partida carrega', async ({ game }) => {
    for (const level of [1, 4]) {
      await game.open({ level });
      for (let i = 0; i < 6; i++) {
        const ok = await game.page.locator('#picture').evaluate((img) => img.complete && img.naturalWidth > 0);
        expect(ok, `nível ${level}: desenho da rodada ${i + 1}`).toBe(true);
        await game.solveRound();
      }
      await game.page.reload();
    }
  });
});

test.describe('arrastar', () => {
  test('a peça certa na lacuna certa encaixa: vai para dentro dela, trava e a voz fala a sílaba', async ({ game }) => {
    await game.open();
    const round = game.plan.rounds[0];
    const syllable = round.syllables[0];

    await game.placeRight(0);

    const slot = game.slot(0);
    await expect(slot).toHaveClass(/filled/);
    const tile = slot.locator('.tile');
    await expect(tile).toHaveCount(1);
    await expect(tile).toHaveAttribute('data-syllable', syllable);
    await expect(tile).toHaveClass(/placed/);
    await expect(tile).not.toHaveClass(/draggable/);
    // a peça fica exatamente no centro da lacuna
    const a = await centerOf(slot);
    const b = await centerOf(tile);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
    await expect(game.looseTiles()).toHaveCount(round.tiles.length - 1);
    expect((await game.spoken()).at(-1)).toBe(Logic.sayFor(syllable));
    // ainda falta a outra sílaba: a palavra não está pronta
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    expect(await complete(game)).toHaveLength(0);
  });

  test('a casa da peça fica na bandeja: as outras peças não mudam de lugar', async ({ game }) => {
    await game.open({ level: 3 });
    const round = game.plan.rounds[0];
    const before = [];
    for (const tile of await game.looseTiles().all()) before.push([await tile.getAttribute('data-tile'), await centerOf(tile)]);

    await game.placeRight(0);

    for (const [id, center] of before) {
      const tile = game.page.locator(`.tile[data-tile="${id}"]`);
      if (await tile.evaluate((e) => e.classList.contains('placed'))) continue;
      const now = await centerOf(tile);
      expect(Math.abs(now.x - center.x), `peça ${id}`).toBeLessThanOrEqual(1);
      expect(Math.abs(now.y - center.y), `peça ${id}`).toBeLessThanOrEqual(1);
    }
    expect(round.tiles.length).toBe(4);
  });

  test('a peça errada volta para onde estava; a voz fala a sílaba escolhida e a lacuna balança', async ({ game }) => {
    await game.open({ level: 2 });
    const syllable = await game.wrongSyllable(0);
    const tile = game.loose(syllable);
    const before = await centerOf(tile);

    await game.dragTo(tile, game.slot(0));
    await expect(game.slot(0)).toHaveClass(/shake/);
    await game.settled();

    // nada encaixou, e a peça está de volta no mesmo lugar da bandeja
    await expect(game.slot(0)).not.toHaveClass(/filled/);
    expect(await game.slot(0).evaluate((e) => e.children.length)).toBe(0);
    await expect(game.looseTiles()).toHaveCount(3);
    const after = await centerOf(tile);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect((await game.spoken()).at(-1)).toBe(Logic.wrongSpeechFor(syllable));
  });

  test('a sílaba certa na lacuna errada também volta (e é um erro)', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];

    await game.dragTo(game.loose(round.syllables[1]), game.slot(0));
    await game.settled();

    await expect(game.slot(0)).not.toHaveClass(/filled/);
    await expect(game.looseTiles()).toHaveCount(2);
    expect((await game.spoken()).at(-1)).toBe(Logic.wrongSpeechFor(round.syllables[1]));
  });

  test('soltar fora de todas as lacunas: a peça volta e não conta erro', async ({ game }) => {
    await game.open({ level: 2 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[0]);
    const before = await centerOf(tile);
    const spokenBefore = (await game.spoken()).length;

    // um canto vazio da tela, longe das lacunas e da bandeja
    await game.dragToPoint(tile, 20, 140);
    await game.settled();

    await expect(game.looseTiles()).toHaveCount(round.tiles.length);
    const after = await centerOf(tile);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect((await game.spoken()).length, 'a voz não diz nada').toBe(spokenBefore);
    // e não houve erro: a partida perfeita ainda vale 3 estrelas
    await game.solve();
    const [done] = await complete(game);
    expect(done.moves).toBe(0);
    expect(done.stars).toBe(3);
  });

  test('durante o arrasto a peça levanta, fica acima do dedo e a lacuna sob ela se destaca', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[0]);
    const lift = await game.lift();

    await game.dragTo(tile, game.slot(0), { drop: false });

    await expect(tile).toHaveClass(/dragging/);
    await expect(game.slot(0)).toHaveClass(/drop-over/);
    const slot = await centerOf(game.slot(0));
    const held = await centerOf(tile);
    // o centro da peça está no centro da lacuna; o dedo está `lift` px abaixo dele
    expect(Math.abs(held.x - slot.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(held.y - slot.y)).toBeLessThanOrEqual(2);
    expect(lift).toBeGreaterThan(0);
    expect(await tile.evaluate((e) => getComputedStyle(e).touchAction)).toBe('none');

    await game.page.mouse.up();
    await game.settled();
    // a peça encaixou (e deixou de ser arrastável): procura-a pela sílaba, em qualquer lugar
    const placed = game.page.locator(`.tile[data-syllable="${round.syllables[0]}"]`).first();
    await expect(placed).not.toHaveClass(/dragging/);
    await expect(game.slot(0)).not.toHaveClass(/drop-over/);
  });

  test('a lacuna sai do destaque quando a peça passa para fora dela', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[0]);

    await game.dragTo(tile, game.slot(0), { drop: false });
    await expect(game.slot(0)).toHaveClass(/drop-over/);
    await game.page.mouse.move(20, 140, { steps: 4 });
    await expect(game.slot(0)).not.toHaveClass(/drop-over/);
    await game.page.mouse.up();
  });

  test('funciona com o dedo: eventos de ponteiro de toque', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];

    await game.touchDrag(game.loose(round.syllables[0]), game.slot(0));
    await game.settled();

    await expect(game.slot(0)).toHaveClass(/filled/);
    await expect(game.slot(0).locator('.tile')).toHaveAttribute('data-syllable', round.syllables[0]);
  });

  test('a folga: um pouco fora da lacuna (12 px) ainda encaixa; longe demais (60 px), não', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const slot = await game.slot(0).boundingBox();

    // o centro da peça solta 12 px acima da borda da lacuna: fora dela, mas dentro da folga (20 px)
    await game.dragTo(game.loose(round.syllables[0]), game.slot(0), { dy: -(slot.height / 2 + 12) });
    await game.settled();
    await expect(game.slot(0)).toHaveClass(/filled/);

    // a outra: 60 px além da borda: volta, sem erro
    const slot1 = await game.slot(1).boundingBox();
    await game.dragTo(game.loose(round.syllables[1]), game.slot(1), { dy: -(slot1.height / 2 + 60) });
    await game.settled();
    await expect(game.slot(1)).not.toHaveClass(/filled/);
    await expect(game.looseTiles()).toHaveCount(1);
  });

  test('um toque curto numa peça (sem arrastar) diz a sílaba e a peça não sai do lugar', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[1]);
    const before = await centerOf(tile);

    await tile.click();

    expect((await game.spoken()).at(-1)).toBe(Logic.sayFor(round.syllables[1]));
    const after = await centerOf(tile);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await expect(game.looseTiles()).toHaveCount(2);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
  });

  test('um toque com a tremida natural do dedo (poucos pixels) continua sendo um toque, não um arrasto', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[0]);
    const c = await centerOf(tile);

    await game.page.mouse.move(c.x, c.y);
    await game.page.mouse.down();
    await game.page.mouse.move(c.x + 3, c.y + 2);
    await expect(tile).not.toHaveClass(/dragging/);
    await game.page.mouse.up();

    expect((await game.spoken()).at(-1)).toBe(Logic.sayFor(round.syllables[0]));
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    const after = await centerOf(tile);
    expect(Math.abs(after.x - c.x)).toBeLessThanOrEqual(1);
  });

  test('só um dedo por vez: um segundo dedo em outra peça é ignorado', async ({ game }) => {
    await game.open({ level: 2 });
    const round = game.plan.rounds[0];
    const first = game.loose(round.syllables[0]);
    const other = game.loose(round.syllables[1]);
    const otherBefore = await centerOf(other);

    await game.dragTo(first, game.slot(0), { drop: false });
    await game.page.evaluate(() => {
      const el = document.querySelector('.tile.draggable:not(.dragging)');
      const r = el.getBoundingClientRect();
      const at = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true,
      }));
      at('pointerdown', r.x + 5, r.y + 5);
      at('pointermove', r.x + 100, r.y - 200);
      at('pointerup', r.x + 100, r.y - 200);
    });
    await expect(first).toHaveClass(/dragging/);
    await expect(other).not.toHaveClass(/dragging/);
    const otherAfter = await centerOf(other);
    expect(otherAfter.x).toBeCloseTo(otherBefore.x, 0);

    await game.page.mouse.up();
    await game.settled();
    await expect(game.slot(0)).toHaveClass(/filled/);
  });

  test('o botão direito do mouse não arrasta', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = await centerOf(game.loose(round.syllables[0]));

    await game.page.mouse.move(tile.x, tile.y);
    await game.page.mouse.down({ button: 'right' });
    await game.page.mouse.move(tile.x, tile.y - 150, { steps: 5 });
    await expect(game.loose(round.syllables[0])).not.toHaveClass(/dragging/);
    await game.page.mouse.up({ button: 'right' });
  });

  test('girar a tela no meio do arrasto: a peça volta e soltar o dedo depois não encaixa nada', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[0]);

    await game.dragTo(tile, game.slot(0), { drop: false });
    await expect(tile).toHaveClass(/dragging/);
    await game.page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(tile).not.toHaveClass(/dragging/);
    await game.page.mouse.up();
    await game.settled();

    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.looseTiles()).toHaveCount(2);
    expect(await complete(game)).toHaveLength(0);
  });
});

test.describe('montar a palavra', () => {
  test('encaixar a última peça: a voz soletra e diz a palavra, a Mia comemora, a estrela acende', async ({ game }) => {
    await game.open();
    const round = game.plan.rounds[0];

    await game.placeRight(0);
    await game.placeRight(1);

    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(round));
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_cheer\.svg$/);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
    await expect(game.page.locator('.slot.filled')).toHaveCount(2);
    // a palavra aparece inteira nas lacunas, na ordem certa
    const shown = await game.page.locator('.slot .tile').evaluateAll((els) => els.map((e) => e.textContent).join(''));
    expect(shown).toBe(round.word.toUpperCase());
    await expect(game.page.locator('#slots')).toHaveAttribute('aria-label', round.word);
  });

  test('depois da pausa vem a próxima palavra, com lacunas vazias e peças novas', async ({ game }) => {
    await game.open();
    await game.solveRound();

    const second = game.plan.rounds[1];
    await expect(game.page.locator('#picture')).toHaveAttribute('src', `../missing-syllable/img/${second.id}.svg`);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.looseTiles()).toHaveCount(second.tiles.length);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second));
  });

  test('a ordem das lacunas não importa: a última sílaba primeiro também monta a palavra', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];

    await game.placeRight(1);
    await game.placeRight(0);

    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(round));
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(1);
  });

  test('palavra de 3 sílabas com a mesma sílaba duas vezes (banana): cada "NA" no seu lugar', async ({ game }) => {
    // procura uma semente em que a partida do nível 4 tenha "banana"
    let seed = 1;
    while (!Logic.createGame(4, { random: require('./fixtures').prng(seed) }).rounds.some((r) => r.id === 'banana')) seed++;
    await game.open({ level: 4, seed });
    const index = game.plan.rounds.findIndex((r) => r.id === 'banana');
    await game.goToRound(index);

    await game.placeRight(0);
    await game.placeRight(1);
    await game.placeRight(2);

    const shown = await game.page.locator('.slot .tile').evaluateAll((els) => els.map((e) => e.textContent).join(''));
    expect(shown).toBe('BANANA');
  });

  test('o desenho continua o da palavra durante a pausa de comemoração', async ({ game }) => {
    await game.open();
    const first = game.plan.rounds[0];
    await game.placeRight(0);
    await game.placeRight(1);
    await game.tick(ADVANCE_DELAY_MS - 100);
    await expect(game.page.locator('#picture')).toHaveAttribute('src', `../missing-syllable/img/${first.id}.svg`);
  });
});

test.describe('dica', () => {
  test('depois de 2 erros, a próxima lacuna e a peça certa pulsam; ao acertar, a dica passa para a seguinte', async ({ game }) => {
    await game.open({ level: 2 });
    const round = game.plan.rounds[0];

    await game.placeWrong(0);
    await expect(game.page.locator('.pulse')).toHaveCount(0);
    await game.placeWrong(1);

    await expect(game.slot(0)).toHaveClass(/pulse/);
    await expect(game.loose(round.syllables[0])).toHaveClass(/pulse/);
    await expect(game.page.locator('.pulse')).toHaveCount(2);

    // a peça certa encaixou: a dica sai dela e vai para a próxima lacuna (a palavra ainda tem erros acumulados)
    await game.placeRight(0);
    await expect(game.slot(0)).not.toHaveClass(/pulse/);
    await expect(game.slot(1)).toHaveClass(/pulse/);
    await expect(game.loose(round.syllables[1])).toHaveClass(/pulse/);
    await expect(game.page.locator('.pulse')).toHaveCount(2);

    // palavra pronta: nenhuma dica sobra
    await game.placeRight(1);
    await expect(game.page.locator('.pulse')).toHaveCount(0);
  });

  test('a peça que pulsa (a dica) também acompanha o dedo', async ({ game }) => {
    await game.open({ level: 2 });
    const round = game.plan.rounds[0];
    await game.placeWrong(0);
    await game.placeWrong(1);
    const tile = game.loose(round.syllables[0]);
    await expect(tile).toHaveClass(/pulse/);
    const before = await centerOf(tile);

    await game.dragTo(tile, game.slot(0), { drop: false });

    await expect(tile).toHaveClass(/dragging/);
    const held = await centerOf(tile);
    const slot = await centerOf(game.slot(0));
    expect(Math.abs(held.x - slot.x), 'a peça com dica não saiu do lugar').toBeLessThanOrEqual(2);
    expect(Math.abs(held.y - slot.y)).toBeLessThanOrEqual(2);
    expect(Math.hypot(held.x - before.x, held.y - before.y)).toBeGreaterThan(20);
    await game.page.mouse.up();
  });

  test('a dica de uma palavra não passa para a palavra seguinte', async ({ game }) => {
    await game.open({ level: 2 });
    await game.placeWrong(0);
    await game.placeWrong(1);
    await game.placeRight(0);
    await game.placeRight(1);
    await game.tick(ADVANCE_DELAY_MS);

    await expect(game.page.locator('.pulse')).toHaveCount(0);
    await game.placeWrong(0);
    await expect(game.page.locator('.pulse'), 'o contador de erros recomeça a cada palavra').toHaveCount(0);
  });
});

test.describe('fim da partida', () => {
  test('uma partida perfeita: 3 estrelas, sem erros, e a Flutter recebe tudo', async ({ game }) => {
    await game.open({ level: 2 });
    await game.solve();

    const [done] = await complete(game);
    expect(done).toMatchObject({ gameId: 'build-word', level: 2, moves: 0, matches: 6, stars: 3 });
    expect(await complete(game)).toHaveLength(1);
    await expect(game.page.locator('#result-modal')).toBeVisible();
    await expect(game.page.locator('#stars .star.earned')).toHaveCount(3);
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Que incrível!');
  });

  test('os erros viram "moves" e as estrelas seguem a tabela do nível', async ({ game }) => {
    await game.open({ level: 1 });
    // 2 palavras com 1 erro cada: 4 de primeira de 6 → nível 1 (2★ com 3, 3★ com 5)
    await game.placeWrong(0);
    await game.solveRound();
    await game.placeWrong(0);
    await game.solveRound();
    for (let i = 2; i < 6; i++) await game.solveRound();

    const [done] = await complete(game);
    expect(done.moves).toBe(2);
    expect(done.matches).toBe(6);
    expect(done.stars).toBe(Logic.starsFor(1, 4));
    expect(done.stars).toBe(2);
  });

  test('o mesmo número de erros vale menos estrelas num nível mais alto', async ({ game }) => {
    await game.open({ level: 6, seed: 3 });
    await game.placeWrong(0);
    await game.solveRound();
    await game.placeWrong(0);
    await game.solveRound();
    for (let i = 2; i < 6; i++) await game.solveRound();

    const [done] = await complete(game);
    expect(done.moves).toBe(2);
    expect(done.stars).toBe(Logic.starsFor(6, 4));
    expect(done.stars).toBe(1);
  });

  test('o tempo só corre depois do primeiro toque e é enviado em segundos', async ({ game }) => {
    await game.open({ level: 1 });
    await game.tick(20000);   // parado, olhando a tela: não conta
    await game.solveRound();  // a pausa de 1,5 s da primeira palavra conta
    await game.tick(3000);
    for (let i = 1; i < 6; i++) await game.solveRound();

    const [done] = await complete(game);
    expect(done.timeSeconds).toBeLessThan(15);
    expect(done.timeSeconds).toBeGreaterThanOrEqual(3);
  });

  test('jogar de novo recomeça do zero (e há mesmo uma partida nova)', async ({ game }) => {
    await game.open({ level: 1 });
    await game.solve();

    await game.page.click('#btn-play-again');

    await expect(game.page.locator('#result-modal')).toBeHidden();
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.looseTiles()).toHaveCount(2);
  });

  test('o recorde: uma partida melhor que a salva mostra "Novo recorde!"', async ({ game }) => {
    await game.open({ level: 1, best: { stars: 2, moves: 3 } });
    await game.solve();
    await expect(game.page.locator('#new-record')).toBeVisible();
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Novo recorde!');
  });
});

test.describe('reiniciar', () => {
  test('reiniciar no meio da pausa: a pausa antiga não mexe na partida nova', async ({ game }) => {
    await game.open({ level: 1 });
    await game.placeRight(0);
    await game.placeRight(1);          // comemorando: a pausa de 1,5 s está pendente
    await game.page.click('#btn-reset');

    await game.tick(ADVANCE_DELAY_MS * 2);

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.looseTiles()).toHaveCount(2);
    expect(await complete(game)).toHaveLength(0);
  });

  test('reiniciar no meio do arrasto: a peça volta, soltar o dedo depois não encaixa nada e um novo dedo já arrasta', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.plan.rounds[0];
    const tile = game.loose(round.syllables[0]);

    await game.dragTo(tile, game.slot(0), { drop: false });
    await game.page.evaluate(() => document.getElementById('btn-reset').click());

    // com o primeiro dedo ainda na tela, outro dedo arrasta uma peça da partida nova: o gesto antigo não pode travá-lo
    // (o reinício sorteia outra palavra: lê qual é pelo desenho)
    const id = (await game.page.locator('#picture').getAttribute('src')).match(/img\/(\w+)\.svg/)[1];
    const fresh = Data.WORDS.find((w) => w.id === id);
    await game.touchDrag(game.loose(fresh.syllables[0]), game.slot(0));
    await game.settled();
    await expect(game.slot(0)).toHaveClass(/filled/);

    // e o primeiro dedo, ao subir, não encaixa nada
    await game.page.mouse.up();
    await game.settled();
    await expect(game.page.locator('.slot.filled')).toHaveCount(1);
  });
});

test.describe('sons', () => {
  test('pegar a peça, encaixar e errar tocam sons; sem som, nenhum', async ({ game }) => {
    await game.open({ level: 2 });
    expect(await game.notes()).toBe(0);
    await game.placeWrong(0);
    const afterWrong = await game.notes();
    expect(afterWrong).toBeGreaterThan(0);
    await game.placeRight(0);
    expect(await game.notes()).toBeGreaterThan(afterWrong);
  });

  test('com o som desligado nos ajustes, o jogo fica em silêncio', async ({ game }) => {
    await game.open({ level: 2, sound: false });
    await game.placeWrong(0);
    await game.solveRound();
    expect(await game.notes()).toBe(0);
  });
});
