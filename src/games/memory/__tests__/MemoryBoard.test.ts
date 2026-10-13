import { computeCardSize } from '../components/MemoryBoard';
import { CARD_MARGIN } from '../components/MemoryCard';

describe('computeCardSize', () => {
  it('em celular retrato, a largura é o limite', () => {
    const size = computeCardSize(360, 600, 3, 4);
    expect(size).toBe(Math.floor((360 - 32) / 3 - CARD_MARGIN * 2));
  });

  it('em tablet paisagem, a altura é o limite e o grid cabe na tela', () => {
    const height = 700;
    const rows = 5;
    const size = computeCardSize(1200, height, 4, rows);

    expect((size + CARD_MARGIN * 2) * rows).toBeLessThanOrEqual(height - 32);
  });

  it('nunca retorna tamanho negativo', () => {
    expect(computeCardSize(10, 10, 4, 5)).toBe(0);
  });
});
