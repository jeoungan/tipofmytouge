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

assert.match(css, /\.phone/);
assert.match(css, /\.bubble\.ai/);
assert.match(css, /\.bubble\.player/);
assert.match(css, /@media/);

console.log("html static tests passed");
