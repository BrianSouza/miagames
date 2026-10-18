/**
 * Letras e números compartilhados pelos jogos: nomes falados em português,
 * símbolos que se confundem e embaralhamento — funções puras, sem DOM.
 *
 * Roda no navegador (expõe window.GameSymbols) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameSymbols = factory();
  }
})(this, function () {
  'use strict';

  // Letras (A–Z). `name` é o que a voz fala: o NOME da letra em português
  // ("Bê", "Cê"...), e não o som que o motor de voz leria sozinho —
  // sozinho, ele lê "E" como a palavra "e" ("i") e "Q" como "cu".
  var LETTERS = [
    ['A', 'Á'],    ['B', 'Bê'],   ['C', 'Cê'],    ['D', 'Dê'],     ['E', 'Ê'],
    ['F', 'Éfe'],  ['G', 'Gê'],   ['H', 'Agá'],   ['I', 'I'],      ['J', 'Jota'],
    ['K', 'Cá'],   ['L', 'Éle'],  ['M', 'Ême'],   ['N', 'Êne'],    ['O', 'Ó'],
    ['P', 'Pê'],   ['Q', 'Quê'],  ['R', 'Érre'],  ['S', 'Ésse'],   ['T', 'Tê'],
    ['U', 'U'],    ['V', 'Vê'],   ['W', 'Dáblio'], ['X', 'Xis'],   ['Y', 'Ípsilon'],
    ['Z', 'Zê'],
  ].map(function (l) { return { symbol: l[0], name: l[1], kind: 'letter' }; });

  var UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  var TEENS = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var TENS = { 2: 'vinte', 3: 'trinta', 4: 'quarenta', 5: 'cinquenta' };

  /** Nome do número por extenso, até 59: 7 → "Sete", 37 → "Trinta e sete" */
  function numberName(n) {
    var text;
    if (n < 10) text = UNITS[n];
    else if (n < 20) text = TEENS[n - 10];
    else {
      var tens = Math.floor(n / 10);
      var unit = n % 10;
      text = TENS[tens] + (unit ? ' e ' + UNITS[unit] : '');
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Cartas de número de 0 até `max` */
  function numbersUpTo(max) {
    var list = [];
    for (var n = 0; n <= max; n++) {
      list.push({ symbol: String(n), name: numberName(n), kind: 'number' });
    }
    return list;
  }

  /**
   * Símbolos que se parecem: nunca aparecem juntos. Para quem está
   * aprendendo a ler, "O" e "0" (e "I" e "1") são a mesma figura — o erro não
   * seria de memória, e sim de uma distinção que a criança ainda não domina.
   */
  var LOOKALIKES = { 'O': '0', '0': 'O', 'I': '1', '1': 'I' };

  /**
   * Dois símbolos que a criança costuma trocar: os que se parecem (O/0, I/1) e os
   * números com os algarismos invertidos (12 e 21, 13 e 31) — erro comum de quem
   * ainda está aprendendo a ordem dos algarismos.
   */
  function looksAlike(a, b) {
    if (LOOKALIKES[a] === b) return true;
    return a.length === 2 && b.length === 2 && a !== b && a.charAt(0) === b.charAt(1) && a.charAt(1) === b.charAt(0);
  }

  /** A letra ou o número de um símbolo ("B", "37") — para quem só tem o texto da carta */
  function findSymbol(symbol) {
    for (var i = 0; i < LETTERS.length; i++) {
      if (LETTERS[i].symbol === symbol) return LETTERS[i];
    }
    var n = Number(symbol);
    return n >= 0 && String(n) === symbol ? numbersUpTo(n).pop() : null;
  }

  /** Rótulo para leitores de tela: "Letra B", "Número 3" */
  function labelFor(item) {
    return (item.kind === 'letter' ? 'Letra ' : 'Número ') + item.symbol;
  }

  /** Fisher-Yates — distribuição uniforme, não altera o array original */
  function shuffle(arr, random) {
    var rnd = random || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  return {
    LETTERS: LETTERS,
    numbersUpTo: numbersUpTo,
    numberName: numberName,
    LOOKALIKES: LOOKALIKES,
    looksAlike: looksAlike,
    findSymbol: findSymbol,
    labelFor: labelFor,
    shuffle: shuffle,
  };
});
