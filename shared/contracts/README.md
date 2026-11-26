# 조사·심문 공통 계약 예시

[이슈 #5](https://github.com/Agent-Project-2/agent-proj/issues/5)에서 A와 B가 검토할 게임 쪽 초안이다. [조사 시나리오](../../docs/museum-investigation-outline.md)와 [JSON 예시](investigation-mock.json)를 함께 사용한다. 최종 필드명, 전송 방식, NPC가 읽는 문맥과 도구 등록은 공동 검토 항목이다.

| 항목        | 검토할 동작                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 세션        | `sessionId`로 진행 중인 게임을 구분하고 `caseId`로 사건을 참조한다. 위치·게임 시각·획득 증거는 세션 값이다. `gameMinute`는 게임 내 자정부터 지난 분이다.                                        |
| 공개 범위   | 예시의 마을·NPC 위치는 플레이어 공개 데이터다. 증거 상세는 해당 세션에서 확보한 뒤 표시한다. 확정 사건 정보는 서버가 읽기 전용으로 관리하고, NPC에게는 해당 NPC가 읽을 수 있는 정보만 전달한다. |
| 심문 요청   | `sessionId`, `eventId`, `npcId`, `gameMinute`에 `action`을 보낸다. 질문은 `question`과 `text`, 증거 제시는 `present_evidence`와 `evidenceId`를 사용한다.                                        |
| 정상 응답   | `answered`에 원래 `eventId`·`npcId`와 `statement`가 온다. 진술의 `source`는 발화한 NPC를 참조하고, `gameMinute`는 발화 시각이다. 진술 안에서 언급한 과거 시각과 구분한다.                       |
| 거절과 실패 | `rejected`는 게임 규칙 위반, `failed`는 응답을 생성하지 못한 상태다. 미획득 증거와 알 수 없는 증거에 동일한 오류를 반환해 증거 존재 여부가 드러나지 않게 한다.                                  |
| 중복 처리   | 같은 세션에서 동일한 `eventId`와 요청을 다시 보내면 기존 처리 결과를 반환한다. 요청을 바꿔 같은 ID를 쓰면 거절한다. 처리 결과가 생기기 전에 발생한 응답 오류는 동일 ID로 재시도할 수 있다.      |

## A가 사용할 입력과 응답

각 항목의 `request`를 테스트 입력으로 쓰고 `response`에서 예상 상태와 필드를 확인한다. 증거 확보 전·후의 예시는 같은 증거 ID를 사용한다.

- `interrogation.question` · 경비 담당에게 질문하면 NPC 출처가 붙은 진술을 반환한다.
- `interrogation.deniedEvidence` · 후문 개폐 기록을 아직 확보하지 못한 세션에서 제시하면 `EVIDENCE_NOT_ACQUIRED`를 반환한다.
- `interrogation.acceptedEvidence` · 같은 단서를 조사로 확보한 뒤 새 이벤트 ID로 제시하면 응답을 받는다.
- `interrogation.unavailable` · 유효한 질문에서 응답 오류가 일어나면 `RESPONSE_UNAVAILABLE`를 반환한다.

`world`의 조사 단서와 응답은 브라우저 목업을 위한 예시 데이터다. 실제 서버에서 쓰는 증거 열람·심문 권한은 게임 서버에서 검사하고, 화면에는 서버가 허용한 상태와 응답을 넘긴다.
