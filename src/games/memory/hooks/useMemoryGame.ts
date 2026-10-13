import { useReducer, useEffect, useCallback } from 'react';

import { shuffleArray } from '../../../core/utils';
import { Colors } from '../../../core/theme';
import type {
  MemoryCard,
  Difficulty,
  DifficultyConfig,
  GameStats,
  GamePhase,
} from '../types';

// ─── Configurações por dificuldade ───────────────────────────────────────────

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy:   { pairs: 6,  columns: 3, label: 'Fácil',   emoji: '⭐' },
  medium: { pairs: 8,  columns: 4, label: 'Médio',   emoji: '⭐⭐' },
  hard:   { pairs: 10, columns: 4, label: 'Difícil', emoji: '⭐⭐⭐' },
};

/** Tempo (ms) que as duas cartas ficam visíveis antes da verificação */
export const CHECK_DELAY_MS = 800;

// Símbolos disponíveis para as cartas (letras + números, visualmente distintos)
const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                 '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// ─── Funções auxiliares puras (sem efeitos colaterais) ─────────────────────

export function createCards(pairs: number): MemoryCard[] {
  const symbols = shuffleArray(SYMBOLS).slice(0, pairs);
  const colorPool = [...Colors.letterColors];

  // Cada símbolo gera DOIS cards (o par)
  const cards: MemoryCard[] = symbols.flatMap((symbol, pairId) => {
    const color = colorPool[pairId % colorPool.length];
    return [
      { id: pairId * 2,     symbol, pairId, state: 'hidden', color },
      { id: pairId * 2 + 1, symbol, pairId, state: 'hidden', color },
    ];
  });

  return shuffleArray(cards);
}

function makeInitialStats(totalPairs: number): GameStats {
  return {
    moves: 0,
    matchesFound: 0,
    totalPairs,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export interface MemoryGameState {
  cards: MemoryCard[];
  phase: GamePhase;
  stats: GameStats;
  flippedIds: number[];
}

export type MemoryGameAction =
  | { type: 'flip'; cardId: number; now: number }
  | { type: 'resolve'; now: number }
  | { type: 'reset'; pairs: number };

export function createInitialState(pairs: number): MemoryGameState {
  return {
    cards: createCards(pairs),
    phase: 'idle',
    stats: makeInitialStats(pairs),
    flippedIds: [],
  };
}

function setCardsState(
  cards: MemoryCard[],
  ids: number[],
  state: MemoryCard['state'],
): MemoryCard[] {
  return cards.map(c => (ids.includes(c.id) ? { ...c, state } : c));
}

/**
 * Toda a regra do jogo, em uma função pura.
 * Sem timers nem efeitos — fácil de testar e seguro com StrictMode.
 */
export function memoryGameReducer(
  state: MemoryGameState,
  action: MemoryGameAction,
): MemoryGameState {
  switch (action.type) {
    case 'flip': {
      // Bloqueia interação durante verificação, jogo concluído
      // ou quando já há duas cartas abertas
      if (state.phase === 'checking' || state.phase === 'completed') return state;
      if (state.flippedIds.length >= 2) return state;

      const card = state.cards.find(c => c.id === action.cardId);
      // Ignora clique em carta já virada ou já pareada
      if (!card || card.state !== 'hidden') return state;

      const flippedIds = [...state.flippedIds, action.cardId];
      const cards = setCardsState(state.cards, [action.cardId], 'flipped');
      // O cronômetro começa no primeiro toque, não quando o tabuleiro aparece
      const startedAt = state.stats.startedAt ?? action.now;

      if (flippedIds.length === 1) {
        return {
          ...state,
          cards,
          flippedIds,
          phase: 'playing',
          stats: { ...state.stats, startedAt },
        };
      }

      // Segunda carta — a verificação é agendada pelo hook
      return {
        ...state,
        cards,
        flippedIds,
        phase: 'checking',
        stats: { ...state.stats, startedAt, moves: state.stats.moves + 1 },
      };
    }

    case 'resolve': {
      if (state.phase !== 'checking' || state.flippedIds.length !== 2) return state;

      const [firstId, secondId] = state.flippedIds;
      const first = state.cards.find(c => c.id === firstId);
      const second = state.cards.find(c => c.id === secondId);
      const isMatch = !!first && !!second && first.pairId === second.pairId;

      if (!isMatch) {
        // Não é par — esconde as duas cartas
        return {
          ...state,
          cards: setCardsState(state.cards, state.flippedIds, 'hidden'),
          flippedIds: [],
          phase: 'playing',
        };
      }

      // Marca ambas como 'matched' — ficam visíveis para sempre
      const matchesFound = state.stats.matchesFound + 1;
      const isCompleted = matchesFound === state.stats.totalPairs;

      return {
        ...state,
        cards: setCardsState(state.cards, state.flippedIds, 'matched'),
        flippedIds: [],
        phase: isCompleted ? 'completed' : 'playing',
        stats: {
          ...state.stats,
          matchesFound,
          completedAt: isCompleted ? action.now : undefined,
        },
      };
    }

    case 'reset':
      return createInitialState(action.pairs);
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * useMemoryGame — conecta o reducer do jogo da memória ao React.
 *
 * Por que um hook customizado e não um Context/Zustand?
 * - O estado do jogo é LOCAL a uma partida. Não precisa ser global.
 * - Hooks são mais simples de testar e compor.
 * - Se amanhã precisarmos de estado global (salvar progresso), basta
 *   mover o reducer para um store sem mudar a interface do hook.
 *
 * Fluxo do jogo:
 *   idle → (flipCard) → playing → (2ª carta) → checking → playing
 *                                                       → completed
 */
export function useMemoryGame(difficulty: Difficulty = 'easy') {
  const config = DIFFICULTY_CONFIGS[difficulty];

  const [state, dispatch] = useReducer(
    memoryGameReducer,
    config.pairs,
    createInitialState,
  );
  const { cards, phase, stats, flippedIds } = state;

  // Se a dificuldade mudar com a tela montada, monta um tabuleiro novo
  useEffect(() => {
    if (stats.totalPairs !== config.pairs) {
      dispatch({ type: 'reset', pairs: config.pairs });
    }
  }, [config.pairs, stats.totalPairs]);

  // Duas cartas abertas → espera um pouco (tempo para a criança ver) e verifica.
  // O cleanup cancela o timer no reset e ao desmontar.
  useEffect(() => {
    if (phase !== 'checking') return;
    const timer = setTimeout(
      () => dispatch({ type: 'resolve', now: Date.now() }),
      CHECK_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const flipCard = useCallback((cardId: number) => {
    dispatch({ type: 'flip', cardId, now: Date.now() });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'reset', pairs: config.pairs });
  }, [config.pairs]);

  // ─── Valores derivados (computados, não armazenados) ──────────────────────
  const isCompleted = phase === 'completed';
  const elapsedSeconds = isCompleted && stats.startedAt && stats.completedAt
    ? Math.floor((stats.completedAt - stats.startedAt) / 1000)
    : 0;

  return {
    cards,
    phase,
    stats,
    config,
    flippedIds,
    isCompleted,
    elapsedSeconds,
    flipCard,
    resetGame,
  } as const;
}
