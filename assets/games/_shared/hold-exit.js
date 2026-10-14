/**
 * Voltar: segurar para sair.
 *
 * Crianças pequenas tocam em tudo; um toque acidental não deve encerrar a
 * partida. Um toque curto só mostra a dica para o adulto.
 */
(function (root) {
  'use strict';

  var HOLD_MS = 700;   // segurar o voltar por este tempo para sair
  var HINT_MS = 2000;

  /** Liga o botão `button`; `hint` é o elemento da dica (some sozinho) */
  function attach(button, hint, onExit) {
    var holdTimer = null;
    var hintTimer = null;
    var exited = false;

    function cancelHold() {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    function showHint() {
      hint.classList.remove('hidden');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { hint.classList.add('hidden'); }, HINT_MS);
    }

    button.addEventListener('pointerdown', function () {
      exited = false;
      cancelHold();
      holdTimer = setTimeout(function () {
        exited = true;
        onExit();
      }, HOLD_MS);
    });
    button.addEventListener('pointerup', cancelHold);
    button.addEventListener('pointercancel', cancelHold);
    button.addEventListener('pointerleave', cancelHold);
    button.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    button.addEventListener('click', function () {
      if (!exited) showHint();
    });
  }

  root.HoldExit = { attach: attach, HOLD_MS: HOLD_MS, HINT_MS: HINT_MS };
})(window);
