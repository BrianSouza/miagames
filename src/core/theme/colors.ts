/**
 * Paleta de cores vibrantes e acessíveis para crianças de 3-6 anos.
 * Alto contraste para facilitar a leitura e reconhecimento visual.
 */
export const Colors = {
  // Primárias — usadas em botões, cabeçalhos e elementos de destaque
  primary: '#FF6B6B',       // vermelho-coral vibrante
  primaryDark: '#E05555',
  secondary: '#4ECDC4',     // turquesa
  secondaryDark: '#3AB5AC',
  accent: '#FFE66D',        // amarelo-limão

  // Backgrounds
  background: '#FFF9F0',    // off-white quente — menos cansativo para os olhos
  surface: '#FFFFFF',
  surfaceElevated: '#F5F0E8',

  // Feedback — cores universalmente reconhecidas
  success: '#6BCB77',       // verde
  error: '#FF6B6B',         // vermelho
  warning: '#FFD166',       // amarelo-âmbar

  // Cartas do jogo da memória
  cardBack: '#845EC2',      // roxo escuro — frente da carta virada
  cardBackGradientEnd: '#6A45A0',
  cardFront: '#FFFFFF',     // fundo branco quando virada para frente

  // Texto
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // Auxiliares
  border: '#DFE6E9',
  shadow: '#B2BEC3',
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',

  // Paleta de cores para as letras/números nas cartas
  letterColors: [
    '#FF6B6B', // vermelho
    '#4ECDC4', // turquesa
    '#FFE66D', // amarelo
    '#6BCB77', // verde
    '#845EC2', // roxo
    '#FF9F43', // laranja
    '#54A0FF', // azul
    '#FF6B9D', // rosa
  ],
} as const;

export type ColorKey = keyof typeof Colors;
