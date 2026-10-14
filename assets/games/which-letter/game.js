(function () {
  'use strict';

  // Camada de apresentação do "Qual é a letra?": DOM, timers e ponte com o Flutter.
  // As regras ficam em which-letter-logic.js (testado com `node --test`).
  var Logic = window.WhichLetterLogic;
  var Utils = window.GameUtils;
  var Sounds = window.GameSounds;
  var Bridge = window.GameBridge;
  var GameResult = window.GameResult;

  var GAME_ID = 'which-letter';
  var OPTION_GAP = 14;
  var MAX_OPTION = 220;     // em tablets, figuras gigantes não ajudam
  var FEEDBACK_MS = 450;    // duração do balanço / pulinho

  // ── Estado ────────────────────────────────────────────────────────────────────
  var state = null;
  var advanceTimer = null;  // pausa de comemoração antes da próxima rodada
  var best = null;          // recorde salvo pelo Flutter: { stars, moves } ou null

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  var optionsEl = document.getElementById('options');
  var areaEl = document.getElementById('options-area');
  var statusEl = document.getElementById('status');
  var miaEl = document.getElementById('mia');
  var askerEl = document.getElementById('asker');

  // ── Ponte com o Flutter ───────────────────────────────────────────────────────
  Bridge.onInit(function (data) {
    Sounds.setEnabled(data.sound !== false);
    best = data.best || null;
    startGame(data.difficulty);
  });

  var speak = Bridge.speak;
  var header = window.GameKit.createHeader({ onReset: resetGame, onListen: listen });
  GameResult.init({ onAgain: resetGame, onHome: Bridge.back });
  askerEl.addEventListener('click', listen);

  // ── Ciclo de vida ─────────────────────────────────────────────────────────────
  function startGame(difficulty) {
    clearTimeout(advanceTimer);   // uma pausa pendente não pode atingir o jogo novo
    advanceTimer = null;

    var previousRound = state ? state.round : 0;
    state = Logic.createGame(difficulty || (state && state.difficulty), {
      previousRound: previousRound,
    });

    GameResult.hide();
    header.setTotal(state.total);
    header.setDone(0);
    renderRound();
  }

  function resetGame() {
    startGame(state ? state.difficulty : 'easy');
  }

  function prompt() {
    return Logic.promptFor(Logic.currentRound(state).answer);
  }

  /** Repete a pergunta (botão de alto-falante e toque na Mia) */
  function listen() {
    if (state) speak(prompt());
  }

  function setMia(pose) {
    miaEl.src = '../_shared/img/mia_' + pose + '.svg';
  }

  // ── Renderização ──────────────────────────────────────────────────────────────
  function renderRound() {
    var round = Logic.currentRound(state);
    optionsEl.classList.remove('locked');
    optionsEl.innerHTML = '';
    round.options.forEach(function (item) {
      var el = document.createElement('button');
      el.className = 'option';
      el.setAttribute('data-symbol', item.symbol);
      el.setAttribute('data-kind', item.kind);
      el.setAttribute('aria-label', (item.kind === 'letter' ? 'Letra ' : 'Número ') + item.symbol);
      el.innerHTML = '<span class="glyph" data-len="' + item.symbol.length + '">' + item.symbol + '</span>';
      el.addEventListener('click', function () { onOptionClick(item.symbol); });
      optionsEl.appendChild(el);
    });
    layoutOptions();
    setMia('happy');
    statusEl.textContent = 'Rodada ' + (state.index + 1) + ' de ' + state.total + '. ' + prompt();
    speak(prompt());
  }

  /** As figuras ocupam o melhor arranjo para a área disponível (largura E altura) */
  function layoutOptions() {
    if (!state) return;
    var style = getComputedStyle(areaEl);
    var width = areaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var height = areaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var grid = Utils.bestGrid(optionsEl.children.length, width, height, OPTION_GAP);
    var size = Math.min(grid.size, MAX_OPTION);

    optionsEl.style.gridTemplateColumns = 'repeat(' + grid.cols + ', ' + size + 'px)';
    optionsEl.style.gap = OPTION_GAP + 'px';
    optionsEl.style.setProperty('--opt-size', size + 'px');
  }

  function optionEl(symbol) {
    return optionsEl.querySelector('[data-symbol="' + symbol + '"]');
  }

  /** Animação curta numa figura (pop ao acertar, shake ao errar, pulse na dica) */
  function animate(el, className, keep) {
    el.classList.add(className);
    if (!keep) setTimeout(function () { el.classList.remove(className); }, FEEDBACK_MS);
  }

  // ── Jogadas ───────────────────────────────────────────────────────────────────
  function onOptionClick(symbol) {
    var round = Logic.currentRound(state);
    var out = Logic.answer(state, symbol, Date.now());
    if (!out.result) return;   // toque ignorado
    state = out.state;

    if (out.result === 'wrong') {
      var el = optionEl(symbol);
      el.classList.add('wrong');
      animate(el, 'shake');
      Sounds.play('mismatch');
      if (Logic.shouldHint(state)) {
        // Depois de 2 erros: a Mia pensa, a resposta certa "respira" e a pergunta se repete
        setMia('think');
        animate(optionEl(round.answer.symbol), 'pulse', true);
        speak(prompt());
      } else {
        speak('Tente de novo!');
      }
      return;
    }

    // acertou
    var right = optionEl(symbol);
    right.classList.remove('pulse');
    right.classList.add('correct');
    animate(right, 'pop');
    optionsEl.classList.add('locked');
    setMia('cheer');
    Sounds.play('match');
    speak(round.answer.name + '! Muito bem!');
    header.setDone(state.solved);

    var token = state.round;
    advanceTimer = setTimeout(function () { onAdvance(token); }, Logic.ADVANCE_DELAY_MS);
  }

  function onAdvance(token) {
    var out = Logic.next(state, token, Date.now());
    if (!out.result) return;
    state = out.state;
    advanceTimer = null;
    if (out.result === 'next') renderRound();
    else endGame();
  }

  function endGame() {
    var elapsed = Logic.elapsedMs(state, Date.now());
    var stars = Logic.calcStars(state);
    var newRecord = Logic.isNewRecord(best, stars, state.errors);

    GameResult.show(stars, newRecord);
    Sounds.play('win');
    speak(newRecord ? 'Parabéns! Novo recorde!' : 'Parabéns! Você acertou tudo!');

    // O Flutter salva o recorde; aqui só atualizamos para o "Jogar de novo"
    if (!best || newRecord) best = { stars: stars, moves: state.errors };

    Bridge.complete({
      gameId:      GAME_ID,
      difficulty:  state.difficulty,
      moves:       state.errors,     // erros: quanto menos, melhor
      matches:     state.solved,
      timeSeconds: Math.floor(elapsed / 1000),
      stars:       stars,
    });
  }

  window.addEventListener('resize', layoutOptions);

})();
