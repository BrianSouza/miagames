/**
 * MiaGames — App de jogos educativos para crianças de 3 a 6 anos.
 *
 * Arquitetura em camadas:
 *
 *   App.tsx              → providers globais (navegação, future: tema, analytics)
 *     └── RootNavigator  → define as rotas disponíveis
 *           ├── HomeScreen         → lista de jogos (consome gameRegistry)
 *           └── MemoryGameScreen   → jogo da memória
 *
 * Para adicionar um novo jogo:
 *   1. Crie src/games/<nome>/ com components/, hooks/, types/, screens/
 *   2. Exporte um GameModule de src/games/<nome>/index.ts
 *   3. Registre em src/modules/gameRegistry.ts
 *   4. Adicione a rota em src/core/navigation/types.ts + RootNavigator.tsx
 *   — Pronto. HomeScreen e o registry já funcionam automaticamente.
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/core/navigation';
import { Colors } from './src/core/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        backgroundColor={Colors.background}
        barStyle="dark-content"
        translucent={false}
      />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
