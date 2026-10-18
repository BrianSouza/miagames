(function () {
  'use strict';

  // Camada de apresentação do Jogo da Memória: DOM, timers e ponte com o Flutter.
  // As regras ficam em memory-logic.js (testado com `node --test`).
  var Logic = window.MemoryLogic;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;

  var BOARD_GAP = 10;

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var checkTimer = null;    // verificação agendada das duas cartas abertas
  var best = null;          // recorde salvo pelo Flutter: { stars, moves } ou null

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  var boardContainerEl = document.getElementById('board-container');
  var boardEl          = document.getElementById('board');
  var matchesEl        = document.getElementById('matches');
  var movesEl          = document.getElementById('moves');

  // ── Ponte com o Flutter ───────────────────────────────────────────────────────
  // INIT: {"type":"INIT","level":1,"gameId":"memory","sound":true,
  //        "best":{"stars":2,"moves":9}}
  Bridge.onInit(function (data) {
    Sounds.setEnabled(data.sound !== false);
    best = data.best || null;
    startGame(data.level);
  });

  var speak = Bridge.speak;

  var header = window.GameKit.createHeader({ onReset: resetGame });
  var GameResult = window.GameResult;
  GameResult.init({ onAgain: resetGame, onHome: Bridge.back });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function findCard(id) {
    return state.cards.find(function (c) { return c.id === id; });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────────
  function startGame(level) {
    clearTimeout(checkTimer);   // uma verificação pendente não pode atingir o jogo novo
    checkTimer = null;

    var previousRound = state ? state.round : 0;
    state = Logic.createGame(level || (state && state.level), {
      previousRound: previousRound,
    });

    GameResult.hide();
    header.setTotal(state.totalPairs);
    renderBoard();
    layoutBoard();
    updateStats();
  }

  function resetGame() {
    startGame(state ? state.level : 1);
  }

  // ── Renderização ──────────────────────────────────────────────────────────────
  function renderBoard() {
    boardEl.innerHTML = '';
    state.cards.forEach(function (card) {
      var el = document.createElement('div');
      el.setAttribute('data-id', card.id);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.innerHTML =
        '<div class="card-inner">' +
          '<div class="card-front" aria-hidden="true">?</div>' +
          '<div class="card-back" data-kind="' + card.kind + '" aria-hidden="true">' +
            '<span class="glyph" data-symbol="' + card.symbol + '" data-len="' + card.symbol.length + '">' +
              card.symbol + '</span>' +
          '</div>' +
        '</div>';
      el.addEventListener('click', function () { onCardClick(card.id); });
      boardEl.appendChild(el);
      refreshCard(card.id);
    });
  }

  function refreshCard(id) {
    var card = findCard(id);
    var el = boardEl.querySelector('[data-id="' + id + '"]');
    if (!card || !el) return;
    el.className = 'card' + (card.state === 'matched' ? ' matched' : '');
    el.querySelector('.card-inner').classList.toggle('flipped', card.state !== 'hidden');
    el.setAttribute('aria-label', card.state === 'hidden' ? 'Carta escondida' : card.label);
  }

  /** Ajusta o tamanho das cartas à largura E altura disponíveis */
  function layoutBoard() {
    if (!state) return;
    var style = getComputedStyle(boardContainerEl);
    var width = boardContainerEl.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var height = boardContainerEl.clientHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var grid = Logic.bestGrid(state.cards.length, width, height, BOARD_GAP);

    boardEl.style.gridTemplateColumns = 'repeat(' + grid.cols + ', ' + grid.size + 'px)';
    boardEl.style.gap = BOARD_GAP + 'px';
    boardEl.style.setProperty('--card-size', grid.size + 'px');
  }

  // O que a criança vê são as estrelas; os números ficam para os leitores de tela
  function updateStats() {
    matchesEl.textContent = state.matches + '/' + state.totalPairs;
    movesEl.textContent = state.moves + (state.moves === 1 ? ' jogada' : ' jogadas');
    header.setDone(state.matches);
  }

  /** Animação curta numa carta (pop ao acertar, shake ao errar) */
  function animateCard(id, className) {
    var el = boardEl.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    el.classList.add(className);
    setTimeout(function () { el.classList.remove(className); }, 450);
  }

  // ── Jogadas ───────────────────────────────────────────────────────────────────
  function onCardClick(id) {
    var next = Logic.flip(state, id, Date.now());
    if (next === state) return;   // toque ignorado

    state = next;
    refreshCard(id);
    Sounds.play('flip');
    speak(findCard(id).name);

    if (state.phase === 'checking') {
      updateStats();
      var round = state.round;
      checkTimer = setTimeout(function () { onResolve(round); }, Logic.CHECK_DELAY_MS);
    }
  }

  function onResolve(round) {
    var pending = state.flipped.slice();
    var outcome = Logic.resolve(state, round, Date.now());
    if (!outcome.result) return;

    state = outcome.state;
    checkTimer = null;
    pending.forEach(refreshCard);
    updateStats();

    if (outcome.result === 'mismatch') {
      Sounds.play('mismatch');
      pending.forEach(function (id) { animateCard(id, 'shake'); });
    }
    if (outcome.result === 'match' || outcome.result === 'complete') {
      pending.forEach(function (id) { animateCard(id, 'pop'); });
    }
    if (outcome.result === 'match') {
      Sounds.play('match');
      // Repete o nome do par encontrado: reforça a letra/número aprendido
      speak(findCard(pending[0]).name + '! Muito bem!');
    }
    if (outcome.result === 'complete') endGame();
  }

  function endGame() {
    var elapsed = Logic.elapsedMs(state, Date.now());
    var stars = Logic.calcStars(state);
    var newRecord = Logic.isNewRecord(best, stars, state.moves);

    GameResult.show(stars, newRecord);
    Sounds.play('win');
    speak(window.GameUtils.resultSpeech(stars, newRecord));

    // O Flutter salva o recorde; aqui só atualizamos para o "Jogar novamente"
    if (!best || newRecord) best = { stars: stars, moves: state.moves };

    Bridge.complete({
      gameId:      'memory',
      level:       state.level,
      moves:       state.moves,
      matches:     state.matches,
      timeSeconds: Math.floor(elapsed / 1000),
      stars:       stars,
    });
  }

  // ── Botões ────────────────────────────────────────────────────────────────────
  window.addEventListener('resize', layoutBoard);

})();
