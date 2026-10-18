(function () {
  'use strict';

  // O "Qual sílaba falta?" mostra o desenho e a palavra com a lacuna; o resto (ponte, rodadas,
  // acerto/erro/dica, fim de jogo) é do kit em _shared/quiz-ui.js.
  // As regras e o banco de palavras ficam em missing-syllable-logic.js e _shared/words.js (testados no Node).
  var Logic = window.MissingSyllableLogic;

  var MAX_PICTURE = 280;
  var MAX_WORD = 76;
  var GAP = 8;

  var pictureEl = document.getElementById('picture');
  var wordEl = document.getElementById('word');
  var areaEl = document.getElementById('picture-area');

  function renderStage(round) {
    pictureEl.src = 'img/' + round.id + '.svg';
    wordEl.innerHTML = Logic.displayFor(round).map(function (part) {
      return part.blank
        ? '<span class="syl blank" data-blank="true">?</span>'
        : '<span class="syl">' + part.text + '</span>';
    }).join('');
    // Para leitores de tela: a palavra inteira, com a lacuna dita em voz alta
    wordEl.setAttribute('aria-label', Logic.displayFor(round).map(function (part) {
      return part.blank ? 'sílaba que falta' : part.text;
    }).join(' '));
  }

  /** Ao acertar, a sílaba entra na lacuna */
  function fillBlank(round, key) {
    var blank = wordEl.querySelector('[data-blank]');
    if (!blank) return;
    blank.textContent = key.toUpperCase();
    blank.classList.remove('blank');
    blank.classList.add('filled', 'pop');
    blank.removeAttribute('data-blank');
    wordEl.setAttribute('aria-label', round.word);
  }

  /**
   * O desenho e a palavra dividem a área: a palavra ocupa a largura (em fonte que cabe)
   * e o desenho fica com a altura que sobra.
   */
  function layoutStage() {
    var syllables = wordEl.children.length;
    if (!syllables) return;
    var style = getComputedStyle(areaEl);
    var width = areaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var height = areaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    // Cada sílaba tem 2 letras de ~.72em, mais o respiro da caixa (.36em) e o espaço entre elas (.25em)
    var em = syllables * (2 * 0.72 + 0.36) + (syllables - 1) * 0.25;
    var wordSize = Math.floor(Math.min(MAX_WORD, (width - 4) / em, height * 0.26));
    wordEl.style.setProperty('--word-size', wordSize + 'px');

    var wordHeight = Math.ceil(wordSize * 1.15) + 8;   // linha + sombra
    var pictureSize = Math.floor(Math.min(MAX_PICTURE, width, height - wordHeight - GAP));
    areaEl.style.setProperty('--pic-size', Math.max(0, pictureSize) + 'px');
  }

  window.GameQuizUI.start({
    gameId: 'missing-syllable',
    logic: Logic,
    prompt: Logic.promptFor,
    correctSpeech: Logic.correctSpeechFor,
    wrongSpeech: Logic.wrongSpeechFor,
    renderOption: function (el, option) {
      var text = option.syllable.toUpperCase();
      el.setAttribute('data-kind', 'letter');
      el.setAttribute('aria-label', 'Sílaba ' + text);
      el.innerHTML = '<span class="glyph" data-len="' + text.length + '">' + text + '</span>';
    },
    renderStage: renderStage,
    layoutStage: layoutStage,
    onCorrect: fillBlank,
  });
})();
