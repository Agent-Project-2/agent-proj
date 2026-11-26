const MAX_QUESTION_LENGTH = 240;

const INVALID_REQUEST = {
  code: "INVALID_REQUEST",
  message: "현재 세션에서 처리할 수 없는 심문 요청입니다.",
};

const EVENT_CONFLICT = {
  code: "EVENT_ID_CONFLICT",
  message: "이미 다른 요청에 사용한 이벤트 ID입니다.",
};

function isActionValid(action) {
  if (action?.type === "question") {
    return (
      typeof action.text === "string" &&
      action.text.trim().length > 0 &&
      action.text.length <= MAX_QUESTION_LENGTH
    );
  }
  return action?.type === "present_evidence" && typeof action.evidenceId === "string";
}

function errorResponse(request, status, error) {
  return {
    eventId: request?.eventId ?? null,
    npcId: request?.npcId ?? null,
    status,
    error: { ...error },
  };
}

export function createInvestigationMock({ world, initialSession, interrogation }) {
  const session = { ...initialSession };
  const acquiredEvidenceIds = new Set(initialSession.acquiredEvidenceIds);
  const resolvedEvents = new Map();

  function getSession() {
    return { ...session, acquiredEvidenceIds: [...acquiredEvidenceIds] };
  }

  function visit(locationId) {
    if (!world.locations.some((location) => location.id === locationId)) {
      return false;
    }
    session.locationId = locationId;
    return true;
  }

  function inspect() {
    const { object } = world.locations.find((location) => location.id === session.locationId);
    if (object.requiresEvidenceId && !acquiredEvidenceIds.has(object.requiresEvidenceId)) {
      return null;
    }
    acquiredEvidenceIds.add(object.evidence.id);
    return globalThis.structuredClone(object.evidence);
  }

  function getAnswer(request, evidenceId) {
    const { eventId, npcId, gameMinute } = request;
    const example = evidenceId ? interrogation.acceptedEvidence : interrogation.question;
    const text =
      npcId === example.request.npcId
        ? example.response.statement.text
        : "저녁 순찰에 관해서는 경비 담당에게 확인해 주세요.";

    return {
      eventId,
      npcId,
      status: "answered",
      presentedEvidenceId: evidenceId,
      statement: {
        id: `statement-${eventId}`,
        text,
        gameMinute,
        source: { type: "npc_testimony", id: npcId },
      },
    };
  }

  function respond(request, { simulateFailure = false } = {}) {
    if (
      request?.sessionId !== session.sessionId ||
      typeof request.eventId !== "string" ||
      request.eventId.trim().length === 0 ||
      !isActionValid(request.action)
    ) {
      return errorResponse(request, "rejected", INVALID_REQUEST);
    }

    const { eventId, npcId, gameMinute, action } = request;
    const isQuestion = action.type === "question";
    const fingerprint = JSON.stringify([
      npcId,
      gameMinute,
      action.type,
      isQuestion ? action.text.trim() : action.evidenceId,
    ]);
    const existing = resolvedEvents.get(eventId);
    if (existing) {
      return existing.fingerprint === fingerprint
        ? globalThis.structuredClone(existing.response)
        : errorResponse(request, "rejected", EVENT_CONFLICT);
    }

    const npcIsPresent = world.npcs.some(
      (npc) => npc.id === npcId && npc.locationId === session.locationId,
    );
    if (!npcIsPresent || gameMinute !== session.gameMinute) {
      return errorResponse(request, "rejected", INVALID_REQUEST);
    }

    const evidenceId = isQuestion ? null : action.evidenceId;
    let response;
    if (evidenceId !== null && !acquiredEvidenceIds.has(evidenceId)) {
      response = errorResponse(request, "rejected", interrogation.deniedEvidence.response.error);
    } else if (simulateFailure) {
      return errorResponse(request, "failed", interrogation.unavailable.response.error);
    } else {
      response = getAnswer(request, evidenceId);
    }

    resolvedEvents.set(eventId, { fingerprint, response });
    return globalThis.structuredClone(response);
  }

  return { getSession, visit, inspect, respond };
}
