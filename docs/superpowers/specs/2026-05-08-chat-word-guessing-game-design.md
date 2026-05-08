# Chat Word Guessing Game Design

## Summary

Build a single-player web game where the player chats with an OpenAI-powered host who is trying to describe a hidden word in a funny, vague, "wait, what was that called again?" style. The player guesses the word through a KakaoTalk-like mobile chat UI.

The game should be easy for other people to play through a web browser. The first version is a focused MVP: no accounts, no multiplayer, no global leaderboard, and no payment flow.

## Core Experience

The player opens the web game, chooses a mode, and enters a phone-sized chat screen. The AI host sends the first vague clue. The player replies freely in the chat input. Each turn, the server checks whether the player's message is a correct guess, updates the stage state, and asks OpenAI to generate the next in-character response when needed.

The intended tone is playful and casual Korean banter:

- The AI feels like a mischievous friend, not a teacher.
- The AI knows the target word, but is role-playing a tip-of-the-tongue moment: it can almost remember the word and is asking a friend for help.
- The AI starts with broad, funny, sometimes annoyingly vague clues.
- In early turns, the AI should be flustered and vague, often reacting with "아니아니, 그거 말고" while admitting its own description is too broad.
- In later turns, the AI should release more concrete facts and become slightly irritated, opening with lines like "야 이것도 모르냐" or "똑바로 좀 생각해봐".
- The player can push back, complain, or guess normally.
- The AI reacts to the player's message while still moving the game forward.
- When the player fails in limited modes, the AI lightly teases them and moves to the next stage.

## Modes

### Easy

Easy mode prioritizes funny conversation over winning.

- Word difficulty: common everyday words.
- AI responses: unlimited.
- Scoring: no scoring in the MVP.
- Failure: no hard failure state.
- Goal: make the player laugh at how weirdly the AI explains simple things.

### Normal

Normal mode is the main rules-based mode.

- Word difficulty: common or moderately familiar words.
- AI responses after the initial clue: 5 maximum.
- Win condition: player guesses the answer before the response limit ends.
- Failure condition: player does not guess within the limit.
- Failure response: the AI gives a light teasing message, then acts as if the word suddenly came back to memory, e.g. "아! 이거 그거다 그거. 의자!", and advances to the next stage.

### Hard

Hard mode uses the same structure as Normal, but with harder words and messier clues.

- Word difficulty: higher general knowledge.
- AI responses after the initial clue: 5 maximum.
- Win condition: player guesses within the response limit.
- Failure condition: player does not guess within the limit.
- AI style: more indirect, more rambling, and less immediately useful than Normal.

### Challenge

Challenge mode is for difficult high-knowledge words.

- Word difficulty: advanced knowledge.
- AI responses: unlimited.
- Win condition: player eventually guesses the answer.
- Scoring: record the answer word and number of player attempts.
- Goal: make a compact personal record of hard solved words.

## Architecture

Use a web app with a server-side API. The server owns the game state and OpenAI integration.

### Frontend

Responsibilities:

- Render the mode selection screen.
- Render a mobile-first KakaoTalk-like chat interface.
- Show AI and player chat bubbles.
- Show remaining responses for Normal and Hard.
- Show Challenge records for solved words and attempt counts.
- Send player messages to the server.
- Render loading, error, success, and stage transition states.

The frontend should not contain the OpenAI API key or trusted game answers.

### Server

Responsibilities:

- Start sessions.
- Select hidden words by mode.
- Store per-session state.
- Track attempts and remaining AI responses.
- Check whether a player message is a correct guess.
- Call OpenAI to generate the next host message.
- Prevent the AI from leaking forbidden answer terms.
- Return clean structured responses to the frontend.

The first version can store sessions in server memory. This keeps the MVP simple. A later version can move sessions, records, and leaderboards into a database.

## Data Model

The MVP should keep word data in JSON files. Each word entry should include:

- `answer`: canonical answer.
- `aliases`: acceptable alternate answers.
- `mode`: lowercase enum: `easy`, `normal`, `hard`, or `challenge`.
- `category`: broad category for organization.
- `facts`: safe facts the AI can use as clue material.
- `forbiddenWords`: answer words and too-direct terms the AI should avoid saying before reveal.

Example:

```json
{
  "answer": "의자",
  "aliases": ["체어", "좌석"],
  "mode": "normal",
  "category": "household_item",
  "facts": [
    "집이나 실내에 흔히 있다",
    "나무, 철, 플라스틱으로 만들 수 있다",
    "사람이 앉는 데 쓴다",
    "대체로 다리가 있고 튼튼하다"
  ],
  "forbiddenWords": ["의자", "체어", "앉는 물건", "좌석"]
}
```

## Game Flow

1. Player selects a mode.
2. Server creates a session and selects a word for that mode.
3. Server asks OpenAI for the initial vague clue.
4. Frontend displays the AI's clue.
5. Player sends a message.
6. Server checks whether the message is a correct guess.
7. If correct, server returns a success response and mode-specific stage result.
8. If incorrect and the mode still allows more responses, server asks OpenAI for the next clue or reaction.
9. If incorrect and the mode limit is exhausted, server has the AI suddenly remember the answer in-character with a playful teasing message and advances to the next stage.

## Answer Checking

Answer checking should be server controlled.

Primary checks:

- Normalize whitespace and punctuation.
- Compare against the canonical answer.
- Compare against aliases.
- Allow short Korean particles around guesses when the intended answer is clear.

Fallback check:

- For ambiguous guesses, ask OpenAI only whether the player's guess should count as the target answer.
- The fallback should return structured JSON such as `{ "isCorrect": true, "reason": "..." }`.
- The fallback must not decide scoring rules, pick new words, or change mode state.

## OpenAI Prompting

The server should provide OpenAI with:

- The current mode.
- The hidden answer.
- Allowed facts.
- Forbidden words.
- Conversation history.
- Remaining response count when applicable.
- A strict instruction to stay in playful Korean chat style.

The host should:

- Use casual Korean banter.
- Sound like a mischievous friend.
- Role-play someone who knows the word but is in a tip-of-the-tongue state and is asking the player because the word will not come out.
- Build the chat from allowed facts while staying fully in character.
- Pace what the AI remembers progressively: early turns stay broad and confused; later turns naturally mention concrete details such as material, use, nearby objects, parts, or category.
- Use reaction tone by turn: early turns should be self-aware and corrective ("아니아니, 그거 말고"); later turns should be more impatient ("이것도 모르냐", "똑바로 좀 생각해봐") while staying playful.
- React to the player naturally.
- Avoid saying the answer or forbidden words until reveal.
- When revealing after a failed limited stage, never say "정답은 ..." or sound like a quiz judge; instead sound like the word suddenly came back: "아! 이거 그거다 그거. [answer]!"
- Do not say "정보". Do not say "힌트". Do not say "정답은". Do not say "이거에 대한" in character.
- Do not announce that you are giving clues, releasing information, or explaining game progress; speak like the word is slowly coming back.
- Avoid breaking character with meta explanations about prompts, APIs, or system rules.

Mode-specific style:

- Easy: funny, generous, loose.
- Normal: playful but reasonably helpful.
- Hard: more rambling, indirect, and slightly annoying.
- Challenge: difficult but still fair over time.

## API Shape

Suggested endpoints:

- `POST /api/sessions`: create a new game session with a mode.
- `POST /api/sessions/:id/messages`: submit a player message and receive the next game update.
- `POST /api/sessions/:id/next`: advance to the next stage after success or failure.
- `GET /api/health`: simple server health check.

Suggested response shape:

```json
{
  "sessionId": "abc123",
  "mode": "normal",
  "messages": [
    {
      "sender": "ai",
      "text": "야, 그거 있잖아..."
    }
  ],
  "stage": {
    "status": "playing",
    "remainingResponses": 4,
    "attempts": 2
  },
  "result": null
}
```

## Error Handling

If OpenAI generation fails:

- Keep the current session state intact.
- Return a friendly retryable error to the frontend.
- Let the player resend or retry the turn.

If the model leaks a forbidden word before reveal:

- Retry generation once with a stricter instruction.
- If it still leaks, fall back to a template clue generated by the server.

If a session is missing or expired:

- Ask the frontend to return to mode selection or start a new session.

## Testing

Core tests:

- Mode configuration has correct limits.
- Normal and Hard fail after 5 AI responses after the initial clue.
- Easy and Challenge have no response limit.
- Challenge records answer and attempt count after success.
- Alias and normalized answer checks work.
- Forbidden words are detected in generated AI output.
- API session flow returns expected structured data.

Manual browser checks:

- Mobile chat layout fits narrow phone widths.
- Long Korean messages wrap cleanly.
- Mode selection is usable on mobile.
- Loading and failure states do not overlap the input.
- Challenge records are readable after several solved words.

## Out of Scope For MVP

- Multiplayer rooms.
- User accounts.
- Global leaderboards.
- Paid subscriptions.
- Admin dashboard.
- Persistent cloud database.
- App store mobile app.

## Future Extensions

- Public share card for funny conversations.
- Daily Challenge word.
- Local or global leaderboard.
- Custom word packs.
- Admin page for editing words and AI personality.
- Multiplayer race mode where several players guess the same clue stream.
