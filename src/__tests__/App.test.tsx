/**
 * Teste de fluxo: abre o app, escolhe o jogo e a dificuldade,
 * e verifica que o tabuleiro aparece e narra as cartas.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import App from '../../App';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(Speech.speak).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('abre o jogo da memória e fala a carta virada', async () => {
    render(<App />);

    fireEvent.press(await screen.findByLabelText(/^Jogo da Memória/));
    expect(Speech.speak).toHaveBeenLastCalledWith('Jogo da Memória', expect.anything());

    fireEvent.press(screen.getByLabelText(/^Dificuldade Fácil/));

    // O tabuleiro mede a área disponível antes de desenhar as cartas
    const board = await screen.findByText('0 / 6');
    expect(board).toBeTruthy();
    act(() => {
      fireEvent(screen.getByTestId('memory-board'), 'layout', {
        nativeEvent: { layout: { width: 360, height: 600 } },
      });
    });

    const cards = screen.getAllByLabelText('Carta escondida');
    expect(cards).toHaveLength(12);

    fireEvent.press(cards[0]);

    expect(screen.queryAllByLabelText('Carta escondida')).toHaveLength(11);
    expect(Speech.speak).toHaveBeenLastCalledWith(
      expect.stringMatching(/^[A-J0-9]$/),
      expect.objectContaining({ language: 'pt-BR' }),
    );
  });
});
