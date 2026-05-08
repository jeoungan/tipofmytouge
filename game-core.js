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
      answer: "고양이",
      aliases: ["냥이", "캣"],
      mode: "easy",
      clues: [
        "야, 그거 있잖아. 집에서 지가 왕인 줄 아는 작은 털뭉치.",
        "가끔 사람 무릎에 올라오는데, 지가 원할 때만 친한 척하는 그 친구.",
        "발소리 조용하고, 높은 데 잘 올라가고, 눈이 밤에 좀 반짝이는 애.",
        "상자만 보면 환장하고, 손으로 툭툭 치다가 갑자기 모르는 척하는 그 생물.",
        "야 이걸 못 맞히면 좀 심하다. 야옹 하는 걔 있잖아."
      ]
    },
    {
      answer: "선글라스",
      aliases: ["썬글라스", "색안경"],
      mode: "easy",
      clues: [
        "그거 있잖아. 햇빛이 너무 나댈 때 얼굴에 걸치는 거.",
        "눈 앞에 끼는데, 쓰면 괜히 좀 멋있는 척하게 되는 그 물건.",
        "렌즈가 어둡고, 여름이나 운전할 때 사람들이 자주 쓰는 거.",
        "눈부심 막아주는 건데, 밤에 쓰면 그냥 이상한 사람 되는 그거.",
        "아니 눈 위에 쓰는 검은 안경 같은 거 있잖아."
      ]
    },
    {
      answer: "의자",
      aliases: ["체어", "좌석"],
      mode: "normal",
      clues: [
        "야, 야, 그거 뭐라고 하더라? 집에도 있고 실내라면 웬만해선 있는 거.",
        "그... 방 안에서 되게 자연스럽게 있는 거. 너무 당연해서 오히려 이름이 안 나와.",
        "나무로 된 것도 있고, 철로 된 것도 있고. 대체로 튼튼하고 무거운 것도 많아.",
        "사람들이 거기에 몸을 맡기는데, 너무 오래 그러면 자세 망가지는 그거.",
        "다리가 있는 경우가 많고, 책상이나 식탁 근처에 자주 붙어 다니는 그 물건.",
        "아 맞다! 그래, 의자! 와 이걸 여기까지 끌고 오네."
      ]
    },
    {
      answer: "자전거",
      aliases: ["바이크", "사이클"],
      mode: "normal",
      clues: [
        "야, 그거 뭐라 그러더라. 타고 다니는 건데 엔진은 없고 사람이 좀 고생하는 거.",
        "두 바퀴가 있고, 발로 계속 돌려야 앞으로 가는 그 물건.",
        "손잡이 잡고 균형 잡아야 하고, 처음 배우면 무릎 좀 까지는 친구야.",
        "출퇴근이나 운동할 때도 쓰고, 길가에 묶어두면 괜히 불안한 그거.",
        "페달 밟고 체인 돌아가고, 헬멧 쓰면 더 안전한 그 이동수단."
      ]
    },
    {
      answer: "엘리베이터",
      aliases: ["승강기", "리프트"],
      mode: "normal",
      clues: [
        "그거 있잖아. 건물 안에서 위아래로 사람 실어 나르는 거.",
        "문이 자동으로 열리고 닫히는데, 가끔 너무 오래 안 와서 사람 빡치게 하는 그거.",
        "버튼 누르면 층 숫자가 올라가거나 내려가고, 안에서 잠깐 어색해지는 공간.",
        "계단 대신 타는 건데, 정전 나면 갑자기 무서워지는 그 물건.",
        "아파트나 회사 건물에 거의 있고, 몇 층 갈지 누르는 그 작은 방 같은 거."
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
        "다빈치 같은 사람 떠올리면 방향은 맞아. 근데 이름이 혀끝에서 계속 미끄러지네.",
        "예술사 시간에 선생님이 칠판에 크게 써놓고, 시험에도 나오는 그 단어.",
        "아! 이거 그거다 그거. 르네상스! 아 이건 좀 어려웠다, 인정은 해줄게. 조금만."
      ]
    },
    {
      answer: "블루투스",
      aliases: ["Bluetooth"],
      mode: "hard",
      clues: [
        "그거 있잖아. 선 없이 기기끼리 붙여주는 건데 이름은 괜히 색깔이랑 이빨 느낌 나는 거.",
        "이어폰이나 스피커 연결할 때 자주 쓰고, 가끔 페어링 안 돼서 사람 열받게 해.",
        "근거리 무선 통신 쪽이고, 휴대폰 설정에 거의 항상 있는 그 기능.",
        "로고도 좀 룬 문자처럼 생겼고, 이름 유래는 북유럽 왕 이름 쪽이었나 그럴걸.",
        "무선 이어폰 처음 연결할 때 켜는 바로 그 기술 이름."
      ]
    },
    {
      answer: "테슬라",
      aliases: ["Tesla"],
      mode: "hard",
      clues: [
        "그거 있잖아. 전기차 하면 사람들이 바로 떠올리는 브랜드 중 하나.",
        "차 안에 큰 화면 있고, 자율주행 얘기 나오면 맨날 같이 끌려나오는 그 회사.",
        "일론 머스크랑 엮여 있고, 모델 3나 모델 Y 같은 이름도 있어.",
        "충전소랑 전기차 이미지가 강하고, 주식 얘기할 때도 자주 등장하는 브랜드.",
        "미국 전기차 회사인데 이름은 발명가 성에서 따온 그거."
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
        "그 단어 근처에 가면 '완전하지 않다'는 말이 핵심으로 나올 거야. 아니 거의 다 말했네?"
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

  function cleanAiMessages(messages) {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages
      .map((message) => String(message || "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  function clueTokens(clue) {
    return String(clue)
      .replace(/[!?.,~…]/gu, " ")
      .split(/\s+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .filter((token) => !["아니", "그거", "있잖아", "되게", "너무", "대체로", "경우가", "많고"].includes(token));
  }

  function includesClueDetail(messages, clue) {
    const combined = messages.join(" ");
    const tokens = clueTokens(clue);
    return tokens.some((token) => combined.includes(token));
  }

  function clueForTurn(word, attempts) {
    if (attempts < word.clues.length) {
      return word.clues[attempts];
    }

    const extraCluesByAnswer = {
      우산: [
        "손잡이 잡고 머리 위에 들고 다니는 그 물건 있잖아. 비 오는 날 괜히 사람들 팔 아프게 하는 거.",
        "접으면 길쭉하고 펴면 위로 둥글게 몸집 커지는 그 친구. 아 답답해, 이름만 안 나와.",
        "편의점 앞에 비 오면 갑자기 잘 팔리는 그거. 없으면 그냥 젖은 사람 되는 거.",
        "가방에 넣으면 물기 때문에 안쪽 다 축축하게 만드는 그 배신자 같은 물건."
      ],
      "괴델의 불완전성 정리": [
        "이거 논리학 쪽에서 수학한테 야 너 완벽한 척 그만해, 하고 태클 거는 그 결과야.",
        "자기 안에서 참인 말을 전부 증명하겠다는 꿈을 되게 얄밉게 꺾어버린 그거.",
        "충분히 센 공리 체계 얘기 나오고, 일관성이랑 완전성이 같이 얽혀서 사람 머리 아프게 하는 그놈.",
        "오스트리아 논리학자 이름 붙은 그 정리인데, 아 이름이 목구멍에서 걸려서 안 나와."
      ]
    };

    const extraClues = extraCluesByAnswer[word.answer] || [
      "아니 여기까지 왔으면 거의 냄새라도 맡아야지. 이름만 계속 도망가네.",
      "내가 같은 말 또 하면 진짜 재미없잖아. 다른 쪽으로 가보면, 이건 일상에서 꽤 자주 만나는 쪽이야.",
      "아 답답해. 단어는 아는데 입 밖으로 안 튀어나오는 그 기분 알지?"
    ];
    return extraClues[(attempts - word.clues.length) % extraClues.length];
  }

  function preludeForTurn(mode, attempts) {
    const preludes = {
      easy: ["아, 그그...", "잠깐만.", "뭐였지.", "아 씨, 그거.", "어우 답답해.", "아니 진짜.", "야 잠깐.", "그 뭐냐.", "아 또.", "입에 맴도네."],
      normal: ["아, 그그...", "아니 잠깐.", "뭐였더라.", "아 답답해.", "야, 잠깐.", "아 진짜.", "그 뭐냐.", "목끝인데.", "아 또 막혀.", "잠깐 들어봐."],
      hard: ["아, 그...", "잠깐, 목끝.", "아 미치겠네.", "그 단어가.", "야 들어봐.", "아니 이거.", "하, 답답해.", "목까지 왔어.", "잠깐만.", "그 이름이."],
      challenge: ["아니 그...", "하, 이거.", "잠깐만.", "아 목끝에.", "야 이거.", "아 머리 아파.", "그 논문.", "아니 진짜.", "거의 왔어.", "입 밖으로."]
    };
    const options = preludes[mode] || preludes.normal;
    return options[(Math.max(attempts, 1) - 1) % options.length];
  }

  function playfulNudge(mode, attempts) {
    if (mode === "easy") {
      const nudges = [
        "아니아니, 그거 말고. 나도 설명이 이상한데 아무튼 너무 넓다.",
        "아니아니, 그쪽은 아닌데. 뭐였지, 점점 생각날 듯 말 듯해.",
        "좋아, 뭔가 떠오른다. 나 지금 설명력 바닥났지만 해본다.",
        "야 이것도 모르냐 슬슬? 똑바로 좀 생각해봐.",
        "아 진짜 거의 다 왔다니까. 정신 차려 봐."
      ];
      return nudges[Math.min(Math.max(attempts - 1, 0), nudges.length - 1)];
    }
    if (mode === "hard") {
      const nudges = [
        "아니아니, 그거 말고. 나도 지금 설명이 너무 뭉개지긴 했는데.",
        "아니 그쪽은 너무 멀어. 뭐였지, 단어가 목구멍까지 왔는데.",
        "좋아, 이제 좀 더 가까이 가볼게. 정신 붙잡아.",
        "야 이것도 모르냐. 똑바로 좀 생각해봐, 꽤 유명한 거야.",
        "아 답답해 죽겠네. 거의 이름표만 안 붙인 수준이잖아."
      ];
      return nudges[Math.min(Math.max(attempts - 1, 0), nudges.length - 1)];
    }
    if (mode === "challenge") {
      const nudges = [
        "아니아니, 그거 말고. 근데 이건 내가 설명을 너무 추상적으로 했지.",
        "그쪽은 아직 멀어. 조금씩 더 떠올려볼게.",
        "좋아, 이제 핵심 쪽으로 좀 들어간다.",
        "이것도 모르냐고 하기엔 어렵긴 한데, 그래도 똑바로 와 봐.",
        "거의 문 앞이야. 여기서 못 들어오면 좀 억울하다."
      ];
      return nudges[Math.min(Math.max(attempts - 1, 0), nudges.length - 1)];
    }
    const nudges = [
      "아니아니, 그거 말고. 나도 설명이 이상한데 너무 넓게 말했지.",
      "아니아니, 그거 말고. 뭐였지, 진짜 흔한 건데.",
      "좋아, 방금보다 조금 더 생각났어.",
      "야 이것도 모르냐. 똑바로 좀 생각해봐.",
      "아 답답해. 거의 다 말했잖아."
    ];
    return nudges[Math.min(Math.max(attempts - 1, 0), nudges.length - 1)];
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

  function submitGuess(game, guess, aiMessages) {
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
      next.messages.push(makeMessage("ai", "아."));
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
      next.messages.push(makeMessage("ai", "아."));
      next.messages.push(makeMessage("ai", `아! 이거 그거다 그거. ${game.word.answer}! 갑자기 기억났어. 와, 이걸 너한테 물어보고 있었네.`));
      return next;
    }

    const clue = clueForTurn(game.word, next.attempts);
    const generatedMessages = cleanAiMessages(aiMessages);
    if (generatedMessages.length > 0) {
      generatedMessages.forEach((message) => {
        next.messages.push(makeMessage("ai", message));
      });
      if (!includesClueDetail(generatedMessages, clue)) {
        next.messages.push(makeMessage("ai", `${playfulNudge(game.mode, next.attempts)} ${clue}`));
      }
      return next;
    }

    next.messages.push(makeMessage("ai", preludeForTurn(game.mode, next.attempts)));
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
    isCorrectGuess,
    getModeConfig,
    getInitialClue,
    modes
  };
})(globalThis);
