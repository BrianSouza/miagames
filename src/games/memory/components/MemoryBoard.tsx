import React, { useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';

import { Spacing } from '../../../core/theme';
import { MemoryCard, CARD_MARGIN } from './MemoryCard';
import type { MemoryCard as MemoryCardType, GamePhase, DifficultyConfig } from '../types';

interface Props {
  cards: MemoryCardType[];
  config: DifficultyConfig;
  phase: GamePhase;
  onCardPress: (id: number) => void;
}

const BOARD_PADDING = Spacing.md;

/**
 * Lado da carta que faz o grid inteiro caber na área disponível.
 * Considera largura E altura — em tablets e no modo paisagem a altura
 * é o limite, e um cálculo só pela largura faria o tabuleiro estourar a tela.
 */
export function computeCardSize(
  width: number,
  height: number,
  columns: number,
  rows: number,
): number {
  const byWidth = (width - BOARD_PADDING * 2) / columns - CARD_MARGIN * 2;
  const byHeight = (height - BOARD_PADDING * 2) / rows - CARD_MARGIN * 2;
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
}

/**
 * MemoryBoard — o tabuleiro do jogo.
 *
 * Responsabilidade única: organizar as cartas em um grid responsivo.
 * Mede o espaço que sobrou na tela (onLayout) e calcula o tamanho ideal
 * de cada carta a partir do número de colunas e linhas da dificuldade.
 *
 * Separar Board de Card segue o Single Responsibility Principle:
 * - Board sabe onde colocar as cartas
 * - Card sabe como renderizar e animar uma carta individual
 */
export function MemoryBoard({ cards, config, phase, onCardPress }: Props) {
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  }

  const rows = Math.ceil(cards.length / config.columns);
  const cardSize = area ? computeCardSize(area.width, area.height, config.columns, rows) : 0;
  const gridWidth = (cardSize + CARD_MARGIN * 2) * config.columns;

  const isDisabled = phase === 'checking' || phase === 'completed';

  return (
    <View style={styles.board} onLayout={handleLayout} testID="memory-board">
      {/* Grid de cartas — usamos flexWrap para montar automaticamente as linhas */}
      {cardSize > 0 && (
        <View style={[styles.grid, { width: gridWidth }]}>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: BOARD_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
