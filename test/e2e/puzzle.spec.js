// "Quebra-cabeça": a criança ARRASTA as peças de um desenho para o lugar delas na grade.
// O sorteio usa semente: o teste sabe o desenho e a ordem das peças de cada rodada.
const { test, expect, ADVANCE_DELAY_MS, shownDots, litDots } = require('./fixtures');
const Logic = require('../../assets/games/puzzle/puzzle-logic.js');

test.use({ gameId: 'puzzle' });

const complete = async (game) =>
  (await game.messages()).filter((m) => m.type === 'GAME_COMPLETE');

const centerOf = async (locator) => {
  const b = await locator.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test.describe('rodada', () => {
  test('mostra a grade, as peças e o guia de cada nível, e a voz diz o pedido', async ({ game }) => {
    for (const [level, cols, rows, guide] of [[1, 2, 1, true], [2, 2, 2, true], [3, 3, 2, true], [4, 3, 3, true], [5, 4, 3, false], [6, 4, 4, false]]) {
      await game.open({ level });
      const round = game.round();

      await expect(game.page.locator('.slot'), `nível ${level}`).toHaveCount(cols * rows);
      await expect(game.loosePieces(), `nível ${level}`).toHaveCount(cols * rows);
      await expect(game.page.locator('.slot .ghost'), `nível ${level}: guia`).toHaveCount(guide ? cols * rows : 0);
      await expect(game.page.locator('#progress .dot')).toHaveCount(shownDots(game.plan.total));
      expect(await game.spoken(), `nível ${level}`).toEqual([Logic.promptFor(round)]);
      await game.page.reload();
    }
  });

  test('o quadro é quadrado e cada lugar é uma fatia dele', async ({ game }) => {
    for (const [level, cols, rows] of [[1, 2, 1], [3, 3, 2], [6, 4, 4]]) {
      await game.open({ level });
      const board = await game.page.locator('#board').boundingBox();
      expect(Math.abs(board.width - board.height), `nível ${level}`).toBeLessThanOrEqual(1);
      const slot = await game.slot(0).boundingBox();
      expect(Math.abs(slot.width - board.width / cols), `nível ${level}: largura do lugar`).toBeLessThanOrEqual(1);
      expect(Math.abs(slot.height - board.height / rows), `nível ${level}: altura do lugar`).toBeLessThanOrEqual(1);
      await game.page.reload();
    }
  });

  test('a peça é a fatia certa do desenho: o tamanho e a posição do fundo batem com a coluna e a linha', async ({ game }) => {
    for (const level of [2, 3, 5]) {
      await game.open({ level });
      const round = game.round();
      for (const piece of round.pieces) {
        const style = await game.piece(piece.id).evaluate((el) => {
          const cs = getComputedStyle(el);
          return { w: parseFloat(cs.width), h: parseFloat(cs.height), size: cs.backgroundSize, pos: cs.backgroundPosition, image: cs.backgroundImage, border: parseFloat(cs.borderTopWidth) };
        });
        // o fundo ocupa a grade toda (cols x rows peças) e a fatia está deslocada em col x largura, row x altura
        const [sw, sh] = style.size.split(',')[0].trim().split(' ').map(parseFloat);
        expect(sw, `nível ${level}: largura do desenho`).toBeCloseTo(round.cols * 100, 3);
        expect(sh, `nível ${level}: altura do desenho`).toBeCloseTo(round.rows * 100, 3);
        const [px, py] = style.pos.split(',')[0].trim().split(' ').map(parseFloat);
        const inner = { w: style.w, h: style.h };     // content-box = onde o fundo é posicionado (a borda é do padding-box)
        const imgW = (sw / 100) * (inner.w);
        const imgH = (sh / 100) * (inner.h);
        expect((inner.w - imgW) * (px / 100), `nível ${level} ${piece.id}: deslocamento x`).toBeCloseTo(-piece.col * inner.w, 1);
        expect((inner.h - imgH) * (py / 100), `nível ${level} ${piece.id}: deslocamento y`).toBeCloseTo(-piece.row * inner.h, 1);
        expect(style.image).toContain(`${round.id}.svg`);
      }
      await game.page.reload();
    }
  });

  test('os desenhos de TODAS as palavras da partida carregam', async ({ game }) => {
    for (const level of [1, 2, 3]) {
      await game.open({ level });
      for (let i = 0; i < game.plan.rounds.length; i++) {
        const round = game.round();
        const loaded = await game.piece('p0').evaluate((el, id) => new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth > 0);
          img.onerror = () => resolve(false);
          img.src = getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)[1];
        }), round.id);
        expect(loaded, `nível ${level}: desenho ${round.id}`).toBe(true);
        await game.solveRound();
      }
      await game.page.reload();
    }
  });

  test('a palavra fica escondida até o desenho ficar pronto (e já ocupa o espaço dela)', async ({ game }) => {
    await game.open({ level: 1 });
    await expect(game.page.locator('#word')).toBeHidden();
    const box = await game.page.locator('#word').boundingBox();
    expect(box.height).toBeGreaterThan(20);
  });
});

test.describe('arrastar', () => {
  test('a peça certa no lugar certo encaixa: preenche o lugar todo, trava e o lugar fica "cheio"', async ({ game }) => {
    await game.open({ level: 2 });
    const piece = game.tray()[0];

    await game.placeRight(piece);

    const slot = game.slot(piece.cell);
    await expect(slot).toHaveClass(/filled/);
    const placed = slot.locator('.piece');
    await expect(placed).toHaveCount(1);
    await expect(placed).toHaveClass(/placed/);
    await expect(placed).not.toHaveClass(/draggable/);
    const a = await slot.boundingBox();
    const b = await placed.boundingBox();
    for (const k of ['x', 'y', 'width', 'height']) expect(Math.abs(a[k] - b[k]), k).toBeLessThanOrEqual(1);
    await expect(game.loosePieces()).toHaveCount(3);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(litDots(1, game.plan.total));
    expect(await complete(game)).toHaveLength(0);
  });

  test('a casa da peça fica na bandeja: as outras peças não mudam de lugar', async ({ game }) => {
    await game.open({ level: 2 });
    const [first, second] = game.tray();
    const before = await centerOf(game.piece(second.id));

    await game.placeRight(first);

    const after = await centerOf(game.piece(second.id));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test('a peça no lugar errado volta, o lugar balança e a voz incentiva', async ({ game }) => {
    await game.open({ level: 2 });
    const [piece] = game.tray();
    const before = await centerOf(game.piece(piece.id));
    const wrong = game.round().pieces.find((p) => p.cell !== piece.cell).cell;

    await game.dragTo(game.piece(piece.id), game.slot(wrong));
    await expect(game.slot(wrong)).toHaveClass(/shake/);
    await game.settled();

    await expect(game.slot(wrong)).not.toHaveClass(/filled/);
    await expect(game.loosePieces()).toHaveCount(4);
    const after = await centerOf(game.piece(piece.id));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect((await game.spoken()).at(-1)).toBe(Logic.wrongSpeech());
  });

  test('soltar fora da grade: a peça volta e não conta erro', async ({ game }) => {
    await game.open({ level: 2 });
    const piece = game.tray()[0];
    const spokenBefore = (await game.spoken()).length;

    await game.dragToPoint(game.piece(piece.id), 20, 150);
    await game.settled();

    await expect(game.loosePieces()).toHaveCount(4);
    expect((await game.spoken()).length).toBe(spokenBefore);
    await game.solve();
    const [done] = await complete(game);
    expect(done.moves).toBe(0);
    expect(done.stars).toBe(3);
  });

  test('soltar num lugar que já tem peça: volta e não conta erro', async ({ game }) => {
    await game.open({ level: 1 });
    const [first, second] = game.tray();
    await game.placeRight(first);

    await game.dragTo(game.piece(second.id), game.slot(first.cell));
    await game.settled();

    await expect(game.loosePieces()).toHaveCount(1);
    await game.placeRight(second);
    await game.tick(ADVANCE_DELAY_MS);
    game.roundIndex = 1;
    await game.solveRound();
    await game.solveRound();
    expect((await complete(game))[0].moves).toBe(0);
  });

  test('durante o arrasto a peça levanta, acompanha o dedo e o lugar sob ela se destaca', async ({ game }) => {
    await game.open({ level: 2 });
    const piece = game.tray()[0];

    await game.dragTo(game.piece(piece.id), game.slot(piece.cell), { drop: false });

    await expect(game.piece(piece.id)).toHaveClass(/dragging/);
    await expect(game.slot(piece.cell)).toHaveClass(/drop-over/);
    const slot = await centerOf(game.slot(piece.cell));
    const held = await centerOf(game.piece(piece.id));
    expect(Math.abs(held.x - slot.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(held.y - slot.y)).toBeLessThanOrEqual(2);
    await game.page.mouse.up();
  });

  test('funciona com o dedo: eventos de ponteiro de toque', async ({ game }) => {
    await game.open({ level: 1 });
    const piece = game.tray()[0];

    await game.touchDrag(game.piece(piece.id), game.slot(piece.cell));
    await game.settled();

    await expect(game.slot(piece.cell)).toHaveClass(/filled/);
  });

  test('um toque curto numa peça diz a palavra, e a peça não sai do lugar', async ({ game }) => {
    await game.open({ level: 1 });
    const piece = game.tray()[0];
    const before = await centerOf(game.piece(piece.id));

    await game.piece(piece.id).click();

    expect((await game.spoken()).at(-1)).toBe(game.round().word);
    const after = await centerOf(game.piece(piece.id));
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
  });
});

test.describe('montar o desenho', () => {
  test('a última peça: a palavra aparece escrita, a voz diz a palavra e a Mia comemora', async ({ game }) => {
    await game.open({ level: 1 });
    const round = game.round();
    const [first, last] = game.tray();

    await game.placeRight(first);
    await expect(game.page.locator('#word')).toBeHidden();
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
    await game.placeRight(last);

    await expect(game.page.locator('#word')).toBeVisible();
    await expect(game.page.locator('#word')).toHaveText(round.word.toUpperCase());
    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(round));
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_cheer\.svg$/);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(2);
  });

  test('depois da pausa vem o próximo desenho: grade vazia, peças novas, palavra escondida, estrelas mantidas', async ({ game }) => {
    await game.open({ level: 1 });
    await game.solveRound();

    const second = game.round();
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.loosePieces()).toHaveCount(2);
    await expect(game.page.locator('#word')).toBeHidden();
    await expect(game.page.locator('#word')).toHaveText(second.word.toUpperCase());
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(2);
    await expect(game.page.locator('#mia')).toHaveAttribute('src', /mia_happy\.svg$/);
    expect((await game.spoken()).at(-1)).toBe(Logic.promptFor(second));
  });

  test('a ordem das peças não importa: da última para a primeira também monta', async ({ game }) => {
    await game.open({ level: 2 });
    for (const piece of game.tray().slice().reverse()) await game.placeRight(piece);
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(litDots(4, game.plan.total));
    expect((await game.spoken()).at(-1)).toBe(Logic.correctSpeechFor(game.round()));
  });

  test('montado, o quadro é o desenho inteiro: todas as fatias estão nos lugares, emendadas', async ({ game }) => {
    await game.open({ level: 3 });
    for (const piece of game.tray()) await game.placeRight(piece);
    await game.settled();

    const board = await game.page.locator('#board').boundingBox();
    for (const piece of game.round().pieces) {
      const placed = game.slot(piece.cell).locator('.piece');
      const b = await placed.boundingBox();
      // cada fatia está no seu lugar da grade, sem folga entre elas
      expect(Math.abs(b.x - (board.x + (piece.col * board.width) / 3)), `${piece.id} x`).toBeLessThanOrEqual(1);
      expect(Math.abs(b.y - (board.y + (piece.row * board.height) / 2)), `${piece.id} y`).toBeLessThanOrEqual(1);
      expect(Math.abs(b.width - board.width / 3), `${piece.id} largura`).toBeLessThanOrEqual(1);
      expect(Math.abs(b.height - board.height / 2), `${piece.id} altura`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('estrelas de progresso', () => {
  test('com 16 peças, há 8 estrelas, cada uma vale 2 peças e a última só acende na última peça', async ({ game }) => {
    await game.open({ level: 6 });
    await expect(game.page.locator('#progress .dot')).toHaveCount(8);
    const tray = game.tray();
    for (const [i, piece] of tray.entries()) {
      await game.placeRight(piece);
      const lit = await game.page.locator('#progress .dot.done').count();
      expect(lit, `depois de ${i + 1} peças`).toBe(litDots(i + 1, 16));
      if (i < 15) expect(lit).toBeLessThan(8);
    }
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(8);
  });
});

test.describe('dica', () => {
  test('depois de 2 erros, a peça e o lugar certos pulsam; a peça que pulsa ainda acompanha o dedo', async ({ game }) => {
    await game.open({ level: 2 });
    await game.dropWrong();
    await expect(game.page.locator('.pulse')).toHaveCount(0);
    const wrongPiece = await game.dropWrong();

    const piece = game.pieceOf(wrongPiece.id);
    await expect(game.piece(piece.id)).toHaveClass(/pulse/);
    await expect(game.slot(piece.cell)).toHaveClass(/pulse/);

    const before = await centerOf(game.piece(piece.id));
    await game.dragTo(game.piece(piece.id), game.slot(piece.cell), { drop: false });
    const held = await centerOf(game.piece(piece.id));
    const slot = await centerOf(game.slot(piece.cell));
    expect(Math.hypot(held.x - before.x, held.y - before.y)).toBeGreaterThan(10);
    expect(Math.abs(held.x - slot.x)).toBeLessThanOrEqual(2);
    await game.page.mouse.up();
    await game.settled();
    await expect(game.slot(piece.cell)).toHaveClass(/filled/);
  });
});

test.describe('fim da partida', () => {
  test('uma partida perfeita: 3 estrelas, sem erros, e o Flutter recebe tudo', async ({ game }) => {
    await game.open({ level: 2 });
    await game.solve();

    const [done] = await complete(game);
    expect(done).toMatchObject({ gameId: 'puzzle', level: 2, moves: 0, matches: 12, stars: 3 });
    expect(await complete(game)).toHaveLength(1);
    await expect(game.page.locator('#stars .star.earned')).toHaveCount(3);
    expect((await game.spoken()).at(-1)).toBe('Parabéns! Que incrível!');
  });

  test('os erros viram "moves" e as estrelas seguem a tabela do nível', async ({ game }) => {
    await game.open({ level: 1 });
    await game.dropWrong();
    await game.dropWrong();
    await game.solve();

    const [done] = await complete(game);
    expect(done.moves).toBe(2);
    expect(done.stars).toBe(Logic.starsFor(1, 2));
    expect(done.stars).toBe(2);
  });

  test('o mesmo número de erros vale menos estrelas num nível mais alto', async ({ game }) => {
    await game.open({ level: 4 });
    for (let i = 0; i < 4; i++) await game.dropWrong();
    await game.solve();

    const [done] = await complete(game);
    expect(done.moves).toBe(4);
    expect(done.stars).toBe(Logic.starsFor(4, 4));
    expect(done.stars).toBe(1);
  });

  test('o tempo só corre depois do primeiro toque', async ({ game }) => {
    await game.open({ level: 1 });
    await game.tick(20000);   // parado, olhando a tela: não conta
    await game.solve();

    const [done] = await complete(game);
    expect(done.timeSeconds).toBeLessThan(10);
  });

  test('jogar de novo recomeça do zero, com peças novas', async ({ game }) => {
    await game.open({ level: 1 });
    await game.solve();

    await game.page.click('#btn-play-again');

    await expect(game.page.locator('#result-modal')).toBeHidden();
    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.loosePieces()).toHaveCount(2);
  });

  test('o recorde: uma partida melhor que a salva mostra "Novo recorde!"', async ({ game }) => {
    await game.open({ level: 1, best: { stars: 2, moves: 3 } });
    await game.solve();
    await expect(game.page.locator('#new-record')).toBeVisible();
  });
});

test.describe('reiniciar e girar', () => {
  test('reiniciar no meio da pausa: a pausa antiga não mexe na partida nova', async ({ game }) => {
    await game.open({ level: 1 });
    for (const piece of game.tray()) await game.placeRight(piece);   // pronto: a pausa de 1,5 s está pendente
    await game.page.click('#btn-reset');

    await game.tick(ADVANCE_DELAY_MS * 2);

    await expect(game.page.locator('#progress .dot.done')).toHaveCount(0);
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    expect(await complete(game)).toHaveLength(0);
  });

  test('reiniciar e girar a tela no meio do arrasto: a peça volta e soltar o dedo depois não encaixa nada', async ({ game }) => {
    await game.open({ level: 1 });
    const piece = game.tray()[0];

    await game.dragTo(game.piece(piece.id), game.slot(piece.cell), { drop: false });
    await game.page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(game.piece(piece.id)).not.toHaveClass(/dragging/);
    await game.page.mouse.up();
    await game.settled();
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);

    await game.dragTo(game.piece(piece.id), game.slot(piece.cell), { drop: false });
    await game.page.evaluate(() => document.getElementById('btn-reset').click());
    await game.page.mouse.up();
    await game.settled();
    await expect(game.page.locator('.slot.filled')).toHaveCount(0);
    await expect(game.loosePieces()).toHaveCount(2);
  });
});

test.describe('sons', () => {
  test('pegar, encaixar e errar tocam sons', async ({ game }) => {
    await game.open({ level: 2 });
    expect(await game.notes()).toBe(0);
    await game.dropWrong();
    const afterWrong = await game.notes();
    expect(afterWrong).toBeGreaterThan(0);
    await game.placeRight(game.tray()[0]);
    expect(await game.notes()).toBeGreaterThan(afterWrong);
  });

  test('com o som desligado nos ajustes, o jogo fica em silêncio', async ({ game }) => {
    await game.open({ level: 2, sound: false });
    await game.dropWrong();
    await game.solve();
    expect(await game.notes()).toBe(0);
  });
});
