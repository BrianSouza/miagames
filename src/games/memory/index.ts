import type { GameModule } from '../../modules/types';
import type { Difficulty } from './types';
import { MemoryGameScreen } from './screens';
import { DIFFICULTY_CONFIGS } from './hooks';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/**
 * Definição do módulo Jogo da Memória.
 *
 * Este arquivo é o "manifesto" do jogo — tudo que o sistema precisa saber
 * sobre este jogo está aqui. Ele é importado pelo gameRegistry.ts e
 * nunca é importado diretamente pelas telas ou componentes.
 *
 * Analogia: como um package.json — descreve o módulo para o runtime.
 */
export const memoryGameModule: GameModule = {
  id: 'memory-game',
  displayName: 'Jogo da Memória',
  description: 'Encontre todos os pares de letras e números!',
  icon: '🧠',
  accentColor: '#845EC2',
  route: 'MemoryGame',
  screen: MemoryGameScreen,
  difficultyOptions: DIFFICULTIES.map(id => ({
    id,
    label: DIFFICULTY_CONFIGS[id].label,
    emoji: DIFFICULTY_CONFIGS[id].emoji,
    detail: `${DIFFICULTY_CONFIGS[id].pairs} pares de cartas`,
  })),
  metadata: {
    ageRange: [3, 6],
    skills: ['memory', 'letters', 'numbers'],
    difficulty: 'easy',
  },
};

// Re-exporta para uso direto se necessário
export { MemoryGameScreen } from './screens';
export { useMemoryGame, DIFFICULTY_CONFIGS } from './hooks';
export type { MemoryCard, Difficulty, GameStats } from './types';
