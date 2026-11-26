import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";
import { createInvestigationMock } from "../src/features/investigation/interrogation-mock.mjs";

const fixtureUrl = new URL("../../../shared/contracts/investigation-mock.json", import.meta.url);
const fixtures = JSON.parse(readFileSync(fixtureUrl, "utf8"));
const { question, deniedEvidence, acceptedEvidence, unavailable } = fixtures.interrogation;

test("질문에 출처와 요청 식별자를 포함한 예시 응답을 반환한다", () => {
  const mock = createInvestigationMock(fixtures);

  assert.deepEqual(mock.respond(question.request), question.response);
});

test("후문을 조사해야 개폐 기록이 열리고 증거가 한 번만 추가된다", () => {
  const mock = createInvestigationMock(fixtures);

  assert.equal(mock.visit("archive-room"), true);
  assert.equal(mock.inspect(), null);
  assert.equal(mock.visit("service-passage"), true);
  assert.equal(mock.inspect().id, "threshold-print");
  assert.equal(mock.visit("archive-room"), true);
  assert.equal(mock.inspect().id, "rear-door-log");
  assert.equal(mock.inspect().id, "rear-door-log");
  assert.deepEqual(mock.getSession().acquiredEvidenceIds, ["threshold-print", "rear-door-log"]);
});

test("미획득 증거와 알 수 없는 증거에 같은 거절 사유를 반환한다", () => {
  const mock = createInvestigationMock(fixtures);
  const unknownEvidenceRequest = {
    ...deniedEvidence.request,
    eventId: "unknown-evidence",
    action: { type: "present_evidence", evidenceId: "unknown" },
  };

  assert.deepEqual(mock.respond(deniedEvidence.request), deniedEvidence.response);
  const unknownEvidenceResponse = mock.respond(unknownEvidenceRequest);
  assert.deepEqual(unknownEvidenceResponse.error, deniedEvidence.response.error);
  assert.equal(unknownEvidenceResponse.statement, undefined);
});

test("획득 후 새 요청은 허용하고 기존 요청을 재전송하면 기존 결과를 반환한다", () => {
  const mock = createInvestigationMock(fixtures);
  assert.deepEqual(mock.respond(deniedEvidence.request), deniedEvidence.response);

  mock.visit("service-passage");
  mock.inspect();
  mock.visit("archive-room");
  mock.inspect();
  mock.visit("exhibition-hall");

  assert.deepEqual(mock.respond(deniedEvidence.request), deniedEvidence.response);
  assert.deepEqual(mock.respond(acceptedEvidence.request), acceptedEvidence.response);
  assert.deepEqual(mock.respond(acceptedEvidence.request), acceptedEvidence.response);
  const changedRequest = {
    ...acceptedEvidence.request,
    action: question.request.action,
  };
  assert.equal(mock.respond(changedRequest).error.code, "EVENT_ID_CONFLICT");
});

test("처리 전 응답 실패는 같은 이벤트 ID로 재시도할 수 있다", () => {
  const mock = createInvestigationMock(fixtures);

  const failed = mock.respond(unavailable.request, { simulateFailure: true });
  assert.deepEqual(failed, unavailable.response);
  assert.equal(mock.respond(unavailable.request).status, "answered");
});

test("세션과 위치를 검증하며 새 목업은 초기 상태에서 시작한다", () => {
  const mock = createInvestigationMock(fixtures);

  const foreignRequest = { ...question.request, sessionId: "other-session" };
  assert.equal(mock.respond(foreignRequest).status, "rejected");
  assert.equal(mock.visit("unknown-location"), false);
  mock.visit("service-passage");
  mock.inspect();
  assert.equal(mock.respond(question.request).status, "rejected");
  assert.deepEqual(createInvestigationMock(fixtures).getSession(), fixtures.initialSession);
});
