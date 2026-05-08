# OpenAI 연결 안전 설정

이 프로젝트는 OpenAI API 키를 브라우저에 넣지 않습니다.
키는 로컬 서버의 `.env` 파일에서만 읽고, 브라우저는 `/api/ai-reply`로 서버에 요청만 보냅니다.

## 네가 해야 할 일

1. OpenAI Platform에서 API 키를 만든다.
2. 이 폴더에서 `.env.example`을 복사해 `.env` 파일을 만든다.
3. `.env`에 키를 넣는다.

```env
OPENAI_API_KEY=여기에_네_API_키
OPENAI_MODEL=gpt-5.2
PORT=3000
```

4. 서버를 실행한다.

```powershell
npm start
```

5. 브라우저에서 연다.

```text
http://localhost:3000
```

## 절대 하지 말 것

- `OPENAI_API_KEY`를 `index.html`, `app.js`, `game-core.js`에 넣지 말 것.
- `.env` 파일을 GitHub, 카톡, 이메일, 스크린샷으로 공유하지 말 것.
- 다른 사람과 같은 API 키를 같이 쓰지 말 것.
- 키가 노출됐다고 의심되면 바로 삭제하고 새 키를 만들 것.

## 지금 구조

```text
브라우저
  -> /api/ai-reply
  -> server.mjs
  -> OpenAI Responses API
  -> server.mjs
  -> 브라우저
```

브라우저에는 OpenAI API 주소나 API 키가 들어가지 않습니다.

## 참고

현재 버전은 API 키 보호를 우선으로 한 연결 단계입니다. 정답 데이터는 아직 브라우저에도 들어 있으므로, 공개 배포용으로 정답 유출까지 막으려면 다음 단계에서 게임 상태와 정답 선택도 서버로 옮기는 것이 좋습니다.
