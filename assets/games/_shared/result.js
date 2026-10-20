/**
 * Tela de parabéns: Mia comemorando, confete, estrelas que aparecem uma a uma
 * e dois botões grandes com ícone (jogar de novo e início). Sem estatísticas:
 * jogadas e tempo continuam salvos e aparecem para os pais.
 */
(function (root) {
  'use strict';

  // O caminho da Mia é relativo a este script, que fica em _shared/
  var MIA = new URL('img/mia_cheer.svg', document.currentScript.src).href;

  var modal = null;

  function build(handlers) {
    modal = document.createElement('div');
    modal.id = 'result-modal';
    modal.className = 'modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Parabéns!');
    modal.innerHTML =
      '<canvas id="confetti" aria-hidden="true"></canvas>' +
      '<div class="modal-content">' +
        '<div class="mia-stack" data-mia-stack><img class="mia" src="' + MIA + '" alt="" /></div>' +
        '<h2>Parabéns!</h2>' +
        '<div id="stars" class="stars" role="img"></div>' +
        '<p id="new-record" class="new-record hidden">Novo recorde!</p>' +
        '<div class="result-actions">' +
          '<button id="btn-play-again" class="btn-round btn-primary" aria-label="Jogar de novo">' + root.GameKit.icon('replay') + '</button>' +
          '<button id="btn-home" class="btn-round btn-secondary" aria-label="Início">' + root.GameKit.icon('home') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    root.GameKit.dress(modal.querySelector('.mia-stack'));
    document.getElementById('btn-play-again').addEventListener('click', handlers.onAgain);
    document.getElementById('btn-home').addEventListener('click', handlers.onHome);
  }

  /** Cria a tela (escondida). handlers: { onAgain, onHome } */
  function init(handlers) {
    build(handlers);
  }

  /** Mostra o resultado: `stars` de 1 a 3 e se bateu o recorde */
  function show(stars, newRecord) {
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += '<svg viewBox="0 0 24 24" aria-hidden="true" class="star' +
        (i < stars ? ' earned' : '') + '" style="--i:' + i + '"><path d="' + root.GameKit.STAR + '"/></svg>';
    }
    var starsEl = document.getElementById('stars');
    starsEl.innerHTML = html;
    starsEl.setAttribute('aria-label', stars + (stars === 1 ? ' estrela' : ' estrelas'));
    document.getElementById('new-record').classList.toggle('hidden', !newRecord);
    modal.classList.remove('hidden');
    root.Confetti.burst(document.getElementById('confetti'));
  }

  function hide() {
    modal.classList.add('hidden');
  }

  root.GameResult = { init: init, show: show, hide: hide };
})(window);
