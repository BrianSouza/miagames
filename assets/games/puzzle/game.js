(function () {
  'use strict';

  // Camada de apresentação do "Quebra-cabeça": a grade, as peças que se arrastam, a palavra e a
  // ponte com o Flutter. As regras ficam em puzzle-logic.js (testado com `node --test`); arrastar é
  // do kit (_shared/drag.js).
  //
  // O desenho (um SVG quadrado, o mesmo do "Qual sílaba falta?") é cortado em peças só com CSS: cada
  // peça mostra a sua fatia (background-size e background-position), sobre um fundo que muda de cor
  // pelo quadro, para as peças de "céu" também se distinguirem.
  var Logic = window.PuzzleLogic;
  var Utils = window.GameUtils;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;
  var GameResult = window.GameResult;
  var GameDrag = window.GameDrag;

  var MAX_BOARD = 380;
  var WORD_HEIGHT = 44;
  var GAP = 6;
  var MAX_SCALE = 1.5;       // a peça da bandeja pode ser até 50% maior que o lugar dela na grade (encolhe ao encaixar)
  var MAX_DOTS = 8;          // estrelas de progresso no cabeçalho (cada uma vale mais de uma peça, se preciso)
  var BACKDROP = 'linear-gradient(135deg, #BFE6FF, #FFE9B8)';

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var best = null;
  var advanceTimer = null;

  // ── DOM ───────────────────────────────────────────────────────────────────────
  var boardAreaEl = document.getElementById('board-area');
  var boardEl = document.getElementById('board');
  var wordEl = document.getElementById('word');
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
    selector: '.piece.draggable',
    getTargets: function () {
      return Array.prototype.map.call(boardEl.querySelectorAll('.slot:not(.filled)'), function (el) {
        return { id: Number(el.getAttribute('data-cell')), el: el };
      });
    },
    onStart: function () {
      state = Logic.start(state, Date.now());
      Sounds.play('flip');
    },
    onTap: function () {
      // tocar numa peça (sem arrastar) diz a palavra do desenho
      speak(Logic.currentRound(state).word);
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

  // ── O desenho cortado em peças ────────────────────────────────────────────────
  /** A fatia da peça: o desenho (esticado até o tamanho do quadro) e o fundo, na posição dela */
  function paintSlice(el, round, piece) {
    var size = round.cols * 100 + '% ' + round.rows * 100 + '%';
    var x = round.cols > 1 ? (piece.col / (round.cols - 1)) * 100 : 0;
    var y = round.rows > 1 ? (piece.row / (round.rows - 1)) * 100 : 0;
    var position = x + '% ' + y + '%';
    el.style.backgroundImage = "url('../missing-syllable/img/" + round.id + ".svg'), " + BACKDROP;
    el.style.backgroundSize = size + ', ' + size;
    el.style.backgroundPosition = position + ', ' + position;
  }

  function showRound() {
    var round = Logic.currentRound(state);
    setMia('happy');
    statusEl.textContent = 'Desenho ' + (state.index + 1) + ' de ' + state.rounds.length + '. ' + prompt();

    wordEl.classList.remove('shown');
    wordEl.textContent = round.word.toUpperCase();
    boardEl.style.setProperty('--cols', round.cols);
    boardEl.style.setProperty('--rows', round.rows);
    boardEl.setAttribute('aria-label', 'Quebra-cabeça: ' + round.word);

    boardEl.innerHTML = '';
    round.pieces.forEach(function (piece) {
      var slot = document.createElement('div');
      slot.className = 'slot drop-target';
      slot.setAttribute('data-cell', piece.cell);
      if (round.guide) {
        var ghost = document.createElement('div');
        ghost.className = 'ghost';
        paintSlice(ghost, round, piece);
        slot.appendChild(ghost);
      }
      boardEl.appendChild(slot);
    });

    trayEl.innerHTML = '';
    round.order.forEach(function (id) {
      var piece = round.pieces.filter(function (p) { return p.id === id; })[0];
      var cell = document.createElement('div');
      cell.className = 'cell';
      var el = document.createElement('div');
      el.className = 'piece draggable';
      el.setAttribute('role', 'img');
      el.setAttribute('data-piece', piece.id);
      el.setAttribute('aria-label', 'Peça do quebra-cabeça');
      paintSlice(el, round, piece);
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

  /** O arranjo da bandeja que deixa as peças maiores: { cols, k } (k = escala em relação ao lugar na grade, até MAX_SCALE) */
  function bestTray(count, cellW, cellH, width, height) {
    var chosen = null;
    for (var cols = 1; cols <= count; cols++) {
      var rows = Math.ceil(count / cols);
      var k = Math.min(
        (width - GAP * (cols - 1)) / (cols * cellW),
        (height - GAP * (rows - 1)) / (rows * cellH),
        MAX_SCALE,
      );
      if (!chosen || k > chosen.k) chosen = { cols: cols, k: k };
    }
    return chosen;
  }

  /**
   * Os tamanhos: o quadro é quadrado e cabe na área do meio (largura E altura, com a palavra embaixo);
   * as peças da bandeja são cópias dos lugares da grade (mesma proporção, de 1 a 1,5 vez o tamanho: em tela
   * pequena o quadro é pequeno, e a peça precisa ser grande para o dedo) e cabem na área de baixo.
   */
  function layout() {
    var round = Logic.currentRound(state);
    var area = inner(boardAreaEl);
    var tray = inner(trayAreaEl);

    var board = Math.max(0, Math.floor(Math.min(MAX_BOARD, area.width, area.height - WORD_HEIGHT - GAP)));
    boardEl.style.setProperty('--board', board + 'px');
    boardAreaEl.style.setProperty('--word-h', WORD_HEIGHT + 'px');
    var letters = Math.max(3, round.word.length);
    boardAreaEl.style.setProperty('--word-size', Math.max(18, Math.min(40, Math.floor(board / (letters * 0.85)))) + 'px');

    var cellW = board / round.cols;
    var cellH = board / round.rows;
    var arrangement = bestTray(round.pieces.length, cellW, cellH, tray.width, tray.height);
    trayEl.style.setProperty('--cols', arrangement.cols);
    trayAreaEl.style.setProperty('--pw', Math.floor(cellW * arrangement.k) + 'px');
    trayAreaEl.style.setProperty('--ph', Math.floor(cellH * arrangement.k) + 'px');
    trayAreaEl.style.setProperty('--gap', GAP + 'px');
  }

  // ── Soltar uma peça ───────────────────────────────────────────────────────────
  function clearHints() {
    Array.prototype.forEach.call(document.querySelectorAll('.pulse'), function (el) {
      el.classList.remove('pulse');
    });
  }

  /** Reinicia uma animação de uma vez só (balançar o lugar que recusou a peça) */
  function flash(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener('animationend', function () { el.classList.remove(className); }, { once: true });
  }

  /** O kit pergunta: a peça foi aceita nesse lugar? (target é null se caiu fora de todos) */
  function onDrop(pieceEl, target) {
    if (!target || !state || state.phase !== 'building') return 'reject';
    var out = Logic.place(state, pieceEl.getAttribute('data-piece'), target.id, Date.now());
    if (!out.result) return 'reject';
    state = out.state;

    if (out.result === 'wrong') {
      Sounds.play('mismatch');
      flash(target.el, 'shake');
      speak(Logic.wrongSpeech());
      clearHints();
      if (Logic.shouldHint(state)) showHint();
      return 'reject';
    }

    // encaixou: a peça passa para dentro do lugar e preenche ele todo
    clearHints();
    target.el.appendChild(pieceEl);
    target.el.classList.add('filled');
    pieceEl.classList.remove('draggable');
    pieceEl.classList.add('placed');
    pieceEl.style.transform = '';
    header.setDone(state.doneUnits);

    if (out.result === 'correct') {
      Sounds.play('flip');
      if (Logic.shouldHint(state)) showHint();
      return 'accept';
    }
    roundDone();
    return 'accept';
  }

  /** A peça e o lugar certos pulsam */
  function showHint() {
    var hint = Logic.hintFor(state);
    if (!hint) return;
    var piece = trayEl.querySelector('.piece[data-piece="' + hint.pieceId + '"]');
    var slot = boardEl.querySelector('.slot[data-cell="' + hint.cell + '"]');
    if (piece) piece.classList.add('pulse');
    if (slot) slot.classList.add('pulse');
  }

  /** O desenho está montado: a palavra aparece, a Mia comemora e vem o próximo */
  function roundDone() {
    var round = Logic.currentRound(state);
    wordEl.classList.add('shown');
    boardEl.setAttribute('aria-label', round.word);
    setMia('cheer');
    Sounds.play('match');
    speak(Logic.correctSpeechFor(round));

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
      gameId:      'puzzle',
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
