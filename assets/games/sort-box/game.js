(function () {
  'use strict';

  // Camada de apresentação do "Na caixa certa": as caixas (ou o prato), a pilha de peças que se
  // arrastam e a ponte com o Flutter. As regras ficam em sort-box-logic.js (testado com `node --test`);
  // arrastar é do kit (_shared/drag.js).
  var Logic = window.SortBoxLogic;
  var Utils = window.GameUtils;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;
  var GameResult = window.GameResult;
  var GameDrag = window.GameDrag;

  var MAX_TILE = 112;
  var MAX_BOX_W = 230;
  var MAX_BOX_H = 250;
  var MAX_CHIP = 44;
  var MIN_CHIP = 24;
  var GAP = 10;
  var MAX_DOTS = 8;          // estrelas de progresso no cabeçalho (cada uma vale mais de uma peça, se preciso)
  var CHIP_GAP = 4;
  var BOX_PADDING = 6 + 4;     // o respiro de dentro da caixa mais a borda

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var best = null;
  var advanceTimer = null;

  // ── DOM ───────────────────────────────────────────────────────────────────────
  var boardEl = document.getElementById('board');
  var boxesEl = document.getElementById('boxes');
  var trayAreaEl = document.getElementById('tray-area');
  var trayEl = document.getElementById('tray');
  var statusEl = document.getElementById('status');
  var miaEl = document.getElementById('mia');
  var askerEl = document.getElementById('asker');

  // ── Ponte com o Flutter ───────────────────────────────────────────────────────
  Bridge.onInit(function (data) {
    Sounds.setEnabled(data.sound !== false);
    best = data.best || null;
    startGame(data.level);
  });

  var speak = Bridge.speak;
  var header = window.GameKit.createHeader({ onReset: resetGame, onListen: listen, maxDots: MAX_DOTS });
  GameResult.init({ onAgain: resetGame, onHome: Bridge.back });
  askerEl.addEventListener('click', listen);

  var drag = GameDrag.create({
    area: document.getElementById('app'),
    selector: '.item.draggable',
    getTargets: function () {
      return Array.prototype.map.call(boxesEl.querySelectorAll('.box'), function (el) {
        return { id: el.getAttribute('data-box'), el: el };
      });
    },
    onStart: function () {
      state = Logic.start(state, Date.now());
      Sounds.play('flip');
    },
    onTap: function (item) {
      // tocar na peça (sem arrastar) diz o que ela é
      speak(item.getAttribute('data-say'));
    },
    onDrop: onDrop,
  });

  // tocar numa caixa diz o nome dela
  boxesEl.addEventListener('click', function (e) {
    var box = e.target.closest('.box');
    if (box) speak(box.getAttribute('data-say'));
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────────
  function startGame(level) {
    clearTimeout(advanceTimer);   // uma pausa pendente não pode atingir o jogo novo
    advanceTimer = null;
    drag.cancel();
    var previousRound = state ? state.round : 0;
    state = Logic.createGame(level || (state && state.level), { previousRound: previousRound });
    GameResult.hide();
    header.setTotal(state.total);
    header.setDone(0);
    showRound();
  }

  function resetGame() {
    startGame(state ? state.level : 1);
  }

  function prompt() {
    return Logic.promptFor(Logic.currentRound(state));
  }

  function listen() {
    if (state) speak(prompt());
  }

  function setMia(pose) {
    miaEl.src = '../_shared/img/mia_' + pose + '.svg';
  }

  // ── A rodada ──────────────────────────────────────────────────────────────────
  function showRound() {
    var round = Logic.currentRound(state);
    setMia('happy');
    statusEl.textContent = prompt();

    boxesEl.innerHTML = '';
    round.targets.forEach(function (target) {
      var box = document.createElement('div');
      box.className = 'box drop-target';
      box.setAttribute('data-box', target.id);
      box.setAttribute('data-say', target.say);
      box.setAttribute('aria-label', target.say);
      box.innerHTML = '<div class="box-label"></div><div class="box-items"></div>';
      box.querySelector('.box-label').textContent = target.label;
      boxesEl.appendChild(box);
    });

    trayEl.innerHTML = '';
    round.items.forEach(function (item) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      var el = document.createElement('div');
      el.className = 'item draggable';
      el.setAttribute('role', 'img');
      el.setAttribute('data-item', item.id);
      el.setAttribute('data-key', item.key);
      el.setAttribute('data-say', item.say);
      el.setAttribute('aria-label', item.say);
      if (item.img) {
        var img = document.createElement('img');
        img.src = '../how-many/img/' + item.img + '.svg';
        img.alt = '';
        el.appendChild(img);
      } else {
        el.textContent = item.glyph;
        el.setAttribute('data-len', item.glyph.length);
      }
      cell.appendChild(el);
      trayEl.appendChild(cell);
    });

    layout();
    speak(prompt());
  }

  function inner(el) {
    var style = getComputedStyle(el);
    return {
      width: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    };
  }

  /** O maior chip (peça pequena, já na caixa) para caber `count` deles numa caixa de `w` x `h` */
  function chipSizeFor(count, w, h) {
    for (var size = MAX_CHIP; size >= MIN_CHIP; size--) {
      var cols = Math.max(1, Math.floor((w + CHIP_GAP) / (size + CHIP_GAP)));
      var rows = Math.ceil(count / cols);
      if (rows * (size + CHIP_GAP) - CHIP_GAP <= h) return size;
    }
    return MIN_CHIP;
  }

  /**
   * Os tamanhos: as peças da pilha cabem na área de baixo (largura E altura); as caixas dividem a
   * largura da área do meio; e as peças que entram numa caixa encolhem para caber todas lá dentro.
   */
  function layout() {
    var round = Logic.currentRound(state);
    var board = inner(boardEl);
    var tray = inner(trayAreaEl);

    var grid = Utils.bestGrid(round.items.length, tray.width, tray.height, GAP);
    var tile = Math.max(0, Math.min(grid.size, MAX_TILE));
    trayEl.style.setProperty('--cols', grid.cols);
    trayAreaEl.style.setProperty('--tile', tile + 'px');
    trayAreaEl.style.setProperty('--gap', GAP + 'px');

    var boxCount = round.targets.length;
    var boxW = Math.floor(Math.min(MAX_BOX_W, (board.width - GAP * (boxCount - 1)) / boxCount));
    var boxH = Math.floor(Math.min(MAX_BOX_H, board.height));
    boardEl.style.setProperty('--box-w', boxW + 'px');
    boardEl.style.setProperty('--box-h', boxH + 'px');
    boardEl.style.setProperty('--gap', GAP + 'px');

    var labelSize = Math.max(14, Math.min(28, Math.floor(boxW / 6.2)));
    boardEl.style.setProperty('--label-size', labelSize + 'px');
    boardEl.style.setProperty('--plate-size', Math.max(28, Math.min(64, Math.floor(boxH * 0.3))) + 'px');

    // as peças de uma caixa ocupam o que sobra embaixo do nome dela
    var perBox = 0;
    round.targets.forEach(function (target) {
      var n = round.items.filter(function (i) { return i.target === target.id; }).length;
      perBox = Math.max(perBox, round.kind === 'give' ? round.goal : n);
    });
    var labelH = round.kind === 'give' ? Math.max(28, Math.min(64, Math.floor(boxH * 0.3))) * 1.1 : labelSize * 1.1;
    var chip = chipSizeFor(perBox, boxW - 2 * BOX_PADDING, boxH - 2 * BOX_PADDING - labelH - 4);
    boardEl.style.setProperty('--chip', chip + 'px');
    boardEl.style.setProperty('--chip-gap', CHIP_GAP + 'px');
  }

  // ── Soltar uma peça ───────────────────────────────────────────────────────────
  function clearHints() {
    Array.prototype.forEach.call(document.querySelectorAll('.pulse'), function (el) {
      el.classList.remove('pulse');
    });
  }

  /** Reinicia uma animação de uma vez só (balançar a caixa que recusou a peça) */
  function flash(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener('animationend', function () { el.classList.remove(className); }, { once: true });
  }

  /** O kit pergunta: a peça foi aceita nessa caixa? (target é null se caiu fora de todas) */
  function onDrop(itemEl, target) {
    if (!target || !state || state.phase !== 'sorting') return 'reject';
    var round = Logic.currentRound(state);
    var itemId = itemEl.getAttribute('data-item');
    var out = Logic.place(state, itemId, target.id, Date.now());
    if (!out.result) return 'reject';
    state = out.state;

    if (out.result === 'wrong') {
      Sounds.play('mismatch');
      flash(target.el, 'shake');
      speak(Logic.wrongSpeechFor(round, itemId, target.id));
      clearHints();
      if (Logic.shouldHint(state)) showHint();
      return 'reject';
    }

    // ficou no lugar: a peça passa para dentro da caixa e encolhe
    clearHints();
    target.el.querySelector('.box-items').appendChild(itemEl);
    itemEl.classList.remove('draggable');
    itemEl.classList.add('placed');
    itemEl.style.transform = '';
    header.setDone(state.doneUnits);

    var last = out.result === 'complete';
    speak(round.kind === 'give'
      ? Logic.countSpeechFor(round, state.placedCount, last)
      : Logic.correctSpeechFor(round, itemId, last));
    if (!last) {
      Sounds.play('flip');
      if (Logic.shouldHint(state)) showHint();
      return 'accept';
    }
    roundDone();
    return 'accept';
  }

  /** A peça e a caixa certas pulsam */
  function showHint() {
    var hint = Logic.hintFor(state);
    if (!hint) return;
    var item = trayEl.querySelector('.item[data-item="' + hint.itemId + '"]');
    var box = boxesEl.querySelector('.box[data-box="' + hint.targetId + '"]');
    if (item) item.classList.add('pulse');
    if (box) box.classList.add('pulse');
  }

  /** A rodada está pronta: a Mia comemora e vem a próxima (as peças que sobraram ficam paradas) */
  function roundDone() {
    Array.prototype.forEach.call(trayEl.querySelectorAll('.item.draggable'), function (el) {
      el.classList.remove('draggable');
      el.classList.add('locked');
    });
    Array.prototype.forEach.call(boxesEl.querySelectorAll('.item.placed'), function (el) {
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    });
    setMia('cheer');
    Sounds.play('match');

    var token = state.round;
    advanceTimer = setTimeout(function () { onAdvance(token); }, Logic.ADVANCE_DELAY_MS);
  }

  function onAdvance(token) {
    var out = Logic.next(state, token, Date.now());
    if (!out.result) return;
    state = out.state;
    advanceTimer = null;
    if (out.result === 'next') showRound();
    else endGame();
  }

  function endGame() {
    var elapsed = Logic.elapsedMs(state, Date.now());
    var stars = Logic.calcStars(state);
    var newRecord = Logic.isNewRecord(best, stars, state.errors);

    GameResult.show(stars, newRecord);
    Sounds.play('win');
    speak(Utils.resultSpeech(stars, newRecord));

    if (!best || newRecord) best = { stars: stars, moves: state.errors };

    Bridge.complete({
      gameId:      'sort-box',
      level:       state.level,
      moves:       state.errors,      // peças soltas no lugar errado: quanto menos, melhor
      matches:     state.doneUnits,
      timeSeconds: Math.floor(elapsed / 1000),
      stars:       stars,
    });
  }

  window.addEventListener('resize', function () {
    if (!state || state.phase === 'completed') return;
    drag.cancel();   // girar a tela no meio do arrasto: a peça volta ao lugar
    layout();
  });
})();
