import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, FontSize, BorderRadius, TouchTargetSize } from '../../../core/theme';
import { speak } from '../../../core/audio';
import { gameRegistry } from '../../../modules/gameRegistry';
import type { GameModule, GameDifficultyOption, GameSkill } from '../../../modules/types';
import type { NavigationProp, GameDifficulty } from '../../../core/navigation';

/**
 * HomeScreen — tela inicial do app.
 *
 * Itera sobre gameRegistry para montar os cards de jogos automaticamente.
 * Adicionar um novo jogo ao registry = ele aparece aqui sem mudar este arquivo.
 *
 * DifficultyPicker é um modal simples de seleção — evita uma tela extra
 * e mantém o fluxo de interação rápido para crianças. Ele aparece para
 * qualquer jogo que declare difficultyOptions no seu GameModule.
 *
 * Os nomes são falados ao toque, para quem ainda não sabe ler.
 */
export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedGame, setSelectedGame] = useState<GameModule | null>(null);

  function handleGameSelect(game: GameModule) {
    speak(game.displayName);
    // Jogos sem configuração prévia navegam direto
    if (game.difficultyOptions?.length) {
      setSelectedGame(game);
    } else {
      navigation.navigate(game.route, {});
    }
  }

  function handleDifficultySelect(option: GameDifficultyOption) {
    if (!selectedGame) return;
    speak(option.label);
    setSelectedGame(null);
    navigation.navigate(selectedGame.route, { difficulty: option.id });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho do app */}
        <View style={styles.header}>
          <Text style={styles.appEmoji}>🎮</Text>
          <Text style={styles.appTitle}>MiaGames</Text>
          <Text style={styles.appSubtitle}>Escolha um jogo!</Text>
        </View>

        {/* Grid de jogos */}
        <View style={styles.gamesGrid}>
          {gameRegistry.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onPress={() => handleGameSelect(game)}
            />
          ))}
        </View>

        {/* Espaço para não cortar o último card */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Modal de seleção de dificuldade */}
      <DifficultyPicker
        visible={selectedGame !== null}
        gameName={selectedGame?.displayName ?? ''}
        options={selectedGame?.difficultyOptions ?? []}
        onSelect={handleDifficultySelect}
        onCancel={() => setSelectedGame(null)}
      />
    </SafeAreaView>
  );
}

// ─── GameCard ─────────────────────────────────────────────────────────────────

function GameCard({ game, onPress }: { game: GameModule; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gameCard,
        { borderColor: game.accentColor },
        pressed && styles.cardPressed,
      ]}
      accessibilityLabel={`${game.displayName}: ${game.description}`}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, { backgroundColor: game.accentColor }]}>
        <Text style={styles.gameIcon}>{game.icon}</Text>
      </View>

      <Text style={styles.gameName}>{game.displayName}</Text>
      <Text style={styles.gameDescription}>{game.description}</Text>

      <View style={styles.tagsRow}>
        {game.metadata.skills.slice(0, 2).map(skill => (
          <View key={skill} style={styles.skillTag}>
            <Text style={styles.skillTagText}>{SKILL_LABELS[skill]}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const SKILL_LABELS: Record<GameSkill, string> = {
  letters: '🔤 Letras',
  numbers: '🔢 Números',
  memory: '🧠 Memória',
  colors: '🎨 Cores',
  logic: '💡 Lógica',
  coordination: '🖐️ Coordenação',
  vocabulary: '📖 Vocabulário',
};

// ─── DifficultyPicker ─────────────────────────────────────────────────────────

interface DifficultyPickerProps {
  visible: boolean;
  gameName: string;
  options: GameDifficultyOption[];
  onSelect: (option: GameDifficultyOption) => void;
  onCancel: () => void;
}

function DifficultyPicker({ visible, gameName, options, onSelect, onCancel }: DifficultyPickerProps) {
  const difficultyColors: Record<GameDifficulty, string> = {
    easy:   Colors.success,
    medium: Colors.warning,
    hard:   Colors.error,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.difficultySheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>🎯 {gameName}</Text>
          <Text style={styles.sheetSubtitle}>Escolha a dificuldade:</Text>

          {options.map(option => (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.difficultyButton,
                { backgroundColor: difficultyColors[option.id] },
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Dificuldade ${option.label}: ${option.detail}`}
            >
              <Text style={styles.difficultyEmoji}>{option.emoji}</Text>
              <View style={styles.difficultyInfo}>
                <Text style={styles.difficultyName}>{option.label}</Text>
                <Text style={styles.difficultyDetails}>{option.detail}</Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cardPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  appEmoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  appTitle: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  gamesGrid: {
    gap: Spacing.md,
  },
  gameCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 3,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  gameIcon: {
    fontSize: 40,
  },
  gameName: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  gameDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: FontSize.sm * 1.4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  skillTagText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Modal de dificuldade
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  difficultySheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xxxl : Spacing.xl,
    gap: Spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    height: TouchTargetSize + 8,
    gap: Spacing.md,
  },
  difficultyEmoji: {
    fontSize: FontSize.lg,
  },
  difficultyInfo: {
    flex: 1,
  },
  // Texto escuro: branco sobre o verde/amarelo dos botões tinha contraste ~2:1
  difficultyName: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  difficultyDetails: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
  cancelButton: {
    height: TouchTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  cancelButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
