/**
 * Sistema de espaçamento baseado em múltiplos de 4px.
 * Botões e áreas de toque são extra-grandes para dedos pequenos (min 44px — Apple HIG).
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

/** Tamanho mínimo de área tocável recomendado para crianças */
export const TouchTargetSize = 56;
