(function () {
  'use strict';

  // O "Quantos tem?" desenha os objetos e deixa a criança contar tocando em cada um;
  // o resto (ponte, rodadas, acerto/erro/dica, fim de jogo) é do kit em _shared/quiz-ui.js.
  // As regras ficam em how-many-logic.js (testado com `node --test`).
  var Logic = window.HowManyLogic;
  var Utils = window.GameUtils;
  var Sounds = window.GameSounds;

  var OBJECT_GAP = 8;
  var MAX_OBJECT = 110;

  var objectsEl = document.getElementById('objects');
  var areaEl = document.getElementById('objects-area');
  var counted = [];   // objetos que a criança já contou nesta rodada, na ordem dos toques

  function renderObjects(round) {
    counted = [];
    objectsEl.innerHTML = '';
    for (var i = 0; i < round.count; i++) {
      var el = document.createElement('button');
      el.className = 'obj';
      el.setAttribute('data-index', i);
      el.setAttribute('aria-label', round.object.name);
      el.innerHTML = '<img src="img/' + round.object.id + '.svg" alt="" />';
      el.addEventListener('click', onObjectClick.bind(null, el, i));
      objectsEl.appendChild(el);
    }
  }

  /** Cada objeto novo fala o próximo número: um objeto, um número */
  function onObjectClick(el, index) {
    var out = Logic.tapObject(counted, index);
    if (out.number === null) return;   // já contado
    counted = out.counted;
    el.classList.add('counted');
    el.insertAdjacentHTML('beforeend', '<span class="badge">' + out.number + '</span>');
    Sounds.play('flip');
    window.GameBridge.speak(Logic.numberName(out.number));
  }

  /** Os objetos ocupam a área em fileiras de 5, com o maior tamanho que couber */
  function layoutObjects() {
    var count = objectsEl.children.length;
    if (!count) return;
    var style = getComputedStyle(areaEl);
    var width = areaEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var height = areaEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var cols = Math.min(count, Logic.PER_ROW);
    var size = Math.min(Utils.fitSquare(width, height, cols, Logic.rowsFor(count), OBJECT_GAP), MAX_OBJECT);

    objectsEl.style.gridTemplateColumns = 'repeat(' + cols + ', ' + size + 'px)';
    objectsEl.style.gap = OBJECT_GAP + 'px';
    objectsEl.style.setProperty('--obj-size', size + 'px');
  }

  window.GameQuizUI.start({
    gameId: 'how-many',
    logic: Logic,
    prompt: function (round) {
      return Logic.promptFor(round.object);
    },
    correctSpeech: function (round) {
      return Logic.numberName(round.count) + '! Muito bem!';
    },
    renderOption: function (el, count) {
      el.setAttribute('data-kind', 'number');
      el.setAttribute('aria-label', String(count));
      el.innerHTML = '<span class="glyph" data-len="' + String(count).length + '">' + count + '</span>';
    },
    renderStage: renderObjects,
    layoutStage: layoutObjects,
  });
})();
