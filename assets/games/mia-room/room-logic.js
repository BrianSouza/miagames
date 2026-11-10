/**
 * Regras do "Quarto da Mia" — funções puras, sem DOM, timers ou ponte.
 *
 * É um jogo livre: a criança arrasta móveis para o quarto, muda de lugar, tira, e a Mia também se
 * arrasta. Não há erro, nem estrela, nem fim. O que está aberto vem do Flutter (`furniture[].open`,
 * pelas estrelas somadas nos outros jogos); o quarto é guardado como frações (0 a 1) do tamanho
 * dele, para sobreviver a girar o aparelho.
 *
 * Cada mudança devolve um estado NOVO e guarda o anterior para "desfazer".
 * Roda no navegador (window.RoomLogic) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RoomLogic = factory();
  }
})(this, function () {
  'use strict';

  /** Quantas peças cabem no quarto (o Flutter aceita até 40) */
  var MAX_ITEMS = 24;

  /** Quantos passos o "desfazer" guarda */
  var MAX_HISTORY = 30;

  var ID_PATTERN = /^[a-z]+$/;

  // O tamanho de cada móvel, em fração da MENOR medida do quarto (a caminha é grande, o novelo, pequeno)
  var SIZES = {
    bed: 0.42, rug: 0.4, plant: 0.22, table: 0.26, lamp: 0.22, chest: 0.28, frame: 0.24,
    shelf: 0.3, chair: 0.3, yarn: 0.16, bowl: 0.22, clock: 0.2, tent: 0.4,
  };
  var DEFAULT_SIZE = 0.26;
  var MIA_SIZE = 0.3;

  // O quarto da primeira vez: já vem arrumado com o que abre de graça, para a criança ver um quarto de verdade
  var STARTER = [
    { id: 'rug', x: 0.5, y: 0.8 },
    { id: 'bed', x: 0.26, y: 0.62 },
    { id: 'plant', x: 0.9, y: 0.58 },
  ];
  var STARTER_MIA = { x: 0.62, y: 0.7 };

  function clamp01(n) {
    return Math.min(Math.max(n, 0), 1);
  }

  function isFraction(n) {
    return typeof n === 'number' && isFinite(n);
  }

  /** Tamanho do móvel (fração da menor medida do quarto) */
  function sizeOf(id) {
    return SIZES[id] || DEFAULT_SIZE;
  }

  // O que é chão (o tapete) fica SEMPRE por baixo de todo mundo, mesmo que esteja mais embaixo no quarto
  var FLAT = { rug: true };
  var FLAT_Z = 5;

  /**
   * A ordem de desenho: quem está mais embaixo no quarto aparece na frente (o z-index vai de 10 a 90);
   * o chão (tapete) fica por baixo de tudo. Sem `id` (a Mia), vale só a posição.
   */
  function zIndexFor(y, id) {
    if (id && FLAT[id]) return FLAT_Z;
    return 10 + Math.round(clamp01(y) * 80);
  }

  function openIds(furniture) {
    var ids = {};
    (Array.isArray(furniture) ? furniture : []).forEach(function (f) {
      if (f && typeof f.id === 'string' && ID_PATTERN.test(f.id) && f.open === true) ids[f.id] = true;
    });
    return ids;
  }

  function snapshot(state) {
    return {
      items: state.items.map(function (i) { return { uid: i.uid, id: i.id, x: i.x, y: i.y }; }),
      mia: { x: state.mia.x, y: state.mia.y },
    };
  }

  function withHistory(state, change) {
    var history = state.history.concat([snapshot(state)]);
    if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);
    return Object.assign({}, state, change, { history: history });
  }

  /**
   * Cria o quarto. `furniture` é a lista do INIT ({ id, name, stars, open }); `saved` é o quarto
   * guardado ({ items: [{ id, x, y }], mia }) ou null (primeira vez: o quarto já vem arrumado).
   * Só entram móveis abertos, com id simples (a-z) e posição numérica; as posições são trazidas para
   * dentro do quarto; passa de MAX_ITEMS, o resto é descartado.
   */
  function create(furniture, saved) {
    var open = openIds(furniture);
    var source = saved && typeof saved === 'object' && Array.isArray(saved.items)
      ? saved
      : { items: STARTER, mia: STARTER_MIA };

    var items = [];
    var nextUid = 1;
    source.items.forEach(function (raw) {
      if (items.length >= MAX_ITEMS || !raw || typeof raw !== 'object') return;
      if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id) || !open[raw.id]) return;
      if (!isFraction(raw.x) || !isFraction(raw.y)) return;
      items.push({ uid: 'u' + nextUid++, id: raw.id, x: clamp01(raw.x), y: clamp01(raw.y) });
    });

    var mia = source.mia && isFraction(source.mia.x) && isFraction(source.mia.y)
      ? { x: clamp01(source.mia.x), y: clamp01(source.mia.y) }
      : { x: STARTER_MIA.x, y: STARTER_MIA.y };

    return { open: open, items: items, mia: mia, nextUid: nextUid, history: [] };
  }

  function indexOfItem(state, uid) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].uid === uid) return i;
    return -1;
  }

  function isOpen(state, id) {
    return state.open[id] === true;
  }

  /**
   * Põe um móvel novo (uma cópia) no quarto. Devolve { state, result, uid } com result:
   * 'added' | 'full' (o quarto está cheio) | 'closed' (ainda não abriu) | null (id ou posição inválidos).
   */
  function add(state, id, x, y) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id) || !isFraction(x) || !isFraction(y)) {
      return { state: state, result: null, uid: null };
    }
    if (!isOpen(state, id)) return { state: state, result: 'closed', uid: null };
    if (state.items.length >= MAX_ITEMS) return { state: state, result: 'full', uid: null };
    var uid = 'u' + state.nextUid;
    var next = withHistory(state, {
      items: state.items.concat([{ uid: uid, id: id, x: clamp01(x), y: clamp01(y) }]),
      nextUid: state.nextUid + 1,
    });
    return { state: next, result: 'added', uid: uid };
  }

  /** Muda um móvel de lugar. Devolve { state, result } com result 'moved' | null (não existe ou posição inválida) */
  function move(state, uid, x, y) {
    var index = indexOfItem(state, uid);
    if (index === -1 || !isFraction(x) || !isFraction(y)) return { state: state, result: null };
    var items = state.items.slice();
    items[index] = Object.assign({}, items[index], { x: clamp01(x), y: clamp01(y) });
    return { state: withHistory(state, { items: items }), result: 'moved' };
  }

  /** Tira um móvel do quarto (volta para a bandeja). Devolve { state, result } com result 'removed' | null */
  function remove(state, uid) {
    var index = indexOfItem(state, uid);
    if (index === -1) return { state: state, result: null };
    var items = state.items.slice();
    items.splice(index, 1);
    return { state: withHistory(state, { items: items }), result: 'removed' };
  }

  /** A Mia vai para outro lugar do quarto. Devolve { state, result } com result 'moved' | null */
  function moveMia(state, x, y) {
    if (!isFraction(x) || !isFraction(y)) return { state: state, result: null };
    return { state: withHistory(state, { mia: { x: clamp01(x), y: clamp01(y) } }), result: 'moved' };
  }

  /** Desfaz a última mudança. Devolve { state, undone } (undone: false se não há o que desfazer) */
  function undo(state) {
    if (!state.history.length) return { state: state, undone: false };
    var previous = state.history[state.history.length - 1];
    return {
      state: Object.assign({}, state, {
        items: previous.items,
        mia: previous.mia,
        history: state.history.slice(0, -1),
      }),
      undone: true,
    };
  }

  /** O que vai para o Flutter guardar: só ids e posições */
  function serialize(state) {
    return {
      items: state.items.map(function (i) { return { id: i.id, x: i.x, y: i.y }; }),
      mia: { x: state.mia.x, y: state.mia.y },
    };
  }

  /** Quantas estrelas faltam para abrir o móvel `id` (0 se já abriu ou se não existe) */
  function starsMissing(furniture, id, totalStars) {
    var item = (furniture || []).filter(function (f) { return f && f.id === id; })[0];
    if (!item) return 0;
    return Math.max(0, item.stars - (Number(totalStars) || 0));
  }

  return {
    MAX_ITEMS: MAX_ITEMS,
    MAX_HISTORY: MAX_HISTORY,
    SIZES: SIZES,
    DEFAULT_SIZE: DEFAULT_SIZE,
    MIA_SIZE: MIA_SIZE,
    STARTER: STARTER,
    STARTER_MIA: STARTER_MIA,
    sizeOf: sizeOf,
    zIndexFor: zIndexFor,
    create: create,
    isOpen: isOpen,
    add: add,
    move: move,
    remove: remove,
    moveMia: moveMia,
    undo: undo,
    serialize: serialize,
    starsMissing: starsMissing,
  };
});
