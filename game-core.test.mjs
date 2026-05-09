import assert from "node:assert/strict";
import "./game-core.js";

const {
  createGame,
  createGameFromWord,
  submitGuess,
  normalizeGuess,
  getModeConfig,
  getWordsForMode,
  getInitialClue,
  isCorrectGuess
} = globalThis.GameCore;

assert.equal(normalizeGuess("  의자요!! "), "의자");
assert.equal(normalizeGuess("괴델 불완전성 정리인가?"), "괴델불완전성정리");
assert.equal(isCorrectGuess("체어", createGame("normal", 0).word), true);

{
  const generated = createGameFromWord("normal", {
    answer: "텀블러",
    aliases: ["보온병"],
    clues: ["아, 그 들고 다니는 거.", "카페에서 자주 보이는 그거."]
  });
  assert.equal(generated.word.answer, "텀블러");
  assert.equal(generated.word.aliases[0], "보온병");
  assert.equal(generated.messages[0].text, "아, 그 들고 다니는 거.");
  assert.equal(isCorrectGuess("보온병", generated.word), true);
}

assert.equal(getModeConfig("normal").maxReplies, 5);
assert.equal(getModeConfig("hard").maxReplies, 5);
assert.equal(getModeConfig("easy").maxReplies, null);
assert.equal(getModeConfig("challenge").maxReplies, null);

{
  const easyAnswers = new Set([0, 1, 2].map((index) => createGame("easy", index).word.answer));
  const normalAnswers = new Set([0, 1, 2].map((index) => createGame("normal", index).word.answer));
  const hardAnswers = new Set([0, 1, 2].map((index) => createGame("hard", index).word.answer));
  const challengeAnswers = new Set([0, 1, 2].map((index) => createGame("challenge", index).word.answer));
  assert.ok(easyAnswers.size >= 3);
  assert.ok(normalAnswers.size >= 3);
  assert.ok(hardAnswers.size >= 3);
  assert.ok(challengeAnswers.size >= 3);
  assert.ok(getWordsForMode("challenge").length >= 3);
  assert.deepEqual([...easyAnswers], ["우산", "고양이", "선글라스"]);
  assert.deepEqual([...normalAnswers], ["의자", "자전거", "엘리베이터"]);
  assert.deepEqual([...hardAnswers], ["르네상스", "블루투스", "테슬라"]);
}

{
  const game = createGame("normal", 0);
  assert.equal(game.mode, "normal");
  assert.equal(game.status, "playing");
  assert.equal(game.remainingReplies, 5);
  assert.equal(getInitialClue(game).sender, "ai");
}

{
  const game = createGame("normal", 0);
  const result = submitGuess(game, "체어");
  assert.equal(result.status, "won");
  assert.equal(result.result.type, "correct");
  assert.equal(result.result.answer, "의자");
  assert.equal(result.attempts, 1);
}

{
  const easyGame = createGame("easy", 0);
  const easyResult = submitGuess(easyGame, easyGame.word.answer);
  assert.match(easyResult.messages.at(-1).text, /ㄳ|고맙다/);

  const reactions = new Set();
  for (const [mode, answer] of [
    ["normal", "체어"],
    ["hard", "르네상스"],
    ["challenge", "괴델 불완전성 정리"]
  ]) {
    let game = createGame(mode, 0);
    game = submitGuess(game, "아닌데");
    const result = submitGuess(game, answer);
    const text = result.messages.at(-1).text;
    assert.equal(result.status, "won");
    assert.doesNotMatch(text, /너 좀 치네/);
    assert.doesNotMatch(text, /아 맞다! 그래/);
    reactions.add(text);
  }
  assert.ok(reactions.size >= 3);
}

{
  let game = createGame("normal", 0);
  const aiReplies = [];
  for (let index = 0; index < 5; index += 1) {
    game = submitGuess(game, `오답 ${index}`);
    aiReplies.push(game.messages.at(-1).text);
  }
  assert.match(aiReplies[0], /아니아니|그거 말고/);
  assert.match(aiReplies[0], /뭐였지|너무 넓다|설명이 이상한데/);
  assert.doesNotMatch(aiReplies[0], /사람들이|다리|책상/);
  assert.match(aiReplies[1], /아니아니|그거 말고/);
  assert.match(aiReplies[3], /이것도 모르냐|똑바로|정신 차려/);
  assert.match(aiReplies[3], /다리|책상|식탁|몸을 맡기/);
  assert.doesNotMatch(aiReplies.join("\n"), /정보|힌트|정답은|이거에 대한/);
  assert.equal(game.status, "failed");
  assert.equal(game.remainingReplies, 0);
  assert.equal(game.result.type, "failed");
  assert.match(game.messages.at(-1).text, /아! 이거 그거다 그거\. 의자!/);
  assert.match(game.messages.at(-1).text, /갑자기 기억났/);
  assert.doesNotMatch(game.messages.at(-1).text, /정답은/);
}

{
  const game = createGame("normal", 0);
  const result = submitGuess(game, "모르겠는데?", ["아, 그그...", "야 그거 말고. 새로 생각난 건 책상 근처에 붙어 다니는 그 물건이야."]);
  const newMessages = result.messages.slice(game.messages.length);
  assert.equal(newMessages[0].sender, "player");
  assert.equal(newMessages[1].sender, "ai");
  assert.equal(newMessages[2].sender, "ai");
  assert.match(newMessages[1].text, /아|그그|잠깐|뭐였/);
  assert.ok(newMessages[1].text.length <= 18);
  assert.match(newMessages[2].text, /야|답답|똑바로|아니아니|그거 말고/);
  assert.doesNotMatch(newMessages[2].text, /입니다|해주세요|알려드릴게/);
}

{
  const game = createGame("normal", 0);
  const result = submitGuess(game, "모르겠는데?", ["아, 그거??? 아니?? 방 안에 있는 거??"]);
  const aiText = result.messages.slice(game.messages.length + 1).map((message) => message.text).join("\n");
  assert.doesNotMatch(aiText, /\?{2,}/);
  assert.doesNotMatch(aiText, /\?.+\?/);
}

{
  const game = createGame("normal", 0);
  const result = submitGuess(game, "모르겠는데?", ["아, 그그...", "아 답답해. 말은 맴도는데 딱 안 나온다."]);
  const aiMessages = result.messages.slice(game.messages.length + 1).map((message) => message.text);
  assert.match(aiMessages.join("\n"), /방 안|자연스럽게|당연해서|이름이 안 나와/);
}

{
  let game = createGame("challenge", 0);
  game = submitGuess(game, "모르겠어");
  game = submitGuess(game, "괴델 불완전성 정리");
  assert.equal(game.status, "won");
  assert.deepEqual(game.challengeRecords, [{ answer: "괴델의 불완전성 정리", attempts: 2 }]);
}

{
  let game = createGame("easy", 0);
  const aiTexts = [];
  for (let index = 0; index < 8; index += 1) {
    game = submitGuess(game, `아니 ${index}`);
    aiTexts.push(...game.messages.slice(-2).filter((message) => message.sender === "ai").map((message) => message.text));
  }
  assert.equal(game.status, "playing");
  assert.equal(game.remainingReplies, null);
  const repeatedAiTexts = aiTexts.filter((text, index) => aiTexts.indexOf(text) !== index);
  assert.deepEqual(repeatedAiTexts, []);
}

console.log("game-core tests passed");
