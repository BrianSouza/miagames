(function () {
  'use strict';

  // O "Qual é a letra?" só diz como desenhar a pergunta e as figuras; o resto
  // (ponte, rodadas, acerto/erro/dica, fim de jogo) é do kit em _shared/quiz-ui.js.
  // As regras ficam em which-letter-logic.js (testado com `node --test`).
  var Logic = window.WhichLetterLogic;

  window.GameQuizUI.start({
    gameId: 'which-letter',
    logic: Logic,
    prompt: function (round) {
      return Logic.promptFor(round.answer);
    },
    correctSpeech: function (round) {
      return round.answer.name + '! Muito bem!';
    },
    renderOption: function (el, item) {
      el.setAttribute('data-kind', item.kind);
      el.setAttribute('aria-label', (item.kind === 'letter' ? 'Letra ' : 'Número ') + item.symbol);
      el.innerHTML = '<span class="glyph" data-len="' + item.symbol.length + '">' + item.symbol + '</span>';
    },
  });
})();
