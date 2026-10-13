import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';
import { Colors } from '../theme';
import { HomeScreen } from '../../games/shared/screens/HomeScreen';
import { gameRegistry } from '../../modules/gameRegistry';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Navegador raiz do app.
 *
 * Por que NativeStack?
 * - Performance nativa (usa UINavigationController no iOS / Fragment no Android)
 * - Transições suaves sem JS thread
 * - Ideal para apps com foco em performance para crianças
 *
 * As telas de jogo são geradas a partir do gameRegistry — registrar um
 * jogo já cria a rota dele. Só a tipagem fica em RootStackParamList (types.ts).
 */
export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,        // cada tela gerencia seu próprio header
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      {gameRegistry.map(game => (
        <Stack.Screen key={game.id} name={game.route} component={game.screen} />
      ))}
    </Stack.Navigator>
  );
}
