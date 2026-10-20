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
   * options: { onReset, onListen (se houver, mostra o botão "ouvir de novo"), maxDots (opcional) }
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

    // Quantas estrelas de progresso se mostram no máximo: nos jogos com muitas peças (uma estrela por
    // peça ficaria minúscula num celular), cada estrela vale mais de uma peça. Sem `maxDots`, é uma por unidade.
    var maxDots = options.maxDots || Infinity;
    var units = 0;

    return {
      /** Quantas unidades (rodadas, pares ou peças) a partida tem; as estrelas são uma por unidade, até `maxDots` */
      setTotal: function (total) {
        units = total;
        var shown = Math.min(total, maxDots);
        var html = '';
        for (var i = 0; i < shown; i++) {
          html += '<svg class="dot" viewBox="0 0 24 24"><path d="' + STAR + '"/></svg>';
        }
        progressEl.innerHTML = html;
        progressEl.setAttribute('data-total', shown);
        progressEl.setAttribute('data-done', 0);
      },
      /** Acende as estrelas das primeiras `done` unidades (só a última acesa ganha a animação) */
      setDone: function (done) {
        var dots = progressEl.children;
        // com menos estrelas que unidades, cada estrela vale `units / dots` unidades; a última só acende ao terminar
        var lit = done >= units ? dots.length : Math.floor((done * dots.length) / Math.max(units, 1));
        var before = Number(progressEl.getAttribute('data-done')) || 0;
        for (var i = 0; i < dots.length; i++) {
          var on = i < lit;
          if (on && i >= before) {
            dots[i].classList.remove('done');
            void dots[i].getBoundingClientRect();   // reinicia a animação
          }
          dots[i].classList.toggle('done', on);
        }
        progressEl.setAttribute('data-done', lit);
      },
    };
  }

  // ── A roupa da Mia ────────────────────────────────────────────────────────────
  // O Flutter manda os ids dos acessórios que ela veste (`INIT.outfit`). Cada acessório é um SVG
  // transparente no mesmo quadro da Mia: empilhado sobre ela (grade de uma célula só), serve em
  // qualquer pose. Os lugares onde a Mia aparece levam `data-mia-stack` e se vestem sozinhos.
  var OUTFIT_URL = new URL('img/', document.currentScript.src).href;
  var outfit = [];

  /** Veste os acessórios em `container` (que tem a Mia como `img.mia` e empilha seus filhos) */
  function dress(container) {
    Array.prototype.slice.call(container.querySelectorAll('img.outfit')).forEach(function (el) {
      el.remove();
    });
    outfit.forEach(function (id) {
      var img = document.createElement('img');
      img.className = 'mia outfit';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.src = OUTFIT_URL + 'outfit_' + id + '.svg';
      container.appendChild(img);
    });
  }

  /** Define o que a Mia veste e atualiza todos os lugares onde ela aparece */
  function setOutfit(ids) {
    // só nomes simples (a-z): o id vira parte do caminho do arquivo
    outfit = (Array.isArray(ids) ? ids : []).filter(function (id) {
      return typeof id === 'string' && /^[a-z]+$/.test(id);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mia-stack]'), dress);
  }

  root.GameKit = {
    createHeader: createHeader,
    icon: icon,
    STAR: STAR,
    dress: dress,
    setOutfit: setOutfit,
  };
})(window);
