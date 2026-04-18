import { useState, useCallback, useEffect, useRef } from 'react';

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

// Símbolos disponíveis para as cartas (letras + números, visualmente distintos)
const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                 '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// ─── Funções auxiliares puras (sem efeitos colaterais) ─────────────────────

function createCards(pairs: number): MemoryCard[] {
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
    startedAt: Date.now(),
  };
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * useMemoryGame — toda a lógica do jogo da memória em um único hook.
 *
 * Por que um hook customizado e não um Context/Zustand?
 * - O estado do jogo é LOCAL a uma partida. Não precisa ser global.
 * - Hooks são mais simples de testar e compor.
 * - Se amanhã precisarmos de estado global (salvar progresso), basta
 *   extrair a lógica para um store sem mudar a interface do hook.
 *
 * Fluxo do jogo:
 *   idle → (startGame) → playing → (flipCard) → checking → playing
 *                                                         → completed
 */
export function useMemoryGame(difficulty: Difficulty = 'easy') {
  const config = DIFFICULTY_CONFIGS[difficulty];

  const [cards, setCards] = useState<MemoryCard[]>(() => createCards(config.pairs));
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [stats, setStats] = useState<GameStats>(() => makeInitialStats(config.pairs));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);

  // Ref para o timer de "esconder cartas não pareadas"
  // Usamos ref (não state) para evitar re-renders desnecessários
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa timer ao desmontar (evita memory leak e setState em componente desmontado)
  useEffect(() => {
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, []);

  // ─── Reiniciar jogo ────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    setCards(createCards(config.pairs));
    setPhase('idle');
    setStats(makeInitialStats(config.pairs));
    setFlippedIds([]);
  }, [config.pairs]);

  // ─── Virar uma carta ───────────────────────────────────────────────────────
  const flipCard = useCallback((cardId: number) => {
    // Bloqueia interação durante verificação ou jogo concluído
    if (phase === 'checking' || phase === 'completed') return;

    setCards(prev => {
      const card = prev.find(c => c.id === cardId);
      // Ignora clique em carta já virada ou já pareada
      if (!card || card.state !== 'hidden') return prev;
      return prev.map(c => c.id === cardId ? { ...c, state: 'flipped' } : c);
    });

    setFlippedIds(prev => {
      const next = [...prev, cardId];

      // Primeira carta — só registra e aguarda a segunda
      if (next.length === 1) {
        setPhase('playing');
        return next;
      }

      // Segunda carta — hora de verificar o par
      if (next.length === 2) {
        setPhase('checking');
        setStats(s => ({ ...s, moves: s.moves + 1 }));

        // Programar verificação após 800ms (tempo para criança ver as duas cartas)
        checkTimerRef.current = setTimeout(() => {
          setCards(current => {
            const [firstId, secondId] = next;
            const first  = current.find(c => c.id === firstId)!;
            const second = current.find(c => c.id === secondId)!;

            const isMatch = first.pairId === second.pairId;

            if (isMatch) {
              // Marca ambas como 'matched' — ficam visíveis para sempre
              const updated = current.map(c =>
                c.id === firstId || c.id === secondId
                  ? { ...c, state: 'matched' as const }
                  : c,
              );

              // Verifica se completou o jogo
              const matchesFound = updated.filter(c => c.state === 'matched').length / 2;
              setStats(s => ({
                ...s,
                matchesFound,
                completedAt: matchesFound === config.pairs ? Date.now() : undefined,
              }));

              if (matchesFound === config.pairs) {
                setPhase('completed');
              } else {
                setPhase('playing');
              }

              return updated;
            } else {
              // Não é par — esconde as duas cartas
              setPhase('playing');
              return current.map(c =>
                c.id === firstId || c.id === secondId
                  ? { ...c, state: 'hidden' as const }
                  : c,
              );
            }
          });

          setFlippedIds([]);
        }, 800);

        return next;
      }

      return prev;
    });
  }, [phase, config.pairs]);

  // ─── Valores derivados (computados, não armazenados) ──────────────────────
  const isCompleted = phase === 'completed';
  const elapsedSeconds = isCompleted && stats.completedAt
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
