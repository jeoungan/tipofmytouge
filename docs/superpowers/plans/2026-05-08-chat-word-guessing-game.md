# Chat Word Guessing Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable single-player mobile chat web game for "아, 그거 뭐라 그러더라".

**Architecture:** A Vite React frontend renders the KakaoTalk-like mobile chat UI. An Express TypeScript server owns game sessions, word selection, answer checking, OpenAI Responses API calls, and mode rules. Shared TypeScript types keep the client/server contract explicit.

**Tech Stack:** TypeScript, React, Vite, Express, OpenAI Node SDK, Vitest, Testing Library, Supertest, CSS.

---

## File Structure

- `package.json`: npm scripts and dependencies for client, server, tests, and dev server.
- `tsconfig.json`: TypeScript settings for browser, server, and tests.
- `vite.config.ts`: Vite app config, React plugin, test config, and API proxy.
- `index.html`: Vite HTML entry.
- `src/shared/types.ts`: shared modes, messages, session responses, word shape, and result types.
- `src/server/data/words.json`: seed word data for all four modes.
- `src/server/modes.ts`: mode configuration and limits.
- `src/server/words.ts`: word loading and mode-filtered random selection.
- `src/server/answerChecker.ts`: deterministic answer normalization, alias matching, and forbidden-word leak detection.
- `src/server/prompt.ts`: OpenAI prompt construction for clue generation and ambiguous answer judging.
- `src/server/aiClient.ts`: OpenAI-backed AI adapter plus deterministic local fallback for missing API key.
- `src/server/sessionStore.ts`: in-memory session store.
- `src/server/gameEngine.ts`: start session, process messages, reveal, advance, and Challenge records.
- `src/server/routes.ts`: Express API routes.
- `src/server/index.ts`: server entrypoint.
- `src/server/__tests__/*.test.ts`: server unit and API tests.
- `src/client/main.tsx`: React entrypoint.
- `src/client/App.tsx`: game screen state machine.
- `src/client/api.ts`: typed fetch wrapper.
- `src/client/components/*.tsx`: mode picker, chat screen, message bubbles, records panel.
- `src/client/styles.css`: mobile-first chat styling.
- `src/client/__tests__/App.test.tsx`: smoke tests for mode selection and chat rendering.
- `.env.example`: required server environment variables.
- `README.md`: local run instructions.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Write the project manifest**

Create `package.json`:

```json
{
  "name": "what-was-that-called",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "server": "tsx watch src/server/index.ts",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "tsc --noEmit && vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.0.0",
    "express": "^5.0.0",
    "openai": "^6.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vite": "^7.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/supertest": "^6.0.0",
    "jsdom": "^27.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.9.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Write TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Write Vite config**

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787"
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/client/testSetup.ts"]
  }
});
```

- [ ] **Step 4: Write HTML, gitignore, env example, and README**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>아, 그거 뭐라 그러더라</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

Create `.gitignore`:

```gitignore
node_modules
dist
.env
.DS_Store
coverage
```

Create `.env.example`:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
PORT=8787
```

Create `README.md`:

```markdown
# 아, 그거 뭐라 그러더라

Single-player chat guessing game where an OpenAI host gives vague, playful Korean clues.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`
3. Add `OPENAI_API_KEY` for live AI responses, or leave it empty to use deterministic fallback responses.
4. Start the API server: `npm run server`
5. Start the web app in another terminal: `npm run dev`
6. Open `http://127.0.0.1:5173`

## Verification

- `npm run check`
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: `node_modules` is created and npm exits with code 0.

- [ ] **Step 6: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore .env.example README.md
git commit -m "chore: scaffold chat game app"
```

Expected: commit succeeds.

---

### Task 2: Shared Types, Modes, and Word Data

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/server/modes.ts`
- Create: `src/server/data/words.json`
- Create: `src/server/words.ts`
- Create: `src/server/__tests__/modes-and-words.test.ts`

- [ ] **Step 1: Write failing mode and word tests**

Create `src/server/__tests__/modes-and-words.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { modeConfigs } from "../modes";
import { getWordsByMode, pickWord } from "../words";

describe("modeConfigs", () => {
  it("sets limited modes to five AI responses after the initial clue", () => {
    expect(modeConfigs.normal.maxAiResponsesAfterInitial).toBe(5);
    expect(modeConfigs.hard.maxAiResponsesAfterInitial).toBe(5);
  });

  it("sets easy and challenge to unlimited AI responses", () => {
    expect(modeConfigs.easy.maxAiResponsesAfterInitial).toBeNull();
    expect(modeConfigs.challenge.maxAiResponsesAfterInitial).toBeNull();
  });
});

describe("word data", () => {
  it("has at least one word for every mode", () => {
    expect(getWordsByMode("easy").length).toBeGreaterThan(0);
    expect(getWordsByMode("normal").length).toBeGreaterThan(0);
    expect(getWordsByMode("hard").length).toBeGreaterThan(0);
    expect(getWordsByMode("challenge").length).toBeGreaterThan(0);
  });

  it("picks a word from the requested mode", () => {
    const word = pickWord("hard", () => 0);
    expect(word.mode).toBe("hard");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/server/__tests__/modes-and-words.test.ts`

Expected: FAIL because `../modes` and `../words` do not exist.

- [ ] **Step 3: Write shared types**

Create `src/shared/types.ts`:

```ts
export type GameMode = "easy" | "normal" | "hard" | "challenge";

export type Sender = "ai" | "player" | "system";

export type StageStatus = "playing" | "won" | "failed";

export type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
};

export type WordEntry = {
  answer: string;
  aliases: string[];
  mode: GameMode;
  category: string;
  facts: string[];
  forbiddenWords: string[];
};

export type ChallengeRecord = {
  answer: string;
  attempts: number;
};

export type StageState = {
  status: StageStatus;
  remainingResponses: number | null;
  attempts: number;
};

export type StageResult =
  | { type: "correct"; answer: string; attempts: number }
  | { type: "failed"; answer: string }
  | null;

export type SessionResponse = {
  sessionId: string;
  mode: GameMode;
  messages: ChatMessage[];
  stage: StageState;
  result: StageResult;
  challengeRecords: ChallengeRecord[];
};
```

- [ ] **Step 4: Write mode config**

Create `src/server/modes.ts`:

```ts
import type { GameMode } from "../shared/types";

export type ModeConfig = {
  mode: GameMode;
  label: string;
  maxAiResponsesAfterInitial: number | null;
  style: string;
};

export const modeConfigs: Record<GameMode, ModeConfig> = {
  easy: {
    mode: "easy",
    label: "Easy",
    maxAiResponsesAfterInitial: null,
    style: "웃기고 너그럽고 일부러 이상하게 설명한다."
  },
  normal: {
    mode: "normal",
    label: "Normal",
    maxAiResponsesAfterInitial: 5,
    style: "장난스럽지만 플레이어가 맞힐 수 있을 정도로 단서를 준다."
  },
  hard: {
    mode: "hard",
    label: "Hard",
    maxAiResponsesAfterInitial: 5,
    style: "더 횡설수설하고 간접적으로 말한다."
  },
  challenge: {
    mode: "challenge",
    label: "Challenge",
    maxAiResponsesAfterInitial: null,
    style: "어려운 지식을 바탕으로 하되 시간이 지나면 공정한 단서를 준다."
  }
};

export function parseMode(value: unknown): GameMode | null {
  return value === "easy" || value === "normal" || value === "hard" || value === "challenge"
    ? value
    : null;
}
```

- [ ] **Step 5: Write seed word data**

Create `src/server/data/words.json`:

```json
[
  {
    "answer": "우산",
    "aliases": ["양산"],
    "mode": "easy",
    "category": "daily_item",
    "facts": ["비 올 때 자주 쓴다", "손잡이가 있다", "접을 수 있는 것도 많다", "머리 위에 펼친다"],
    "forbiddenWords": ["우산", "양산", "비 막는 것"]
  },
  {
    "answer": "의자",
    "aliases": ["체어", "좌석"],
    "mode": "normal",
    "category": "household_item",
    "facts": ["집이나 실내에 흔히 있다", "나무나 철로 만들 수 있다", "대체로 튼튼하다", "사람 한 명이 몸을 맡기는 물건이다"],
    "forbiddenWords": ["의자", "체어", "좌석", "앉는 물건"]
  },
  {
    "answer": "르네상스",
    "aliases": ["문예부흥"],
    "mode": "hard",
    "category": "history",
    "facts": ["유럽 문화사에서 중요한 전환기다", "고대의 가치가 다시 주목받았다", "예술과 학문이 크게 성장했다", "이탈리아 도시들과 관련이 깊다"],
    "forbiddenWords": ["르네상스", "문예부흥", "재탄생"]
  },
  {
    "answer": "괴델의 불완전성 정리",
    "aliases": ["불완전성 정리", "괴델 불완전성 정리"],
    "mode": "challenge",
    "category": "logic",
    "facts": ["수리논리학의 유명한 결과다", "충분히 강한 형식 체계의 한계를 다룬다", "참이지만 증명할 수 없는 명제와 관련된다", "힐베르트 프로그램에 큰 타격을 줬다"],
    "forbiddenWords": ["괴델", "불완전성", "정리", "수리논리"]
  }
]
```

- [ ] **Step 6: Write word loader**

Create `src/server/words.ts`:

```ts
import type { GameMode, WordEntry } from "../shared/types";
import words from "./data/words.json";

const allWords = words as WordEntry[];

export function getWordsByMode(mode: GameMode): WordEntry[] {
  return allWords.filter((word) => word.mode === mode);
}

export function pickWord(mode: GameMode, random: () => number = Math.random): WordEntry {
  const candidates = getWordsByMode(mode);
  if (candidates.length === 0) {
    throw new Error(`No words configured for mode: ${mode}`);
  }
  const index = Math.floor(random() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test -- src/server/__tests__/modes-and-words.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit shared model**

Run:

```bash
git add src/shared/types.ts src/server/modes.ts src/server/data/words.json src/server/words.ts src/server/__tests__/modes-and-words.test.ts
git commit -m "feat: add game modes and word data"
```

Expected: commit succeeds.

---

### Task 3: Answer Checking and Leak Detection

**Files:**
- Create: `src/server/answerChecker.ts`
- Create: `src/server/__tests__/answerChecker.test.ts`

- [ ] **Step 1: Write failing answer checker tests**

Create `src/server/__tests__/answerChecker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkDeterministicAnswer, containsForbiddenWord, normalizeGuess } from "../answerChecker";
import type { WordEntry } from "../../shared/types";

const chair: WordEntry = {
  answer: "의자",
  aliases: ["체어", "좌석"],
  mode: "normal",
  category: "household_item",
  facts: [],
  forbiddenWords: ["의자", "체어", "좌석", "앉는 물건"]
};

describe("normalizeGuess", () => {
  it("removes punctuation, spaces, and common Korean particles", () => {
    expect(normalizeGuess("  의자요!! ")).toBe("의자");
    expect(normalizeGuess("좌석인가?")).toBe("좌석");
  });
});

describe("checkDeterministicAnswer", () => {
  it("accepts canonical answer and aliases", () => {
    expect(checkDeterministicAnswer("의자", chair).isCorrect).toBe(true);
    expect(checkDeterministicAnswer("체어", chair).isCorrect).toBe(true);
  });

  it("rejects unrelated guesses", () => {
    expect(checkDeterministicAnswer("책상", chair).isCorrect).toBe(false);
  });
});

describe("containsForbiddenWord", () => {
  it("detects direct answer leaks", () => {
    expect(containsForbiddenWord("그거 의자 비슷한 거야", chair.forbiddenWords)).toBe(true);
  });

  it("allows safe vague clues", () => {
    expect(containsForbiddenWord("집에 보통 있고 튼튼한 편이야", chair.forbiddenWords)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/server/__tests__/answerChecker.test.ts`

Expected: FAIL because `answerChecker.ts` does not exist.

- [ ] **Step 3: Implement answer checking**

Create `src/server/answerChecker.ts`:

```ts
import type { WordEntry } from "../shared/types";

const trailingParticles = /(이야|야|입니다|임|이에요|예요|요|인가|일까|같아|같은데|아닌가)$/u;

export type AnswerCheck = {
  isCorrect: boolean;
  method: "canonical" | "alias" | "none";
};

export function normalizeGuess(value: string): string {
  return value
    .trim()
    .replace(/[!?.,~…\s]/gu, "")
    .replace(trailingParticles, "")
    .toLocaleLowerCase("ko-KR");
}

export function checkDeterministicAnswer(guess: string, word: WordEntry): AnswerCheck {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(word.answer);
  if (normalizedGuess === normalizedAnswer) {
    return { isCorrect: true, method: "canonical" };
  }

  const matchedAlias = word.aliases.some((alias) => normalizeGuess(alias) === normalizedGuess);
  if (matchedAlias) {
    return { isCorrect: true, method: "alias" };
  }

  return { isCorrect: false, method: "none" };
}

export function containsForbiddenWord(text: string, forbiddenWords: string[]): boolean {
  const normalizedText = normalizeGuess(text);
  return forbiddenWords.some((word) => {
    const normalizedWord = normalizeGuess(word);
    return normalizedWord.length > 0 && normalizedText.includes(normalizedWord);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/server/__tests__/answerChecker.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit answer checker**

Run:

```bash
git add src/server/answerChecker.ts src/server/__tests__/answerChecker.test.ts
git commit -m "feat: add answer checking"
```

Expected: commit succeeds.

---

### Task 4: Prompt Builder and AI Adapter

**Files:**
- Create: `src/server/prompt.ts`
- Create: `src/server/aiClient.ts`
- Create: `src/server/__tests__/prompt.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Create `src/server/__tests__/prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCluePrompt, buildJudgePrompt } from "../prompt";
import type { ChatMessage, WordEntry } from "../../shared/types";

const word: WordEntry = {
  answer: "의자",
  aliases: ["체어"],
  mode: "normal",
  category: "household_item",
  facts: ["집에 흔히 있다", "대체로 튼튼하다"],
  forbiddenWords: ["의자", "체어"]
};

const history: ChatMessage[] = [
  { id: "1", sender: "ai", text: "야 그거 있잖아." },
  { id: "2", sender: "player", text: "뭔데?" }
];

describe("buildCluePrompt", () => {
  it("includes mode, facts, forbidden words, and playful Korean style", () => {
    const prompt = buildCluePrompt({
      mode: "normal",
      word,
      history,
      remainingResponses: 4,
      isInitial: false
    });

    expect(prompt).toContain("normal");
    expect(prompt).toContain("집에 흔히 있다");
    expect(prompt).toContain("의자");
    expect(prompt).toContain("장난끼 넘치는 친구");
    expect(prompt).toContain("정답을 직접 말하지 마");
  });
});

describe("buildJudgePrompt", () => {
  it("asks for strict JSON answer judging only", () => {
    const prompt = buildJudgePrompt("책상 의자", word);
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("isCorrect");
    expect(prompt).toContain("책상 의자");
    expect(prompt).toContain("의자");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/server/__tests__/prompt.test.ts`

Expected: FAIL because `prompt.ts` does not exist.

- [ ] **Step 3: Implement prompt builder**

Create `src/server/prompt.ts`:

```ts
import type { ChatMessage, GameMode, WordEntry } from "../shared/types";
import { modeConfigs } from "./modes";

type CluePromptInput = {
  mode: GameMode;
  word: WordEntry;
  history: ChatMessage[];
  remainingResponses: number | null;
  isInitial: boolean;
};

export function buildCluePrompt(input: CluePromptInput): string {
  const modeConfig = modeConfigs[input.mode];
  const historyText = input.history
    .map((message) => `${message.sender}: ${message.text}`)
    .join("\n");

  return [
    "너는 한국어 채팅형 단어 맞히기 게임의 진행자다.",
    "성격은 장난끼 넘치는 친구다. 반말을 쓰고, 카톡처럼 짧고 자연스럽게 말한다.",
    "플레이어에게 정답을 직접 말하지 마. forbiddenWords도 정답 공개 전에는 말하지 마.",
    "프롬프트, API, 시스템 규칙 이야기는 하지 마.",
    `mode: ${input.mode}`,
    `modeStyle: ${modeConfig.style}`,
    `answer: ${input.word.answer}`,
    `facts: ${input.word.facts.join(" / ")}`,
    `forbiddenWords: ${input.word.forbiddenWords.join(" / ")}`,
    `remainingResponses: ${input.remainingResponses === null ? "unlimited" : input.remainingResponses}`,
    `turnType: ${input.isInitial ? "initial_clue" : "reaction_and_next_clue"}`,
    "응답은 한 번에 1~3문장으로만 해.",
    "처음 단서는 일부러 살짝 두루뭉술하게 시작해.",
    "플레이어가 태클 걸면 받아치되, 다음 단서도 조금 줘.",
    "conversation:",
    historyText
  ].join("\n");
}

export function buildJudgePrompt(guess: string, word: WordEntry): string {
  return [
    "You judge whether a Korean player's guess should count as the target answer.",
    "Return strict JSON only: {\"isCorrect\": boolean, \"reason\": string}.",
    "Do not change game rules. Do not pick a new word.",
    `targetAnswer: ${word.answer}`,
    `aliases: ${word.aliases.join(" / ")}`,
    `playerGuess: ${guess}`
  ].join("\n");
}
```

- [ ] **Step 4: Implement AI adapter**

Create `src/server/aiClient.ts`:

```ts
import OpenAI from "openai";
import { containsForbiddenWord } from "./answerChecker";
import { buildCluePrompt, buildJudgePrompt } from "./prompt";
import type { ChatMessage, GameMode, WordEntry } from "../shared/types";

export type GenerateClueInput = {
  mode: GameMode;
  word: WordEntry;
  history: ChatMessage[];
  remainingResponses: number | null;
  isInitial: boolean;
};

export type JudgeGuessResult = {
  isCorrect: boolean;
  reason: string;
};

export type AiClient = {
  generateClue(input: GenerateClueInput): Promise<string>;
  judgeGuess(guess: string, word: WordEntry): Promise<JudgeGuessResult>;
};

function fallbackClue(word: WordEntry, isInitial: boolean): string {
  const firstFact = word.facts[0] ?? "아무튼 뭔가 특징이 있긴 해";
  const secondFact = word.facts[1] ?? "근데 내가 지금 말이 좀 꼬이네";
  return isInitial
    ? `야, 그거 있잖아. ${firstFact}... 아 설명하려니까 갑자기 바보 된 느낌인데?`
    : `아니 그거 말고. ${secondFact}. 이쯤이면 슬슬 감 와야 되는 거 아니냐?`;
}

export function createAiClient(apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL ?? "gpt-5.5"): AiClient {
  if (!apiKey) {
    return {
      async generateClue(input) {
        return fallbackClue(input.word, input.isInitial);
      },
      async judgeGuess() {
        return { isCorrect: false, reason: "No API key; deterministic checks only." };
      }
    };
  }

  const client = new OpenAI({ apiKey });

  return {
    async generateClue(input) {
      const prompt = buildCluePrompt(input);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await client.responses.create({
          model,
          input: prompt
        });
        const text = response.output_text.trim();
        if (!containsForbiddenWord(text, input.word.forbiddenWords)) {
          return text;
        }
      }
      return fallbackClue(input.word, input.isInitial);
    },

    async judgeGuess(guess, word) {
      const response = await client.responses.create({
        model,
        input: buildJudgePrompt(guess, word),
        text: {
          format: {
            type: "json_schema",
            name: "answer_judgment",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                isCorrect: { type: "boolean" },
                reason: { type: "string" }
              },
              required: ["isCorrect", "reason"]
            }
          }
        }
      });

      return JSON.parse(response.output_text) as JudgeGuessResult;
    }
  };
}
```

- [ ] **Step 5: Run prompt tests**

Run: `npm run test -- src/server/__tests__/prompt.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit prompt and AI adapter**

Run:

```bash
git add src/server/prompt.ts src/server/aiClient.ts src/server/__tests__/prompt.test.ts
git commit -m "feat: add prompt and ai adapter"
```

Expected: commit succeeds.

---

### Task 5: Session Store and Game Engine

**Files:**
- Create: `src/server/sessionStore.ts`
- Create: `src/server/gameEngine.ts`
- Create: `src/server/__tests__/gameEngine.test.ts`

- [ ] **Step 1: Write failing game engine tests**

Create `src/server/__tests__/gameEngine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGameEngine } from "../gameEngine";
import { createSessionStore } from "../sessionStore";
import type { AiClient } from "../aiClient";

const fakeAi: AiClient = {
  async generateClue(input) {
    return input.isInitial ? "야 그거 있잖아." : "아니 그거 말고, 집에 보통 있어.";
  },
  async judgeGuess() {
    return { isCorrect: false, reason: "not close" };
  }
};

describe("gameEngine", () => {
  it("starts a normal session with one AI message and five remaining responses", async () => {
    const engine = createGameEngine({ store: createSessionStore(), aiClient: fakeAi, random: () => 0 });
    const session = await engine.startSession("normal");

    expect(session.mode).toBe("normal");
    expect(session.messages).toHaveLength(1);
    expect(session.stage.remainingResponses).toBe(5);
    expect(session.stage.attempts).toBe(0);
  });

  it("wins when the player guesses an alias", async () => {
    const engine = createGameEngine({ store: createSessionStore(), aiClient: fakeAi, random: () => 0 });
    const session = await engine.startSession("normal");
    const response = await engine.handlePlayerMessage(session.sessionId, "체어");

    expect(response.stage.status).toBe("won");
    expect(response.result).toEqual({ type: "correct", answer: "의자", attempts: 1 });
  });

  it("fails normal mode after five incorrect player attempts", async () => {
    const engine = createGameEngine({ store: createSessionStore(), aiClient: fakeAi, random: () => 0 });
    const session = await engine.startSession("normal");
    let response = session;

    for (let index = 0; index < 5; index += 1) {
      response = await engine.handlePlayerMessage(session.sessionId, `오답${index}`);
    }

    expect(response.stage.status).toBe("failed");
    expect(response.result).toEqual({ type: "failed", answer: "의자" });
    expect(response.messages.at(-1)?.text).toContain("의자");
  });

  it("records challenge attempts after success", async () => {
    const engine = createGameEngine({ store: createSessionStore(), aiClient: fakeAi, random: () => 0 });
    const session = await engine.startSession("challenge");
    await engine.handlePlayerMessage(session.sessionId, "아닌데");
    const response = await engine.handlePlayerMessage(session.sessionId, "괴델 불완전성 정리");

    expect(response.stage.status).toBe("won");
    expect(response.challengeRecords).toEqual([{ answer: "괴델의 불완전성 정리", attempts: 2 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/server/__tests__/gameEngine.test.ts`

Expected: FAIL because `gameEngine.ts` and `sessionStore.ts` do not exist.

- [ ] **Step 3: Implement session store**

Create `src/server/sessionStore.ts`:

```ts
import type { ChatMessage, ChallengeRecord, GameMode, StageState, WordEntry } from "../shared/types";

export type GameSession = {
  id: string;
  mode: GameMode;
  word: WordEntry;
  messages: ChatMessage[];
  stage: StageState;
  challengeRecords: ChallengeRecord[];
};

export type SessionStore = {
  create(session: GameSession): GameSession;
  get(id: string): GameSession | null;
  save(session: GameSession): GameSession;
};

export function createSessionStore(): SessionStore {
  const sessions = new Map<string, GameSession>();
  return {
    create(session) {
      sessions.set(session.id, session);
      return session;
    },
    get(id) {
      return sessions.get(id) ?? null;
    },
    save(session) {
      sessions.set(session.id, session);
      return session;
    }
  };
}
```

- [ ] **Step 4: Implement game engine**

Create `src/server/gameEngine.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { AiClient } from "./aiClient";
import { checkDeterministicAnswer } from "./answerChecker";
import { modeConfigs } from "./modes";
import type { GameSession, SessionStore } from "./sessionStore";
import { pickWord } from "./words";
import type { ChatMessage, GameMode, SessionResponse, StageResult } from "../shared/types";

type EngineDeps = {
  store: SessionStore;
  aiClient: AiClient;
  random?: () => number;
};

function message(sender: ChatMessage["sender"], text: string): ChatMessage {
  return { id: randomUUID(), sender, text };
}

function toResponse(session: GameSession, result: StageResult = null): SessionResponse {
  return {
    sessionId: session.id,
    mode: session.mode,
    messages: session.messages,
    stage: session.stage,
    result,
    challengeRecords: session.challengeRecords
  };
}

function failureText(answer: string): string {
  return `와 이걸 못 맞히네? 너도 진짜 너다. 정답은 ${answer}였어. 다음 거 가자.`;
}

export function createGameEngine({ store, aiClient, random = Math.random }: EngineDeps) {
  return {
    async startSession(mode: GameMode): Promise<SessionResponse> {
      const word = pickWord(mode, random);
      const max = modeConfigs[mode].maxAiResponsesAfterInitial;
      const session: GameSession = {
        id: randomUUID(),
        mode,
        word,
        messages: [],
        stage: {
          status: "playing",
          remainingResponses: max,
          attempts: 0
        },
        challengeRecords: []
      };

      const clue = await aiClient.generateClue({
        mode,
        word,
        history: session.messages,
        remainingResponses: session.stage.remainingResponses,
        isInitial: true
      });
      session.messages.push(message("ai", clue));
      store.create(session);
      return toResponse(session);
    },

    async handlePlayerMessage(sessionId: string, text: string): Promise<SessionResponse> {
      const session = store.get(sessionId);
      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }
      if (session.stage.status !== "playing") {
        return toResponse(session, null);
      }

      session.messages.push(message("player", text));
      session.stage.attempts += 1;

      const deterministic = checkDeterministicAnswer(text, session.word);
      const aiJudgment = deterministic.isCorrect
        ? { isCorrect: true }
        : await aiClient.judgeGuess(text, session.word);

      if (deterministic.isCorrect || aiJudgment.isCorrect) {
        session.stage.status = "won";
        const result = { type: "correct", answer: session.word.answer, attempts: session.stage.attempts } as const;
        session.messages.push(message("ai", `아 맞다! 그래, ${session.word.answer}! ${session.stage.attempts}번 만에 맞혔네.`));
        if (session.mode === "challenge") {
          session.challengeRecords.push({ answer: session.word.answer, attempts: session.stage.attempts });
        }
        store.save(session);
        return toResponse(session, result);
      }

      if (session.stage.remainingResponses !== null) {
        session.stage.remainingResponses -= 1;
      }

      if (session.stage.remainingResponses === 0) {
        session.stage.status = "failed";
        const result = { type: "failed", answer: session.word.answer } as const;
        session.messages.push(message("ai", failureText(session.word.answer)));
        store.save(session);
        return toResponse(session, result);
      }

      const clue = await aiClient.generateClue({
        mode: session.mode,
        word: session.word,
        history: session.messages,
        remainingResponses: session.stage.remainingResponses,
        isInitial: false
      });
      session.messages.push(message("ai", clue));
      store.save(session);
      return toResponse(session);
    }
  };
}
```

- [ ] **Step 5: Run game engine tests**

Run: `npm run test -- src/server/__tests__/gameEngine.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit game engine**

Run:

```bash
git add src/server/sessionStore.ts src/server/gameEngine.ts src/server/__tests__/gameEngine.test.ts
git commit -m "feat: add game session engine"
```

Expected: commit succeeds.

---

### Task 6: Express API

**Files:**
- Create: `src/server/routes.ts`
- Create: `src/server/index.ts`
- Create: `src/server/__tests__/routes.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `src/server/__tests__/routes.test.ts`:

```ts
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAiClient } from "../aiClient";
import { createGameEngine } from "../gameEngine";
import { createRoutes } from "../routes";
import { createSessionStore } from "../sessionStore";

function appForTest() {
  const app = express();
  app.use(express.json());
  const engine = createGameEngine({
    store: createSessionStore(),
    aiClient: createAiClient(""),
    random: () => 0
  });
  app.use("/api", createRoutes(engine));
  return app;
}

describe("routes", () => {
  it("responds to health checks", async () => {
    const response = await request(appForTest()).get("/api/health").expect(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("creates a session", async () => {
    const response = await request(appForTest())
      .post("/api/sessions")
      .send({ mode: "normal" })
      .expect(201);

    expect(response.body.mode).toBe("normal");
    expect(response.body.messages[0].sender).toBe("ai");
  });

  it("rejects invalid modes", async () => {
    await request(appForTest())
      .post("/api/sessions")
      .send({ mode: "nightmare" })
      .expect(400);
  });

  it("accepts player messages", async () => {
    const created = await request(appForTest())
      .post("/api/sessions")
      .send({ mode: "normal" })
      .expect(201);

    const response = await request(appForTest())
      .post(`/api/sessions/${created.body.sessionId}/messages`)
      .send({ text: "의자" })
      .expect(200);

    expect(response.body.stage.status).toBe("won");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/server/__tests__/routes.test.ts`

Expected: FAIL because `routes.ts` does not exist.

- [ ] **Step 3: Implement routes**

Create `src/server/routes.ts`:

```ts
import { Router } from "express";
import { parseMode } from "./modes";
import type { createGameEngine } from "./gameEngine";

type GameEngine = ReturnType<typeof createGameEngine>;

export function createRoutes(engine: GameEngine): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.post("/sessions", async (req, res, next) => {
    try {
      const mode = parseMode(req.body?.mode);
      if (!mode) {
        res.status(400).json({ error: "INVALID_MODE" });
        return;
      }
      const session = await engine.startSession(mode);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/messages", async (req, res, next) => {
    try {
      const text = String(req.body?.text ?? "").trim();
      if (!text) {
        res.status(400).json({ error: "EMPTY_MESSAGE" });
        return;
      }
      const response = await engine.handlePlayerMessage(req.params.id, text);
      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
        res.status(404).json({ error: "SESSION_NOT_FOUND" });
        return;
      }
      next(error);
    }
  });

  return router;
}
```

- [ ] **Step 4: Implement server entrypoint**

Create `src/server/index.ts`:

```ts
import cors from "cors";
import "dotenv/config";
import express from "express";
import { createAiClient } from "./aiClient";
import { createGameEngine } from "./gameEngine";
import { createRoutes } from "./routes";
import { createSessionStore } from "./sessionStore";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors({ origin: "http://127.0.0.1:5173" }));
app.use(express.json());

const engine = createGameEngine({
  store: createSessionStore(),
  aiClient: createAiClient()
});

app.use("/api", createRoutes(engine));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "SERVER_ERROR" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`API server listening on http://127.0.0.1:${port}`);
});
```

- [ ] **Step 5: Run route tests**

Run: `npm run test -- src/server/__tests__/routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit API**

Run:

```bash
git add src/server/routes.ts src/server/index.ts src/server/__tests__/routes.test.ts
git commit -m "feat: expose game api"
```

Expected: commit succeeds.

---

### Task 7: React Client

**Files:**
- Create: `src/client/testSetup.ts`
- Create: `src/client/main.tsx`
- Create: `src/client/api.ts`
- Create: `src/client/App.tsx`
- Create: `src/client/components/ModePicker.tsx`
- Create: `src/client/components/ChatScreen.tsx`
- Create: `src/client/components/MessageBubble.tsx`
- Create: `src/client/components/ChallengeRecords.tsx`
- Create: `src/client/__tests__/App.test.tsx`

- [ ] **Step 1: Write failing client tests**

Create `src/client/testSetup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `src/client/__tests__/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders mode buttons", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Easy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Normal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Challenge/i })).toBeInTheDocument();
  });

  it("starts a chat after choosing a mode", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessionId: "s1",
        mode: "normal",
        messages: [{ id: "m1", sender: "ai", text: "야 그거 있잖아." }],
        stage: { status: "playing", remainingResponses: 5, attempts: 0 },
        result: null,
        challengeRecords: []
      })
    })));

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /Normal/i }));
    expect(await screen.findByText("야 그거 있잖아.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("답을 입력해봐")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/client/__tests__/App.test.tsx`

Expected: FAIL because client files do not exist.

- [ ] **Step 3: Implement typed API wrapper**

Create `src/client/api.ts`:

```ts
import type { GameMode, SessionResponse } from "../shared/types";

async function parseResponse(response: Response): Promise<SessionResponse> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<SessionResponse>;
}

export async function createSession(mode: GameMode): Promise<SessionResponse> {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });
  return parseResponse(response);
}

export async function sendMessage(sessionId: string, text: string): Promise<SessionResponse> {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  return parseResponse(response);
}
```

- [ ] **Step 4: Implement React entrypoint**

Create `src/client/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Implement mode picker**

Create `src/client/components/ModePicker.tsx`:

```tsx
import type { GameMode } from "../../shared/types";

const modes: Array<{ mode: GameMode; label: string; description: string }> = [
  { mode: "easy", label: "Easy", description: "정답보다 웃긴 대화가 먼저" },
  { mode: "normal", label: "Normal", description: "5번 안에 맞히는 기본 모드" },
  { mode: "hard", label: "Hard", description: "더 어렵고 더 횡설수설" },
  { mode: "challenge", label: "Challenge", description: "무제한 고급 지식 도전" }
];

type Props = {
  onSelect(mode: GameMode): void;
  loading: boolean;
};

export function ModePicker({ onSelect, loading }: Props) {
  return (
    <main className="mode-page">
      <section className="phone-shell mode-shell" aria-label="게임 모드 선택">
        <div className="app-title">
          <p>아, 그거</p>
          <h1>뭐라 그러더라?</h1>
        </div>
        <div className="mode-list">
          {modes.map((item) => (
            <button key={item.mode} className="mode-button" disabled={loading} onClick={() => onSelect(item.mode)}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Implement message and records components**

Create `src/client/components/MessageBubble.tsx`:

```tsx
import type { ChatMessage } from "../../shared/types";

type Props = {
  message: ChatMessage;
};

export function MessageBubble({ message }: Props) {
  return (
    <div className={`message-row ${message.sender}`}>
      <div className="message-bubble">{message.text}</div>
    </div>
  );
}
```

Create `src/client/components/ChallengeRecords.tsx`:

```tsx
import type { ChallengeRecord } from "../../shared/types";

type Props = {
  records: ChallengeRecord[];
};

export function ChallengeRecords({ records }: Props) {
  if (records.length === 0) {
    return null;
  }

  return (
    <aside className="records" aria-label="Challenge 기록">
      {records.map((record) => (
        <span key={`${record.answer}-${record.attempts}`}>
          {record.answer} · {record.attempts}번
        </span>
      ))}
    </aside>
  );
}
```

- [ ] **Step 7: Implement chat screen**

Create `src/client/components/ChatScreen.tsx`:

```tsx
import { FormEvent, useState } from "react";
import type { SessionResponse } from "../../shared/types";
import { ChallengeRecords } from "./ChallengeRecords";
import { MessageBubble } from "./MessageBubble";

type Props = {
  session: SessionResponse;
  loading: boolean;
  error: string | null;
  onSend(text: string): void;
  onBack(): void;
};

export function ChatScreen({ session, loading, error, onSend, onBack }: Props) {
  const [text, setText] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }
    setText("");
    onSend(trimmed);
  }

  return (
    <main className="chat-page">
      <section className="phone-shell chat-shell" aria-label="게임 채팅">
        <header className="chat-header">
          <button className="icon-button" onClick={onBack} aria-label="모드 선택으로 돌아가기">
            ←
          </button>
          <div>
            <strong>{session.mode.toUpperCase()}</strong>
            <span>
              {session.stage.remainingResponses === null
                ? `${session.stage.attempts}번 시도`
                : `남은 답변 ${session.stage.remainingResponses}번`}
            </span>
          </div>
        </header>

        <ChallengeRecords records={session.challengeRecords} />

        <div className="message-list">
          {session.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {loading && <div className="typing">상대가 열심히 헛소리 정리 중...</div>}
        </div>

        {session.result && (
          <div className={`result-banner ${session.result.type}`}>
            {session.result.type === "correct"
              ? `${session.result.answer}, ${session.result.attempts}번 만에 맞힘`
              : `정답은 ${session.result.answer}`}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <form className="chat-input" onSubmit={submit}>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="답을 입력해봐"
            disabled={loading || session.stage.status !== "playing"}
          />
          <button disabled={loading || session.stage.status !== "playing"}>전송</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 8: Implement App state machine**

Create `src/client/App.tsx`:

```tsx
import { useState } from "react";
import { createSession, sendMessage } from "./api";
import { ChatScreen } from "./components/ChatScreen";
import { ModePicker } from "./components/ModePicker";
import type { GameMode, SessionResponse } from "../shared/types";

export default function App() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(mode: GameMode) {
    setLoading(true);
    setError(null);
    try {
      setSession(await createSession(mode));
    } catch {
      setError("시작하다가 삐끗했어. 다시 눌러봐.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(text: string) {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSession(await sendMessage(session.sessionId, text));
    } catch {
      setError("메시지가 중간에 길을 잃었어. 다시 보내봐.");
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return <ModePicker loading={loading} onSelect={start} />;
  }

  return (
    <ChatScreen
      session={session}
      loading={loading}
      error={error}
      onSend={submit}
      onBack={() => setSession(null)}
    />
  );
}
```

- [ ] **Step 9: Run client tests**

Run: `npm run test -- src/client/__tests__/App.test.tsx`

Expected: PASS.

- [ ] **Step 10: Commit React client**

Run:

```bash
git add src/client src/shared/types.ts
git commit -m "feat: add chat game client"
```

Expected: commit succeeds.

---

### Task 8: Mobile Styling and Final Verification

**Files:**
- Create: `src/client/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Write mobile-first CSS**

Create `src/client/styles.css`:

```css
:root {
  color: #1f2328;
  background: #8fb7d7;
  font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.mode-page,
.chat-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 18px;
}

.phone-shell {
  width: min(100%, 430px);
  height: min(860px, calc(100vh - 36px));
  border: 1px solid rgba(31, 35, 40, 0.18);
  border-radius: 28px;
  background: #f7f4ea;
  box-shadow: 0 24px 80px rgba(31, 35, 40, 0.24);
  overflow: hidden;
}

.mode-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  padding: 28px;
}

.app-title p {
  margin: 0 0 6px;
  font-size: 18px;
}

.app-title h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
}

.mode-list {
  display: grid;
  gap: 10px;
}

.mode-button {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 16px;
  text-align: left;
  border: 1px solid rgba(31, 35, 40, 0.16);
  border-radius: 8px;
  background: #ffffff;
  color: #1f2328;
  cursor: pointer;
}

.mode-button strong {
  font-size: 18px;
}

.mode-button span {
  color: #586069;
  font-size: 14px;
}

.chat-shell {
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  background: #b7d3e9;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 12px 14px;
  background: #eef4f8;
  border-bottom: 1px solid rgba(31, 35, 40, 0.12);
}

.chat-header div {
  display: grid;
  gap: 2px;
}

.chat-header span {
  font-size: 12px;
  color: #586069;
}

.icon-button {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 0;
  background: #ffffff;
  cursor: pointer;
}

.records {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.45);
}

.records span {
  white-space: nowrap;
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #ffffff;
}

.message-list {
  min-height: 0;
  overflow-y: auto;
  padding: 16px 12px;
}

.message-row {
  display: flex;
  margin: 8px 0;
}

.message-row.ai {
  justify-content: flex-start;
}

.message-row.player {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 78%;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 1.45;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.message-row.ai .message-bubble {
  background: #ffffff;
}

.message-row.player .message-bubble {
  background: #ffe45c;
}

.typing,
.error-banner,
.result-banner {
  margin: 8px 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.typing {
  background: rgba(255, 255, 255, 0.55);
}

.error-banner {
  background: #ffe2df;
  color: #8a1f11;
}

.result-banner {
  background: #e9f7df;
  color: #246b22;
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 10px;
  background: #eef4f8;
}

.chat-input input {
  min-width: 0;
  border: 1px solid rgba(31, 35, 40, 0.18);
  border-radius: 8px;
  padding: 12px;
}

.chat-input button {
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  background: #2f6f9f;
  color: #ffffff;
  cursor: pointer;
}

button:disabled,
input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Run full verification**

Run: `npm run check`

Expected: TypeScript check passes and all Vitest tests pass.

- [ ] **Step 3: Build production bundle**

Run: `npm run build`

Expected: Vite production build completes and writes `dist`.

- [ ] **Step 4: Start local API server**

Run: `npm run server`

Expected: terminal prints `API server listening on http://127.0.0.1:8787`.

- [ ] **Step 5: Start local web server in a second terminal**

Run: `npm run dev`

Expected: terminal prints a local Vite URL such as `http://127.0.0.1:5173`.

- [ ] **Step 6: Browser smoke test**

Open `http://127.0.0.1:5173` and verify:

- Mode buttons fit inside the phone shell.
- Normal starts with an AI bubble.
- Sending `의자` wins the first Normal seed stage.
- Long Korean messages wrap inside bubbles.
- Challenge shows solved-word records after a correct answer.

- [ ] **Step 7: Update README with fallback behavior**

Modify `README.md` so the setup section says:

```markdown
When `OPENAI_API_KEY` is empty, the server uses deterministic fallback clue text. This is useful for local UI and rules testing, but real gameplay needs a valid OpenAI API key.
```

- [ ] **Step 8: Commit styling and verification docs**

Run:

```bash
git add src/client/styles.css README.md
git commit -m "feat: finish mobile chat experience"
```

Expected: commit succeeds.

---

## Plan Self-Review

Spec coverage:

- Single-player web game: Tasks 1, 6, 7, and 8.
- Mobile KakaoTalk-like chat UI: Tasks 7 and 8.
- Server-owned state and OpenAI key: Tasks 4, 5, and 6.
- Easy, Normal, Hard, Challenge rules: Tasks 2 and 5.
- Normal and Hard five-response limit: Tasks 2 and 5.
- Challenge records answer and attempts: Tasks 5 and 7.
- JSON word model: Task 2.
- Answer and alias checking: Task 3.
- Forbidden-word leak detection and fallback: Tasks 3 and 4.
- API routes: Task 6.
- Testing and browser verification: Tasks 2 through 8.

Red-flag scan:

- This plan contains no unresolved marker text or unscoped implementation instructions.
- Each code-writing step names exact files and includes concrete code.
- Each verification step lists exact commands and expected results.

Type consistency:

- `GameMode`, `ChatMessage`, `WordEntry`, `SessionResponse`, `StageState`, and `ChallengeRecord` are defined in Task 2 and reused consistently.
- API responses are represented by `SessionResponse` on both server and client.
- Engine methods are `startSession` and `handlePlayerMessage` in tests, routes, and implementation.
