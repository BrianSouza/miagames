import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, BorderRadius, FontSize } from '../../../core/theme';
import type { MemoryCard as MemoryCardType } from '../types';

interface Props {
  card: MemoryCardType;
  size: number;               // tamanho do lado da carta em px (calculado pelo Board)
  onPress: (id: number) => void;
  disabled: boolean;
}

/**
 * MemoryCard — representa uma carta individual no tabuleiro.
 *
 * Animação de flip 3D:
 * - Usamos dois Animated.Value para controlar a rotação de cada face.
 * - Quando a carta está 'hidden': mostra o verso (roxo).
 * - Quando 'flipped' ou 'matched': mostra a frente com o símbolo.
 *
 * Por que Animated.Value e não Reanimated?
 * - Reanimated seria mais performático, mas adiciona complexidade e dependência.
 * - Para um MVP com 10-20 cartas, Animated nativo é mais que suficiente.
 * - TODO: migrar para react-native-reanimated na v2 para animações 60fps garantidas.
 */
export function MemoryCard({ card, size, onPress, disabled }: Props) {
  const flipAnim = useRef(new Animated.Value(0)).current;

  const isVisible = card.state === 'flipped' || card.state === 'matched';

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isVisible ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isVisible, flipAnim]);

  // Interpolações de rotação para efeito 3D flip
  const frontRotateY = flipAnim.interpolate({
    inputRange:  [0, 0.5, 1],
    outputRange: ['180deg', '90deg', '0deg'],
  });

  const backRotateY = flipAnim.interpolate({
    inputRange:  [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });

  // Escala ao pressionar — feedback tátil visual
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  }

  const cardStyle = {
    width: size,
    height: size,
    margin: 4,
  };

  // Carta 'matched' fica com brilho verde para indicar sucesso
  const matchedOverlayOpacity = card.state === 'matched' ? 1 : 0;

  return (
    <Pressable
      onPress={() => !disabled && onPress(card.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || card.state !== 'hidden'}
      accessibilityLabel={`Carta ${isVisible ? card.symbol : 'escondida'}`}
      accessibilityRole="button"
    >
      <Animated.View style={[cardStyle, { transform: [{ scale: scaleAnim }] }]}>

        {/* ── VERSO (carta fechada) ───────────────────────── */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            cardStyle,
            { transform: [{ rotateY: backRotateY }] },
          ]}
        >
          <Text style={styles.cardBackEmoji}>🌟</Text>
        </Animated.View>

        {/* ── FRENTE (carta aberta com símbolo) ──────────── */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            cardStyle,
            { transform: [{ rotateY: frontRotateY }] },
          ]}
        >
          <Text style={[styles.symbol, { color: card.color, fontSize: size * 0.45 }]}>
            {card.symbol}
          </Text>

          {/* Overlay verde sutil quando pareada */}
          {card.state === 'matched' && (
            <View
              style={[
                styles.matchedOverlay,
                { opacity: matchedOverlayOpacity },
              ]}
            />
          )}
        </Animated.View>

      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardFace: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backfaceVisibility: 'hidden',   // essencial para o efeito flip 3D
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardBack: {
    backgroundColor: Colors.cardBack,
  },
  cardFront: {
    backgroundColor: Colors.cardFront,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cardBackEmoji: {
    fontSize: FontSize.lg,
  },
  symbol: {
    fontWeight: '900',
    textAlign: 'center',
  },
  matchedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    opacity: 0.15,
  },
});
