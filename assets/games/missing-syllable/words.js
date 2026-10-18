/**
 * Palavras do "Qual sílaba falta?": cada uma tem um desenho em img/<id>.svg e as
 * sílabas separadas. Só sílabas "consoante + vogal" (BO-LA, CA-SA), as primeiras
 * que se aprendem a ler.
 *
 * Roda no navegador (window.SyllableWords) e no Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SyllableWords = factory();
  }
})(this, function () {
  'use strict';

  // `id` é o nome do desenho (img/<id>.svg); `word` é a palavra por extenso.
  var WORDS = [
    // duas sílabas (fácil e médio)
    { id: 'bola',   word: 'bola',   syllables: ['bo', 'la'] },
    { id: 'casa',   word: 'casa',   syllables: ['ca', 'sa'] },
    { id: 'gato',   word: 'gato',   syllables: ['ga', 'to'] },
    { id: 'pato',   word: 'pato',   syllables: ['pa', 'to'] },
    { id: 'sapo',   word: 'sapo',   syllables: ['sa', 'po'] },
    { id: 'vaca',   word: 'vaca',   syllables: ['va', 'ca'] },
    { id: 'mesa',   word: 'mesa',   syllables: ['me', 'sa'] },
    { id: 'mala',   word: 'mala',   syllables: ['ma', 'la'] },
    { id: 'bota',   word: 'bota',   syllables: ['bo', 'ta'] },
    { id: 'pipa',   word: 'pipa',   syllables: ['pi', 'pa'] },
    { id: 'boca',   word: 'boca',   syllables: ['bo', 'ca'] },
    { id: 'copo',   word: 'copo',   syllables: ['co', 'po'] },
    { id: 'bolo',   word: 'bolo',   syllables: ['bo', 'lo'] },
    { id: 'rato',   word: 'rato',   syllables: ['ra', 'to'] },
    { id: 'sino',   word: 'sino',   syllables: ['si', 'no'] },
    { id: 'dado',   word: 'dado',   syllables: ['da', 'do'] },
    { id: 'cama',   word: 'cama',   syllables: ['ca', 'ma'] },
    { id: 'lata',   word: 'lata',   syllables: ['la', 'ta'] },
    { id: 'vela',   word: 'vela',   syllables: ['ve', 'la'] },
    // três sílabas (difícil)
    { id: 'banana', word: 'banana', syllables: ['ba', 'na', 'na'] },
    { id: 'janela', word: 'janela', syllables: ['ja', 'ne', 'la'] },
    { id: 'tomate', word: 'tomate', syllables: ['to', 'ma', 'te'] },
    { id: 'sapato', word: 'sapato', syllables: ['sa', 'pa', 'to'] },
    { id: 'panela', word: 'panela', syllables: ['pa', 'ne', 'la'] },
    { id: 'macaco', word: 'macaco', syllables: ['ma', 'ca', 'co'] },
    { id: 'coruja', word: 'coruja', syllables: ['co', 'ru', 'ja'] },
    { id: 'tucano', word: 'tucano', syllables: ['tu', 'ca', 'no'] },
  ];

  /**
   * Outras palavras que a criança conhece e que uma sílaba errada poderia formar
   * (BO + CA = "boca", mas também BO + DA = "boda"). Não têm desenho: só servem
   * para que nenhuma sílaba errada seja, na verdade, uma resposta certa.
   */
  var OTHER_WORDS = [
    'bala', 'bata', 'bebe', 'bela', 'belo', 'bico', 'bode', 'boda', 'bota', 'cabo', 'cada', 'cana',
    'cano', 'cara', 'cavalo', 'copa', 'cuja', 'cura', 'dama', 'data', 'dedo', 'dona', 'dono', 'fada',
    'faca', 'fala', 'fato', 'fera', 'fita', 'fogo', 'foca', 'fome', 'gala', 'gola', 'gosto', 'jaca',
    'jogo', 'juba', 'lado', 'lago', 'lama', 'lobo', 'loja', 'lula', 'maca', 'mano', 'mapa', 'mato',
    'meta', 'mola', 'mula', 'mudo', 'nada', 'nata', 'nota', 'novo', 'nuca', 'pata', 'pano', 'pena',
    'pera', 'pele', 'pilha', 'pote', 'pulo', 'puma', 'rama', 'rede', 'rima', 'rolo', 'roda', 'rosa',
    'sala', 'sede', 'selo', 'sola', 'sopa', 'suco', 'tapa', 'taco', 'tela', 'tema', 'teto', 'toca',
    'tubo', 'tudo', 'vaso', 'vida', 'vila', 'zero', 'zona', 'cabelo', 'cabide', 'camelo', 'comida',
    'tomada', 'pomada', 'parede', 'banana', 'sabono', 'canela', 'cadela', 'camisa', 'cenoura',
    'janela', 'melado', 'pepino', 'tomate', 'tecido', 'sapato', 'macaco', 'papel', 'pijama', 'bonito',
    'bonita', 'batata', 'barata', 'balata', 'palito', 'panela', 'pirata', 'robot', 'rodada', 'salada',
    'sereno', 'tesoura', 'vizinho', 'vitoria',
  ];

  // Consoantes que se juntam a todas as vogais; "c" e "g" só com a, o, u (ce, ci, ge e gi têm
  // outro som, e confundiriam quem está aprendendo)
  var CONSONANTS = ['b', 'd', 'f', 'j', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
  var VOWELS = ['a', 'e', 'i', 'o', 'u'];
  var SYLLABLES = [];
  CONSONANTS.forEach(function (c) { VOWELS.forEach(function (v) { SYLLABLES.push(c + v); }); });
  ['c', 'g'].forEach(function (c) { ['a', 'o', 'u'].forEach(function (v) { SYLLABLES.push(c + v); }); });

  var ACCENTED = { a: 'á', e: 'ê', i: 'í', o: 'ô', u: 'ú' };

  /**
   * Como a voz fala uma sílaba solta. O motor de voz leria "to" como "tu" (o "o"
   * final soa "u") e "ne" como "ni": a vogal acentuada força o som certo.
   * Para consertar uma sílaba que ainda soe estranha no aparelho, ponha-a em SAY_OVERRIDES.
   */
  var SAY_OVERRIDES = {};

  function sayFor(syllable) {
    if (SAY_OVERRIDES[syllable]) return SAY_OVERRIDES[syllable];
    return syllable.charAt(0) + ACCENTED[syllable.charAt(1)];
  }

  function consonantOf(syllable) { return syllable.charAt(0); }
  function vowelOf(syllable) { return syllable.charAt(1); }

  /** Todas as palavras que a criança conhece: as do jogo e as outras */
  function isKnownWord(text) {
    return WORDS.some(function (w) { return w.word === text; }) || OTHER_WORDS.indexOf(text) !== -1;
  }

  return {
    WORDS: WORDS,
    OTHER_WORDS: OTHER_WORDS,
    SYLLABLES: SYLLABLES,
    SAY_OVERRIDES: SAY_OVERRIDES,
    sayFor: sayFor,
    consonantOf: consonantOf,
    vowelOf: vowelOf,
    isKnownWord: isKnownWord,
  };
});
