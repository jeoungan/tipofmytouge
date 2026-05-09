# Render 배포 메모

이 앱은 Render Web Service로 배포합니다. OpenAI API 키는 코드나 GitHub에 넣지 말고 Render의 Environment Variables에만 넣습니다.

## Render 설정

- Service Type: Web Service
- Repository: `https://github.com/jeoungan/tipofmytouge`
- Branch: `master`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`

## Environment Variables

Render 대시보드에서 아래 값을 넣습니다.

- `OPENAI_API_KEY`: 본인 OpenAI API 키
- `OPENAI_MODEL`: `gpt-5.2`
- `AI_RATE_LIMIT_WINDOW_MS`: `60000`
- `AI_RATE_LIMIT_MAX`: `20`

`OPENAI_API_KEY`는 절대 `.env`, `app.js`, `server.mjs`, GitHub README 등에 붙여넣지 마세요.

## 비용 안전장치

서버는 같은 IP 기준으로 1분에 20번까지만 OpenAI 답변 요청을 받습니다. 더 세게 막고 싶으면 Render에서 `AI_RATE_LIMIT_MAX`를 `10`처럼 낮추면 됩니다.
