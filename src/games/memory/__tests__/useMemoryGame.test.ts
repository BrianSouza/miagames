/**
 * Testes unitários do jogo da memória.
 * O reducer é testado como função pura; o hook, com renderHook (timers falsos).
 *
 * Como rodar: npm test
 */
import { renderHook, act } from '@testing-library/react-native';

import {
  useMemoryGame,
  memoryGameReducer,
  createInitialState,
  CHECK_DELAY_MS,
  type MemoryGameState,
} from '../hooks/useMemoryGame';
import type { MemoryCard } from '../types';

/** Escolhe duas cartas do mesmo par (sem depender da ordem aleatória) */
function findPair(cards: MemoryCard[]): [MemoryCard, MemoryCard] {
  const first = cards[0];
  const match = cards.find(c => c.pairId === first.pairId && c.id !== first.id)!;
  return [first, match];
}

/** Escolhe duas cartas de pares diferentes */
function findMismatch(cards: MemoryCard[]): [MemoryCard, MemoryCard] {
  const first = cards[0];
  const other = cards.find(c => c.pairId !== first.pairId)!;
  return [first, other];
}

function flip(state: MemoryGameState, cardId: number, now = 1000) {
  return memoryGameReducer(state, { type: 'flip', cardId, now });
}

describe('memoryGameReducer', () => {
  it('cria 2 cartas por par, todas escondidas e com um par por símbolo', () => {
    const state = createInitialState(6);

    expect(state.cards).toHaveLength(12);
    expect(state.cards.every(c => c.state === 'hidden')).toBe(true);
    expect(new Set(state.cards.map(c => c.id)).size).toBe(12);
    for (let pairId = 0; pairId < 6; pairId++) {
      expect(state.cards.filter(c => c.pairId === pairId)).toHaveLength(2);
    }
  });

  it('inicia o cronômetro no primeiro toque, não ao criar o tabuleiro', () => {
    const initial = createInitialState(6);
    expect(initial.stats.startedAt).toBeUndefined();

    const state = flip(initial, initial.cards[0].id, 5000);
    expect(state.stats.startedAt).toBe(5000);
  });

  it('ignora uma terceira carta enquanto duas estão abertas', () => {
    const initial = createInitialState(6);
    const [a, b] = findMismatch(initial.cards);
    const third = initial.cards.find(c => c.id !== a.id && c.id !== b.id)!;

    let state = flip(initial, a.id);
    state = flip(state, b.id);
    // Mesmo que a fase ainda não tenha sido lida pela UI, o reducer bloqueia
    const after = flip({ ...state, phase: 'playing' }, third.id);

    expect(after.cards.find(c => c.id === third.id)?.state).toBe('hidden');
    expect(after.flippedIds).toEqual([a.id, b.id]);
  });

  it('não conta a mesma carta duas vezes', () => {
    const initial = createInitialState(6);
    const id = initial.cards[0].id;

    const state = flip(flip(initial, id), id);

    expect(state.flippedIds).toEqual([id]);
    expect(state.stats.moves).toBe(0);
  });

  it('marca o fim do jogo ao encontrar o último par', () => {
    let state = createInitialState(1);
    const [a, b] = findPair(state.cards);

    state = flip(state, a.id, 1000);
    state = flip(state, b.id, 2000);
    state = memoryGameReducer(state, { type: 'resolve', now: 9000 });

    expect(state.phase).toBe('completed');
    expect(state.stats.matchesFound).toBe(1);
    expect(state.stats.completedAt).toBe(9000);
  });

  it('resolve fora da fase checking não altera nada', () => {
    const state = createInitialState(6);
    expect(memoryGameReducer(state, { type: 'resolve', now: 0 })).toBe(state);
  });
});

describe('useMemoryGame', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('inicializa com as cartas corretas para a dificuldade easy', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));

    expect(result.current.cards).toHaveLength(12); // 6 pares × 2
    expect(result.current.phase).toBe('idle');
    expect(result.current.stats.matchesFound).toBe(0);
    expect(result.current.stats.moves).toBe(0);
    expect(result.current.isCompleted).toBe(false);
    result.current.cards.forEach(card => expect(card.state).toBe('hidden'));
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

  it('incrementa moves e entra em checking ao virar o segundo card', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));
    const [a, b] = findMismatch(result.current.cards);

    act(() => {
      result.current.flipCard(a.id);
      result.current.flipCard(b.id);
    });

    expect(result.current.stats.moves).toBe(1);
    expect(result.current.phase).toBe('checking');
  });

  it('marca cartas como matched quando são um par', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));
    const [a, b] = findPair(result.current.cards);

    act(() => {
      result.current.flipCard(a.id);
      result.current.flipCard(b.id);
    });
    act(() => {
      jest.advanceTimersByTime(CHECK_DELAY_MS);
    });

    expect(result.current.cards.find(c => c.id === a.id)?.state).toBe('matched');
    expect(result.current.cards.find(c => c.id === b.id)?.state).toBe('matched');
    expect(result.current.stats.matchesFound).toBe(1);
    expect(result.current.phase).toBe('playing');
  });

  it('esconde cartas quando não formam par', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));
    const [a, b] = findMismatch(result.current.cards);

    act(() => {
      result.current.flipCard(a.id);
      result.current.flipCard(b.id);
    });
    act(() => {
      jest.advanceTimersByTime(CHECK_DELAY_MS);
    });

    expect(result.current.cards.find(c => c.id === a.id)?.state).toBe('hidden');
    expect(result.current.cards.find(c => c.id === b.id)?.state).toBe('hidden');
    expect(result.current.phase).toBe('playing');
  });

  it('não permite virar carta durante fase checking', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));
    const [a, b] = findMismatch(result.current.cards);

    act(() => {
      result.current.flipCard(a.id);
      result.current.flipCard(b.id);
    });
    expect(result.current.phase).toBe('checking');

    const hiddenCard = result.current.cards.find(c => c.state === 'hidden')!;
    act(() => {
      result.current.flipCard(hiddenCard.id);
    });

    expect(result.current.cards.find(c => c.id === hiddenCard.id)?.state).toBe('hidden');
  });

  it('completa o jogo e calcula o tempo a partir do primeiro toque', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));
    const pairIds = [...new Set(result.current.cards.map(c => c.pairId))];

    act(() => {
      jest.advanceTimersByTime(60_000); // tempo parado antes do 1º toque não conta
    });

    for (const pairId of pairIds) {
      const [a, b] = result.current.cards.filter(c => c.pairId === pairId);
      act(() => {
        result.current.flipCard(a.id);
        result.current.flipCard(b.id);
      });
      act(() => {
        jest.advanceTimersByTime(CHECK_DELAY_MS);
      });
    }

    expect(result.current.isCompleted).toBe(true);
    expect(result.current.stats.moves).toBe(6);
    expect(result.current.elapsedSeconds).toBe(Math.floor((6 * CHECK_DELAY_MS) / 1000));
  });

  it('reinicia o jogo ao chamar resetGame e cancela a verificação pendente', () => {
    const { result } = renderHook(() => useMemoryGame('easy'));
    const [a, b] = findPair(result.current.cards);

    act(() => {
      result.current.flipCard(a.id);
      result.current.flipCard(b.id);
    });
    act(() => {
      result.current.resetGame();
    });
    act(() => {
      jest.advanceTimersByTime(CHECK_DELAY_MS);
    });

    expect(result.current.phase).toBe('idle');
    expect(result.current.stats.moves).toBe(0);
    expect(result.current.stats.matchesFound).toBe(0);
    result.current.cards.forEach(c => expect(c.state).toBe('hidden'));
  });

  it('monta um tabuleiro novo quando a dificuldade muda', () => {
    const { result, rerender } = renderHook(
      ({ difficulty }: { difficulty: 'easy' | 'hard' }) => useMemoryGame(difficulty),
      { initialProps: { difficulty: 'easy' } },
    );
    expect(result.current.cards).toHaveLength(12);

    rerender({ difficulty: 'hard' });

    expect(result.current.cards).toHaveLength(20);
    expect(result.current.stats.totalPairs).toBe(10);
  });
});
