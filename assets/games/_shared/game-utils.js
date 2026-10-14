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

  /**
   * Estrelas pelos acertos de primeira: 7 de 8 ou mais → 3, 5 de 8 ou mais → 2,
   * senão 1. (A criança sempre ganha ao menos uma estrela por terminar.)
   */
  function starsForAccuracy(firstTry, total) {
    var ratio = firstTry / Math.max(total, 1);
    if (ratio >= 7 / 8) return 3;
    if (ratio >= 5 / 8) return 2;
    return 1;
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
    fitSquare: fitSquare,
    bestGrid: bestGrid,
    elapsedMs: elapsedMs,
    starsForAccuracy: starsForAccuracy,
    isNewRecord: isNewRecord,
  };
});
