import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

/** Parâmetros que toda tela de jogo recebe (vindos do seletor de dificuldade) */
export type GameRouteParams = {
  difficulty?: GameDifficulty;
};

/**
 * Mapa centralizado de todas as rotas do app.
 * Adicionar novos jogos = adicionar uma entrada aqui + registrar em gameRegistry.
 * O TypeScript garante que os params de cada tela estejam corretos.
 */
export type RootStackParamList = {
  Home: undefined;
  MemoryGame: GameRouteParams;
  // Futuros jogos são adicionados aqui:
  // NumberPuzzle: GameRouteParams;
  // ColorMatch: GameRouteParams;
};

/** Rotas que pertencem a jogos (todas exceto a Home) */
export type GameRoute = Exclude<keyof RootStackParamList, 'Home'>;

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type ScreenRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;
