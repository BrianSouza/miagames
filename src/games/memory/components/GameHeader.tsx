import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Colors, Spacing, FontSize, BorderRadius, TouchTargetSize } from '../../../core/theme';
import type { GameStats, DifficultyConfig } from '../types';

interface Props {
  stats: GameStats;
  config: DifficultyConfig;
  onBack: () => void;
  onReset: () => void;
}

/**
 * GameHeader — barra superior do jogo.
 * Exibe progresso (pares encontrados) e botões de ação.
 * Botões grandes para dedos pequenos (>= TouchTargetSize = 56px).
 */
export function GameHeader({ stats, config, onBack, onReset }: Props) {
  const progress = `${stats.matchesFound} / ${stats.totalPairs}`;

  return (
    <View style={styles.container}>
      {/* Botão Voltar */}
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityLabel="Voltar para a tela inicial"
      >
        <Text style={styles.iconButtonText}>←</Text>
      </Pressable>

      {/* Indicador de progresso central */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Pares</Text>
        <Text style={styles.progressValue}>{progress}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{config.emoji} {config.label}</Text>
        </View>
      </View>

      {/* Botão Reiniciar */}
      <Pressable
        onPress={onReset}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityLabel="Reiniciar jogo"
      >
        <Text style={styles.iconButtonText}>↺</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconButton: {
    width: TouchTargetSize,
    height: TouchTargetSize,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: FontSize.lg,
    color: Colors.textOnPrimary,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  difficultyBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  difficultyText: {
    fontSize: FontSize.xs,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
});
