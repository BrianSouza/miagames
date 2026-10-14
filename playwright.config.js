// Testes de navegador dos mini-jogos (assets/games/*). Rodam o HTML real em
// um Chromium, com a ponte do Flutter simulada — ver test/e2e/fixtures.js.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sem retries: um teste instável deve ser consertado, não repetido até passar
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: 'test-results',
});
