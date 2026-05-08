import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");
const core = readFileSync("game-core.js", "utf8");
const server = readFileSync("server.mjs", "utf8");
const gitignore = readFileSync(".gitignore", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const setupGuide = readFileSync("OPENAI_SETUP.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.match(server, /OPENAI_API_KEY/);
assert.match(server, /https:\/\/api\.openai\.com\/v1\/responses/);
assert.match(server, /Authorization/);
assert.match(server, /Bearer \$\{apiKey\}/);
assert.match(server, /output_text/);
assert.match(server, /Do not reuse the same clue/);
assert.match(server, /short filler/);
assert.match(server, /tip-of-the-tongue/);

assert.match(app, /\/api\/ai-reply/);
assert.match(app, /requestAiReply/);
assert.match(app, /GameCore\.isCorrectGuess/);
assert.doesNotMatch(app, /OPENAI_API_KEY/);
assert.doesNotMatch(app, /api\.openai\.com/);
assert.doesNotMatch(core, /OPENAI_API_KEY/);
assert.doesNotMatch(core, /api\.openai\.com/);

assert.match(gitignore, /^\.env$/m);
assert.match(gitignore, /^node_modules$/m);
assert.match(envExample, /^OPENAI_API_KEY=$/m);
assert.match(envExample, /^OPENAI_MODEL=gpt-5\.2$/m);
assert.equal(packageJson.scripts.start, "node server.mjs");
assert.match(setupGuide, /브라우저에 넣지 않습니다/);
assert.match(setupGuide, /절대 하지 말 것/);
assert.match(setupGuide, /\.env/);

console.log("server static tests passed");
