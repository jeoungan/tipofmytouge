import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || readEnvFile().PORT || 3000);
const model = process.env.OPENAI_MODEL || readEnvFile().OPENAI_MODEL || "gpt-5.2";
const apiKey = process.env.OPENAI_API_KEY || readEnvFile().OPENAI_API_KEY;

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
    "Prefer progressive memory: early turns are broad and flustered; later turns mention more concrete material, use, location, parts, category, or examples.",
    "You may send a short filler message first, then send the actual thought as a separate chat bubble.",
    "The short filler should feel like the sentence is stuck, for example '아, 그그...' or '뭐였지.'",
    "Return ONLY JSON shaped like {\"messages\":[\"short filler\",\"actual chat\"]}.",
    "Use one to three messages. Each message must be Korean and short enough for a chat bubble."
  ].join("\n");
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
      return parsed.messages.map((message) => String(message || "").trim()).filter(Boolean).slice(0, 3);
    }
  } catch {
    // Fall through to a conservative single-bubble fallback.
  }
  const fallback = String(outputText || "").trim();
  return fallback ? [fallback] : [];
}

async function handleAiReply(request, response) {
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

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
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
    if (request.method === "POST" && request.url === "/api/ai-reply") {
      await handleAiReply(request, response);
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

server.listen(port, () => {
  console.log(`Game server running at http://localhost:${port}`);
  if (!apiKey) {
    console.log("OPENAI_API_KEY is missing. The game will use local fallback replies.");
  }
});
