(function () {
  'use strict';

  // Camada de apresentação do "Montar a palavra": o desenho, as lacunas, as peças que se arrastam
  // e a ponte com o Flutter. As regras ficam em build-word-logic.js (testado com `node --test`);
  // arrastar é do kit (_shared/drag.js).
  var Logic = window.BuildWordLogic;
  var Utils = window.GameUtils;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;
  var GameResult = window.GameResult;
  var GameDrag = window.GameDrag;

  var MAX_PICTURE = 340;
  var MAX_TILE = 128;
  var GAP = 10;

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var best = null;
  var advanceTimer = null;

  // ── DOM ───────────────────────────────────────────────────────────────────────
  var boardEl = document.getElementById('board');
  var pictureEl = document.getElementById('picture');
  var slotsEl = document.getElementById('slots');
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
  var header = window.GameKit.createHeader({ onReset: resetGame, onListen: listen });
  GameResult.init({ onAgain: resetGame, onHome: Bridge.back });
  askerEl.addEventListener('click', listen);

  var drag = GameDrag.create({
    area: document.getElementById('app'),
    selector: '.tile.draggable',
    getTargets: function () {
      return Array.prototype.map.call(slotsEl.querySelectorAll('.slot:not(.filled)'), function (el) {
        return { id: Number(el.getAttribute('data-index')), el: el };
      });
    },
    onStart: function () {
      state = Logic.start(state, Date.now());
      Sounds.play('flip');
    },
    onTap: function (tile) {
      // tocar na peça (sem arrastar) diz a sílaba
      speak(Logic.sayFor(tile.getAttribute('data-syllable')));
    },
    onDrop: onDrop,
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

  // ── A palavra ─────────────────────────────────────────────────────────────────
  function showRound() {
    var round = Logic.currentRound(state);
    setMia('happy');
    statusEl.textContent = 'Palavra ' + (state.index + 1) + ' de ' + state.total + '. ' + prompt();

    pictureEl.src = '../missing-syllable/img/' + round.id + '.svg';

    slotsEl.innerHTML = round.syllables.map(function (_, i) {
      return '<div class="slot drop-target" data-index="' + i + '"></div>';
    }).join('');
    slotsEl.setAttribute('aria-label', 'Lugares das sílabas de ' + round.word);

    trayEl.innerHTML = '';
    round.tiles.forEach(function (tile) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      var el = document.createElement('div');
      el.className = 'tile draggable';
      el.setAttribute('role', 'img');
      el.setAttribute('data-tile', tile.id);
      el.setAttribute('data-syllable', tile.syllable);
      el.setAttribute('aria-label', 'Sílaba ' + tile.syllable.toUpperCase());
      el.textContent = tile.syllable.toUpperCase();
      cell.appendChild(el);
      trayEl.appendChild(cell);
    });

    layout();
    speak(prompt());
  }

  /**
   * Os tamanhos: a peça tem o mesmo tamanho na bandeja e na lacuna, e cabe nas duas áreas
   * (largura E altura); o desenho fica com a altura que sobra na área da palavra.
   */
  function layout() {
    var round = Logic.currentRound(state);
    var board = inner(boardEl);
    var tray = inner(trayAreaEl);

    var grid = Utils.bestGrid(round.tiles.length, tray.width, tray.height, GAP);
    var slotCount = round.syllables.length;
    var byBoard = Math.floor((board.width - GAP * (slotCount - 1)) / slotCount);
    var tile = Math.max(0, Math.min(grid.size, byBoard, MAX_TILE));

    trayEl.style.setProperty('--cols', grid.cols);
    boardEl.style.setProperty('--tile', tile + 'px');
    trayAreaEl.style.setProperty('--tile', tile + 'px');
    boardEl.style.setProperty('--gap', GAP + 'px');
    trayAreaEl.style.setProperty('--gap', GAP + 'px');

    var picture = Math.floor(Math.min(MAX_PICTURE, board.width, board.height - tile - GAP));
    boardEl.style.setProperty('--pic-size', Math.max(0, picture) + 'px');
  }

  function inner(el) {
    var style = getComputedStyle(el);
    return {
      width: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    };
  }

  // ── Soltar uma peça ───────────────────────────────────────────────────────────
  function clearHints() {
    Array.prototype.forEach.call(document.querySelectorAll('.pulse'), function (el) {
      el.classList.remove('pulse');
    });
  }

  /** Reinicia uma animação de uma vez só (balançar a lacuna que recusou a peça) */
  function flash(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener('animationend', function () { el.classList.remove(className); }, { once: true });
  }

  /** O kit pergunta: a peça foi aceita nessa lacuna? (target é null se caiu fora de todas) */
  function onDrop(tileEl, target) {
    if (!target || !state || state.phase !== 'building') return 'reject';
    var tileId = tileEl.getAttribute('data-tile');
    var out = Logic.place(state, tileId, target.id, Date.now());
    if (!out.result) return 'reject';
    state = out.state;

    if (out.result === 'wrong') {
      Sounds.play('mismatch');
      flash(target.el, 'shake');
      speak(Logic.wrongSpeechFor(tileEl.getAttribute('data-syllable')));
      clearHints();
      if (Logic.shouldHint(state)) showHint();
      return 'reject';
    }

    // encaixou: a peça passa para dentro da lacuna
    clearHints();
    target.el.appendChild(tileEl);
    target.el.classList.add('filled');
    tileEl.classList.remove('draggable');
    tileEl.classList.add('placed');
    tileEl.style.transform = '';

    if (out.result === 'correct') {
      Sounds.play('flip');
      speak(Logic.sayFor(tileEl.getAttribute('data-syllable')));
      if (Logic.shouldHint(state)) showHint();
      return 'accept';
    }
    wordDone();
    return 'accept';
  }

  /** A próxima lacuna vazia e a peça que serve nela pulsam */
  function showHint() {
    var hint = Logic.hintFor(state);
    if (!hint) return;
    var slot = slotsEl.querySelector('.slot[data-index="' + hint.slotIndex + '"]');
    var tile = trayEl.querySelector('.tile[data-tile="' + hint.tileId + '"]');
    if (slot) slot.classList.add('pulse');
    if (tile) tile.classList.add('pulse');
  }

  /** A palavra está montada: a Mia comemora e vem a próxima */
  function wordDone() {
    var round = Logic.currentRound(state);
    Array.prototype.forEach.call(slotsEl.querySelectorAll('.tile'), function (el) {
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    });
    slotsEl.setAttribute('aria-label', round.word);
    setMia('cheer');
    Sounds.play('match');
    speak(Logic.correctSpeechFor(round));
    header.setDone(state.solved);

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
      gameId:      'build-word',
      level:       state.level,
      moves:       state.errors,     // peças soltas no lugar errado: quanto menos, melhor
      matches:     state.solved,
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
