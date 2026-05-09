(function initApp() {
  const app = document.querySelector("#app");
  let game = null;
  let lastMode = "normal";
  let seedCounter = Math.floor(Math.random() * 100000);
  let inputOpen = false;
  let waitingForAi = false;
  let isComposingGuess = false;
  let gameRequestId = 0;
  const usedAnswersByMode = new Map();

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function usedAnswersFor(mode) {
    if (!usedAnswersByMode.has(mode)) {
      usedAnswersByMode.set(mode, new Set());
    }
    return usedAnswersByMode.get(mode);
  }

  function applyPreviousChallengeRecords(nextGame, previousGame) {
    if (nextGame.mode === "challenge" && previousGame?.mode === "challenge") {
      nextGame.challengeRecords = previousGame.challengeRecords;
    }
    return nextGame;
  }

  async function requestAiWord(mode, usedAnswers) {
    if (window.location.protocol === "file:") {
      return null;
    }

    try {
      const response = await fetch("/api/ai-word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode,
          usedAnswers: Array.from(usedAnswers).slice(-80)
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.word || null;
    } catch {
      return null;
    }
  }

  function createLocalManagedGame(mode, usedAnswers) {
    const wordCount = GameCore.getWordsForMode(mode).length;
    let selectedGame = null;
    let selectedSeed = seedCounter;

    for (let offset = 0; offset < wordCount; offset += 1) {
      const candidateSeed = seedCounter + offset;
      const candidate = GameCore.createGame(mode, candidateSeed);
      if (!usedAnswers.has(candidate.word.answer)) {
        selectedGame = candidate;
        selectedSeed = candidateSeed;
        break;
      }
    }

    selectedGame = selectedGame || GameCore.createGame(mode, seedCounter);
    seedCounter = selectedSeed + 1;
    return selectedGame;
  }

  async function createManagedGame(mode, previousGame = null) {
    const usedAnswers = usedAnswersFor(mode);
    const aiWord = await requestAiWord(mode, usedAnswers);
    let selectedGame = null;

    if (aiWord?.answer && !usedAnswers.has(aiWord.answer)) {
      try {
        selectedGame = GameCore.createGameFromWord(mode, aiWord);
      } catch {
        selectedGame = null;
      }
    }

    selectedGame = selectedGame || createLocalManagedGame(mode, usedAnswers);
    usedAnswers.add(selectedGame.word.answer);

    return applyPreviousChallengeRecords(selectedGame, previousGame);
  }

  function renderLoadingGame(mode) {
    app.innerHTML = `
      <div class="phone-frame-scene">
        <section class="phone chat-phone chat-room">
          <header class="chat-top">
            <button class="icon-button" data-action="back" aria-label="모드 선택으로 돌아가기">‹</button>
            <div class="chat-title-block">
              <strong>어휘력이 좋은 지 나쁜 지 모르겠는 놈</strong>
              <span class="header-meta">${GameCore.getModeConfig(mode).label} · 문제 고르는 중</span>
            </div>
            <div class="top-actions" aria-hidden="true">
              <span>⌕</span>
              <span>☰</span>
            </div>
          </header>
          <div class="chat-log" aria-label="대화 내용">
            <div class="date-chip">2026년 5월 8일 금요일</div>
            <div class="message-line ai">
              <div class="avatar default-profile" aria-hidden="true">
                <span class="profile-head"></span>
                <span class="profile-body"></span>
              </div>
              <div class="message-stack">
                <div class="bubble ai">아 잠깐만. 지금 머릿속에서 하나 꺼내는 중.</div>
                <span class="message-time">오전 9:16</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    app.querySelector('[data-action="back"]').addEventListener("click", returnToModePicker);
  }

  function returnToModePicker() {
    gameRequestId += 1;
    renderModePicker();
  }

  function renderModePicker(options = {}) {
    const withOpening = options.withOpening === true;
    const modes = GameCore.modes();
    const modeDescriptions = {
      easy: "장난? 장난은 계속 말해주마.",
      normal: "이게 진짜니까 딱 5번만 설명한다.",
      hard: "니가 5번 안에 맞출 수 있을까?",
      challenge: "계속 말해도 너는 못 맞출껄?"
    };
    const modeCards = modes
      .map((item) => {
        const iconText = item.label === "Challenge" ? "Ch" : item.label.slice(0, 1);
        return `
          <button class="mode-card ${item.mode}" data-mode="${item.mode}" aria-label="${escapeHtml(item.label)}">
            <span class="mode-icon" aria-hidden="true">${escapeHtml(iconText)}</span>
            <span class="mode-icon-label">
              <strong>${escapeHtml(item.label)}</strong>
            </span>
          </button>
        `;
      })
      .join("");
    const modeDetails = modes
      .map(
        (item) => `
          <div class="mode-description ${item.mode}">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(modeDescriptions[item.mode])}</span>
          </div>
        `
      )
      .join("");

    app.innerHTML = `
      ${
        withOpening
          ? `
            <div class="opening-screen" aria-hidden="true">
              <video class="opening-video" src="assets/opening.mp4" autoplay muted playsinline preload="auto"></video>
            </div>
          `
          : ""
      }
      <div class="phone-frame-scene ${withOpening ? "phone-frame-scene--behind-opening" : ""}">
        <section class="phone intro-phone">
          <div class="brand">
            <img class="intro-title-image" src="assets/intro-title.png" alt="아, 그거 뭐라고 하더라" />
            <p>답답한 친구가<br />설명하는 걸 맞혀봐</p>
          </div>
          <div class="mode-grid">
            ${modeCards}
          </div>
          <div class="mode-descriptions">
            ${modeDetails}
          </div>
          <div class="home-dock" aria-label="기본 앱">
            <span class="dock-icon phone-app" aria-hidden="true"></span>
            <span class="dock-icon message-app" aria-hidden="true"></span>
            <span class="dock-icon camera-app" aria-hidden="true"></span>
            <span class="dock-icon settings-app" aria-hidden="true"></span>
          </div>
        </section>
      </div>
    `;

    if (withOpening) {
      attachOpeningTransition();
    }

    app.querySelectorAll(".mode-card").forEach((button) => {
      button.addEventListener("click", () => {
        startGame(button.dataset.mode);
      });
    });
  }

  function attachOpeningTransition() {
    const opening = app.querySelector(".opening-screen");
    const video = app.querySelector(".opening-video");
    const scene = app.querySelector(".phone-frame-scene");
    if (!opening || !video || !scene) {
      return;
    }

    const finishOpening = () => {
      opening.classList.add("opening-screen--done");
      scene.classList.add("phone-frame-scene--revealed");
      window.setTimeout(() => {
        opening.remove();
      }, 720);
    };

    video.addEventListener("ended", finishOpening, { once: true });
    video.addEventListener("error", finishOpening, { once: true });

    const playRequest = video.play();
    if (playRequest) {
      playRequest.catch(finishOpening);
    }
  }

  async function startGame(mode) {
    const requestId = ++gameRequestId;
    lastMode = mode;
    renderLoadingGame(mode);
    const nextGame = await createManagedGame(mode);
    if (requestId !== gameRequestId) {
      return;
    }
    game = nextGame;
    inputOpen = false;
    renderGame();
  }

  async function nextStage() {
    const requestId = ++gameRequestId;
    const previousGame = game;
    waitingForAi = true;
    renderGame();
    const nextGame = await createManagedGame(lastMode, previousGame);
    if (requestId !== gameRequestId) {
      return;
    }
    game = nextGame;
    inputOpen = false;
    waitingForAi = false;
    renderGame();
  }

  async function requestAiReply(currentGame, guess) {
    if (window.location.protocol === "file:") {
      return null;
    }
    if (GameCore.isCorrectGuess(guess, currentGame.word)) {
      return null;
    }
    if (currentGame.remainingReplies === 1) {
      return null;
    }

    try {
      const response = await fetch("/api/ai-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: currentGame.mode,
          word: {
            answer: currentGame.word.answer,
            aliases: currentGame.word.aliases,
            clues: currentGame.word.clues
          },
          guess,
          history: currentGame.messages,
          attempts: currentGame.attempts + 1,
          remainingReplies:
            currentGame.remainingReplies === null ? null : currentGame.remainingReplies - 1
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return Array.isArray(data.messages) ? data.messages : null;
    } catch {
      return null;
    }
  }

  async function submitPlayerGuess(guess) {
    waitingForAi = true;
    inputOpen = false;
    renderGame();

    const aiMessages = await requestAiReply(game, guess);
    game = GameCore.submitGuess(game, guess, aiMessages);
    waitingForAi = false;
    inputOpen = false;
    renderGame();
  }

  function submitGuessFromForm(form) {
    const input = form.elements.guess;
    const guess = String(input.value || "").normalize("NFC").trim();
    if (!guess) {
      return;
    }
    submitPlayerGuess(guess);
  }

  function renderMessages() {
    return game.messages
      .map((message, index) => {
        const time = index === 0 ? "오전 9:16" : "";
        const avatar =
          message.sender === "ai"
            ? `
              <div class="avatar default-profile" aria-hidden="true">
                <span class="profile-head"></span>
                <span class="profile-body"></span>
              </div>
            `
            : "";
        const meta =
          time && message.sender === "ai"
            ? `<span class="message-time">${time}</span>`
            : "";
        return `
          <div class="message-line ${message.sender}">
            ${avatar}
            <div class="message-stack">
              <div class="bubble ${message.sender}">${escapeHtml(message.text)}</div>
              ${meta}
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderChallengeRecords() {
    if (game.challengeRecords.length === 0) {
      return "";
    }
    const records = game.challengeRecords
      .map((record) => `<span>${escapeHtml(record.answer)} · ${record.attempts}번</span>`)
      .join("");
    return `<div class="challengeRecords">${records}</div>`;
  }

  function renderStatusText() {
    if (game.remainingReplies === null) {
      return `${game.attempts}번 시도`;
    }
    return `남은 답변 ${game.remainingReplies}번`;
  }

  function renderResult() {
    if (!game.result) {
      return "";
    }
    const text =
      game.result.type === "correct"
        ? `${game.result.answer} · ${game.result.attempts}번 만에 맞힘`
        : `기억난 건 ${game.result.answer}`;

    return `<span>${escapeHtml(text)}</span>`;
  }

  function renderResultAction() {
    if (!game.result) {
      return "";
    }

    return `
      <div class="result-action ${game.result.type}">
        <div class="result ${game.result.type}">
          ${renderResult()}
        </div>
        <button class="next-button" data-action="next">다음 문제</button>
      </div>
    `;
  }

  function renderFloatingChoices() {
    if (game.status !== "playing" || waitingForAi) {
      return "";
    }

    if (inputOpen) {
      return "";
    }

    return `
      <div class="floating-choices" aria-label="답변 선택지">
        <button class="choice-button ghost" data-action="hint">모르겠는데?</button>
        <button class="choice-button primary" data-action="answer">답변 입력</button>
      </div>
    `;
  }

  function renderComposer() {
    return `
      <form class="input-panel composer-bar ${inputOpen ? "active" : "muted"}">
        <button class="round-button" type="button" aria-label="추가">+</button>
        <input
          name="guess"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          inputmode="text"
          enterkeyhint="send"
          lang="ko"
          placeholder="${waitingForAi ? "AI가 말 고르는 중..." : inputOpen ? "메시지 입력" : "AI가 말하는 중..."}"
          ${inputOpen && game.status === "playing" && !waitingForAi ? "" : "disabled"}
        />
        <button class="${inputOpen ? "send-button" : "round-button"}" data-action="composer-answer" ${inputOpen && game.status === "playing" && !waitingForAi ? "" : "disabled"}>
          ${inputOpen ? "전송" : "#"}
        </button>
      </form>
    `;
  }

  function renderControlDeck() {
    return `
      <div class="control-deck">
        ${renderResultAction()}
        ${renderFloatingChoices()}
        ${renderComposer()}
      </div>
    `;
  }

  function renderGame() {
    app.innerHTML = `
      <div class="phone-frame-scene">
        <section class="phone chat-phone chat-room">
          <header class="chat-top">
            <button class="icon-button" data-action="back" aria-label="모드 선택으로 돌아가기">‹</button>
            <div class="chat-title-block">
              <strong>어휘력이 좋은 지 나쁜 지 모르겠는 놈</strong>
              <span class="header-meta">${GameCore.getModeConfig(game.mode).label} · ${renderStatusText()}</span>
            </div>
            <div class="top-actions" aria-hidden="true">
              <span>⌕</span>
              <span>☰</span>
            </div>
          </header>
          ${renderChallengeRecords()}
          <div class="chat-log" id="chat-log" aria-label="대화 내용">
            <div class="date-chip">2026년 5월 8일 금요일</div>
            ${renderMessages()}
          </div>
          ${renderControlDeck()}
        </section>
      </div>
    `;

    const chatLog = app.querySelector("#chat-log");
    chatLog.scrollTop = chatLog.scrollHeight;

    app.querySelector('[data-action="back"]').addEventListener("click", returnToModePicker);
    app.querySelector('[data-action="next"]')?.addEventListener("click", nextStage);
    app.querySelector('[data-action="hint"]')?.addEventListener("click", () => {
      submitPlayerGuess("모르겠는데?");
    });
    app.querySelector('[data-action="answer"]')?.addEventListener("click", () => {
      inputOpen = true;
      renderGame();
    });

    const form = app.querySelector(".input-panel");
    const guessInput = app.querySelector(".input-panel input");
    guessInput?.addEventListener("compositionstart", () => {
      isComposingGuess = true;
    });
    guessInput?.addEventListener("compositionend", () => {
      isComposingGuess = false;
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (waitingForAi || !inputOpen || game.status !== "playing") {
        return;
      }
      form.elements.guess.blur();
      window.setTimeout(() => {
        if (isComposingGuess) {
          window.setTimeout(() => submitGuessFromForm(form), 40);
          return;
        }
        submitGuessFromForm(form);
      }, 0);
    });

    if (inputOpen && game.status === "playing" && !waitingForAi) {
      guessInput?.focus({ preventScroll: true });
    }
  }

  renderModePicker({ withOpening: true });
})();
