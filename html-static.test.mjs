import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("app.js", "utf8");
const css = readFileSync("styles.css", "utf8");

assert.match(html, /<html lang="ko">/);
assert.match(html, /아, 그거 뭐라 그러더라/);
assert.match(html, /<script src="game-core\.js"><\/script>/);
assert.match(html, /<script src="app\.js"><\/script>/);

assert.match(app, /GameCore\.createGame/);
assert.match(app, /GameCore\.submitGuess/);
assert.match(app, /mode-card/);
assert.match(app, /challengeRecords/);
assert.match(app, /모르겠는데\?/);
assert.match(app, /답변 입력/);
assert.match(app, /data-action="hint"/);
assert.match(app, /data-action="answer"/);
assert.match(app, /input-panel/);
assert.match(app, /chat-room/);
assert.match(app, /floating-choices/);
assert.match(app, /composer-bar/);
assert.match(app, /AI가 말하는 중/);

assert.match(css, /\.phone/);
assert.match(css, /\.bubble\.ai/);
assert.match(css, /\.bubble\.player/);
assert.match(css, /\.input-panel/);
assert.match(css, /\.chat-room/);
assert.match(css, /\.floating-choices/);
assert.match(css, /\.composer-bar/);
assert.match(css, /background: #b7d3e9/);
assert.doesNotMatch(css, /background: #050505/);
assert.match(css, /@media/);

console.log("html static tests passed");
