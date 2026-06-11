(function () {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────────
  const DIFFICULTY = {
    easy:   { pairs: 6,  cols: 3 },
    medium: { pairs: 8,  cols: 4 },
    hard:   { pairs: 10, cols: 4 },
  };

  // 10 emoji pairs (enough for the hardest level)
  const EMOJIS = ['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁'];

  // ── State ─────────────────────────────────────────────────────────────────────
  let difficulty  = 'easy';
  let cards       = [];   // { id, emoji, pairId, state: 'hidden'|'flipped'|'matched' }
  let phase       = 'idle'; // idle | playing | checking | completed
  let flipped     = [];   // at most 2 card ids
  let moves       = 0;
  let matchCount  = 0;
  let totalPairs  = 0;
  let startTime   = null;
  let timerRef    = null;

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  const boardEl       = document.getElementById('board');
  const matchesEl     = document.getElementById('matches');
  const timerEl       = document.getElementById('timer');
  const movesEl       = document.getElementById('moves');
  const resultModal   = document.getElementById('result-modal');
  const starsEl       = document.getElementById('stars');
  const resultStatsEl = document.getElementById('result-stats');

  // ── Flutter bridge ────────────────────────────────────────────────────────────
  /**
   * Called by Flutter after the page loads:
   *   controller.runJavaScript('window.handleFlutterMessage({"type":"INIT","difficulty":"easy",...})');
   */
  window.handleFlutterMessage = function (data) {
    if (data.type === 'INIT') {
      difficulty = data.difficulty || 'easy';
      initGame();
    }
  };

  function sendToFlutter(type, payload) {
    const msg = JSON.stringify(Object.assign({ type }, payload));
    if (window.MiaGamesFlutter) {
      window.MiaGamesFlutter.postMessage(msg);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return m + ':' + sec;
  }

  function calcStars() {
    // ratio: ideal = 1 move per pair; good ≥ 0.75; ok ≥ 0.5
    const ratio = totalPairs / Math.max(moves, 1);
    if (ratio >= 0.75) return 3;
    if (ratio >= 0.50) return 2;
    return 1;
  }

  // ── Game lifecycle ────────────────────────────────────────────────────────────
  function initGame() {
    const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;
    totalPairs = cfg.pairs;
    moves      = 0;
    matchCount = 0;
    flipped    = [];
    phase      = 'playing';

    const emojis = EMOJIS.slice(0, totalPairs);
    const pairs  = emojis.flatMap((emoji, i) => [
      { id: i * 2,     emoji, pairId: i, state: 'hidden' },
      { id: i * 2 + 1, emoji, pairId: i, state: 'hidden' },
    ]);
    cards = shuffle(pairs);

    startTime = Date.now();
    clearInterval(timerRef);
    timerRef = setInterval(tickTimer, 1000);

    boardEl.style.setProperty('--cols', cfg.cols);
    renderBoard();
    updateStats();
    resultModal.classList.add('hidden');
  }

  function resetGame() {
    clearInterval(timerRef);
    initGame();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────
  function renderBoard() {
    boardEl.innerHTML = '';
    cards.forEach(function (card) {
      var el = document.createElement('div');
      el.className = 'card' + (card.state === 'matched' ? ' matched' : '');
      el.setAttribute('data-id', card.id);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', card.state === 'matched' ? card.emoji : 'Carta virada');
      el.innerHTML =
        '<div class="card-inner' + (card.state !== 'hidden' ? ' flipped' : '') + '">' +
          '<div class="card-front">?</div>' +
          '<div class="card-back">' + card.emoji + '</div>' +
        '</div>';
      el.addEventListener('click', function () { onCardClick(card.id); });
      boardEl.appendChild(el);
    });
  }

  function refreshCard(id) {
    var card = cards.find(function (c) { return c.id === id; });
    var el   = boardEl.querySelector('[data-id="' + id + '"]');
    if (!card || !el) return;
    var inner = el.querySelector('.card-inner');
    el.className = 'card' + (card.state === 'matched' ? ' matched' : '');
    if (card.state === 'hidden') {
      inner.classList.remove('flipped');
    } else {
      inner.classList.add('flipped');
    }
    el.setAttribute('aria-label', card.state === 'matched' ? card.emoji : 'Carta virada');
  }

  // ── Game logic ────────────────────────────────────────────────────────────────
  function onCardClick(id) {
    if (phase !== 'playing') return;
    var card = cards.find(function (c) { return c.id === id; });
    if (!card || card.state !== 'hidden') return;
    if (flipped.length >= 2) return;

    card.state = 'flipped';
    flipped.push(id);
    refreshCard(id);

    if (flipped.length < 2) return;

    // Two cards flipped — check for match after a short delay
    moves++;
    phase = 'checking';
    updateStats();

    var idA = flipped[0];
    var idB = flipped[1];

    setTimeout(function () {
      var a = cards.find(function (c) { return c.id === idA; });
      var b = cards.find(function (c) { return c.id === idB; });

      if (a.pairId === b.pairId) {
        a.state = 'matched';
        b.state = 'matched';
        matchCount++;
        flipped = [];
        phase   = 'playing';
        refreshCard(a.id);
        refreshCard(b.id);
        updateStats();
        if (matchCount === totalPairs) endGame();
      } else {
        a.state = 'hidden';
        b.state = 'hidden';
        flipped = [];
        phase   = 'playing';
        refreshCard(a.id);
        refreshCard(b.id);
      }
    }, 800);
  }

  function endGame() {
    clearInterval(timerRef);
    phase = 'completed';

    var elapsed = Date.now() - startTime;
    var stars   = calcStars();

    starsEl.textContent       = '⭐'.repeat(stars);
    resultStatsEl.textContent = moves + ' jogadas · ' + fmtTime(elapsed);
    resultModal.classList.remove('hidden');

    sendToFlutter('GAME_COMPLETE', {
      gameId:      'memory',
      difficulty:  difficulty,
      moves:       moves,
      matches:     matchCount,
      timeSeconds: Math.floor(elapsed / 1000),
      stars:       stars,
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  function updateStats() {
    matchesEl.textContent = matchCount + '/' + totalPairs;
    movesEl.textContent   = moves + (moves === 1 ? ' jogada' : ' jogadas');
  }

  function tickTimer() {
    if (!startTime) return;
    timerEl.textContent = fmtTime(Date.now() - startTime);
  }

  // ── Event listeners ───────────────────────────────────────────────────────────
  document.getElementById('btn-back').addEventListener('click', function () {
    sendToFlutter('NAVIGATE_BACK');
  });
  document.getElementById('btn-reset').addEventListener('click', resetGame);
  document.getElementById('btn-play-again').addEventListener('click', resetGame);
  document.getElementById('btn-home').addEventListener('click', function () {
    sendToFlutter('NAVIGATE_BACK');
  });

})();
