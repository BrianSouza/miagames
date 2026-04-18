import { shuffleArray, chunkArray } from '../array';

describe('shuffleArray', () => {
  it('retorna array com os mesmos elementos', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  it('não muta o array original', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffleArray(original);
    expect(original).toEqual(copy);
  });

  it('funciona com array vazio', () => {
    expect(shuffleArray([])).toEqual([]);
  });
});

describe('chunkArray', () => {
  it('divide array em chunks iguais', () => {
    const result = chunkArray([1, 2, 3, 4, 5, 6], 3);
    expect(result).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  it('último chunk pode ser menor', () => {
    const result = chunkArray([1, 2, 3, 4, 5], 3);
    expect(result).toEqual([[1, 2, 3], [4, 5]]);
  });
});
