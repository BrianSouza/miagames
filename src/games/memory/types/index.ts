/**
 * Tipos do Jogo da Memória.
 * Mantidos isolados em /types para que hooks e componentes
 * possam importá-los sem criar dependências circulares.
 */

export type CardSymbol = string; // letra 'A'-'Z' ou número '1'-'9'

export type CardState = 'hidden' | 'flipped' | 'matched';

export interface MemoryCard {
  /** ID único da carta no board (posição) */
  id: number;

  /** O símbolo visível quando a carta está virada */
  symbol: CardSymbol;

  /**
   * Identificador do par — duas cartas com o mesmo pairId formam um par.
   * Separar id de pairId permite embaralhar mantendo os pares rastreáveis.
   */
  pairId: number;

  /** Estado atual da carta */
  state: CardState;

  /** Cor do símbolo — atribuída na criação para consistência visual */
  color: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  /** Total de PARES de cartas */
  pairs: number;
  /** Número de colunas no grid */
  columns: number;
  label: string;
  emoji: string;
}

export interface GameStats {
  moves: number;
  matchesFound: number;
  totalPairs: number;
  startedAt: number;         // timestamp
  completedAt?: number;      // timestamp — undefined se não concluído
}

export type GamePhase = 'idle' | 'playing' | 'checking' | 'completed';
