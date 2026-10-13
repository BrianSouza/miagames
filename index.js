/**
 * Ponto de entrada do app.
 * Este arquivo é carregado pelo Metro Bundler e não deve conter lógica de negócio.
 * registerRootComponent registra o App e funciona no Expo Go e em builds nativos.
 */
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
