# 🎮 MiaGames

App mobile de jogos educativos para crianças de 3 a 6 anos, construído com React Native + TypeScript sobre o **Expo SDK 50**.

> Histórico de correções e próximos passos: [`docs/PLANO-DE-CORRECOES.md`](docs/PLANO-DE-CORRECOES.md).

---

## 📁 Estrutura de Pastas

```
MiaGames/
├── src/
│   ├── core/                        ← Infraestrutura transversal
│   │   ├── audio/
│   │   │   └── speech.ts            ← Narração por voz (expo-speech, pt-BR)
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx    ← Home + uma rota por jogo do registry
│   │   │   ├── types.ts             ← RootStackParamList (tipagem de rotas)
│   │   │   └── index.ts
│   │   ├── theme/
│   │   │   ├── colors.ts            ← Paleta de cores vibrantes para crianças
│   │   │   ├── spacing.ts           ← Espaçamento e border-radius
│   │   │   ├── typography.ts        ← Fontes e tamanhos
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── array.ts             ← shuffleArray (Fisher-Yates), chunkArray
│   │       └── index.ts
│   │
│   ├── modules/                     ← Sistema de registro de jogos (plugin system)
│   │   ├── types.ts                 ← Interface GameModule (contrato de um jogo)
│   │   ├── gameRegistry.ts          ← Array com todos os jogos registrados
│   │   └── index.ts
│   │
│   └── games/
│       ├── shared/
│       │   └── screens/
│       │       └── HomeScreen.tsx   ← Tela inicial (consume gameRegistry)
│       │
│       └── memory/                  ← Módulo isolado do Jogo da Memória
│           ├── index.ts             ← "Manifesto" do módulo (GameModule)
│           ├── types/
│           │   └── index.ts         ← MemoryCard, Difficulty, GameStats, etc.
│           ├── hooks/
│           │   └── useMemoryGame.ts ← Reducer puro com as regras + hook
│           ├── components/
│           │   ├── MemoryCard.tsx   ← Carta individual com animação de flip 3D
│           │   ├── MemoryBoard.tsx  ← Grid responsivo de cartas
│           │   ├── GameHeader.tsx   ← Barra com progresso e botões
│           │   └── ResultModal.tsx  ← Modal de celebração ao completar
│           └── screens/
│               └── MemoryGameScreen.tsx ← Orquestra hook + componentes
│
├── App.tsx                          ← Providers globais + NavigationContainer
└── index.js                        ← Ponto de entrada (AppRegistry)
```

---

## 🏛️ Decisões Arquiteturais

### 1. Módulos de Jogo (Plugin System)

Cada jogo é um módulo completamente isolado que segue a interface `GameModule`:

```typescript
interface GameModule {
  id: string;
  displayName: string;
  icon: string;
  accentColor: string;
  route: GameRoute;                         // chave em RootStackParamList
  screen: ComponentType;                    // registrada no navigator automaticamente
  difficultyOptions?: GameDifficultyOption[]; // se houver, a Home mostra o seletor
  metadata: { ageRange, skills, difficulty };
}
```

Para **adicionar um novo jogo**, você só precisa:
1. Criar `src/games/<nome>/` com a estrutura padrão
2. Exportar um `GameModule` de `src/games/<nome>/index.ts`
3. Importar e adicionar ao array em `src/modules/gameRegistry.ts`
4. Declarar a rota em `RootStackParamList` (`src/core/navigation/types.ts`) — o TypeScript avisa se faltar

A `HomeScreen`, o seletor de dificuldade e o `RootNavigator` se adaptam automaticamente.

### 2. Separação de Responsabilidades

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Lógica | `useMemoryGame.ts` | Reducer puro (regras) + hook (timer de verificação) |
| Layout | `MemoryBoard.tsx` | Grid e tamanho de cartas |
| Apresentação | `MemoryCard.tsx` | Animação e aparência da carta |
| Orquestração | `MemoryGameScreen.tsx` | Conecta hook + componentes |
| Configuração | `memory/index.ts` | Manifesto do módulo |

### 3. State Management

- **Local com hook**: O estado do jogo é local à tela (`useMemoryGame`). Não há necessidade de estado global para uma partida.
- **Sem Redux/Zustand no MVP**: Adicionamos Zustand apenas quando o progresso precisar persistir entre sessões (ver roadmap).
- **Reducer puro**: as regras ficam em `memoryGameReducer`, sem timers nem efeitos colaterais — seguro com `StrictMode` e testável sem renderizar nada. O atraso de 800ms é um `useEffect` que reage à fase `checking`.

### 4. Performance

- `useNativeDriver: true` em todas as animações → animações rodam na thread nativa
- `backfaceVisibility: 'hidden'` → evita renderização da face invisível durante o flip
- `Pressable` com `hitSlop` → área de toque maior sem aumentar o visual
- `useCallback` no `flipCard` → evita re-criação desnecessária
- Tamanho das cartas calculado pela largura **e** altura disponíveis → o tabuleiro cabe na tela em celular, tablet e paisagem

---

## 🎮 Jogo da Memória

### Fluxo de Estados

```
idle
 └── (flipCard — inicia o cronômetro) → playing
                    └── (flipCard 2ª carta) → checking (800ms)
                                                ├── (match)    → playing | completed
                                                └── (no match) → playing
```

### Dificuldades

| Nível   | Pares | Colunas |
|---------|-------|---------|
| Fácil   | 6     | 3       |
| Médio   | 8     | 4       |
| Difícil | 10    | 4       |

### Algoritmo de Embaralhamento

Fisher-Yates (Knuth Shuffle) — O(n), distribuição uniforme garantida.

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento — leia o QR code com o app Expo Go no celular
npm start

# Abrir direto no emulador Android / simulador iOS (requer Android Studio / Xcode)
npm run android
npm run ios

# Gerar o projeto nativo (android/ e ios/) para builds de loja
npx expo prebuild

# Qualidade (os mesmos comandos rodam no CI a cada PR)
npm test
npm run type-check
npm run lint
```

---

## 📈 Roadmap de Melhorias

### v1.1 — Sons e Animações
- ✅ Narração por voz das cartas, dos jogos e das dificuldades (`expo-speech`)
- `expo-av` para efeitos de acerto/erro/vitória
- Confetes com `react-native-confetti-cannon` na tela de resultado
- Animação de "shake" nas cartas erradas (feedback negativo suave)

### v1.2 — Persistência de Progresso
```typescript
// Zustand + AsyncStorage
interface ProgressStore {
  highScores: Record<string, Record<Difficulty, number>>;
  gamesPlayed: number;
  setHighScore: (gameId: string, difficulty: Difficulty, moves: number) => void;
}
// persist middleware do Zustand + AsyncStorage como storage adapter
```

### v1.3 — Mais Jogos (cada um como módulo independente)
- **Caça ao Número**: Encontrar o número que o narrador fala
- **Combine Cores**: Arrastar objetos para a cor correta
- **Traçado de Letras**: Desenhar letras com o dedo (canvas)

### v1.4 — Perfil da Criança
- Múltiplos perfis por dispositivo
- Dashboard para os pais com relatório de progresso
- Restrição de conteúdo por faixa etária automática

### v2.0 — Micro Frontends (escala para web/TV)
Cada jogo vira um pacote npm independente carregado dinamicamente:
```
@miagames/memory-game
@miagames/number-puzzle
@miagames/color-match
```
O app shell registra módulos em runtime com Re.Pack (React Native) ou
Module Federation (web).

---

## ♿ Acessibilidade

- Todos os elementos interativos têm `accessibilityLabel`
- `accessibilityRole="button"` nos elementos pressionáveis
- Área de toque mínima de 56px (acima dos 44pt do Apple HIG)
- Símbolos das cartas com contraste ≥ 4.5:1 sobre o branco (WCAG AA)
- Narração por voz para quem ainda não lê
- Sair do jogo exige segurar o botão voltar (evita saídas acidentais)
- Compatível com VoiceOver (iOS) e TalkBack (Android)
