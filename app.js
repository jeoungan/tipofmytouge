(function initApp() {
  const app = document.querySelector("#app");
  let game = null;
  let lastMode = "normal";
  let seedCounter = Math.floor(Math.random() * 100000);
  let inputOpen = false;
  let waitingForAi = false;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderModePicker() {
    const modeCards = GameCore.modes()
      .map((item) => {
        const iconText = item.label === "Challenge" ? "Ch" : item.label.slice(0, 1);
        return `
          <button class="mode-card ${item.mode}" data-mode="${item.mode}" aria-label="${escapeHtml(item.label)} ${escapeHtml(item.subtitle)}">
            <span class="mode-icon" aria-hidden="true">${escapeHtml(iconText)}</span>
            <span class="mode-icon-label">
              <strong>${escapeHtml(item.label)}</strong>
              <small>${escapeHtml(item.subtitle)}</small>
            </span>
          </button>
        `;
      })
      .join("");

    app.innerHTML = `
      <div class="phone-frame-scene">
        <section class="phone intro-phone">
          <div class="brand">
            <h1>아, 그거 뭐라 그러더라</h1>
            <p>답답한 친구가<br />설명하는 걸 맞혀봐</p>
          </div>
          <div class="mode-grid">
            ${modeCards}
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

    app.querySelectorAll(".mode-card").forEach((button) => {
      button.addEventListener("click", () => {
        startGame(button.dataset.mode);
      });
    });
  }

  function startGame(mode) {
    lastMode = mode;
    game = GameCore.createGame(mode, seedCounter);
    seedCounter += 1;
    inputOpen = false;
    renderGame();
  }

  function nextStage() {
    game = GameCore.createGame(lastMode, seedCounter);
    seedCounter += 1;
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

    app.querySelector('[data-action="back"]').addEventListener("click", renderModePicker);
    app.querySelector('[data-action="next"]')?.addEventListener("click", nextStage);
    app.querySelector('[data-action="hint"]')?.addEventListener("click", () => {
      submitPlayerGuess("모르겠는데?");
    });
    app.querySelector('[data-action="answer"]')?.addEventListener("click", () => {
      inputOpen = true;
      renderGame();
    });

    const form = app.querySelector(".input-panel");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.elements.guess;
      const guess = input.value.trim();
      if (!guess) {
        return;
      }
      submitPlayerGuess(guess);
    });

    app.querySelector(".input-panel input")?.focus();
  }

  renderModePicker();
})();
