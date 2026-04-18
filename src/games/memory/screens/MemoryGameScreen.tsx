import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Colors } from '../../../core/theme';
import type { NavigationProp, ScreenRouteProp } from '../../../core/navigation';
import { useMemoryGame } from '../hooks';
import { MemoryBoard, GameHeader, ResultModal } from '../components';

type RouteProps = ScreenRouteProp<'MemoryGame'>;

/**
 * MemoryGameScreen — tela principal do jogo da memória.
 *
 * Responsabilidade: orquestrar os componentes e conectar o hook ao UI.
 * NÃO contém lógica de jogo — isso fica em useMemoryGame.
 * NÃO contém lógica de layout das cartas — isso fica em MemoryBoard.
 *
 * Esta separação torna fácil:
 * - Testar o hook sem renderizar nada
 * - Trocar o layout do board sem mexer na lógica
 * - Trocar o modal sem alterar o fluxo de navegação
 */
export function MemoryGameScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const difficulty = route.params?.difficulty ?? 'easy';

  const {
    cards,
    phase,
    stats,
    config,
    isCompleted,
    elapsedSeconds,
    flipCard,
    resetGame,
  } = useMemoryGame(difficulty);

  function handleBack() {
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <GameHeader
          stats={stats}
          config={config}
          onBack={handleBack}
          onReset={resetGame}
        />

        <MemoryBoard
          cards={cards}
          config={config}
          phase={phase}
          onCardPress={flipCard}
        />

        <ResultModal
          visible={isCompleted}
          stats={stats}
          elapsedSeconds={elapsedSeconds}
          onPlayAgain={resetGame}
          onGoHome={handleBack}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
