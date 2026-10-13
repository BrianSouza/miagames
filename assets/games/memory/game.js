(function () {
  'use strict';

  // Camada de apresentação do Jogo da Memória: DOM, timers e ponte com o Flutter.
  // As regras ficam em memory-logic.js (testado com `node --test`).
  var Logic = window.MemoryLogic;

  var BOARD_GAP = 10;
  var EXIT_HOLD_MS = 700;   // segurar o voltar por este tempo para sair
  var HINT_MS = 2000;

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var checkTimer = null;    // verificação agendada das duas cartas abertas
  var clockTimer = null;    // atualiza o cronômetro na tela
  var hintTimer = null;

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  var boardContainerEl = document.getElementById('board-container');
  var boardEl          = document.getElementById('board');
  var matchesEl        = document.getElementById('matches');
  var timerEl          = document.getElementById('timer');
  var movesEl          = document.getElementById('moves');
  var hintEl           = document.getElementById('exit-hint');
  var resultModal      = document.getElementById('result-modal');
  var starsEl          = document.getElementById('stars');
  var resultStatsEl    = document.getElementById('result-stats');
  var backBtn          = document.getElementById('btn-back');

  // ── Ponte com o Flutter ───────────────────────────────────────────────────────
  /**
   * Chamado pelo Flutter quando a página termina de carregar:
   *   window.handleFlutterMessage({"type":"INIT","difficulty":"easy","gameId":"memory"})
   */
  window.handleFlutterMessage = function (data) {
    if (data && data.type === 'INIT') {
      startGame(data.difficulty);
    }
  };

  function sendToFlutter(type, payload) {
    if (!window.MiaGamesFlutter) return;
    window.MiaGamesFlutter.postMessage(JSON.stringify(Object.assign({ type: type }, payload)));
  }

  /** A voz do navegador não funciona na WebView do Android — quem fala é o Flutter */
  function speak(text) {
    sendToFlutter('SPEAK', { text: text });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60).toString().padStart(2, '0');
    var sec = (s % 60).toString().padStart(2, '0');
    return m + ':' + sec;
  }

  function findCard(id) {
    return state.cards.find(function (c) { return c.id === id; });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────────
  function startGame(difficulty) {
    clearTimeout(checkTimer);   // uma verificação pendente não pode atingir o jogo novo
    clearInterval(clockTimer);
    checkTimer = null;

    var previousRound = state ? state.round : 0;
    state = Logic.createGame(difficulty || (state && state.difficulty), {
      previousRound: previousRound,
    });

    resultModal.classList.add('hidden');
    renderBoard();
    layoutBoard();
    updateStats();
    timerEl.textContent = fmtTime(0);
  }

  function resetGame() {
    startGame(state ? state.difficulty : 'easy');
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
          '<div class="card-back" aria-hidden="true">' + card.emoji + '</div>' +
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
    el.setAttribute('aria-label', card.state === 'hidden' ? 'Carta escondida' : card.name);
  }

  /** Ajusta o tamanho das cartas à largura E altura disponíveis */
  function layoutBoard() {
    if (!state) return;
    var style = getComputedStyle(boardContainerEl);
    var width = boardContainerEl.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var height = boardContainerEl.clientHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var rows = Math.ceil(state.cards.length / state.cols);
    var size = Logic.cardSize(width, height, state.cols, rows, BOARD_GAP);

    boardEl.style.gridTemplateColumns = 'repeat(' + state.cols + ', ' + size + 'px)';
    boardEl.style.gap = BOARD_GAP + 'px';
    boardEl.style.setProperty('--card-size', size + 'px');
  }

  function updateStats() {
    matchesEl.textContent = state.matches + '/' + state.totalPairs;
    movesEl.textContent = state.moves + (state.moves === 1 ? ' jogada' : ' jogadas');
  }

  // ── Jogadas ───────────────────────────────────────────────────────────────────
  function onCardClick(id) {
    var next = Logic.flip(state, id, Date.now());
    if (next === state) return;   // toque ignorado

    var startedNow = state.startedAt === null;
    state = next;
    refreshCard(id);
    speak(findCard(id).name);

    if (startedNow) {
      clockTimer = setInterval(tickClock, 1000);
    }

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

    if (outcome.result === 'match') speak('Muito bem!');
    if (outcome.result === 'complete') endGame();
  }

  function endGame() {
    clearInterval(clockTimer);

    var elapsed = Logic.elapsedMs(state, Date.now());
    var stars = Logic.calcStars(state);

    timerEl.textContent = fmtTime(elapsed);
    starsEl.textContent = '⭐'.repeat(stars);
    resultStatsEl.textContent = state.moves + ' jogadas · ' + fmtTime(elapsed);
    resultModal.classList.remove('hidden');
    speak('Parabéns! Você encontrou todos os pares!');

    sendToFlutter('GAME_COMPLETE', {
      gameId:      'memory',
      difficulty:  state.difficulty,
      moves:       state.moves,
      matches:     state.matches,
      timeSeconds: Math.floor(elapsed / 1000),
      stars:       stars,
    });
  }

  function tickClock() {
    timerEl.textContent = fmtTime(Logic.elapsedMs(state, Date.now()));
  }

  // ── Voltar: segurar para sair ─────────────────────────────────────────────────
  // Crianças pequenas tocam em tudo; um toque acidental não deve encerrar a
  // partida. Um toque curto só mostra a dica para o adulto.
  var holdTimer = null;
  var exited = false;

  function showExitHint() {
    hintEl.classList.remove('hidden');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { hintEl.classList.add('hidden'); }, HINT_MS);
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  backBtn.addEventListener('pointerdown', function () {
    exited = false;
    cancelHold();
    holdTimer = setTimeout(function () {
      exited = true;
      sendToFlutter('NAVIGATE_BACK');
    }, EXIT_HOLD_MS);
  });
  backBtn.addEventListener('pointerup', cancelHold);
  backBtn.addEventListener('pointercancel', cancelHold);
  backBtn.addEventListener('pointerleave', cancelHold);
  backBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  backBtn.addEventListener('click', function () {
    if (!exited) showExitHint();
  });

  // ── Demais botões ─────────────────────────────────────────────────────────────
  document.getElementById('btn-reset').addEventListener('click', resetGame);
  document.getElementById('btn-play-again').addEventListener('click', resetGame);
  document.getElementById('btn-home').addEventListener('click', function () {
    sendToFlutter('NAVIGATE_BACK');
  });
  window.addEventListener('resize', layoutBoard);

})();
