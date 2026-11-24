# 저장소 작업 지침

## 처음 저장소를 열었을 때

1. [PRD.md](PRD.md)의 목표, MVP 범위, 완료 기준을 먼저 읽는다.
2. [TodoList.md](TodoList.md)에서 팀원이 지정한 A/B 역할, 단계 번호, 이슈와 선행 작업을 확인한다.
3. 아래 저장소 작업 지침과 이슈의 완료 기준에 따라 작업을 진행한다.

## 작업 시작

- 이슈 본문에서 담당자, 완료 기준, 선행 작업을 확인한다. 승인된 작업 브랜치는 최신 `main`에서 만든다.
- 기존 계획(`PRD.md`, `TodoList.md`)에 없던 기능이나 요소를 추가할 때는 구현 전에 GitHub Issues에 새 이슈를 등록하고 [Projects 보드](https://github.com/orgs/Agent-Project-2/projects/3)에 연결한다. 이슈에는 추가 이유, 작업 범위, 완료 기준을 적는다.
- A는 수사·심문·증거·추리를, B는 NPC 기억·관계·자율 행동과 마을을 담당한다. 공통 타입이나 API를 바꿀 때는 먼저 상대 팀원과 계약을 맞추고 관련 이슈를 연결한다.
- 실제 사용자나 에이전트의 권한은 현재 세션에서 허용된 범위를 따른다. 검토 결과와 머지 승인은 별도로 기록한다.

## 코드 규칙

- `client/src/scenes`는 Phaser 장면, `client/src/features/investigation`은 조사·심문·수첩, `client/src/features/npc`는 마을·NPC UI를 둔다.
- `server/app/api`는 HTTP 라우트, `server/app/game`은 사건·상태 규칙, `server/app/npc`는 NPC 상태와 이벤트, `server/app/mcp`는 도구, `server/app/skills`는 게임 런타임 Skill과 로딩 코드를 둔다. 계약과 예시는 `docs/contracts`, 테스트는 `client/tests`와 `server/tests`에 둔다.
- TypeScript는 값·함수에 `camelCase`, 클래스·타입에 `PascalCase`, 불변 상수에 `UPPER_SNAKE_CASE`, 소스 파일에 `kebab-case`를 쓴다. Python은 함수·모듈·변수에 `snake_case`, 클래스에 `PascalCase`, 상수에 `UPPER_SNAKE_CASE`를 쓴다. 외부 데이터 필드는 공통 계약의 이름을 따른다.
- 사건의 확정 사실은 서버에서 읽기 전용으로 관리한다. 플레이어 화면과 NPC에는 역할별로 접근 가능한 정보만 넘긴다. 에이전트 판단은 서버가 규칙과 권한을 확인한 뒤 상태에 반영한다.
- API 키는 서버 환경변수로 관리한다. 키, 원본 대화 파일, 개인 식별정보를 커밋하거나 이슈·PR에 첨부하지 않는다.

## 자동 검사

Node.js 24와 Python 3.12를 사용한다. 첫 실행 시 루트에서 다음 명령으로 도구를 설치한다.

```sh
npm ci
python -m pip install -r requirements-dev.txt
```

PR을 올리기 전에 아래 검사와 해당 이슈의 기능 테스트를 실행하고 결과를 본문에 기록한다.

```sh
npm run check
python -m ruff check .
python -m ruff format --check .
```

자동 수정은 `npm run lint:fix`, `npm run format`, `python -m ruff check --fix .`, `python -m ruff format .`을 사용한다. 검사에 실패하면 변경한 코드나 설정의 원인을 확인한다.

## 브랜치와 리뷰

- 브랜치는 `a/<이슈번호>-<kebab-case>` 또는 `b/<이슈번호>-<kebab-case>`로 만든다. 예: `a/12-evidence-log`.
- 커밋과 PR 제목은 `type(scope): 요약`을 사용한다. 예: `feat(investigation): 증거 기록 추가`. `scope`는 생략할 수 있다.
- PR은 이슈 하나의 검증 가능한 변경 단위로 자주 올린다. 이슈의 일부만 구현한 PR은 본문에서 `Refs #번호`를 쓰고, 완료 기준을 충족하는 마지막 PR에서 `Closes #번호`를 쓴다.
- 상대 팀원의 에이전트가 1차 리뷰를 보조한다. PR 작성자가 아닌 상대 팀원 1명이 GitHub에서 승인하고, 자동 검사가 모두 통과한 PR을 squash merge한다. 변경이 추가되면 다시 검토한다.
- 공유 계약·의존성·개발 범위를 변경할 때는 회의록에 결론과 후속 작업을 기록하고 관련 ADR에 결정 이유와 대안을 남긴다.

## 기록 위치

- PR 본문은 [PR 템플릿](.github/pull_request_template.md)을 사용한다.
- 회의록은 [회의록 양식](docs/meetings/TEMPLATE.md), 의사결정 기록은 [ADR 양식](docs/decisions/TEMPLATE.md)을 사용한다.
