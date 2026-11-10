/**
 * Contas dos jogos de arrastar: onde o item caiu, em qual alvo, e posições que sobrevivem à
 * rotação da tela. Funções puras, sem DOM.
 *
 * Um retângulo é { left, top, right, bottom } (em px de tela, como getBoundingClientRect);
 * um alvo é um retângulo com um `id` (e o que mais o jogo quiser guardar nele).
 *
 * Roda no navegador (window.GameDragLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameDragLogic = factory();
  }
})(this, function () {
  'use strict';

  function centerOf(rect) {
    return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function contains(rect, point, pad) {
    return point.x >= rect.left - pad && point.x <= rect.right + pad &&
           point.y >= rect.top - pad && point.y <= rect.bottom + pad;
  }

  /**
   * Em qual alvo o ponto caiu? `slack` (px) é a folga em volta de cada alvo: um dedo de 5 anos
   * não acerta na mosca. Quem contém o ponto de verdade vence quem só o alcança pela folga;
   * entre vários, o de centro mais próximo. Devolve o alvo ou null.
   */
  function hitTarget(point, targets, slack) {
    var pad = Math.max(0, slack || 0);
    var best = null;
    var bestExact = false;
    var bestDistance = Infinity;
    targets.forEach(function (target) {
      if (!contains(target, point, pad)) return;
      var exact = contains(target, point, 0);
      var d = distance(point, centerOf(target));
      var better = best === null ||
        (exact && !bestExact) ||
        (exact === bestExact && d < bestDistance);
      if (better) {
        best = target;
        bestExact = exact;
        bestDistance = d;
      }
    });
    return best;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /** O ponto, trazido para dentro do retângulo (com uma margem) */
  function clampPoint(point, rect, margin) {
    var m = margin || 0;
    return {
      x: clamp(point.x, rect.left + m, Math.max(rect.left + m, rect.right - m)),
      y: clamp(point.y, rect.top + m, Math.max(rect.top + m, rect.bottom - m)),
    };
  }

  /** Posição de tela → fração (0 a 1) do retângulo: sobrevive a girar o aparelho */
  function toNormalized(point, rect) {
    var width = Math.max(1, rect.right - rect.left);
    var height = Math.max(1, rect.bottom - rect.top);
    return {
      x: clamp((point.x - rect.left) / width, 0, 1),
      y: clamp((point.y - rect.top) / height, 0, 1),
    };
  }

  /** Fração (0 a 1) → posição de tela dentro do retângulo */
  function fromNormalized(norm, rect) {
    return {
      x: rect.left + clamp(norm.x, 0, 1) * (rect.right - rect.left),
      y: rect.top + clamp(norm.y, 0, 1) * (rect.bottom - rect.top),
    };
  }

  return {
    centerOf: centerOf,
    distance: distance,
    contains: contains,
    hitTarget: hitTarget,
    clamp: clamp,
    clampPoint: clampPoint,
    toNormalized: toNormalized,
    fromNormalized: fromNormalized,
  };
});
