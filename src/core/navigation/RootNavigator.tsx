import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';
import { HomeScreen } from '../../games/shared/screens/HomeScreen';
import { MemoryGameScreen } from '../../games/memory/screens/MemoryGameScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Navegador raiz do app.
 *
 * Por que NativeStack?
 * - Performance nativa (usa UINavigationController no iOS / Fragment no Android)
 * - Transições suaves sem JS thread
 * - Ideal para apps com foco em performance para crianças
 *
 * Como adicionar um novo jogo:
 * 1. Crie a tela em src/games/<nome>/screens/<Nome>Screen.tsx
 * 2. Adicione a rota em RootStackParamList (types.ts)
 * 3. Adicione o <Stack.Screen> abaixo
 * 4. Registre o jogo em src/modules/gameRegistry.ts
 */
export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,        // cada tela gerencia seu próprio header
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFF9F0' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="MemoryGame" component={MemoryGameScreen} />
    </Stack.Navigator>
  );
}
