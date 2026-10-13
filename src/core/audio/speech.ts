import * as Speech from 'expo-speech';

/**
 * Narração por voz (text-to-speech do próprio aparelho).
 *
 * Crianças de 3 a 6 anos ainda não leem: falar a letra, o número ou a
 * opção tocada é o que torna o jogo educativo e navegável sem texto.
 * Cada fala interrompe a anterior para a voz acompanhar o toque.
 */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'pt-BR', rate: 0.9, pitch: 1.1 });
}

export function stopSpeaking() {
  Speech.stop();
}
