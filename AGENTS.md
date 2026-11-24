# 저장소 작업 지침

## 처음 저장소를 열었을 때

1. [PRD.md](PRD.md)의 목표, MVP 범위, 완료 기준을 먼저 읽는다.
2. [TodoList.md](TodoList.md)에서 A·B·공동 담당, 단계 번호, 이슈와 선행 작업을 확인한다.
3. 아래 저장소 작업 지침과 이슈의 완료 기준에 따라 작업을 진행한다.

## 작업 시작

- 이슈 본문에서 담당자, 완료 기준, 선행 작업을 확인한다. 승인된 작업 브랜치는 최신 `main`에서 만든다.
- 기존 계획(`PRD.md`, `TodoList.md`)에 없던 기능이나 요소를 추가할 때는 구현 전에 GitHub Issues에 새 이슈를 등록하고 [Projects 보드](https://github.com/orgs/Agent-Project-2/projects/3)에 연결한다. 이슈에는 추가 이유, 작업 범위, 완료 기준을 적는다.
- A는 AI 에이전트 실행 환경, NPC 성격·목표·비밀·기억·관계·소문, 자율 행동 판단, 대화 생성과 신뢰·압박에 따른 심문 대응을 담당한다. MCP 클라이언트·도구 호출과 Agent Skills도 맡는다.
- B는 게임 시각 디자인과 2D 픽셀 아트, 마을·현장·캐릭터, 플레이어와 NPC의 이동·상호작용, 게임 시간·이벤트·상태, 증거·수첩, 대화·심문 UI, 최종 추리·판정과 MCP 서버·게임 도구를 담당한다.
- A와 B는 세계관·진행 방식·사건·증거·NPC 초기 설정, 공통 데이터·API 계약, GitHub 운영·코드 리뷰, 회의록·의사결정 기록, 통합·최종 테스트·발표·시연을 공동으로 맡는다.
- B가 게임 규칙과 권한을 확인해 승인된 행동을 게임 상태에 반영하고, A는 공통 계약에 따라 에이전트가 사용할 정보를 읽고 행동을 요청한다. 담당 변경은 이슈 본문·Projects 보드의 담당 필드·`TodoList.md`에 함께 반영한다. 공동 이슈는 두 팀원이 산출물과 검증 범위를 이슈 본문에 적는다.
- 실제 사용자나 에이전트의 권한은 현재 세션에서 허용된 범위를 따른다. 검토 결과와 머지 승인은 별도로 기록한다.

## 코드 규칙

- B가 맡는 `game/`에서 `game/client/src/scenes`는 Phaser 장면, `game/client/src/features/investigation`은 조사·심문·수첩, `game/client/src/features/npc`는 마을·NPC UI를 둔다. `game/server/app/api`는 HTTP 라우트, `game/server/app/game`은 사건·게임 상태와 이벤트 규칙, `game/server/app/mcp`는 게임 MCP 서버와 도구를 둔다.
- A가 맡는 `agent/`에서 `agent/app/npc`는 NPC 프로필·기억·관계와 판단, `agent/app/mcp`는 MCP 클라이언트, `agent/app/skills`는 Agent Skills와 로딩 코드를 둔다.
- 공통 데이터·API·MCP 계약과 예시는 `shared/contracts`에 둔다. 테스트는 구현에 맞춰 `game/client/tests`, `game/server/tests`, `agent/tests`에 둔다. 공용 검사 스크립트와 설정은 `scripts/`, 회의록과 ADR은 `docs/`에 둔다.
- TypeScript는 값·함수에 `camelCase`, 클래스·타입에 `PascalCase`, 불변 상수에 `UPPER_SNAKE_CASE`, 소스 파일에 `kebab-case`를 쓴다. Python은 함수·모듈·변수에 `snake_case`, 클래스에 `PascalCase`, 상수에 `UPPER_SNAKE_CASE`를 쓴다. 외부 데이터 필드는 공통 계약의 이름을 따른다.
- 사건의 확정 사실은 서버에서 읽기 전용으로 관리한다. 플레이어 화면과 NPC에는 역할별로 접근 가능한 정보만 넘긴다. 에이전트 판단은 서버가 규칙과 권한을 확인한 뒤 상태에 반영한다.
- API 키는 서버 환경변수로 관리한다. 키, 원본 대화 파일, 개인 식별정보를 커밋하거나 이슈·PR에 첨부하지 않는다.

## 자동 검사

Node.js 24와 Python 3.12를 사용한다. 첫 실행 시 루트에서 다음 명령으로 도구를 설치한다.

```sh
npm --prefix scripts ci
python -m pip install -r scripts/requirements-dev.txt
```

PR을 올리기 전에 아래 검사와 해당 이슈의 기능 테스트를 실행하고 결과를 본문에 기록한다.

```sh
npm --prefix scripts run check
python -m ruff check --config scripts/pyproject.toml .
python -m ruff format --check --config scripts/pyproject.toml .
```

자동 수정은 `npm --prefix scripts run lint:fix`, `npm --prefix scripts run format`, `python -m ruff check --fix --config scripts/pyproject.toml .`, `python -m ruff format --config scripts/pyproject.toml .`을 사용한다. 검사에 실패하면 변경한 코드나 설정의 원인을 확인한다.

## 브랜치와 리뷰

- 브랜치는 `a/<이슈번호>-<작업명>` 또는 `b/<이슈번호>-<작업명>`으로 만든다. 작업명은 한국어로 쓰고 단어는 하이픈으로 연결한다. 숫자와 소문자 영문 기술명을 함께 쓸 수 있다. 예시는 `b/12-증거-조회-도구`다. 공동 이슈는 브랜치를 만드는 팀원의 접두사를 쓴다.
- 커밋 메시지의 제목과 PR 제목은 `type(scope): 요약`을 사용한다. `type`은 `feat`, `fix`, `docs` 등 기존 유형 식별자를 쓰고 `scope`, 요약, 본문의 설명은 한국어로 작성한다. `scope`는 생략할 수 있다. 예시는 `feat(수사): 증거 기록 추가`다.
- PR은 이슈 하나의 검증 가능한 변경 단위로 자주 올린다. 이슈의 일부만 구현한 PR은 본문에서 `Refs #번호`를 쓰고, 완료 기준을 충족하는 마지막 PR에서 `Closes #번호`를 쓴다.
- ChatGPT나 Codex가 직접 코드 리뷰를 작성할 때는 총평, 줄별 코멘트, 수정 요청과 재검토 결과를 모두 한국어로 작성한다. 팀원이 직접 작성하는 리뷰의 언어는 작성자가 정한다.
- 상대 팀원의 에이전트가 1차 리뷰를 보조한다. PR 작성자가 아닌 상대 팀원 1명이 GitHub에서 승인하고, 자동 검사가 모두 통과한 PR을 squash merge한다. 변경이 추가되면 다시 검토한다.
- 공유 계약·의존성·개발 범위를 변경할 때는 회의록에 결론과 후속 작업을 기록하고 관련 ADR에 결정 이유와 대안을 남긴다.

## 기록 위치

- PR 본문은 [PR 템플릿](.github/pull_request_template.md)을 사용한다.
- 회의록은 [회의록 양식](docs/meetings/TEMPLATE.md), 의사결정 기록은 [ADR 양식](docs/decisions/TEMPLATE.md)을 사용한다.
