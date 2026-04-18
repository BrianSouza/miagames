/**
 * Embaralha um array usando o algoritmo Fisher-Yates (Knuth shuffle).
 * Garante distribuição uniforme — essencial para um jogo justo.
 * Retorna um NOVO array (imutável — seguro para uso com React state).
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Agrupa um array em chunks de tamanho N — útil para montar o grid de cartas */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
