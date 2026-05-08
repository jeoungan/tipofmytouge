import assert from "node:assert/strict";
import "./game-core.js";

const {
  createGame,
  submitGuess,
  normalizeGuess,
  getModeConfig,
  getInitialClue
} = globalThis.GameCore;

assert.equal(normalizeGuess("  의자요!! "), "의자");
assert.equal(normalizeGuess("괴델 불완전성 정리인가?"), "괴델불완전성정리");

assert.equal(getModeConfig("normal").maxReplies, 5);
assert.equal(getModeConfig("hard").maxReplies, 5);
assert.equal(getModeConfig("easy").maxReplies, null);
assert.equal(getModeConfig("challenge").maxReplies, null);

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
  let game = createGame("normal", 0);
  for (let index = 0; index < 5; index += 1) {
    game = submitGuess(game, `오답 ${index}`);
  }
  assert.equal(game.status, "failed");
  assert.equal(game.remainingReplies, 0);
  assert.equal(game.result.type, "failed");
  assert.match(game.messages.at(-1).text, /이걸 못 맞히네/);
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
  for (let index = 0; index < 8; index += 1) {
    game = submitGuess(game, `아니 ${index}`);
  }
  assert.equal(game.status, "playing");
  assert.equal(game.remainingReplies, null);
}

console.log("game-core tests passed");
