/**
 * Contas que todos os jogos usam: tamanho dos quadrados na tela, tempo,
 * estrelas por acertos e recorde. Funções puras, sem DOM.
 *
 * Roda no navegador (window.GameUtils) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameUtils = factory();
  }
})(this, function () {
  'use strict';

  /**
   * Lado (px) de quadrados em `cols` x `rows` para caberem na área disponível,
   * considerando largura E altura — em tablets e telas baixas a altura é o limite.
   */
  function fitSquare(width, height, cols, rows, gap) {
    var byWidth = (width - gap * (cols - 1)) / cols;
    var byHeight = (height - gap * (rows - 1)) / rows;
    return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
  }

  /**
   * Entre os arranjos possíveis de `count` quadrados (1 coluna, 2 colunas...),
   * o que deixa os quadrados maiores. Devolve { cols, rows, size }.
   */
  function bestGrid(count, width, height, gap) {
    var best = null;
    for (var cols = 1; cols <= count; cols++) {
      var rows = Math.ceil(count / cols);
      var size = fitSquare(width, height, cols, rows, gap);
      if (!best || size > best.size) best = { cols: cols, rows: rows, size: size };
    }
    return best;
  }

  /** Milissegundos desde o primeiro toque (0 antes de começar) */
  function elapsedMs(state, now) {
    if (state.startedAt === null) return 0;
    var end = state.completedAt !== null ? state.completedAt : now;
    return Math.max(0, end - state.startedAt);
  }

  /** Níveis de cada jogo: 6 degraus, do 1 ao 6 */
  var LEVEL_COUNT = 6;

  /** Um nível válido (1 a 6); qualquer outra coisa vira o 1 */
  function clampLevel(level) {
    var n = Math.floor(Number(level));
    return n >= 1 && n <= LEVEL_COUNT ? n : 1;
  }

  /**
   * Quantos acertos de primeira (de 8 rodadas) valem 2 e 3 estrelas em cada nível.
   * A exigência CRESCE com o nível: no 1, 4 de 8 já dão 2 estrelas (o suficiente para abrir o
   * nível 2); no 6, são 7 de 8. Subir de nível fica mais difícil sem deixar de ser possível.
   */
  var QUIZ_STAR_RULES = {
    two:   [4, 5, 5, 6, 6, 7],
    three: [6, 7, 7, 7, 8, 8],
  };

  /**
   * Estrelas pelos acertos de primeira no nível `level` (1 a 6). A criança sempre
   * ganha ao menos uma estrela por terminar.
   */
  function starsForAccuracy(firstTry, total, level) {
    var i = clampLevel(level) - 1;
    var ratio = firstTry / Math.max(total, 1);
    if (ratio >= QUIZ_STAR_RULES.three[i] / 8) return 3;
    if (ratio >= QUIZ_STAR_RULES.two[i] / 8) return 2;
    return 1;
  }

  /**
   * O que a voz diz no fim da partida. Com 1 estrela o próximo nível não abre (são precisas 2):
   * a Mia incentiva a tentar de novo, sem dizer que errou.
   */
  function resultSpeech(stars, newRecord) {
    if (newRecord) return 'Parabéns! Novo recorde!';
    if (stars >= 3) return 'Parabéns! Que incrível!';
    if (stars === 2) return 'Muito bem!';
    return 'Quase! Vamos tentar de novo?';
  }

  /**
   * A partida terminada bate o recorde salvo? Mais estrelas vencem; com as
   * mesmas estrelas, menos jogadas (ou erros). Sem recorde salvo, não é "novo
   * recorde" (a primeira partida não deve parecer uma conquista especial).
   */
  function isNewRecord(best, stars, moves) {
    if (!best) return false;
    if (stars !== best.stars) return stars > best.stars;
    return moves < best.moves;
  }

  return {
    LEVEL_COUNT: LEVEL_COUNT,
    QUIZ_STAR_RULES: QUIZ_STAR_RULES,
    clampLevel: clampLevel,
    fitSquare: fitSquare,
    bestGrid: bestGrid,
    elapsedMs: elapsedMs,
    starsForAccuracy: starsForAccuracy,
    resultSpeech: resultSpeech,
    isNewRecord: isNewRecord,
  };
});
