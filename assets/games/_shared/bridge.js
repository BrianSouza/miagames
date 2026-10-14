/**
 * Ponte com o Flutter, igual para todos os jogos.
 *
 *   Flutter → jogo:  window.handleFlutterMessage({type:'INIT', difficulty, gameId, sound, best})
 *   jogo → Flutter:  SPEAK {text} · GAME_COMPLETE {...} · NAVIGATE_BACK
 *
 * A voz do navegador não funciona na WebView do Android — quem fala é o Flutter.
 */
(function (root) {
  'use strict';

  function send(type, payload) {
    if (!root.MiaGamesFlutter) return;
    root.MiaGamesFlutter.postMessage(JSON.stringify(Object.assign({ type: type }, payload)));
  }

  /** Registra quem recebe o INIT (dificuldade, som e recorde atual) */
  function onInit(callback) {
    root.handleFlutterMessage = function (data) {
      if (data && data.type === 'INIT') callback(data);
    };
  }

  root.GameBridge = {
    onInit: onInit,
    send: send,
    speak: function (text) { send('SPEAK', { text: text }); },
    complete: function (payload) { send('GAME_COMPLETE', payload); },
    back: function () { send('NAVIGATE_BACK'); },
  };
})(window);
