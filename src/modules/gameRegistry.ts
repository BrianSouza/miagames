import type { GameModule } from './types';

/**
 * Registro central de todos os jogos do app.
 *
 * Como adicionar um novo jogo:
 * 1. Crie o módulo em src/games/<nome>/
 * 2. Exporte um objeto GameModule de src/games/<nome>/index.ts
 * 3. Importe e adicione ao array abaixo — só isso!
 *
 * A HomeScreen, o sistema de navegação e qualquer
 * outra tela que consuma este registry serão atualizados automaticamente.
 *
 * Por que array e não objeto?
 * - Mantém a ordem de exibição controlada
 * - Facilita filtros e mapas (mais idiomático no React)
 * - Não há necessidade de lookup por chave na home (iteramos todos)
 */
import { memoryGameModule } from '../games/memory';

export const gameRegistry: GameModule[] = [
  memoryGameModule,
  // Adicione novos jogos aqui:
  // numberPuzzleModule,
  // colorMatchModule,
  // letterTracingModule,
];

/** Busca um módulo pelo id — útil para telas de detalhe */
export function findGameById(id: string): GameModule | undefined {
  return gameRegistry.find(game => game.id === id);
}

/** Filtra jogos por faixa etária */
export function getGamesForAge(age: number): GameModule[] {
  return gameRegistry.filter(
    game => age >= game.metadata.ageRange[0] && age <= game.metadata.ageRange[1],
  );
}
