import { randomUUID } from "node:crypto";
import dossier from "../../shared/contracts/case-01.json" with { type: "json" };
import world from "./world.json" with { type: "json" };
import { openingLine, statementFor } from "./dialogue.mjs";

const errorMessages = {
  INVALID_REQUEST: "요청 내용을 확인해 주세요.",
  SESSION_MISMATCH: "조사 세션이 바뀌었습니다. 현재 기록을 다시 불러오세요.",
  REQUEST_CONFLICT: "같은 요청 번호에 다른 행동이 담겼습니다.",
  NOT_HERE: "먼저 해당 장소로 이동해 주세요.",
  UNAVAILABLE: "현재 조사할 수 없는 대상입니다.",
  EVIDENCE_NOT_ACQUIRED: "이 수사에서 확보한 증거만 제시할 수 있습니다.",
};
function reject(code) {
  return { status: "rejected", error: { code, message: errorMessages[code] } };
}
const speech = new Set(["question", "persuade", "promise"]);
function validAction(action) {
  if (!action || !dossier.actions.includes(action.type)) return false;
  const field = { travel: "locationId", inspect: "objectId" }[action.type] ?? "npcId";
  if (typeof action[field] !== "string" || !action[field]) return false;
  const fields = ["type", field];
  if (speech.has(action.type)) fields.push("text");
  if (action.type === "present_evidence") fields.push("evidenceId");
  if (Object.keys(action).some((key) => !fields.includes(key))) return false;
  if (speech.has(action.type))
    return (
      typeof action.text === "string" && action.text.trim().length > 0 && action.text.length <= 240
    );
  return action.type !== "present_evidence" || typeof action.evidenceId === "string";
}

export function createSession(id = randomUUID(), respond = statementFor) {
  let locationId = world.start;
  let minute = dossier.startMinute;
  const evidence = new Map();
  const viewed = new Set();
  const receipts = new Map();
  const events = [];
  const interviews = {};
  const log = (type, text, sourceId, requestId) => {
    const entry = {
      eventId: "ev-" + (events.length + 1),
      requestId,
      type,
      locationId,
      gameMinute: minute,
      sourceId,
      text,
    };
    events.push(entry);
    return entry;
  };
  function collect(evidenceId, event, method) {
    if (evidence.has(evidenceId)) return;
    evidence.set(evidenceId, {
      id: evidenceId,
      ...dossier.evidence[evidenceId],
      acquired: {
        eventId: event.eventId,
        sourceId: event.sourceId,
        locationId,
        gameMinute: minute,
        method,
      },
    });
  }
  const arrival = log("arrival", "무연리에 도착해 도현의 자백서를 인계받았다.", "dispatch", null);
  for (const evidenceId of dossier.initialEvidence) collect(evidenceId, arrival, "dispatch");

  const currentPlace = () => world.places.find((place) => place.id === locationId);
  const available = (item) => (item.requires ?? []).every((required) => evidence.has(required));
  function snapshot() {
    const places = world.places.map(({ objects, ...place }) => ({
      ...place,
      objects:
        place.id === locationId
          ? objects
              .filter(available)
              .map(({ id, label, x, y }) => ({ id, label, x, y, inspected: viewed.has(id) }))
          : [],
    }));
    const residents = dossier.residents.map((npc) => {
      const records = interviews[npc.id] ?? [];
      const reconsidered =
        npc.id === "dohyeon" && records.some((turn) => turn.presentedEvidenceId === "E04");
      return {
        ...npc,
        locationId: world.places.find((p) => p.residents.includes(npc.id)).id,
        opening: openingLine(npc.id),
        attitude: reconsidered ? "자백서와 통화 기록을 번갈아 본다." : npc.attitude,
      };
    });
    return globalThis.structuredClone({
      sessionId: id,
      caseId: dossier.caseId,
      caseTitle: dossier.title,
      locationId,
      gameMinute: minute,
      places,
      residents,
      evidence: [...evidence.values()],
      interviews,
      events,
    });
  }
  function apply(action, requestId) {
    const place = currentPlace();
    if (action.type === "travel") {
      const destination = world.places.find((item) => item.id === action.locationId);
      if (!destination) return reject("UNAVAILABLE");
      if (destination.id === locationId)
        return { status: "accepted", message: "이미 이 장소에 있습니다." };
      locationId = destination.id;
      minute += 5;
      const event = log("travel", destination.name + "에 도착했다.", destination.id, requestId);
      return { status: "accepted", eventId: event.eventId, message: event.text };
    }
    if (action.type === "inspect") {
      const item = place.objects.find((item) => item.id === action.objectId && available(item));
      if (!item) return reject("UNAVAILABLE");
      const detail = item.detail ?? dossier.evidence[item.evidence].detail;
      const title = item.evidence ? dossier.evidence[item.evidence].title : item.label;
      if (viewed.has(item.id))
        return { status: "accepted", title, message: detail, evidenceId: item.evidence ?? null };
      minute += 3;
      const event = log("inspect", title + " 확인", item.id, requestId);
      viewed.add(item.id);
      if (item.evidence) collect(item.evidence, event, "inspection");
      return {
        status: "accepted",
        eventId: event.eventId,
        title,
        message: detail,
        evidenceId: item.evidence ?? null,
      };
    }
    if (!place.residents.includes(action.npcId)) return reject("NOT_HERE");
    const npc = dossier.residents.find((n) => n.id === action.npcId);
    if (action.type === "present_evidence" && !evidence.has(action.evidenceId))
      return reject("EVIDENCE_NOT_ACQUIRED");
    if (action.type === "end_interview") {
      minute += 1;
      const event = log("end_interview", npc.name + " 면담 종료", npc.id, requestId);
      return { status: "accepted", eventId: event.eventId, message: event.text };
    }
    const giveLetter =
      npc.id === "harin" &&
      action.type === "persuade" &&
      evidence.has("E07") &&
      !evidence.has("E08");
    const presented = evidence.get(action.evidenceId);
    const context = {
      caseId: dossier.caseId,
      sessionId: id,
      requestId,
      locationId,
      gameMinute: minute,
      npcId: npc.id,
      action: { ...action },
      previousTurns: globalThis.structuredClone(interviews[npc.id] ?? []),
      presentedEvidence: presented
        ? {
            id: presented.id,
            title: presented.title,
            source: presented.source,
            eventTime: presented.eventTime,
            detail: presented.detail,
          }
        : null,
    };
    let statement;
    try {
      statement = giveLetter
        ? "어머니가 남긴 편지가 있어요. 기록과 같이 읽어 주시겠어요?"
        : respond(context);
      if (typeof statement !== "string" || !statement.trim()) throw new Error("empty statement");
    } catch {
      return {
        status: "failed",
        error: {
          code: "RESPONSE_UNAVAILABLE",
          message: "면담 응답을 받지 못했습니다. 다시 시도해 주세요.",
        },
      };
    }
    minute += 2;
    const event = log(
      "statement",
      npc.name + (action.type === "present_evidence" ? " · 증거 제시 후 진술" : " · 면담 진술"),
      npc.id,
      requestId,
    );
    const turn = {
      eventId: event.eventId,
      gameMinute: minute,
      sourceId: npc.id,
      kind: "testimony",
      intent: action.type,
      question: action.text?.trim() ?? null,
      presentedEvidenceId: action.evidenceId ?? null,
      text: statement,
    };
    (interviews[npc.id] ??= []).push(turn);
    if (giveLetter) collect("E08", event, "voluntary_disclosure");
    return {
      status: "accepted",
      eventId: event.eventId,
      message: statement,
      ...(giveLetter && { evidenceId: "E08" }),
    };
  }
  function act(request) {
    if (request?.sessionId !== id) return reject("SESSION_MISMATCH");
    const { requestId, action } = request;
    if (
      typeof requestId !== "string" ||
      !requestId.trim() ||
      requestId.length > 120 ||
      !validAction(action)
    )
      return reject("INVALID_REQUEST");
    const key = JSON.stringify([
      action.type,
      action.locationId,
      action.objectId,
      action.npcId,
      action.text?.trim(),
      action.evidenceId,
    ]);
    const prior = receipts.get(requestId);
    if (prior)
      return prior.key === key
        ? globalThis.structuredClone(prior.result)
        : reject("REQUEST_CONFLICT");
    const result = { requestId, ...apply(action, requestId) };
    if (result.status !== "failed") receipts.set(requestId, { key, result });
    return globalThis.structuredClone(result);
  }
  return { snapshot, act };
}
