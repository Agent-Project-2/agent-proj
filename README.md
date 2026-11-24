# AI 기반 적응형 사회 추리 게임

게임 요구사항은 [PRD](PRD.md), 이슈별 작업 순서는 [TodoList](TodoList.md), 코드와 협업 규칙은 [AGENTS.md](AGENTS.md)에서 확인한다.

## 폴더 구조

```text
ai-detective-game/
├── .github/        # GitHub Actions와 PR 양식
├── game/           # 팀원 B · 게임 시스템, UI, MCP 서버
├── agent/          # 팀원 A · NPC 에이전트, MCP 클라이언트, Agent Skills
├── shared/         # 공동 · 데이터와 API·MCP 계약
├── scripts/        # 공동 · 검사 스크립트와 개발 도구 설정
├── docs/           # 공동 · 협업 기록
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
