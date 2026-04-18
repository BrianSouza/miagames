module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@core': './src/core',
          '@games': './src/games',
          '@modules': './src/modules',
          '@assets': './src/assets',
        },
      },
    ],
  ],
};
