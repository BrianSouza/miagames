// Testes dos símbolos compartilhados (assets/games/_shared/symbols.js).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Symbols = require('../../assets/games/_shared/symbols.js');
const Memory = require('../../assets/games/memory/memory-logic.js');

describe('símbolos compartilhados', () => {
  test('26 letras com nome falado em português', () => {
    assert.equal(Symbols.LETTERS.length, 26);
    assert.equal(Symbols.findSymbol('B').name, 'Bê');
    assert.equal(Symbols.findSymbol('E').name, 'Ê');
    assert.equal(Symbols.findSymbol('H').name, 'Agá');
  });

  test('números por extenso até 50', () => {
    assert.equal(Symbols.numberName(0), 'Zero');
    assert.equal(Symbols.numberName(17), 'Dezessete');
    assert.equal(Symbols.numberName(37), 'Trinta e sete');
    assert.equal(Symbols.numberName(50), 'Cinquenta');
    assert.equal(Symbols.numbersUpTo(50).length, 51);
  });

  test('símbolos que se confundem', () => {
    assert.ok(Symbols.looksAlike('O', '0'));
    assert.ok(Symbols.looksAlike('1', 'I'));
    assert.ok(Symbols.looksAlike('12', '21'));
    assert.ok(!Symbols.looksAlike('11', '11'));
    assert.ok(!Symbols.looksAlike('A', 'B'));
  });

  test('findSymbol devolve null para o que não existe', () => {
    assert.equal(Symbols.findSymbol('?'), null);
    assert.equal(Symbols.findSymbol('007'), null);
  });

  test('labelFor distingue letra e número', () => {
    assert.equal(Symbols.labelFor(Symbols.findSymbol('B')), 'Letra B');
    assert.equal(Symbols.labelFor(Symbols.findSymbol('3')), 'Número 3');
  });

  test('shuffle não altera o original e mantém os itens', () => {
    const list = [1, 2, 3, 4, 5];
    const out = Symbols.shuffle(list);
    assert.deepEqual(list, [1, 2, 3, 4, 5]);
    assert.deepEqual([...out].sort(), list);
  });

  test('a Memória usa exatamente os símbolos compartilhados', () => {
    assert.equal(Memory.LETTERS, Symbols.LETTERS);
    assert.equal(Memory.numberName, Symbols.numberName);
    assert.equal(Memory.shuffle, Symbols.shuffle);
  });
});
