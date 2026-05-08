(function initApp() {
  const app = document.querySelector("#app");
  let game = null;
  let lastMode = "normal";
  let seedCounter = 0;

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
      .map(
        (item) => `
          <button class="mode-card" data-mode="${item.mode}">
            <strong>${item.label}</strong>
            <span>${item.subtitle}</span>
          </button>
        `
      )
      .join("");

    app.innerHTML = `
      <section class="phone intro-phone">
        <div class="brand">
          <span>OpenAI 말고도 일단</span>
          <h1>아, 그거 뭐라 그러더라</h1>
          <p>말을 못 하는 친구가 설명하는 걸 맞혀봐.</p>
        </div>
        <div class="mode-grid">
          ${modeCards}
        </div>
      </section>
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
    renderGame();
  }

  function nextStage() {
    game = GameCore.createGame(lastMode, seedCounter);
    seedCounter += 1;
    renderGame();
  }

  function renderMessages() {
    return game.messages
      .map(
        (message) => `
          <div class="message-line ${message.sender}">
            <div class="bubble ${message.sender}">${escapeHtml(message.text)}</div>
          </div>
        `
      )
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
        : `정답은 ${game.result.answer}`;

    return `
      <div class="result ${game.result.type}">
        <span>${escapeHtml(text)}</span>
        <button class="small-button" data-action="next">다음 문제</button>
      </div>
    `;
  }

  function renderGame() {
    app.innerHTML = `
      <section class="phone chat-phone">
        <header class="chat-top">
          <button class="icon-button" data-action="back" aria-label="모드 선택으로 돌아가기">‹</button>
          <div>
            <strong>${GameCore.getModeConfig(game.mode).label}</strong>
            <span>${renderStatusText()}</span>
          </div>
        </header>
        ${renderChallengeRecords()}
        <div class="chat-log" id="chat-log">
          ${renderMessages()}
        </div>
        ${renderResult()}
        <form class="composer">
          <input name="guess" autocomplete="off" placeholder="답을 입력해봐" ${game.status === "playing" ? "" : "disabled"} />
          <button ${game.status === "playing" ? "" : "disabled"}>전송</button>
        </form>
      </section>
    `;

    const chatLog = app.querySelector("#chat-log");
    chatLog.scrollTop = chatLog.scrollHeight;

    app.querySelector('[data-action="back"]').addEventListener("click", renderModePicker);
    app.querySelector('[data-action="next"]')?.addEventListener("click", nextStage);

    const form = app.querySelector(".composer");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.elements.guess;
      const guess = input.value.trim();
      if (!guess) {
        return;
      }
      game = GameCore.submitGuess(game, guess);
      renderGame();
      const nextInput = app.querySelector(".composer input");
      nextInput?.focus();
    });

    app.querySelector(".composer input")?.focus();
  }

  renderModePicker();
})();
