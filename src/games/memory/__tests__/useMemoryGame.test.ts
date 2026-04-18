/**
 * Testes unitários do hook useMemoryGame.
 * Testamos a lógica pura sem renderizar nenhum componente.
 *
 * Como rodar: npm test
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useMemoryGame } from '../hooks/useMemoryGame';

// Mock do timer para controlar o delay de verificação de pares
jest.useFakeTimers();

describe('useMemoryGame', () => {
  it('inicializa com as cartas corretas para a dificuldade easy', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    expect(result.current.cards).toHaveLength(12); // 6 pares × 2
    expect(result.current.phase).toBe('idle');
    expect(result.current.stats.matchesFound).toBe(0);
    expect(result.current.stats.moves).toBe(0);
    expect(result.current.isCompleted).toBe(false);
  });

  it('cartas começam com state hidden', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    result.current.cards.forEach(card => {
      expect(card.state).toBe('hidden');
    });
  });

  it('vira uma carta ao chamar flipCard', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    const firstCardId = result.current.cards[0].id;

    act(() => {
      result.current.flipCard(firstCardId);
    });

    const flippedCard = result.current.cards.find(c => c.id === firstCardId);
    expect(flippedCard?.state).toBe('flipped');
    expect(result.current.phase).toBe('playing');
  });

  it('incrementa moves ao virar o segundo card', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    act(() => {
      result.current.flipCard(result.current.cards[0].id);
      result.current.flipCard(result.current.cards[2].id);
    });

    expect(result.current.stats.moves).toBe(1);
    expect(result.current.phase).toBe('checking');
  });

  it('marca cartas como matched quando são um par', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    // Encontra dois cards do mesmo par
    const firstCard  = result.current.cards[0];
    const matchCard  = result.current.cards.find(
      c => c.pairId === firstCard.pairId && c.id !== firstCard.id,
    )!;

    act(() => {
      result.current.flipCard(firstCard.id);
      result.current.flipCard(matchCard.id);
    });

    act(() => {
      jest.runAllTimers();
    });

    const updatedFirst = result.current.cards.find(c => c.id === firstCard.id);
    const updatedMatch = result.current.cards.find(c => c.id === matchCard.id);

    expect(updatedFirst?.state).toBe('matched');
    expect(updatedMatch?.state).toBe('matched');
    expect(result.current.stats.matchesFound).toBe(1);
  });

  it('esconde cartas quando não formam par', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    // Encontra dois cards de pares DIFERENTES
    const firstCard  = result.current.cards[0];
    const otherCard  = result.current.cards.find(c => c.pairId !== firstCard.pairId)!;

    act(() => {
      result.current.flipCard(firstCard.id);
      result.current.flipCard(otherCard.id);
    });

    act(() => {
      jest.runAllTimers();
    });

    const updatedFirst = result.current.cards.find(c => c.id === firstCard.id);
    const updatedOther = result.current.cards.find(c => c.id === otherCard.id);

    expect(updatedFirst?.state).toBe('hidden');
    expect(updatedOther?.state).toBe('hidden');
    expect(result.current.phase).toBe('playing');
  });

  it('reinicia o jogo ao chamar resetGame', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    act(() => {
      result.current.flipCard(result.current.cards[0].id);
    });

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.phase).toBe('idle');
    expect(result.current.stats.moves).toBe(0);
    result.current.cards.forEach(c => expect(c.state).toBe('hidden'));
  });

  it('não permite virar carta durante fase checking', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    act(() => {
      result.current.flipCard(result.current.cards[0].id);
      result.current.flipCard(result.current.cards[2].id);
    });

    // Fase deve ser 'checking' agora
    expect(result.current.phase).toBe('checking');

    // Tentar virar terceira carta — deve ser ignorado
    const hiddenCard = result.current.cards.find(c => c.state === 'hidden');
    act(() => {
      if (hiddenCard) result.current.flipCard(hiddenCard.id);
    });

    // Carta não deve ter sido virada
    const card = result.current.cards.find(c => c.id === hiddenCard?.id);
    expect(card?.state).toBe('hidden');
  });
});
