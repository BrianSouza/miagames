# Plano de correções — MiaGames

Este plano vem da avaliação do projeto (nota inicial **5/10**). O código estava
bem organizado, mas o app **não executava**: o build e os testes falhavam e
não existia projeto nativo. Os problemas estão agrupados em 5 fases, da mais
bloqueante para a menos. Cada fase deixa o projeto num estado utilizável.

Legenda: ✅ feito neste PR · ⏭️ fica para depois

---

## Fase 1 — Fazer o app rodar (bloqueante)

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 1.1 | Pastas `android/` e `ios/` ausentes; `npm run android`/`ios` impossíveis | Migrar para **Expo SDK 50**, que usa exatamente o React Native 0.73.6 já fixado no projeto. O Expo gera o projeto nativo sob demanda (`expo run:*`/`prebuild`), e o Expo Go roda o app sem compilar nada | ✅ |
| 1.2 | `babel-plugin-module-resolver` usado no Babel e não instalado (o Metro e o Jest quebravam) | Remover os aliases `@core/*`, `@games/*`, que nunca foram usados (todos os imports são relativos), e trocar o preset por `babel-preset-expo` | ✅ |
| 1.3 | `@types/react-native` obsoleto (os tipos já vêm no RN ≥ 0.71) | Remover | ✅ |
| 1.4 | Versões nativas incompatíveis com o SDK | Fixar `react-native-screens` e `react-native-safe-area-context` nas versões do Expo 50 | ✅ |

**Critério de pronto:** `npx expo start` abre o app no Expo Go, no emulador Android ou no simulador iOS.

## Fase 2 — Testes, lint e CI

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 2.1 | `@testing-library/react-hooks` não instalado e descontinuado para React 18 | Usar `renderHook` do `@testing-library/react-native` | ✅ |
| 2.2 | Falta `@types/jest`; o `tsc` acusava dezenas de erros nos testes | Adicionar `@types/jest` | ✅ |
| 2.3 | Testes intermitentes (`cards[0]` e `cards[2]` podiam formar par) | Escolher as cartas pelo `pairId` | ✅ |
| 2.4 | Sem configuração do ESLint (`npm run lint` falhava) | Criar `.eslintrc.js` a partir de `@react-native/eslint-config` | ✅ |
| 2.5 | Sem CI | GitHub Actions rodando `type-check`, `lint` e `test` em todo PR | ✅ |
| 2.6 | Sem lockfile (builds não reproduzíveis) | Versionar o `package-lock.json` | ✅ |

**Critério de pronto:** `npm run type-check && npm run lint && npm test` passam localmente e no CI.

## Fase 3 — Corretude da lógica do jogo

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 3.1 | Efeitos colaterais (`setPhase`, `setStats`, `setTimeout`) dentro do `setFlippedIds(prev => …)`, que duplicam com `StrictMode` | Reescrever o hook com **`useReducer`** e um reducer puro. O timer de verificação vira um `useEffect` que reage à fase `checking` | ✅ |
| 3.2 | Uma 3ª carta virada antes de a tela atualizar ficava presa como `flipped` | O reducer ignora qualquer virada enquanto já houver 2 cartas abertas | ✅ |
| 3.3 | Cronômetro começava quando o tabuleiro aparecia | `startedAt` passa a ser definido no primeiro toque | ✅ |
| 3.4 | Mudar a dificuldade com a tela montada não recriava o tabuleiro | O jogo reinicia quando o número de pares muda | ✅ |
| 3.5 | Botão voltar do Android no modal de resultado reiniciava o jogo | `onRequestClose` passa a voltar ao início | ✅ |

## Fase 4 — Arquitetura

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 4.1 | `HomeScreen` tinha `if (game.route === 'MemoryGame')` fixo e importava código do jogo da memória | `GameModule` ganha `difficultyOptions` e `screen`. A Home e o Navigator passam a ser genéricos | ✅ |
| 4.2 | `RootNavigator` listava as telas dos jogos à mão | As telas de jogo são geradas a partir do `gameRegistry` | ✅ |
| 4.3 | `SafeAreaView` do `react-native` (só iOS) | Usar o do `react-native-safe-area-context` | ✅ |
| 4.4 | Cor fixa `#FFF9F0` no navigator | Usar `Colors.background` | ✅ |

Agora, para adicionar um jogo basta criar o módulo, registrá-lo no `gameRegistry`
e declarar os parâmetros da rota em `RootStackParamList`, que o TypeScript exige.

## Fase 5 — Usabilidade para crianças de 3 a 6 anos

| # | Problema | Solução | Status |
|---|----------|---------|--------|
| 5.1 | Nenhum som: a criança não sabe que letra ou número virou | `expo-speech` fala o símbolo de cada carta em pt-BR e comemora ao formar par e ao terminar | ✅ |
| 5.2 | Contraste baixo (amarelo e turquesa sobre branco) | Nova paleta para os símbolos com contraste ≥ 4.5:1 sobre branco (WCAG AA) | ✅ |
| 5.3 | O tabuleiro estourava a tela em tablets e no modo paisagem | Tamanho da carta calculado pela largura **e** pela altura disponíveis | ✅ |
| 5.4 | O flip 3D ficava achatado (sem `perspective`) | Adicionar `perspective` à transformação | ✅ |
| 5.5 | A criança saía do jogo sem querer pelo botão voltar | Para sair, é preciso **segurar** o botão. Um toque curto mostra a dica "Segure para sair" | ✅ |
| 5.6 | Interface muito baseada em texto | Narração por voz dos nomes dos jogos e das dificuldades | ✅ |
| 5.7 | Ícones e ilustrações próprios em vez de emoji | Precisa de assets de design | ⏭️ |
| 5.8 | Sons de efeito (virar, acerto) além da voz | Precisa de arquivos de áudio (`expo-av`) | ⏭️ |
| 5.9 | Bloqueio de controle parental para configurações e compras | Só faz sentido quando existirem essas telas | ⏭️ |

---

## Como rodar depois das correções

```bash
npm install
npx expo start          # abre o menu: a = Android, i = iOS, ou leia o QR code no Expo Go
npm test                # testes
npm run type-check      # TypeScript
npm run lint            # ESLint
```
