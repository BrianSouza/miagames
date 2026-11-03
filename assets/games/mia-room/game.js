(function () {
  'use strict';

  // Camada de apresentação do "Quarto da Mia": o quarto, os móveis e a Mia que se arrastam, a bandeja e
  // a ponte com o Flutter. As regras ficam em room-logic.js (testado com `node --test`); arrastar é do
  // kit (_shared/drag.js).
  //
  // Aqui não há erro, estrela nem fim: o jogo é livre. O que a criança fez é guardado (SAVE_STATE).
  var Logic = window.RoomLogic;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;
  var GameDrag = window.GameDrag;

  var MIN_SOURCE = 56;
  var MAX_SOURCE = 88;
  var GAP = 8;
  var SAVE_DELAY_MS = 400;
  var CHEER_MS = 900;

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var furniture = [];
  var totalStars = 0;
  var pageIndex = 0;
  var perPage = 6;
  var saveTimer = null;
  var dirty = false;
  var cheerTimer = null;

  // ── DOM ───────────────────────────────────────────────────────────────────────
  var roomEl = document.getElementById('room');
  var trayAreaEl = document.getElementById('tray-area');
  var trayEl = document.getElementById('tray');
  var prevEl = document.getElementById('page-prev');
  var nextEl = document.getElementById('page-next');
  var statusEl = document.getElementById('status');
  var miaEl = null;   // o ator da Mia (criado depois do INIT, quando ela já sabe o que veste)

  // ── Ponte com o Flutter ───────────────────────────────────────────────────────
  // Sair do jogo guarda o que ficou pendente (o botão voltar chama Bridge.back)
  var backToHome = Bridge.back;
  Bridge.back = function () {
    flushSave();
    backToHome();
  };

  Bridge.onInit(function (data) {
    Sounds.setEnabled(data.sound !== false);
    furniture = Array.isArray(data.furniture) ? data.furniture : [];
    totalStars = Number(data.totalStars) || 0;
    state = Logic.create(furniture, data.state);
    pageIndex = 0;
    renderAll();
  });

  var speak = Bridge.speak;
  window.GameKit.createHeader({
    onReset: undo,
    onListen: function () { speak('Arraste os móveis para o quarto da Mia!'); },
    resetLabel: 'Desfazer',
  });

  var drag = GameDrag.create({
    area: document.getElementById('app'),
    selector: '.draggable',
    getTargets: function () {
      return [{ id: 'room', el: roomEl }, { id: 'tray', el: trayAreaEl }];
    },
    onStart: function () { Sounds.play('flip'); },
    onTap: onTap,
    onDrop: onDrop,
  });

  // ── Guardar ───────────────────────────────────────────────────────────────────
  /** Manda o quarto ao Flutter, um pouquinho depois da última mudança (arrastar gera muitas) */
  function changed() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DELAY_MS);
  }

  function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!dirty || !state) return;
    dirty = false;
    Bridge.send('SAVE_STATE', { state: Logic.serialize(state) });
  }

  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushSave();
  });

  // ── Desenhar ──────────────────────────────────────────────────────────────────
  function furnitureById(id) {
    for (var i = 0; i < furniture.length; i++) if (furniture[i].id === id) return furniture[i];
    return null;
  }

  function nameOf(id) {
    var item = furnitureById(id);
    return item ? item.name : id;
  }

  function renderAll() {
    renderActors();
    layout();
    statusEl.textContent = 'Quarto da Mia. Arraste os móveis para o quarto.';
  }

  /** Refaz tudo que está no quarto (a Mia e os móveis) a partir do estado */
  function renderActors() {
    drag.cancel();
    Array.prototype.forEach.call(roomEl.querySelectorAll('.actor'), function (el) { el.remove(); });

    miaEl = document.createElement('div');
    miaEl.className = 'actor mia-actor mia-stack draggable';
    miaEl.setAttribute('data-mia-stack', '');
    miaEl.setAttribute('role', 'img');
    miaEl.setAttribute('aria-label', 'Mia');
    var img = document.createElement('img');
    img.className = 'mia';
    img.alt = '';
    img.src = '../_shared/img/mia_happy.svg';
    miaEl.appendChild(img);
    roomEl.appendChild(miaEl);
    window.GameKit.dress(miaEl);

    state.items.forEach(function (item) { roomEl.appendChild(makeItem(item)); });
    positionAll();
  }

  function makeItem(item) {
    var el = document.createElement('div');
    el.className = 'actor item draggable';
    el.setAttribute('data-uid', item.uid);
    el.setAttribute('data-id', item.id);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', nameOf(item.id));
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = 'img/' + item.id + '.svg';
    el.appendChild(img);
    return el;
  }

  // ── Tamanhos e lugares ────────────────────────────────────────────────────────
  function roomSize() {
    return { w: roomEl.clientWidth, h: roomEl.clientHeight };
  }

  /** O lado (px) de um ator: fração da menor medida do quarto */
  function sidePx(fraction) {
    var r = roomSize();
    return Math.max(24, Math.round(Math.min(r.w, r.h) * fraction));
  }

  function fractionOf(el) {
    return el === miaEl ? Logic.MIA_SIZE : Logic.sizeOf(el.getAttribute('data-id'));
  }

  /** Põe o ator no lugar (x e y são frações do quarto: o centro dele) */
  function positionActor(el, x, y) {
    var r = roomSize();
    var s = sidePx(fractionOf(el));
    var cx = Math.min(Math.max(x * r.w, s / 2), Math.max(s / 2, r.w - s / 2));
    var cy = Math.min(Math.max(y * r.h, s / 2), Math.max(s / 2, r.h - s / 2));
    el.style.width = s + 'px';
    el.style.height = s + 'px';
    el.style.left = Math.round(cx - s / 2) + 'px';
    el.style.top = Math.round(cy - s / 2) + 'px';
    el.style.zIndex = Logic.zIndexFor(cy / r.h, el === miaEl ? null : el.getAttribute('data-id'));
  }

  function positionAll() {
    if (!state || !miaEl) return;
    positionActor(miaEl, state.mia.x, state.mia.y);
    Array.prototype.forEach.call(roomEl.querySelectorAll('.item'), function (el) {
      var item = state.items.filter(function (i) { return i.uid === el.getAttribute('data-uid'); })[0];
      if (item) positionActor(el, item.x, item.y);
    });
  }

  function layout() {
    positionAll();
    layoutTray();
  }

  /**
   * A bandeja: o maior tamanho de móvel (de 56 a 88 px) que deixa ao menos 4 na página; quantos cabem
   * por página vem da largura E da altura que ela tem (nas setas, a bandeja é a parte do meio).
   */
  function layoutTray() {
    var w = trayEl.clientWidth;
    var h = trayEl.clientHeight;
    var chosen = null;
    for (var size = MAX_SOURCE; size >= MIN_SOURCE && !chosen; size -= 4) {
      var cols = Math.floor((w + GAP) / (size + GAP));
      var rows = Math.floor((h + GAP) / (size + GAP));
      if (cols >= 1 && rows >= 1 && cols * rows >= Math.min(4, furniture.length)) {
        chosen = { size: size, cols: cols, rows: rows };
      }
    }
    if (!chosen) {
      chosen = {
        size: MIN_SOURCE,
        cols: Math.max(1, Math.floor((w + GAP) / (MIN_SOURCE + GAP))),
        rows: Math.max(1, Math.floor((h + GAP) / (MIN_SOURCE + GAP))),
      };
    }
    trayAreaEl.style.setProperty('--src', chosen.size + 'px');
    trayAreaEl.style.setProperty('--gap', GAP + 'px');
    trayEl.style.setProperty('--cols', chosen.cols);
    perPage = Math.max(1, chosen.cols * chosen.rows);
    pageIndex = Math.min(pageIndex, Math.max(0, Math.ceil(furniture.length / perPage) - 1));
    renderTray();
  }

  function renderTray() {
    trayEl.innerHTML = '';
    furniture.slice(pageIndex * perPage, (pageIndex + 1) * perPage).forEach(function (item) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.appendChild(makeSource(item));
      trayEl.appendChild(cell);
    });
    prevEl.disabled = pageIndex === 0;
    nextEl.disabled = (pageIndex + 1) * perPage >= furniture.length;
  }

  function lockedMessage(item) {
    var missing = Logic.starsMissing(furniture, item.id, totalStars);
    return item.name + '. Faltam ' + missing + (missing === 1 ? ' estrela' : ' estrelas') + ' para abrir!';
  }

  function makeSource(item) {
    var open = item.open === true;
    var el = document.createElement('div');
    el.className = 'source ' + (open ? 'draggable' : 'locked');
    el.setAttribute('data-furniture', item.id);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', open ? item.name : item.name + ', fechado');
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = 'img/' + item.id + '.svg';
    el.appendChild(img);
    if (!open) {
      var lock = document.createElement('span');
      lock.className = 'lock';
      lock.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/>' +
        '<path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
      el.appendChild(lock);
      var need = document.createElement('span');
      need.className = 'need';
      need.textContent = '★ ' + item.stars;
      el.appendChild(need);
    }
    return el;
  }

  prevEl.addEventListener('click', function () {
    if (pageIndex > 0) { pageIndex--; renderTray(); }
  });
  nextEl.addEventListener('click', function () {
    if ((pageIndex + 1) * perPage < furniture.length) { pageIndex++; renderTray(); }
  });

  // ── Soltar ────────────────────────────────────────────────────────────────────
  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /** O centro do ator, trazido para dentro do quarto (a peça nunca sai dele), em frações do quarto */
  function fractionAt(center, side) {
    var rect = roomEl.getBoundingClientRect();
    var half = side / 2;
    var cx = Math.min(Math.max(center.x - rect.left, half), Math.max(half, rect.width - half));
    var cy = Math.min(Math.max(center.y - rect.top, half), Math.max(half, rect.height - half));
    return { x: cx / rect.width, y: cy / rect.height };
  }

  function cheer() {
    setMia('cheer');
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(function () { setMia('happy'); }, CHEER_MS);
  }

  function setMia(pose) {
    var img = miaEl && miaEl.querySelector('img.mia:not(.outfit)');
    if (img) img.src = '../_shared/img/mia_' + pose + '.svg';
  }

  /** O kit pergunta: o que fazer com o que a criança soltou? ('accept' o ator fica; 'reject' volta para onde estava) */
  function onDrop(el, target) {
    if (!state) return 'reject';
    if (el.classList.contains('source')) return dropSource(el, target);
    if (el === miaEl) return dropMia();
    return dropItem(el, target);
  }

  /** Um móvel da bandeja caiu: se foi no quarto, entra uma cópia dele (a bandeja continua com o dele) */
  function dropSource(el, target) {
    if (!target || target.id !== 'room') return 'reject';
    var id = el.getAttribute('data-furniture');
    var at = fractionAt(centerOf(el), sidePx(Logic.sizeOf(id)));
    var out = Logic.add(state, id, at.x, at.y);
    if (out.result === 'full') {
      speak('O quarto está cheio! Guarde algum móvel.');
      return 'reject';
    }
    if (out.result !== 'added') return 'reject';
    state = out.state;
    var item = state.items[state.items.length - 1];
    var actor = makeItem(item);
    roomEl.appendChild(actor);
    positionActor(actor, item.x, item.y);
    Sounds.play('match');
    speak(nameOf(id) + '!');
    cheer();
    changed();
    return 'reject';
  }

  /** Um móvel do quarto: se caiu na bandeja, é guardado; senão muda de lugar (sem sair do quarto) */
  function dropItem(el, target) {
    var uid = el.getAttribute('data-uid');
    if (target && target.id === 'tray') {
      var removed = Logic.remove(state, uid);
      if (removed.result !== 'removed') return 'reject';
      state = removed.state;
      el.remove();
      Sounds.play('flip');
      speak('Guardei!');
      changed();
      return 'accept';
    }
    var id = el.getAttribute('data-id');
    var at = fractionAt(centerOf(el), sidePx(Logic.sizeOf(id)));
    var moved = Logic.move(state, uid, at.x, at.y);
    if (moved.result !== 'moved') return 'reject';
    state = moved.state;
    positionActor(el, at.x, at.y);
    Sounds.play('flip');
    changed();
    return 'accept';
  }

  /** A Mia também se arrasta: nunca sai do quarto e não vai para a bandeja */
  function dropMia() {
    var at = fractionAt(centerOf(miaEl), sidePx(Logic.MIA_SIZE));
    var moved = Logic.moveMia(state, at.x, at.y);
    if (moved.result !== 'moved') return 'reject';
    state = moved.state;
    positionActor(miaEl, at.x, at.y);
    Sounds.play('flip');
    changed();
    return 'accept';
  }

  // ── Tocar ─────────────────────────────────────────────────────────────────────
  function pop(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    el.addEventListener('animationend', function () { el.classList.remove('pop'); }, { once: true });
  }

  /** Um toque curto (sem arrastar): a voz diz o que é */
  function onTap(el) {
    if (el === miaEl) {
      speak('Oi! Este é o meu quarto!');
      cheer();
      return;
    }
    if (el.classList.contains('source')) {
      speak(nameOf(el.getAttribute('data-furniture')));
      return;
    }
    speak(nameOf(el.getAttribute('data-id')));
    pop(el);
  }

  // Tocar num móvel fechado (que não é arrastável) diz quantas estrelas faltam
  trayEl.addEventListener('click', function (e) {
    var locked = e.target.closest ? e.target.closest('.source.locked') : null;
    if (!locked) return;
    var item = furnitureById(locked.getAttribute('data-furniture'));
    if (item) speak(lockedMessage(item));
  });

  // ── Desfazer ──────────────────────────────────────────────────────────────────
  function undo() {
    if (!state) return;
    var out = Logic.undo(state);
    if (!out.undone) {
      speak('Nada para desfazer.');
      return;
    }
    state = out.state;
    renderActors();
    speak('Desfeito!');
    changed();
  }

  window.addEventListener('resize', function () {
    if (!state) return;
    drag.cancel();   // girar a tela no meio do arrasto: o móvel volta ao lugar
    layout();
  });
})();
