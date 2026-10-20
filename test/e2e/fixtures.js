// Base dos testes: abre o Jogo da Memória como a WebView do Flutter abriria.
//
// - A ponte `MiaGamesFlutter` é simulada: tudo que o jogo envia ao Flutter
//   (SPEAK, GAME_COMPLETE, NAVIGATE_BACK) fica em `game.messages()`.
// - O relógio é falso e pausado (page.clock): o tempo só avança quando o teste
//   manda (game.tick), então os testes são rápidos e deterministas.
// - A Web Audio é espiada: `game.notes()` conta as notas tocadas.
// - Qualquer erro de página ou recurso que falhar ao carregar derruba o teste.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test: base, expect } = require('@playwright/test');

const LOGICS = {
  'which-letter': require('../../assets/games/which-letter/which-letter-logic.js'),
  'how-many': require('../../assets/games/how-many/how-many-logic.js'),
  'missing-syllable': require('../../assets/games/missing-syllable/missing-syllable-logic.js'),
};
const PaintLogic = require('../../assets/games/paint/paint-logic.js');
const BuildWordLogic = require('../../assets/games/build-word/build-word-logic.js');
const SortBoxLogic = require('../../assets/games/sort-box/sort-box-logic.js');
const PuzzleLogic = require('../../assets/games/puzzle/puzzle-logic.js');

const gameUrl = (id) =>
  pathToFileURL(path.join(__dirname, `../../assets/games/${id}/index.html`)).href;

/** Tempo que o jogo espera antes de verificar as duas cartas (CHECK_DELAY_MS) */
const CHECK_DELAY_MS = 800;

/** Pausa de comemoração dos jogos de responder, antes da próxima rodada */
const ADVANCE_DELAY_MS = 1500;

/**
 * Gerador pseudoaleatório com semente (mulberry32). O mesmo código roda na página
 * (substituindo Math.random) e no Node, então um teste pode escolher uma semente
 * que produz o tabuleiro que quer verificar.
 */
function prng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** O que todo jogo tem: abrir como a WebView do Flutter, ouvir a ponte e avançar o relógio */
class Game {
  constructor(page, problems, id) {
    this.page = page;
    this.problems = problems;
    this.id = id;
  }

  /** Abre o jogo e envia o INIT, como o Flutter faz quando a página carrega. */
  async open({ level = 1, sound = true, best = null, seed = null, outfit = [] } = {}) {
    await this.page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
    if (seed !== null) {
      // Tabuleiro previsível: o sorteio da página usa o mesmo gerador que o Node
      await this.page.addInitScript({
        content: `Math.random = (${prng.toString()})(${Number(seed)});`,
      });
    }
    await this.page.addInitScript(() => {
      window.__messages = [];
      window.__notes = 0;
      window.MiaGamesFlutter = {
        postMessage: (m) => window.__messages.push(JSON.parse(m)),
      };
      const Real = window.AudioContext;
      window.AudioContext = class extends Real {
        createOscillator() {
          window.__notes++;
          return super.createOscillator();
        }
      };
    });
    await this.page.goto(gameUrl(this.id));
    // Pausa o relógio: depois de install() o tempo ainda corre sozinho, o que
    // deixaria os cronômetros e prazos dependentes da velocidade da máquina.
    await this.page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
    await this.page.evaluate(
      (init) =>
        window.handleFlutterMessage({ type: 'INIT', ...init }),
      { gameId: this.id, level, sound, best, outfit },
    );
    return this;
  }

  /** Mensagens enviadas ao Flutter (acumuladas desde o início) */
  messages() {
    return this.page.evaluate(() => window.__messages);
  }

  spoken() {
    return this.messages().then((all) =>
      all.filter((m) => m.type === 'SPEAK').map((m) => m.text),
    );
  }

  notes() {
    return this.page.evaluate(() => window.__notes);
  }

  /** Avança o relógio do jogo */
  tick(ms) {
    return this.page.clock.runFor(ms);
  }
}

class MemoryGame extends Game {
  constructor(page, problems) {
    super(page, problems, 'memory');
  }

  /** Padrão: nível 2 (6 pares, os números até 9) — os testes da partida contam com 6 pares */
  open({ level = 2, ...rest } = {}) {
    return super.open({ level, ...rest });
  }

  cards() {
    return this.page.locator('.card');
  }

  /** Símbolo (letra ou número) de cada carta, na ordem do tabuleiro */
  symbols() {
    return this.page.evaluate(() =>
      [...document.querySelectorAll('.glyph')].map((g) => g.dataset.symbol),
    );
  }

  /** Índices das cartas agrupados por símbolo: [[a, b], [c, d], ...] */
  async pairs() {
    const groups = {};
    (await this.symbols()).forEach((symbol, i) => (groups[symbol] ??= []).push(i));
    return Object.values(groups);
  }

  /** Vira duas cartas e espera a verificação */
  async flipPair(a, b) {
    await this.cards().nth(a).click();
    await this.cards().nth(b).click();
    await this.tick(CHECK_DELAY_MS);
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (const [a, b] of await this.pairs()) {
      await this.flipPair(a, b);
    }
  }

  /** Dois índices de cartas de pares diferentes */
  async mismatch() {
    const [[a], [b]] = await this.pairs();
    return [a, b];
  }
}

/**
 * Jogos de responder (Qual é a letra?, Quantos tem?...): sabem a resposta certa de
 * cada rodada porque o sorteio da página usa a mesma semente que o Node.
 */
class QuizGame extends Game {
  constructor(page, problems, id) {
    super(page, problems, id);
    this.logic = LOGICS[id];
  }

  async open({ level = 1, seed = 1, ...rest } = {}) {
    await super.open({ level, seed, ...rest });
    this.plan = this.logic.createGame(level, { random: prng(seed) });
    return this;
  }

  options() {
    return this.page.locator('.option');
  }

  option(symbol) {
    return this.page.locator(`.option[data-symbol="${symbol}"]`);
  }

  /** Quantas rodadas já foram acertadas */
  solvedCount() {
    return this.page.locator('#progress .dot.done').count();
  }

  /** A rodada em que a criança está, segundo o sorteio com semente */
  async currentRound() {
    return this.plan.rounds[await this.solvedCount()];
  }

  /** A chave da figura certa da rodada atual ("B", "7"...) */
  async correctSymbol() {
    return (await this.currentRound()).answerKey;
  }

  /** A chave de uma figura errada da rodada atual (a n-ésima) */
  async wrongSymbol(n = 0) {
    const round = await this.currentRound();
    return round.optionKeys.filter((k) => k !== round.answerKey)[n];
  }

  /**
   * Acerta a rodada atual e espera a pausa de comemoração. `force`: depois de 2 erros
   * a resposta certa pulsa sem parar, e o Playwright esperaria ela "ficar parada".
   */
  async answerRight() {
    await this.option(await this.correctSymbol()).click({ force: true });
    await this.tick(ADVANCE_DELAY_MS);
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (let i = 0; i < this.plan.total; i++) await this.answerRight();
  }

  /** Acerta as rodadas até chegar à de índice `index` (0 = a primeira) */
  async goToRound(index) {
    while ((await this.solvedCount()) < index) await this.answerRight();
  }
}

/**
 * "Colorir": pinta de verdade, passando o mouse. Para saber onde é "dentro" da letra, lê a máscara
 * (#mask), que é a forma da letra desenhada num canvas escondido.
 */
class PaintGame extends Game {
  constructor(page, problems) {
    super(page, problems, 'paint');
  }

  async open({ level = 1, seed = 1, ...rest } = {}) {
    await super.open({ level, seed, ...rest });
    this.plan = PaintLogic.createGame(level, { random: prng(seed) });
    await this.ready();
    return this;
  }

  /** Espera a forma estar desenhada (a fonte carrega de forma assíncrona) */
  ready() {
    return this.page.waitForSelector('#canvas-wrap[data-ready]');
  }

  /** Quantas formas já foram pintadas */
  doneCount() {
    return this.page.locator('#progress .dot.done').count();
  }

  swatch(id) {
    return this.page.locator(`.swatch[data-color="${id}"]`);
  }

  /** O pincel atual, em px de tela */
  async brush() {
    return Number(await this.page.locator('#canvas-wrap').getAttribute('data-brush'));
  }

  /**
   * Fileiras de pontos DENTRO da letra, em coordenadas de tela: [[{x, y}, ...], ...].
   * Cada fileira é um trecho contínuo de dentro; entre fileiras o dedo se levanta, então
   * pintar por elas nunca sai do contorno. `rowStep`/`colStep` em px de tela.
   */
  insideRuns(rowStep, colStep) {
    return this.page.evaluate(
      ({ rowStep, colStep }) => {
        const mask = document.getElementById('mask');
        const data = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
        const rect = document.getElementById('outline').getBoundingClientRect();
        const sx = rect.width / mask.width;
        const sy = rect.height / mask.height;
        const runs = [];
        for (let y = Math.floor(rowStep / 2 / sy); y < mask.height; y += Math.max(1, Math.round(rowStep / sy))) {
          let run = [];
          for (let x = 0; x < mask.width; x += Math.max(1, Math.round(colStep / sx))) {
            const inside = data[(y * mask.width + x) * 4 + 3] > 200;
            if (inside) run.push({ x: rect.left + x * sx, y: rect.top + y * sy });
            else if (run.length) { runs.push(run); run = []; }
          }
          if (run.length) runs.push(run);
        }
        return runs;
      },
      { rowStep, colStep },
    );
  }

  /** Um ponto dentro da letra e outro bem fora dela (o canto da tela de pintura) */
  async insideAndOutside() {
    const [first] = await this.insideRuns(20, 20);
    const rect = await this.page.locator('#outline').boundingBox();
    return { inside: first[Math.floor(first.length / 2)], outside: { x: rect.x + 2, y: rect.y + 2 } };
  }

  /**
   * Pinta (parte de) a letra por dentro, sem sair do contorno. `fraction`: quanto das fileiras.
   * Os eventos de ponteiro são disparados de uma vez dentro da página (um por um, pelo mouse, as
   * palavras do nível 6 levariam minutos); o mouse de verdade é usado nos testes de contorno.
   */
  async paintInside(fraction = 1) {
    const brush = await this.brush();
    // espaçamento pequeno em relação ao pincel, para não perder traços finos da letra
    const step = Math.max(6, brush * 0.4);
    const runs = await this.insideRuns(step, step);
    const used = runs.slice(0, Math.ceil(runs.length * fraction));
    await this.page.evaluate((runs) => {
      const el = document.getElementById('outline');
      const fire = (type, p) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            clientX: p.x, clientY: p.y, pointerId: 1, pointerType: 'mouse',
            isPrimary: true, bubbles: true, cancelable: true,
          }),
        );
      for (const run of runs) {
        fire('pointerdown', run[0]);
        for (const p of run.slice(1)) fire('pointermove', p);
        fire('pointerup', run[run.length - 1]);
      }
    }, used);
  }

  /** Um toque que começa dentro, vai para fora do contorno e volta: conta 1 saída */
  async leaveOnce() {
    const { inside, outside } = await this.insideAndOutside();
    await this.page.mouse.move(inside.x, inside.y);
    await this.page.mouse.down();
    await this.page.mouse.move(outside.x, outside.y);
    await this.page.mouse.move(inside.x, inside.y);
    await this.page.mouse.up();
  }

  /** Pinta a forma atual inteira e espera a pausa de comemoração */
  async finishItem() {
    await this.paintInside(1);
    await this.tick(PaintLogic.ADVANCE_DELAY_MS);
    if ((await this.doneCount()) < this.plan.total) await this.ready();
  }

  /** Joga uma partida perfeita, sem sair do contorno */
  async solve() {
    for (let i = 0; i < this.plan.total; i++) await this.finishItem();
  }

  /** Os pixels pintados (alpha > 10) que ficam FORA da máscara: tem de ser 0 */
  paintOutsideMask() {
    return this.page.evaluate(() => {
      const get = (id) => {
        const c = document.getElementById(id);
        return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      };
      const paint = get('paint');
      const mask = get('mask');
      let outside = 0;
      let painted = 0;
      for (let i = 3; i < paint.length; i += 4) {
        if (paint[i] > 10) {
          painted++;
          if (mask[i] < 10) outside++;
        }
      }
      return { painted, outside };
    });
  }

  /** A cor (rgb) do pixel pintado mais ao centro da letra */
  paintedColor() {
    return this.page.evaluate(() => {
      const c = document.getElementById('paint');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const counts = {};
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 250) {
          const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
          counts[k] = (counts[k] || 0) + 1;
        }
      }
      return counts;
    });
  }
}

/**
 * Jogos de arrastar: o dedo é o mouse de verdade (mouse.down / move / up) ou, em `touchDrag`,
 * eventos de ponteiro do tipo "toque" disparados na página. O item levantado fica `GameDrag.LIFT`
 * px acima do dedo: para o CENTRO dele parar no alvo, o dedo vai `LIFT` abaixo do centro do alvo.
 */
class DragGame extends Game {
  lift() {
    return this.page.evaluate(() => window.GameDrag.LIFT);
  }

  /** Arrasta `from` até `to` (locators) com o mouse. `drop: false` deixa o botão apertado */
  async dragTo(from, to, { steps = 8, drop = true, dx = 0, dy = 0 } = {}) {
    const a = await from.boundingBox();
    const b = await to.boundingBox();
    const lift = await this.lift();
    await this.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + lift + dy, { steps });
    if (drop) await this.page.mouse.up();
  }

  /** Arrasta até um ponto da tela (o centro do item para nele) */
  async dragToPoint(from, x, y, { steps = 8, drop = true } = {}) {
    const a = await from.boundingBox();
    const lift = await this.lift();
    await this.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + lift, { steps });
    if (drop) await this.page.mouse.up();
  }

  /** O mesmo arrasto, mas com eventos de ponteiro de TOQUE (como a WebView do Android envia) */
  async touchDrag(from, to, { steps = 6 } = {}) {
    const a = await from.boundingBox();
    const b = await to.boundingBox();
    const lift = await this.lift();
    await this.page.evaluate(
      ({ a, b, lift, steps }) => {
        const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
        const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 + lift };
        const el = document.elementFromPoint(start.x, start.y);
        const fire = (type, p) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              clientX: p.x, clientY: p.y, pointerId: 7, pointerType: 'touch',
              isPrimary: true, bubbles: true, cancelable: true,
            }),
          );
        fire('pointerdown', start);
        for (let i = 1; i <= steps; i++) {
          fire('pointermove', { x: start.x + ((end.x - start.x) * i) / steps, y: start.y + ((end.y - start.y) * i) / steps });
        }
        fire('pointerup', end);
      },
      { a, b, lift, steps },
    );
  }

  /** Espera as animações de CSS (encaixe, volta) terminarem; as que não acabam (a dica pulsa) ficam de fora */
  settled() {
    return this.page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((x) => x.effect.getTiming().iterations !== Infinity)
          .map((x) => x.finished.catch(() => {})),
      ),
    );
  }
}

/** "Montar a palavra": arrasta as sílabas para as lacunas; sabe a palavra de cada rodada pela semente */
class BuildWordGame extends DragGame {
  constructor(page, problems) {
    super(page, problems, 'build-word');
  }

  async open({ level = 1, seed = 1, ...rest } = {}) {
    await super.open({ level, seed, ...rest });
    this.plan = BuildWordLogic.createGame(level, { random: prng(seed) });
    return this;
  }

  /** Peças que ainda estão na bandeja */
  looseTiles() {
    return this.page.locator('#tray .tile.draggable');
  }

  /** Uma peça solta com essa sílaba ('bo') */
  loose(syllable) {
    return this.page.locator(`#tray .tile.draggable[data-syllable="${syllable}"]`).first();
  }

  slot(index) {
    return this.page.locator(`.slot[data-index="${index}"]`);
  }

  doneCount() {
    return this.page.locator('#progress .dot.done').count();
  }

  /** A palavra em que a criança está, segundo o sorteio com semente */
  async currentRound() {
    return this.plan.rounds[await this.doneCount()];
  }

  /** Uma sílaba que NÃO serve na lacuna dada, entre as peças soltas */
  async wrongSyllable(slot) {
    const round = await this.currentRound();
    const loose = await this.looseTiles().evaluateAll((els) => els.map((e) => e.dataset.syllable));
    return loose.find((s) => s !== round.syllables[slot]);
  }

  /** Arrasta a peça certa para a lacuna `slot` da palavra atual */
  async placeRight(slot) {
    const round = await this.currentRound();
    await this.dragTo(this.loose(round.syllables[slot]), this.slot(slot));
    await this.settled();
  }

  /** Arrasta uma peça errada para a lacuna `slot` */
  async placeWrong(slot) {
    await this.dragTo(this.loose(await this.wrongSyllable(slot)), this.slot(slot));
    await this.settled();
  }

  /** Monta a palavra atual sem erro e espera a pausa de comemoração */
  async solveRound() {
    const round = await this.currentRound();
    for (let slot = 0; slot < round.syllables.length; slot++) await this.placeRight(slot);
    await this.tick(BuildWordLogic.ADVANCE_DELAY_MS);
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (let i = 0; i < this.plan.total; i++) await this.solveRound();
  }

  /** Monta as palavras até chegar à de índice `index` (0 = a primeira) */
  async goToRound(index) {
    while ((await this.doneCount()) < index) await this.solveRound();
  }
}

/**
 * "Na caixa certa": arrasta as peças para as caixas (ou, nos níveis de dar, para o prato).
 * Sabe cada rodada pela semente; `roundIndex` é a rodada em que a criança está.
 */
class SortBoxGame extends DragGame {
  constructor(page, problems) {
    super(page, problems, 'sort-box');
  }

  async open({ level = 1, seed = 1, ...rest } = {}) {
    await super.open({ level, seed, ...rest });
    this.plan = SortBoxLogic.createGame(level, { random: prng(seed) });
    this.roundIndex = 0;
    return this;
  }

  round() {
    return this.plan.rounds[this.roundIndex];
  }

  /** Peças que ainda estão na pilha e podem ser arrastadas */
  looseItems() {
    return this.page.locator('#tray .item.draggable');
  }

  /** A peça (da pilha) com esse id */
  item(id) {
    return this.page.locator(`#tray .item[data-item="${id}"]`);
  }

  box(id) {
    return this.page.locator(`.box[data-box="${id}"]`);
  }

  doneCount() {
    return this.page.locator('#progress .dot.done').count();
  }

  /** Arrasta a peça `id` até a caixa `boxId` e espera as animações */
  async drop(id, boxId) {
    await this.dragTo(this.item(id), this.box(boxId));
    await this.settled();
  }

  /** As peças da rodada atual que vão para alguma caixa, na ordem da pilha */
  wanted() {
    return this.round().items.filter((i) => i.target);
  }

  /** Coloca a peça no lugar certo */
  placeRight(item) {
    return this.drop(item.id, item.target);
  }

  /** Uma peça da rodada atual que NÃO vai na caixa dada (e ainda está solta) e o id de uma caixa errada para ela */
  async wrongDrop() {
    const loose = await this.looseItems().evaluateAll((els) => els.map((e) => e.dataset.item));
    const round = this.round();
    for (const id of loose) {
      const item = round.items.find((i) => i.id === id);
      const box = round.targets.find((t) => t.id !== item.target);
      if (box) return { item, boxId: box.id };
    }
    return null;
  }

  /** Solta uma peça numa caixa que não é a dela */
  async dropWrong() {
    const { item, boxId } = await this.wrongDrop();
    await this.drop(item.id, boxId);
    return item;
  }

  /** Termina a rodada atual sem erro e espera a pausa de comemoração */
  async solveRound() {
    const round = this.round();
    const wanted = this.wanted().slice(0, round.goal);
    for (const item of wanted) await this.placeRight(item);
    await this.tick(SortBoxLogic.ADVANCE_DELAY_MS);
    this.roundIndex++;
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (let i = 0; i < this.plan.rounds.length; i++) await this.solveRound();
  }
}

/**
 * "Quebra-cabeça": arrasta as peças do desenho para a grade. Sabe o desenho e a ordem das peças de cada
 * rodada pela semente; `roundIndex` é o desenho em que a criança está.
 */
class PuzzleGame extends DragGame {
  constructor(page, problems) {
    super(page, problems, 'puzzle');
  }

  async open({ level = 1, seed = 1, ...rest } = {}) {
    await super.open({ level, seed, ...rest });
    this.plan = PuzzleLogic.createGame(level, { random: prng(seed) });
    this.roundIndex = 0;
    return this;
  }

  round() {
    return this.plan.rounds[this.roundIndex];
  }

  /** Peças que ainda estão na bandeja */
  loosePieces() {
    return this.page.locator('#tray .piece.draggable');
  }

  piece(id) {
    return this.page.locator(`#tray .piece[data-piece="${id}"]`);
  }

  slot(cell) {
    return this.page.locator(`.slot[data-cell="${cell}"]`);
  }

  /** A peça de número `id` (da rodada atual), pelo objeto do plano */
  pieceOf(id) {
    return this.round().pieces.find((p) => p.id === id);
  }

  /** Arrasta a peça `id` até o lugar `cell` e espera as animações */
  async drop(id, cell) {
    await this.dragTo(this.piece(id), this.slot(cell));
    await this.settled();
  }

  /** Coloca a peça no lugar certo */
  placeRight(piece) {
    return this.drop(piece.id, piece.cell);
  }

  /** A bandeja da rodada atual na ordem em que as peças aparecem */
  tray() {
    return this.round().order.map((id) => this.pieceOf(id));
  }

  /** Solta uma peça solta num lugar vazio que NÃO é o dela; devolve a peça */
  async dropWrong() {
    const loose = await this.loosePieces().evaluateAll((els) => els.map((e) => e.dataset.piece));
    const piece = this.pieceOf(loose[0]);
    const filled = await this.page.locator('.slot.filled').evaluateAll((els) => els.map((e) => Number(e.dataset.cell)));
    const cell = this.round().pieces.find((p) => p.cell !== piece.cell && !filled.includes(p.cell)).cell;
    await this.drop(piece.id, cell);
    return piece;
  }

  /** Monta o desenho atual sem erro e espera a pausa de comemoração */
  async solveRound() {
    for (const piece of this.tray()) await this.placeRight(piece);
    await this.tick(PuzzleLogic.ADVANCE_DELAY_MS);
    this.roundIndex++;
  }

  /** Joga uma partida perfeita, sem erros */
  async solve() {
    for (let i = 0; i < this.plan.rounds.length; i++) await this.solveRound();
  }
}

const CLASSES = {
  puzzle: (page, problems) => new PuzzleGame(page, problems),
  'sort-box': (page, problems) => new SortBoxGame(page, problems),
  'build-word': (page, problems) => new BuildWordGame(page, problems),
  memory: (page, problems) => new MemoryGame(page, problems),
  'which-letter': (page, problems) => new QuizGame(page, problems, 'which-letter'),
  'how-many': (page, problems) => new QuizGame(page, problems, 'how-many'),
  'missing-syllable': (page, problems) => new QuizGame(page, problems, 'missing-syllable'),
  paint: (page, problems) => new PaintGame(page, problems),
};

const test = base.extend({
  // Qual jogo abrir: `test.use({ gameId: 'which-letter' })` (o padrão é a Memória)
  gameId: ['memory', { option: true }],

  game: async ({ page, gameId }, use) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`erro na página: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`falhou ao carregar: ${r.url()}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    });

    await use(CLASSES[gameId](page, problems));

    expect(problems, 'erros de página ou recursos que não carregaram').toEqual([]);
  },
});

/** Jogos com muitas peças mostram no máximo 8 estrelas de progresso (cada uma vale mais de uma peça) */
const MAX_DOTS = 8;

/** Quantas estrelas de progresso se veem numa partida de `total` peças */
const shownDots = (total) => Math.min(total, MAX_DOTS);

/** Quantas estão acesas depois de `done` peças no lugar (todas, só quando todas as peças estão) */
const litDots = (done, total) =>
  done >= total ? shownDots(total) : Math.floor((done * shownDots(total)) / total);

module.exports = { test, expect, CHECK_DELAY_MS, ADVANCE_DELAY_MS, prng, MAX_DOTS, shownDots, litDots };
