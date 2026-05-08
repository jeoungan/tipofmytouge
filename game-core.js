(function initGameCore(global) {
  const modeConfigs = {
    easy: {
      label: "Easy",
      maxReplies: null,
      subtitle: "웃긴 대화가 먼저"
    },
    normal: {
      label: "Normal",
      maxReplies: 5,
      subtitle: "5번 안에 맞히기"
    },
    hard: {
      label: "Hard",
      maxReplies: 5,
      subtitle: "고급 상식과 횡설수설"
    },
    challenge: {
      label: "Challenge",
      maxReplies: null,
      subtitle: "무제한 고급 지식 도전"
    }
  };

  const words = [
    {
      answer: "우산",
      aliases: ["양산"],
      mode: "easy",
      clues: [
        "야, 그거 있잖아. 하늘이 갑자기 성격 나빠질 때 꺼내는 거.",
        "손에 들고 다니다가 위로 촥 펼치는 그거. 근데 멋있게 펼치면 약간 주인공 같음.",
        "비랑 싸우는 느낌인데, 사실 바람 세게 불면 얘도 멘탈 나가.",
        "접었다 폈다 하는데, 가방 안에 넣으면 꼭 물기 때문에 분위기 망치는 그 친구.",
        "아니 이걸 이렇게까지 설명해야 돼? 머리 위에 작은 지붕 만드는 거!"
      ]
    },
    {
      answer: "의자",
      aliases: ["체어", "좌석"],
      mode: "normal",
      clues: [
        "야, 야, 그거 뭐라고 하더라? 집에도 있고 실내라면 웬만해선 있는 거.",
        "나무로 된 것도 있고, 철로 된 것도 있고. 대체로 튼튼하고 무거운 것도 많아.",
        "사람들이 거기에 몸을 맡기는데, 너무 오래 그러면 자세 망가지는 그거.",
        "다리가 있는 경우가 많은데, 동물은 아니고. 아니 당연한 말을 되게 대단하게 하네 나.",
        "책상 근처에 자주 붙어 다니고, 식탁 주변에도 모여 있는 그 물건.",
        "아 맞다! 그래, 의자! 와 이걸 여기까지 끌고 오네."
      ]
    },
    {
      answer: "르네상스",
      aliases: ["문예부흥"],
      mode: "hard",
      clues: [
        "그거 있잖아. 옛날 유럽 사람들이 갑자기 고대 거 다시 꺼내 들고 와, 우리 이거 좀 멋진데? 한 시기.",
        "이탈리아 쪽이랑 관련이 깊고, 그림이랑 학문이랑 인간이랑 막 다 같이 들썩거려.",
        "중세 다음에 분위기가 확 바뀌는 느낌인데, 이름부터 약간 다시 태어나는 척해.",
        "다빈치 같은 사람 떠올리면 방향은 맞아. 근데 정답을 내가 바로 말하면 재미없잖아.",
        "예술사 시간에 선생님이 칠판에 크게 써놓고, 시험에도 나오는 그 단어.",
        "정답은 르네상스였어. 아 이건 좀 어려웠다, 인정은 해줄게. 조금만."
      ]
    },
    {
      answer: "괴델의 불완전성 정리",
      aliases: ["불완전성 정리", "괴델 불완전성 정리"],
      mode: "challenge",
      clues: [
        "와 이건 진짜 매운맛이다. 수학이 자기 자신을 쳐다보다가 어? 나 완벽하지 않네? 하는 느낌.",
        "충분히 강한 형식 체계에서는 참인데도 그 안에서 증명 못 하는 명제가 생긴다는 쪽이야.",
        "힐베르트가 꿈꾸던 완전하고 일관된 수학의 성을 살짝 와르르 흔든 결과.",
        "수리논리학 쪽 이름이고, 어떤 오스트리아 출신 논리학자 이름이 붙어 있어.",
        "정답 근처에 가면 '완전하지 않다'는 말이 핵심으로 나올 거야. 아니 거의 다 말했네?"
      ]
    }
  ];

  const particles = /(이야|야|입니다|임|이에요|예요|요|인가|일까|같아|같은데|아닌가)$/u;

  function normalizeGuess(value) {
    return String(value)
      .trim()
      .replace(/[!?.,~…\s]/gu, "")
      .replace(particles, "")
      .toLocaleLowerCase("ko-KR");
  }

  function getModeConfig(mode) {
    return modeConfigs[mode];
  }

  function getWordsForMode(mode) {
    return words.filter((word) => word.mode === mode);
  }

  function pickWord(mode, seedIndex = Math.floor(Math.random() * 100000)) {
    const candidates = getWordsForMode(mode);
    if (candidates.length === 0) {
      throw new Error(`Unknown mode: ${mode}`);
    }
    return candidates[Math.abs(seedIndex) % candidates.length];
  }

  function makeMessage(sender, text) {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender,
      text
    };
  }

  function isCorrectGuess(guess, word) {
    const normalizedGuess = normalizeGuess(guess);
    const answers = [word.answer, ...word.aliases].map(normalizeGuess);
    return answers.includes(normalizedGuess);
  }

  function clueForTurn(word, attempts) {
    return word.clues[Math.min(attempts, word.clues.length - 1)];
  }

  function playfulNudge(mode, attempts) {
    if (mode === "easy") {
      const nudges = [
        "아니 근데 네 답도 묘하게 맞는 척해서 더 웃기네.",
        "그렇게 말하면 세상 모든 게 다 정답 후보 아니냐?",
        "좋아, 내가 힌트 더 줄게. 나 지금 설명력 바닥났지만 해본다."
      ];
      return nudges[attempts % nudges.length];
    }
    if (mode === "hard") {
      return "음, 방향이 아주 틀린 건 아닌 척하고 싶은데... 아니야. 다시 가자.";
    }
    if (mode === "challenge") {
      return "오, 지식인의 냄새는 났는데 정답은 아직 아니야. 계속 와 봐.";
    }
    return "아니 그건 좀 너무 멀리 갔다. 다시 집중해봐.";
  }

  function createGame(mode, seedIndex) {
    const config = getModeConfig(mode);
    if (!config) {
      throw new Error(`Unknown mode: ${mode}`);
    }
    const word = pickWord(mode, seedIndex);
    const firstMessage = makeMessage("ai", word.clues[0]);
    return {
      mode,
      word,
      status: "playing",
      remainingReplies: config.maxReplies,
      attempts: 0,
      messages: [firstMessage],
      result: null,
      challengeRecords: []
    };
  }

  function getInitialClue(game) {
    return game.messages[0];
  }

  function submitGuess(game, guess) {
    if (game.status !== "playing") {
      return game;
    }

    const next = {
      ...game,
      attempts: game.attempts + 1,
      messages: [...game.messages, makeMessage("player", guess)]
    };

    if (isCorrectGuess(guess, game.word)) {
      next.status = "won";
      next.result = {
        type: "correct",
        answer: game.word.answer,
        attempts: next.attempts
      };
      next.messages.push(makeMessage("ai", `아 맞다! 그래, ${game.word.answer}! ${next.attempts}번 만에 맞혔네. 야 너 좀 치네?`));
      if (game.mode === "challenge") {
        next.challengeRecords = [...game.challengeRecords, { answer: game.word.answer, attempts: next.attempts }];
      }
      return next;
    }

    if (next.remainingReplies !== null) {
      next.remainingReplies -= 1;
    }

    if (next.remainingReplies === 0) {
      next.status = "failed";
      next.result = {
        type: "failed",
        answer: game.word.answer
      };
      next.messages.push(makeMessage("ai", `아, 이걸 못 맞히네? 이것도 못 맞추냐? 너도 진짜 너다. 정답은 ${game.word.answer}였어.`));
      return next;
    }

    const clue = clueForTurn(game.word, next.attempts);
    next.messages.push(makeMessage("ai", `${playfulNudge(game.mode, next.attempts)} ${clue}`));
    return next;
  }

  function modes() {
    return Object.entries(modeConfigs).map(([mode, config]) => ({
      mode,
      ...config
    }));
  }

  global.GameCore = {
    createGame,
    submitGuess,
    normalizeGuess,
    getModeConfig,
    getInitialClue,
    modes
  };
})(globalThis);
