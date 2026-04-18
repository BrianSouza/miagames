import { Platform } from 'react-native';

/**
 * Tipografia otimizada para crianças:
 * - Fontes grandes e legíveis
 * - Peso bold para facilitar reconhecimento de letras
 * - Famílias de sistema (sem dependências externas)
 */
export const FontFamily = {
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif' }),
  bold: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-bold' }),
  rounded: Platform.select({ ios: 'SF Pro Rounded', android: 'sans-serif-medium' }),
} as const;

export const FontSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 36,
  xxl: 48,
  hero: 72,   // letras/números nas cartas
} as const;

export const LineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;
