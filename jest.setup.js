/* global jest */
// expo-speech depende de módulo nativo — nos testes, só registramos as chamadas.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));
