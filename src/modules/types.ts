import type { ComponentType } from 'react';
import type { RootStackParamList } from '../core/navigation/types';

/**
 * Contrato que todo módulo de jogo deve implementar.
 *
 * GameModule é o "plugin interface" do sistema.
 * Cada jogo novo apenas precisa exportar um objeto que siga este contrato
 * e registrá-lo em gameRegistry.ts — nenhum outro arquivo precisa ser tocado.
 *
 * Analogia: é como um USB — o conector é padronizado,
 * o que você pluga pode ser qualquer coisa.
 */
export interface GameModule {
  /** Identificador único do jogo (kebab-case) */
  id: string;

  /** Nome exibido na home screen */
  displayName: string;

  /** Descrição curta para o card na home */
  description: string;

  /** Emoji ou ícone representativo */
  icon: string;

  /** Cor de destaque usada no card da home */
  accentColor: string;

  /** Rota de navegação para este jogo (deve existir em RootStackParamList) */
  route: keyof RootStackParamList;

  /** Parâmetros padrão para navegar para o jogo */
  defaultParams?: RootStackParamList[keyof RootStackParamList];

  /** Componente de thumbnail/preview (opcional, para telas de seleção ricas) */
  ThumbnailComponent?: ComponentType;

  /**
   * Metadados educacionais — útil para filtrar jogos por faixa etária,
   * habilidade ou para o relatório de progresso dos pais.
   */
  metadata: {
    ageRange: [number, number];     // ex: [3, 6]
    skills: GameSkill[];
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export type GameSkill =
  | 'letters'
  | 'numbers'
  | 'colors'
  | 'memory'
  | 'logic'
  | 'coordination'
  | 'vocabulary';
