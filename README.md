# AI 기반 적응형 사회 추리 게임

플레이어의 수사 방식이 주민의 기억·관계·행동에 영향을 주고, 서로 다른 단서를 따라 같은 사건의 진실을 찾는 PC 웹 추리 게임을 만든다. 사건 01 「돌아오지 말았어야 할 사람」의 웹 시연에서는 주민 4명을 만나고, 무연리 광장·구 마을 사무소·마을 기록관·하린의 카페·진료소를 조사할 수 있다. [탐색 장소 및 단서 경로](docs/game-design/cases/case-01/locations.md)

목적·사용자·기능·완성 기준은 [PRD](PRD.md), 상태·권한·연동 조건은 [상세 기능·기술 요구사항](docs/technical-requirements.md), 작업 번호·이슈·일정은 [TodoList](TodoList.md), 코드와 협업 규칙은 [AGENTS.md](AGENTS.md)에서 확인한다.

## 사건 01 플레이

Node.js 24로 저장소 루트에서 다음 명령을 실행한 뒤 같은 컴퓨터의 브라우저에서 `http://127.0.0.1:3000/`을 연다.

```sh
node game/mock/server.mjs
```

지도에서 **기록관 → 이동하여 조사 → 전화 회신철**을 선택해 통화 기록을 확보한다. 광장의 **강도현 → 증거 제시**에서 통화 기록을 건네고 자백 시각에 대한 진술을 듣는다. 수사 수첩에서 자료 출처·사건 시각·진술을 확인한다. **수사 수첩 → 새 조사**로 처음부터 다시 플레이할 수 있다.

시연 서버는 브라우저별 세션을 메모리에 보관한다. 새로고침하면 같은 조사를 이어가고, 서버를 종료하면 세션은 사라진다. 면담은 인물별 예시 응답을 사용한다. 실제 LLM·MCP·Skills 연동은 후속 작업이다. [게임 상태와 행동 계약](shared/contracts/README.md)

```sh
node --test game/client/tests/investigation.test.mjs
```

마을 지도·현장 5곳·주민 초상 및 스프라이트·UI 아이콘은 이번 작업에서 ChatGPT 이미지 생성으로 제작했다. 기록관에서 확보한 자료의 열람 화면은 기존 PixelLab 기록실 그림을 사용한다. 한글 픽셀 글꼴은 Galmuri11이다. [PixelLab 원본 커밋](https://github.com/Agent-Project-2/agent-proj/commit/e41248b02faea8053ef286a053a26f82499e76d6) · [글꼴 라이선스](game/client/assets/galmuri/LICENSE.txt)

## 개발·협업 상태

- A는 AI·NPC·Skills·MCP 클라이언트와 NPC 도구를, B는 게임·디자인·UI·게임 도구와 MCP 서버 기반을 담당하는 안이다. 공통 서버 등록·권한·연동 계약은 함께 검토한다.
- 실행 안내 #18은 A가 AI 설정·Skills·복구를, B가 게임 설치·실행·세션 초기화·검사를 작성하고 상대가 새 환경에서 재현한다. 각자의 실제 작성은 자신의 커밋·PR로 남긴다.
- [기여 기록](docs/contributions.md)은 A의 최초 아이디어와 B의 초기 환경·문서 작성, 이후 공동 작업을 구분한다. [ADR 0001](docs/decisions/0001-collaboration-boundaries.md)에 채택 대기 사항을 적는다.
- 내부 MVP 동결은 12/13, 코드 제출은 12/20 23:59 KST, 발표는 12/23이다. 12/21 00:00 이후 기능 코드 커밋은 금지되며 README·발표 자료만 보완한다.

## 폴더 구조

```text
ai-detective-game/
├── .github/        # GitHub Actions와 PR 양식
├── game/           # 팀원 B · 게임 시스템, UI, MCP 서버
├── agent/          # 팀원 A · NPC 에이전트, MCP 클라이언트, Agent Skills
├── shared/         # 공동 · 데이터와 API·MCP 계약
├── scripts/        # 공동 · 검사 스크립트와 개발 도구 설정
├── docs/           # 상세 요구사항·기여·협업 기록
│   ├── technical-requirements.md
│   ├── contributions.md
│   ├── meetings/   # 회의록
│   └── decisions/  # 의사결정 기록
├── AGENTS.md
├── PRD.md
├── TodoList.md
├── README.md
└── .gitignore
```

## 저장소 검사

Node.js 24와 Python 3.12를 사용한다. 저장소 최상위에서 다음 명령을 실행한다.

```sh
npm --prefix scripts ci
python -m pip install -r scripts/requirements-dev.txt
npm --prefix scripts run check
python -m ruff check --config scripts/pyproject.toml .
python -m ruff format --check --config scripts/pyproject.toml .
```
