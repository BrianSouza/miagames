import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

/**
 * Mapa centralizado de todas as rotas do app.
 * Adicionar novos jogos = adicionar uma entrada aqui + registrar em gameRegistry.
 * O TypeScript garante que os params de cada tela estejam corretos.
 */
export type RootStackParamList = {
  Home: undefined;
  MemoryGame: {
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  // Futuros jogos são adicionados aqui:
  // NumberPuzzle: { level?: number };
  // ColorMatch: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type ScreenRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;
