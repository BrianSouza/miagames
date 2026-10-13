module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // O projeto alinha colunas manualmente em tabelas de configuração;
    // a formatação não é validada pelo lint.
    'prettier/prettier': 'off',
    // Permite o idioma do projeto: `if (cond) return;` em uma linha
    curly: ['error', 'multi-line'],
  },
};
