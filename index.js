/**
 * Ponto de entrada do React Native.
 * Este arquivo é carregado pelo Metro Bundler e não deve conter lógica de negócio.
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
