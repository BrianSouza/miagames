import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Spacing, FontSize, BorderRadius, TouchTargetSize } from '../../../core/theme';
import type { GameStats } from '../types';

interface Props {
  visible: boolean;
  stats: GameStats;
  elapsedSeconds: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

/**
 * ResultModal — tela de celebração ao completar o jogo.
 *
 * Usa entrada animada (scale + fade) para criar um efeito de "pop"
 * satisfatório — feedback visual positivo é essencial para crianças.
 *
 * Acessibilidade: o Modal bloqueia interação com o fundo automaticamente
 * e o foco de acessibilidade é movido para ele.
 */
export function ResultModal({ visible, stats, elapsedSeconds, onPlayAgain, onGoHome }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Classificação baseada em movimentos (menos = melhor)
  const getRating = (): string => {
    const efficiency = stats.totalPairs / stats.moves;
    if (efficiency >= 0.8) return '⭐⭐⭐';
    if (efficiency >= 0.5) return '⭐⭐';
    return '⭐';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onPlayAgain}
    >
      {/* Overlay escurecido */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Card de resultado */}
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Emoji de celebração */}
          <Text style={styles.celebrationEmoji}>🎉</Text>

          <Text style={styles.title}>Parabéns!</Text>
          <Text style={styles.subtitle}>Você encontrou todos os pares!</Text>

          {/* Estrelas */}
          <Text style={styles.stars}>{getRating()}</Text>

          {/* Estatísticas */}
          <View style={styles.statsRow}>
            <StatItem emoji="🎯" label="Jogadas" value={String(stats.moves)} />
            <StatItem emoji="⏱️" label="Tempo" value={formatTime(elapsedSeconds)} />
            <StatItem emoji="✅" label="Pares" value={String(stats.totalPairs)} />
          </View>

          {/* Botões de ação */}
          <Pressable
            onPress={onPlayAgain}
            style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}
            accessibilityLabel="Jogar novamente"
          >
            <Text style={styles.primaryButtonText}>🔄 Jogar Novamente</Text>
          </Pressable>

          <Pressable
            onPress={onGoHome}
            style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
            accessibilityLabel="Ir para o início"
          >
            <Text style={styles.secondaryButtonText}>🏠 Início</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Sub-componente para cada estatística ────────────────────────────────────

function StatItem({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  celebrationEmoji: {
    fontSize: 72,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  stars: {
    fontSize: FontSize.xl,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: FontSize.lg,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  button: {
    width: '100%',
    height: TouchTargetSize + 4,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    color: Colors.textOnPrimary,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
