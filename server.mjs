import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const envFile = readEnvFile();
const host = process.env.HOST || envFile.HOST || "0.0.0.0";
const port = Number(process.env.PORT || envFile.PORT || 3000);
const model = process.env.OPENAI_MODEL || envFile.OPENAI_MODEL || "gpt-5.2";
const apiKey = process.env.OPENAI_API_KEY || envFile.OPENAI_API_KEY;
const aiRateLimitWindowMs = Math.max(Number(process.env.AI_RATE_LIMIT_WINDOW_MS || envFile.AI_RATE_LIMIT_WINDOW_MS || 60_000), 1_000);
const aiRateLimitMax = Math.max(Number(process.env.AI_RATE_LIMIT_MAX || envFile.AI_RATE_LIMIT_MAX || 20), 1);
const aiRateBuckets = new Map();

function readEnvFile() {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((values, line) => {
      const separator = line.indexOf("=");
      if (separator === -1) {
        return values;
      }
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/gu, "");
      values[key] = value;
      return values;
    }, {});
}

function jsonResponse(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 80_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function clientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.socket.remoteAddress || "unknown";
}

function isAiRateLimited(request) {
  const now = Date.now();
  for (const [ip, bucket] of aiRateBuckets) {
    if (now >= bucket.resetAt) {
      aiRateBuckets.delete(ip);
    }
  }

  const ip = clientIp(request);
  const current = aiRateBuckets.get(ip);

  if (!current || now >= current.resetAt) {
    aiRateBuckets.set(ip, {
      count: 1,
      resetAt: now + aiRateLimitWindowMs
    });
    return { limited: false };
  }

  if (current.count >= aiRateLimitMax) {
    return {
      limited: true,
      retryAfter: Math.max(Math.ceil((current.resetAt - now) / 1000), 1)
    };
  }

  current.count += 1;
  return { limited: false };
}

function rateLimitResponse(response, retryAfter) {
  response.writeHead(429, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Retry-After": String(retryAfter)
  });
  response.end(JSON.stringify({
    error: "Too many AI requests. Wait a bit and try again."
  }));
}

function trimHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }
  return history.slice(-12).map((message) => ({
    sender: message.sender === "player" ? "player" : "ai",
    text: String(message.text || "").slice(0, 500)
  }));
}

function buildInstructions() {
  return [
    "You are the AI friend in a Korean chat word guessing game.",
    "You know the target answer, but you are role-playing a tip-of-the-tongue state.",
    "The player is your friend, not a quiz contestant.",
    "Use casual Korean banter. You may sound rough, impatient, and teasing, but do not become cruel or hateful.",
    "Do not say the target answer or aliases before the reveal.",
    "Do not say \"정보\". Do not say \"힌트\". Do not say \"정답은\". Do not say \"이거에 대한\" in character.",
    "Do not reuse the same clue as the main content of a later turn; use the conversation history so each new response adds a fresh angle.",
    "Every non-filler response must include one concrete clue about appearance, use, location, material, category, brand, origin, or a common situation.",
    "Do not send only emotional stalling like '아 답답해' without a concrete clue.",
    "Do not sprinkle question marks between phrases. Use at most one question mark in the whole response, and prefer periods or commas.",
    "Prefer progressive memory: early turns are broad and flustered; later turns mention more concrete material, use, location, parts, category, or examples.",
    "You may send a short filler message first, then send the actual thought as a separate chat bubble.",
    "The short filler should feel like the sentence is stuck, for example '아, 그그...' or '뭐였지.'",
    "Return ONLY JSON shaped like {\"messages\":[\"short filler\",\"actual chat\"]}.",
    "Use one to three messages. Each message must be Korean and short enough for a chat bubble."
  ].join("\n");
}

function buildWordInstructions() {
  return [
    "You create target answers for a Korean tip-of-the-tongue chat guessing game.",
    "Return ONLY JSON shaped like {\"word\":{\"answer\":\"...\",\"aliases\":[\"...\"],\"clues\":[\"...\",\"...\",\"...\",\"...\",\"...\"]}}.",
    "The answer must be a concrete word, name, object, concept, brand, person, place, work, theory, technology, or term that can be guessed.",
    "Do not choose any item in usedAnswers, including close spelling variants.",
    "Easy: common everyday words almost anyone knows.",
    "Normal: common words or concepts a normal person can name.",
    "Hard: somewhat harder general knowledge, famous brands, terms, works, places, or concepts.",
    "Challenge: difficult expert-ish knowledge, but still a real named thing that can be answered.",
    "Write all clues in Korean casual speech from the friend who knows the answer but suddenly cannot say it.",
    "Clue 1 must be broad and flustered. Each later clue must add a new concrete detail.",
    "Do not reveal the answer or aliases inside the clues.",
    "Do not say meta phrases like '정답은', '힌트', '정보를 풀게', or '문제'.",
    "Use five or more clues. Keep each clue short enough for a chat bubble."
  ].join("\n");
}

function modeWordBrief(mode) {
  const briefs = {
    easy: "everyday object, animal, food, place, or simple concept",
    normal: "common object, vehicle, appliance, tool, public place, or everyday concept",
    hard: "famous brand, cultural term, historical period, technology, science term, work, or well-known person",
    challenge: "advanced theorem, scientific concept, historical document, niche technology, philosophy term, artwork, or named phenomenon"
  };
  return briefs[mode] || briefs.normal;
}

function sanitizeUsedAnswers(usedAnswers) {
  if (!Array.isArray(usedAnswers)) {
    return [];
  }
  return usedAnswers.map((answer) => String(answer || "").normalize("NFC").trim()).filter(Boolean).slice(-80);
}

function buildWordInput(payload) {
  return {
    mode: payload.mode,
    difficulty: modeWordBrief(payload.mode),
    usedAnswers: sanitizeUsedAnswers(payload.usedAnswers)
  };
}

function parseJsonObject(outputText) {
  const text = String(outputText || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Model did not return JSON.");
  }
}

function normalizeAnswerKey(value) {
  return String(value || "")
    .normalize("NFC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function parseGeneratedWord(outputText, payload) {
  const parsed = parseJsonObject(outputText);
  const rawWord = parsed.word || parsed;
  const answer = String(rawWord.answer || "").normalize("NFC").trim();
  const aliases = Array.isArray(rawWord.aliases)
    ? rawWord.aliases.map((alias) => String(alias || "").normalize("NFC").trim()).filter(Boolean).slice(0, 8)
    : [];
  const clues = Array.isArray(rawWord.clues)
    ? rawWord.clues.map((clue) => sanitizeQuestionMarks(String(clue || "").normalize("NFC").trim())).filter(Boolean).slice(0, 8)
    : [];
  const answerKey = normalizeAnswerKey(answer);
  const usedKeys = new Set(sanitizeUsedAnswers(payload.usedAnswers).map(normalizeAnswerKey));

  if (!answer || answer.length > 60 || usedKeys.has(answerKey) || clues.length < 5) {
    throw new Error("Generated word payload is incomplete or repeated.");
  }

  const blockedKeys = [answer, ...aliases].map(normalizeAnswerKey).filter((key) => key.length >= 2);
  if (clues.some((clue) => {
    const clueKey = normalizeAnswerKey(clue);
    return blockedKeys.some((blockedKey) => clueKey.includes(blockedKey));
  })) {
    throw new Error("Generated clues revealed the answer.");
  }

  return {
    answer,
    aliases,
    clues
  };
}

function fallbackClueForPayload(payload) {
  const clues = Array.isArray(payload.word?.clues) ? payload.word.clues : [];
  if (clues.length === 0) {
    return "아니, 뭔가 손에 잡히는 특징이 있긴 한데 말이 안 나온다.";
  }
  const index = Math.min(Math.max(Number(payload.attempts || 1), 1), clues.length - 1);
  return clues[index] || clues.at(-1);
}

function buildInput(payload) {
  return {
    mode: payload.mode,
    answer: payload.word?.answer,
    aliases: payload.word?.aliases || [],
    existingClues: payload.word?.clues || [],
    fallbackClue: fallbackClueForPayload(payload),
    playerGuess: payload.guess,
    attempts: payload.attempts,
    remainingReplies: payload.remainingReplies,
    conversationHistory: trimHistory(payload.history)
  };
}

function parseModelMessages(outputText) {
  try {
    const parsed = JSON.parse(outputText);
    if (Array.isArray(parsed.messages)) {
      return parsed.messages.map((message) => sanitizeQuestionMarks(String(message || "").trim())).filter(Boolean).slice(0, 3);
    }
  } catch {
    // Fall through to a conservative single-bubble fallback.
  }
  const fallback = sanitizeQuestionMarks(String(outputText || "").trim());
  return fallback ? [fallback] : [];
}

function sanitizeQuestionMarks(text) {
  const questionCount = (text.match(/\?/gu) || []).length;
  if (questionCount <= 1) {
    return text.replace(/\?{2,}/gu, "?");
  }
  return text.replace(/\?+/gu, ".");
}

async function handleAiReply(request, response) {
  const rateLimit = isAiRateLimited(request);
  if (rateLimit.limited) {
    rateLimitResponse(response, rateLimit.retryAfter);
    return;
  }

  if (!apiKey) {
    jsonResponse(response, 503, {
      error: "OPENAI_API_KEY is not configured. Create .env from .env.example and restart the server."
    });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    jsonResponse(response, 400, { error: "Invalid JSON body." });
    return;
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      instructions: buildInstructions(),
      input: JSON.stringify(buildInput(payload))
    })
  });

  if (!openAiResponse.ok) {
    const detail = await openAiResponse.text();
    jsonResponse(response, 502, {
      error: "OpenAI request failed.",
      detail: detail.slice(0, 500)
    });
    return;
  }

  const data = await openAiResponse.json();
  const messages = parseModelMessages(data.output_text || "");
  jsonResponse(response, 200, {
    messages: messages.length > 0 ? messages : ["아, 그그...", fallbackClueForPayload(payload)]
  });
}

async function handleAiWord(request, response) {
  const rateLimit = isAiRateLimited(request);
  if (rateLimit.limited) {
    rateLimitResponse(response, rateLimit.retryAfter);
    return;
  }

  if (!apiKey) {
    jsonResponse(response, 503, {
      error: "OPENAI_API_KEY is not configured. The game will use local fallback words."
    });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    jsonResponse(response, 400, { error: "Invalid JSON body." });
    return;
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      instructions: buildWordInstructions(),
      input: JSON.stringify(buildWordInput(payload))
    })
  });

  if (!openAiResponse.ok) {
    const detail = await openAiResponse.text();
    jsonResponse(response, 502, {
      error: "OpenAI word request failed.",
      detail: detail.slice(0, 500)
    });
    return;
  }

  const data = await openAiResponse.json();
  try {
    jsonResponse(response, 200, {
      word: parseGeneratedWord(data.output_text || "", payload)
    });
  } catch (error) {
    jsonResponse(response, 502, {
      error: error.message || "Invalid generated word."
    });
  }
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png"
};

async function serveStatic(request, response) {
  const url = new URL(request.url, "http://localhost");
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(rootDir, `.${requestedPath}`);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/healthz") {
      jsonResponse(response, 200, { ok: true });
      return;
    }
    if (request.method === "POST" && request.url === "/api/ai-reply") {
      await handleAiReply(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/ai-word") {
      await handleAiWord(request, response);
      return;
    }
    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }
    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    jsonResponse(response, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Game server running at http://${host}:${port}`);
  if (!apiKey) {
    console.log("OPENAI_API_KEY is missing. The game will use local fallback replies.");
  }
});
