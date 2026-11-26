# AI 기반 적응형 사회 추리 게임

플레이어의 수사 방식이 주민의 기억·관계·행동에 영향을 주고, 서로 다른 단서를 따라 같은 사건의 진실을 찾는 PC 웹 추리 게임을 만든다. 현재 MVP 계획은 사건 1개·핵심 NPC 4명·장소 3곳이다.

목적·사용자·기능·완성 기준은 [PRD](PRD.md), 상태·권한·연동 조건은 [상세 기능·기술 요구사항](docs/technical-requirements.md), 작업 번호·이슈·일정은 [TodoList](TodoList.md), 코드와 협업 규칙은 [AGENTS.md](AGENTS.md)에서 확인한다.

> 현재는 코드 폴더·저장소 검사 환경과 기획·협업 문서를 준비한 단계다. 게임·LLM·MCP·Skills 실행 기능은 아직 구현·검증하지 않았다. 역할·일정 등 협업 개선안은 팀 검토·최종 채택 전이다. 아래 명령은 저장소 검사이며 게임 실행 명령이 아니다.

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
