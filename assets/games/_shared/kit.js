/**
 * Cabeçalho comum dos jogos: voltar (segurar para sair), uma estrela de
 * progresso por rodada, "ouvir de novo" (opcional) e reiniciar.
 *
 * Sem cronômetro nem contagem de jogadas à vista: para quem tem 5 anos isso só
 * pressiona. O progresso é uma fileira de estrelas que acendem ao acertar.
 */
(function (root) {
  'use strict';

  var STAR = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z';
  var ICONS = {
    back:   '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
    reset:  '<path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M19.5 3.5v5h-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    listen: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/>' +
            '<path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    replay: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    home:   '<path d="M3.5 11.5 12 4l8.5 7.5M6 10v9.5h4.5V14h3v5.5H18V10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  /**
   * Monta o cabeçalho dentro de `#header`.
   * options: { onReset, onListen (se houver, mostra o botão "ouvir de novo") }
   */
  function createHeader(options) {
    var header = document.getElementById('header');
    header.innerHTML =
      '<button id="btn-back" class="icon-btn" aria-label="Voltar (segure para sair)">' + icon('back') + '</button>' +
      '<div id="progress" class="progress" aria-hidden="true"></div>' +
      (options.onListen
        ? '<button id="btn-listen" class="icon-btn" aria-label="Ouvir de novo">' + icon('listen') + '</button>'
        : '') +
      '<button id="btn-reset" class="icon-btn" aria-label="Reiniciar">' + icon('reset') + '</button>' +
      '<span id="exit-hint" class="hint hidden" role="status">Segure ← para sair</span>';

    var progressEl = document.getElementById('progress');
    root.HoldExit.attach(
      document.getElementById('btn-back'),
      document.getElementById('exit-hint'),
      root.GameBridge.back,
    );
    document.getElementById('btn-reset').addEventListener('click', options.onReset);
    if (options.onListen) {
      document.getElementById('btn-listen').addEventListener('click', options.onListen);
    }

    return {
      /** Quantas estrelas de progresso existem (uma por rodada ou par) */
      setTotal: function (total) {
        var html = '';
        for (var i = 0; i < total; i++) {
          html += '<svg class="dot" viewBox="0 0 24 24"><path d="' + STAR + '"/></svg>';
        }
        progressEl.innerHTML = html;
        progressEl.setAttribute('data-total', total);
        progressEl.setAttribute('data-done', 0);
      },
      /** Acende as primeiras `done` estrelas (só a última acesa ganha a animação) */
      setDone: function (done) {
        var dots = progressEl.children;
        var before = Number(progressEl.getAttribute('data-done')) || 0;
        for (var i = 0; i < dots.length; i++) {
          var lit = i < done;
          if (lit && i >= before) {
            dots[i].classList.remove('done');
            void dots[i].getBoundingClientRect();   // reinicia a animação
          }
          dots[i].classList.toggle('done', lit);
        }
        progressEl.setAttribute('data-done', done);
      },
    };
  }

  root.GameKit = { createHeader: createHeader, icon: icon, STAR: STAR };
})(window);
