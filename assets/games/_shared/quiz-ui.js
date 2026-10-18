/**
 * Tela dos jogos de responder: ponte com o Flutter, rodadas, figuras de resposta,
 * retorno (acerto, erro, dica), pausa entre rodadas e fim de jogo.
 * Cada jogo só diz como desenhar a pergunta e as figuras (veja `start`).
 *
 * Espera no HTML: #options, #options-area, #status, #mia, #asker e #header,
 * mais os scripts do kit (bridge, sounds, kit, result, game-utils).
 */
(function (root) {
  'use strict';

  var OPTION_GAP = 14;
  var MAX_OPTION = 220;     // em tablets, figuras gigantes não ajudam
  var FEEDBACK_MS = 450;    // duração do balanço / pulinho

  /**
   * config:
   *   gameId, logic            — o id do jogo e suas regras puras (createGame, answer, next...)
   *   prompt(round)            — o que a voz pergunta
   *   correctSpeech(round)     — o que a voz diz ao acertar
   *   renderOption(el, option, round) — preenche o botão de uma figura (conteúdo e rótulo)
   *   renderStage(round)       — (opcional) desenha o resto da rodada: objetos, imagem...
   *   layoutStage()            — (opcional) ajusta o resto ao tamanho da tela
   *   wrongSpeech(round, key)  — (opcional) o que a voz diz ao errar (padrão: "Tente de novo!")
   *   onCorrect(round, key)    — (opcional) chamado ao acertar, antes da pausa (ex.: preencher a lacuna)
   */
  function start(config) {
    var Logic = config.logic;
    var Utils = root.GameUtils;
    var Sounds = root.GameSounds;
    var Bridge = root.GameBridge;
    var GameResult = root.GameResult;

    var state = null;
    var advanceTimer = null;  // pausa de comemoração antes da próxima rodada
    var best = null;          // recorde salvo pelo Flutter: { stars, moves } ou null

    var optionsEl = document.getElementById('options');
    var areaEl = document.getElementById('options-area');
    var statusEl = document.getElementById('status');
    var miaEl = document.getElementById('mia');
    var askerEl = document.getElementById('asker');

    var speak = Bridge.speak;

    // ── Ponte com o Flutter ─────────────────────────────────────────────────────
    Bridge.onInit(function (data) {
      Sounds.setEnabled(data.sound !== false);
      best = data.best || null;
      startGame(data.level);
    });

    var header = root.GameKit.createHeader({ onReset: resetGame, onListen: listen });
    GameResult.init({ onAgain: resetGame, onHome: Bridge.back });
    askerEl.addEventListener('click', listen);
    root.addEventListener('resize', layout);

    // ── Ciclo de vida ───────────────────────────────────────────────────────────
    function startGame(level) {
      clearTimeout(advanceTimer);   // uma pausa pendente não pode atingir o jogo novo
      advanceTimer = null;

      var previousRound = state ? state.round : 0;
      state = Logic.createGame(level || (state && state.level), {
        previousRound: previousRound,
      });

      GameResult.hide();
      header.setTotal(state.total);
      header.setDone(0);
      renderRound();
    }

    function resetGame() {
      startGame(state ? state.level : 1);
    }

    function prompt() {
      return config.prompt(Logic.currentRound(state));
    }

    /** Repete a pergunta (botão de alto-falante e toque na Mia) */
    function listen() {
      if (state) speak(prompt());
    }

    function setMia(pose) {
      miaEl.src = '../_shared/img/mia_' + pose + '.svg';
    }

    // ── Renderização ────────────────────────────────────────────────────────────
    function renderRound() {
      var round = Logic.currentRound(state);
      optionsEl.classList.remove('locked');
      optionsEl.innerHTML = '';
      round.options.forEach(function (option, i) {
        var el = document.createElement('button');
        el.className = 'option';
        el.setAttribute('data-symbol', round.optionKeys[i]);
        config.renderOption(el, option, round);
        el.addEventListener('click', function () { onOptionClick(round.optionKeys[i]); });
        optionsEl.appendChild(el);
      });
      if (config.renderStage) config.renderStage(round);
      layout();
      setMia('happy');
      statusEl.textContent = 'Rodada ' + (state.index + 1) + ' de ' + state.total + '. ' + prompt();
      speak(prompt());
    }

    /** As figuras de resposta ocupam o melhor arranjo para a área (largura E altura) */
    function layout() {
      if (!state) return;
      var style = getComputedStyle(areaEl);
      var width = areaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      var height = areaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      var grid = Utils.bestGrid(optionsEl.children.length, width, height, OPTION_GAP);
      var size = Math.min(grid.size, MAX_OPTION);

      optionsEl.style.gridTemplateColumns = 'repeat(' + grid.cols + ', ' + size + 'px)';
      optionsEl.style.gap = OPTION_GAP + 'px';
      optionsEl.style.setProperty('--opt-size', size + 'px');
      if (config.layoutStage) config.layoutStage();
    }

    function optionEl(key) {
      return optionsEl.querySelector('[data-symbol="' + key + '"]');
    }

    /** Animação curta numa figura (pop ao acertar, shake ao errar, pulse na dica) */
    function animate(el, className, keep) {
      el.classList.add(className);
      if (!keep) setTimeout(function () { el.classList.remove(className); }, FEEDBACK_MS);
    }

    // ── Jogadas ─────────────────────────────────────────────────────────────────
    function onOptionClick(key) {
      var round = Logic.currentRound(state);
      var out = Logic.answer(state, key, Date.now());
      if (!out.result) return;   // toque ignorado
      state = out.state;

      if (out.result === 'wrong') {
        var el = optionEl(key);
        el.classList.add('wrong');
        animate(el, 'shake');
        Sounds.play('mismatch');
        if (Logic.shouldHint(state)) {
          // Depois de 2 erros: a Mia pensa, a resposta certa "respira" e a pergunta se repete
          setMia('think');
          animate(optionEl(round.answerKey), 'pulse', true);
          speak(prompt());
        } else {
          speak(config.wrongSpeech ? config.wrongSpeech(round, key) : 'Tente de novo!');
        }
        return;
      }

      // acertou
      var right = optionEl(key);
      right.classList.remove('pulse');
      right.classList.add('correct');
      animate(right, 'pop');
      optionsEl.classList.add('locked');
      setMia('cheer');
      Sounds.play('match');
      speak(config.correctSpeech(round));
      if (config.onCorrect) config.onCorrect(round, key);
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
      speak(root.GameUtils.resultSpeech(stars, newRecord));

      // O Flutter salva o recorde; aqui só atualizamos para o "Jogar de novo"
      if (!best || newRecord) best = { stars: stars, moves: state.errors };

      Bridge.complete({
        gameId:      config.gameId,
        level:       state.level,
        moves:       state.errors,     // erros: quanto menos, melhor
        matches:     state.solved,
        timeSeconds: Math.floor(elapsed / 1000),
        stars:       stars,
      });
    }
  }

  root.GameQuizUI = { start: start };
})(window);
