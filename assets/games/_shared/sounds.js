/**
 * Efeitos sonoros sintetizados com a Web Audio API — sem arquivos de áudio.
 *
 * Cada som é uma sequência curta de notas com envelope suave (sem estalos).
 * O volume é baixo de propósito: os efeitos acompanham a voz, não a cobrem.
 *
 * Navegadores (e a WebView) só liberam o áudio depois de um toque do
 * usuário; por isso o contexto é criado/retomado no primeiro toque na tela.
 */
(function (root) {
  'use strict';

  // [frequência Hz, início s, duração s, forma de onda, volume]
  var SOUNDS = {
    flip:     [[660, 0, 0.09, 'sine', 0.16]],
    match:    [[784, 0, 0.12, 'sine', 0.18], [1047, 0.1, 0.22, 'sine', 0.18]],
    mismatch: [[330, 0, 0.12, 'triangle', 0.12], [262, 0.11, 0.18, 'triangle', 0.12]],
    win:      [[523, 0, 0.14, 'sine', 0.18], [659, 0.13, 0.14, 'sine', 0.18],
               [784, 0.26, 0.14, 'sine', 0.18], [1047, 0.39, 0.4, 'sine', 0.2]],
  };

  var ctx = null;
  var enabled = true;

  function context() {
    try {
      if (!ctx) {
        var AudioCtx = root.AudioContext || root.webkitAudioContext;
        if (!AudioCtx) return null;
        ctx = new AudioCtx();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;   // sem áudio, o jogo continua funcionando
    }
  }

  function note(c, freq, start, duration, type, volume) {
    var t0 = c.currentTime + start;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function play(name) {
    if (!enabled || !SOUNDS[name]) return;
    var c = context();
    if (!c) return;
    SOUNDS[name].forEach(function (n) { note(c, n[0], n[1], n[2], n[3], n[4]); });
  }

  // Libera o áudio no primeiro toque (exigência dos navegadores)
  root.addEventListener('pointerdown', function unlock() {
    context();
    root.removeEventListener('pointerdown', unlock);
  });

  root.GameSounds = {
    play: play,
    setEnabled: function (value) { enabled = value !== false; },
    isEnabled: function () { return enabled; },
  };
})(window);
