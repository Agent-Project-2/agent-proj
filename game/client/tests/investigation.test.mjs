import assert from "node:assert/strict";
import test from "node:test";
import { createSession } from "../../mock/session.mjs";
import { createGameServer } from "../../mock/server.mjs";
import examples from "../../../shared/contracts/action-examples.json" with { type: "json" };
import expectedContext from "../../../shared/contracts/interview-context.json" with { type: "json" };
import toolExamples from "../../../shared/contracts/mcp-examples.json" with { type: "json" };

function investigation() {
  const game = createSession("test-case");
  let next = 0;
  const act = (action, requestId = "test-" + ++next) =>
    game.act({ sessionId: "test-case", requestId, action });
  return {
    game,
    act,
    travel: (locationId) => act({ type: "travel", locationId }),
    inspect: (objectId) => act({ type: "inspect", objectId }),
  };
}

test("공통 JSON 요청 전체를 같은 순서로 처리하고 시각·출처와 진술을 보존한다", () => {
  const { game, act } = investigation();
  for (const { name, request, expect } of examples.steps) {
    const result = act(request.action, request.requestId);
    for (const [key, value] of Object.entries(expect))
      assert.equal(key === "error" ? result.error.code : result[key], value, name);
  }
  const state = game.snapshot();
  assert.equal(state.events.length, 5);
  assert.equal(state.gameMinute, 855);
  assert.equal(state.interviews.dohyeon.length, 1);
  assert.equal(state.interviews.dohyeon[0].sourceId, "dohyeon");
  assert.equal(state.interviews.dohyeon[0].presentedEvidenceId, "E04");
  assert.equal(state.evidence[1].acquired.sourceId, "call");
});

test("공개 상태에는 시작 자료만 있고 다른 장소의 대상·미획득 자료·잠긴 단서를 감춘다", () => {
  const { game, act, travel, inspect } = investigation();
  const state = game.snapshot();
  assert.equal(state.places.length, 5);
  assert.equal(state.residents.length, 4);
  assert.deepEqual(
    state.evidence.map((e) => e.id),
    ["E01"],
  );
  assert.ok(state.places.filter((p) => p.id !== "square").every((p) => p.objects.length === 0));
  assert.equal(inspect("tape").error.code, "UNAVAILABLE");
  assert.equal(
    act({ type: "question", npcId: "harin", text: "안녕하세요" }).error.code,
    "NOT_HERE",
  );
  assert.equal(
    act({ type: "present_evidence", npcId: "dohyeon", evidenceId: "unknown" }).error.code,
    "EVIDENCE_NOT_ACQUIRED",
  );
  travel("office");
  assert.equal(inspect("tape").error.code, "UNAVAILABLE");
  inspect("scene-report");
  assert.equal(inspect("tape").evidenceId, "E11");
  const minute = game.snapshot().gameMinute;
  inspect("tape");
  assert.equal(game.snapshot().gameMinute, minute);
});

test("기록관과 카페에서 같은 편지에 도달하며 자발적 제공과 공식 열람 출처를 구분한다", () => {
  for (const route of ["inspection", "voluntary_disclosure"]) {
    const { game, travel, inspect, act } = investigation();
    travel("archive");
    inspect("old-file");
    if (route === "inspection") {
      assert.equal(inspect("letter-copy").error.code, "UNAVAILABLE");
      travel("office");
      inspect("pass");
      inspect("envelope");
      travel("archive");
      inspect("letter-copy");
    } else {
      travel("cafe");
      act({ type: "persuade", npcId: "harin", text: "편지를 함께 살펴봐도 될까요?" });
    }
    const found = game.snapshot().evidence.filter((e) => e.id === "E08");
    assert.equal(found.length, 1);
    assert.equal(found[0].acquired.method, route);
  }
});

test("진료소 업무 기록은 두 곳에서 대조해도 수첩 한 건과 최초 획득 출처를 보존한다", () => {
  const { game, travel, inspect } = investigation();
  travel("clinic");
  inspect("duty");
  travel("archive");
  inspect("call");
  inspect("clinic-copy");
  const found = game.snapshot().evidence.filter((e) => e.id === "E05");
  assert.equal(found.length, 1);
  assert.equal(found[0].acquired.locationId, "clinic");
});

test("서로 다른 네 주민의 질문·약속·설득과 증거 제시 이력이 섞이지 않는다", () => {
  const { game, act, travel } = investigation();
  for (const npc of game.snapshot().residents) {
    travel(npc.locationId);
    for (const type of ["question", "promise", "persuade"])
      assert.equal(
        act({ type, npcId: npc.id, text: "전날의 일을 들려주시겠어요?" }).status,
        "accepted",
      );
    act({ type: "present_evidence", npcId: npc.id, evidenceId: "E01" });
    act({ type: "end_interview", npcId: npc.id });
    assert.ok(game.snapshot().interviews[npc.id].every((t) => t.sourceId === npc.id));
    assert.equal(game.snapshot().interviews[npc.id].length, 4);
  }
});

test("공백·장문·잘못된 세션과 요청은 기록을 바꾸지 않는다", () => {
  const { game, act } = investigation();
  const before = game.snapshot();
  assert.equal(
    act({ type: "question", npcId: "dohyeon", text: "  " }).error.code,
    "INVALID_REQUEST",
  );
  assert.equal(
    act({ type: "promise", npcId: "dohyeon", text: "가".repeat(241) }).error.code,
    "INVALID_REQUEST",
  );
  assert.equal(
    act({ type: "present_evidence", npcId: "dohyeon", evidenceId: "E01", text: {} }).error.code,
    "INVALID_REQUEST",
  );
  assert.equal(
    game.act({
      sessionId: "other",
      requestId: "x",
      action: { type: "travel", locationId: "clinic" },
    }).error.code,
    "SESSION_MISMATCH",
  );
  assert.deepEqual(game.snapshot(), before);
});

test("A에 전달할 문맥은 실제 제시한 자료와 해당 주민의 이전 면담만 포함한다", () => {
  let observed;
  const game = createSession("joint-demo", (context) => {
    observed = context;
    return "기록의 시각을 다시 확인하겠습니다.";
  });
  for (const { request } of examples.steps) game.act({ sessionId: "joint-demo", ...request });
  assert.deepEqual(observed, expectedContext);
});

test("MCP 문서의 공개 조회·거절 예시는 같은 세션의 게임 결과와 일치한다", () => {
  const [read, offer] = toolExamples;
  const game = createSession(read.request.params.arguments.sessionId);
  const { caseId, gameMinute, locationId, places } = game.snapshot();
  const here = places.find((p) => p.id === locationId);
  const { sessionId, requestId, ...fields } = offer.request.params.arguments;
  const rejected = game.act({
    sessionId,
    requestId,
    action: { type: "present_evidence", ...fields },
  });
  assert.deepEqual(read.response.result.structuredContent, {
    caseId,
    locationId,
    locationName: here.name,
    gameMinute,
    residentIds: here.residents,
  });
  assert.equal(read.response.result.isError, false);
  assert.deepEqual(offer.response.result.structuredContent, rejected);
  assert.equal(offer.response.result.isError, true);
  for (const { request, response } of toolExamples) {
    assert.equal(response.id, request.id);
    assert.deepEqual(
      JSON.parse(response.result.content[0].text),
      response.result.structuredContent,
    );
  }
});

test("면담 응답이 일시적으로 실패해도 같은 ID로 재시도해 한 번만 기록한다", () => {
  let attempts = 0;
  const game = createSession("retry", () => {
    if (++attempts === 1) throw new Error("offline");
    return "제 기록을 확인해 보세요.";
  });
  const request = {
    sessionId: "retry",
    requestId: "same",
    action: { type: "question", npcId: "dohyeon", text: "언제인가요?" },
  };
  const before = game.snapshot();
  assert.equal(game.act(request).error.code, "RESPONSE_UNAVAILABLE");
  assert.deepEqual(game.snapshot(), before);
  const success = game.act(request);
  assert.equal(success.status, "accepted");
  assert.deepEqual(game.act(request), success);
  assert.equal(game.snapshot().interviews.dohyeon.length, 1);
  assert.equal(attempts, 2);
});

test("HTTP 세션 격리와 초기화, 비공개 저장소 경로 차단", async (t) => {
  const server = createGameServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  const first = await globalThis.fetch(base + "/api/session");
  const cookie = first.headers.get("set-cookie").split(";")[0];
  const initial = await first.json();
  const headers = { "Content-Type": "application/json", Cookie: cookie };
  const other = await globalThis.fetch(base + "/api/session").then((r) => r.json());
  assert.notEqual(other.sessionId, initial.sessionId);
  const action = (sessionId) =>
    globalThis.fetch(base + "/api/actions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId,
        requestId: "travel",
        action: { type: "travel", locationId: "clinic" },
      }),
    });
  assert.equal((await action(other.sessionId)).status, 409);
  assert.equal((await action(initial.sessionId)).status, 200);
  assert.equal(
    (await globalThis.fetch(base + "/api/session", { headers }).then((r) => r.json())).locationId,
    "clinic",
  );
  const reset = await globalThis
    .fetch(base + "/api/session", { method: "POST", headers, body: "{}" })
    .then((r) => r.json());
  assert.notEqual(reset.sessionId, initial.sessionId);
  assert.equal(reset.locationId, "square");
  assert.equal((await action(initial.sessionId)).status, 409);
  for (const path of [
    "/mock/world.json",
    "/shared/contracts/case-01.json",
    "/docs/game-design/cases/case-01/scenario.md",
  ])
    assert.equal((await globalThis.fetch(base + path)).status, 404);
});
