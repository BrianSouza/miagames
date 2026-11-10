/**
 * Arrastar com o dedo, igual para os jogos de arrastar (Montar a palavra, Na caixa certa,
 * Quebra-cabeça, Quarto da Mia).
 *
 * Usa Pointer Events (o arrastar HTML5 não funciona em toque na WebView) e a captura do ponteiro,
 * como o Colorir. O item "levanta" — cresce um pouco e fica acima do dedo, para o dedo não
 * esconder o que se arrasta — e segue o dedo. Ao soltar, o jogo diz se aceitou o item naquele
 * alvo ('accept') ou não ('reject'): se não, o item volta suave para onde estava.
 * Um toque curto, sem arrastar, é um "toque" (onTap).
 *
 * Só um dedo por vez: outro dedo na tela enquanto se arrasta é ignorado.
 */
(function (root) {
  'use strict';

  var Logic = root.GameDragLogic;

  var LIFT = 28;          // px que o item fica acima do dedo
  var SCALE = 1.1;        // o item levantado cresce um pouco
  var TAP_SLOP = 10;      // até aqui o dedo "só tocou"
  var SLACK = 20;         // folga (px) em volta de cada alvo: o dedo não precisa acertar na mosca
  var RETURN_MS = 260;    // quanto dura a volta (ou o encaixe) suave

  /**
   * options:
   *   area        elemento que contém os itens (os eventos são ouvidos nele)
   *   selector    quais filhos de `area` se arrastam (padrão '.draggable')
   *   getTargets(item) → [{ id, el }]   onde o item pode ser solto (lido a cada movimento)
   *   onDrop(item, target) → 'accept' | 'reject'   target = { id, el } ou null (solto fora de todos)
   *   onStart(item), onTap(item), onCancel(item)   opcionais
   *   slack, lift      (opcionais) sobrescrevem os padrões
   */
  function create(options) {
    var area = options.area;
    var selector = options.selector || '.draggable';
    var slack = options.slack === undefined ? SLACK : options.slack;
    var lift = options.lift === undefined ? LIFT : options.lift;

    var enabled = true;
    var gesture = null;     // { item, pointerId, startX, startY, moved, over }

    function rectOf(el) {
      var r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }

    function targetsFor(item) {
      return (options.getTargets ? options.getTargets(item) : []).map(function (t) {
        var r = rectOf(t.el);
        return { id: t.id, el: t.el, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
    }

    /** Em qual alvo o item está agora? (o centro do item, já levantado e crescido) */
    function targetUnder(item) {
      var center = Logic.centerOf(rectOf(item));
      return Logic.hitTarget(center, targetsFor(item), slack);
    }

    function setOver(target) {
      var el = target ? target.el : null;
      if (gesture.over === el) return;
      if (gesture.over) gesture.over.classList.remove('drop-over');
      if (el) el.classList.add('drop-over');
      gesture.over = el;
    }

    /**
     * O item sai de onde está (a posição visual `from`) e vai para o seu lugar natural, que pode
     * ser outro (se o jogo o moveu no DOM) ou o mesmo (se ele só volta): desliza suave até lá.
     */
    function settle(item, from) {
      item.classList.remove('dragging');
      item.style.transition = 'none';
      item.style.transform = '';
      var to = rectOf(item);
      var dx = from.left + from.width / 2 - (to.left + to.width / 2);
      var dy = from.top + from.height / 2 - (to.top + to.height / 2);
      var scale = to.width > 0 ? from.width / to.width : 1;
      item.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
      void item.offsetWidth;                       // aplica o ponto de partida antes de animar
      item.classList.add('returning');
      item.style.transition = '';
      item.style.transform = '';
      var done = function () { item.classList.remove('returning'); };
      item.addEventListener('transitionend', done, { once: true });
      item.addEventListener('transitioncancel', done, { once: true });
      setTimeout(done, RETURN_MS + 80);
    }

    function onDown(e) {
      if (!enabled || gesture) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var item = e.target.closest ? e.target.closest(selector) : null;
      if (!item || !area.contains(item)) return;
      e.preventDefault();
      // uma volta anterior ainda em andamento não pode atrasar este arrasto
      item.classList.remove('returning');
      item.style.transition = '';
      // sem a captura o dedo que escapa do item deixaria de arrastá-lo; sem ela, arrastar continua
      try { item.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sem captura */ }
      gesture = { item: item, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, over: null };
    }

    function onMove(e) {
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      var dx = e.clientX - gesture.startX;
      var dy = e.clientY - gesture.startY;
      if (!gesture.moved) {
        if (Math.hypot(dx, dy) < TAP_SLOP) return;
        gesture.moved = true;
        gesture.item.classList.add('dragging');
        if (options.onStart) options.onStart(gesture.item);
      }
      gesture.item.style.transform =
        'translate(' + dx + 'px, ' + (dy - lift) + 'px) scale(' + SCALE + ')';
      setOver(targetUnder(gesture.item));
    }

    function onUp(e) {
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      var item = gesture.item;
      if (!gesture.moved) {
        gesture = null;
        if (options.onTap) options.onTap(item);
        return;
      }
      var target = targetUnder(item);
      var from = rectOf(item);
      if (gesture.over) gesture.over.classList.remove('drop-over');
      gesture = null;
      var result = options.onDrop(item, target ? { id: target.id, el: target.el } : null);
      // aceito ou recusado, o item desliza do ponto em que foi solto até o seu lugar
      settle(item, from);
      return result;
    }

    function onCancel(e) {
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      cancel();
    }

    /** Desiste do gesto atual: o item volta ao lugar (girou a tela, o jogo reiniciou, o dedo sumiu) */
    function cancel() {
      if (!gesture) return;
      var item = gesture.item;
      var moved = gesture.moved;
      var from = rectOf(item);
      if (gesture.over) gesture.over.classList.remove('drop-over');
      gesture = null;
      if (!moved) return;
      settle(item, from);
      if (options.onCancel) options.onCancel(item);
    }

    area.addEventListener('pointerdown', onDown);
    // ouvidos na janela: com a captura os eventos chegam ao item e sobem até aqui; sem ela, também
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onCancel);
    area.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // sem menu no toque longo

    return {
      cancel: cancel,
      isDragging: function () { return !!gesture && gesture.moved; },
      setEnabled: function (on) { enabled = !!on; if (!enabled) cancel(); },
    };
  }

  root.GameDrag = {
    create: create,
    LIFT: LIFT,
    SCALE: SCALE,
    SLACK: SLACK,
    TAP_SLOP: TAP_SLOP,
    RETURN_MS: RETURN_MS,
  };
})(window);
