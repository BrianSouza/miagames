import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

import { Spacing } from '../../../core/theme';
import { MemoryCard } from './MemoryCard';
import type { MemoryCard as MemoryCardType, GamePhase, DifficultyConfig } from '../types';

interface Props {
  cards: MemoryCardType[];
  config: DifficultyConfig;
  phase: GamePhase;
  onCardPress: (id: number) => void;
}

/**
 * MemoryBoard — o tabuleiro do jogo.
 *
 * Responsabilidade única: organizar as cartas em um grid responsivo.
 * Calcula o tamanho ideal de cada carta baseado na largura da tela
 * e no número de colunas definido pela dificuldade.
 *
 * Separar Board de Card segue o Single Responsibility Principle:
 * - Board sabe onde colocar as cartas
 * - Card sabe como renderizar e animar uma carta individual
 */
export function MemoryBoard({ cards, config, phase, onCardPress }: Props) {
  const { width } = useWindowDimensions();

  // Calcula tamanho da carta para preencher a largura disponível
  const horizontalPadding = Spacing.md * 2;
  const cardMargin = 8;  // margem de cada lado (4px * 2)
  const availableWidth = width - horizontalPadding - cardMargin * config.columns;
  const cardSize = Math.floor(availableWidth / config.columns);

  const isDisabled = phase === 'checking' || phase === 'completed';

  return (
    <View style={styles.board}>
      {/* Grid de cartas — usamos flexWrap para montar automaticamente as linhas */}
      <View style={[styles.grid, { width: width - horizontalPadding }]}>
        {cards.map(card => (
          <MemoryCard
            key={card.id}
            card={card}
            size={cardSize}
            onPress={onCardPress}
            disabled={isDisabled}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
