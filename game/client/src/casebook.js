import {
  art,
  button,
  clock,
  dialogHead,
  esc,
  fieldView,
  interview,
  notebook,
} from "./features/investigation/view.js";

const workspace = document.querySelector("#workspace");
const sheet = document.querySelector("#sheet");
const ui = {
  page: "map",
  tab: "evidence",
  selected: null,
  selectedEvidenceId: null,
  npcId: null,
  intent: "question",
  draft: "",
  modal: null,
};
let state;
let busy = false;
let repeat = null;
let message = null;

function say(text) {
  document.querySelector("#announce").textContent = text;
}
function waiting(active, label = "확인 중…") {
  busy = active;
  document.body.classList.toggle("working", active);
  const form = sheet.querySelector("form");
  if (form) {
    form.setAttribute("aria-busy", String(active));
    for (const control of form.elements) control.disabled = active;
    const submit = form.querySelector('[type="submit"]');
    if (active) submit.textContent = "응답 대기…";
  }
  if (active) say(label);
}
function render() {
  if (!state) return;
  document.querySelector("#clock").textContent = clock(state.gameMinute);
  document.querySelector("#day").textContent =
    "수사 " + (Math.floor(state.gameMinute / 1440) + 1) + "일차";
  for (const b of document.querySelectorAll(".main-nav button")) {
    if ((ui.page === "notes") === (b.dataset.cmd === "notes"))
      b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  workspace.innerHTML = ui.page === "notes" ? notebook(state, ui.tab) : fieldView(state, ui);
  if (!ui.modal) {
    if (sheet.open) sheet.close();
    return;
  }
  if (ui.modal === "interview") {
    sheet.innerHTML = interview(state, ui);
  } else if (ui.modal === "restart") {
    sheet.innerHTML =
      dialogHead("notebook", "새 조사를 시작할까요?") +
      '<div class="detail-body"><p>이 브라우저의 수첩과 면담 기록을 비우고 무연리 광장에 다시 도착합니다.</p></div><div class="dialog-actions">' +
      button("close", "계속 수사") +
      button("confirm-restart", "새 조사 시작", "", "gold") +
      "</div>";
  } else {
    sheet.innerHTML =
      dialogHead(message.icon, message.title, message.kicker) +
      '<div class="detail-body">' +
      (message.image
        ? art(message.image, message.image === "archive-reading-room" ? "document-room" : "exhibit")
        : "") +
      "<p>" +
      esc(message.text) +
      "</p>" +
      (message.source
        ? "<dl><dt>출처</dt><dd>" +
          esc(message.source) +
          "</dd><dt>사건 시각</dt><dd>" +
          esc(message.eventTime) +
          "</dd><dt>확보</dt><dd>" +
          esc(message.acquisition) +
          "</dd></dl>"
        : "") +
      '</div><div class="dialog-actions">' +
      (repeat ? button("retry", "다시 시도", "", "gold") : "") +
      button("close", "돌아가기") +
      "</div>";
  }
  if (!sheet.open) sheet.showModal();
  const log = sheet.querySelector("#transcript");
  if (log) log.scrollTop = log.scrollHeight;
}
function notice(title, text, options = {}) {
  message = { icon: "folder", title, text, ...options };
  ui.modal = "detail";
}
async function start(fresh = false) {
  waiting(true);
  try {
    const options = fresh
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
      : {};
    const response = await fetch("/api/session", {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("load");
    state = await response.json();
    Object.assign(ui, {
      page: "map",
      selected: state.locationId,
      modal: null,
      npcId: null,
      draft: "",
    });
    repeat = null;
    render();
  } catch {
    if (state) {
      notice("수사 기록을 불러오지 못했습니다.", "연결을 확인하고 수첩을 다시 열어 주세요.");
      render();
    } else
      workspace.innerHTML =
        '<section class="panel failure"><p>조사 서버에 연결할 수 없습니다.</p>' +
        button("reload", "다시 연결", "", "gold") +
        "</section>";
  } finally {
    waiting(false);
  }
}
function newRequestId() {
  const parts = crypto.getRandomValues(new Uint32Array(4));
  return [...parts].map((n) => n.toString(16).padStart(8, "0")).join("");
}
async function send(action, onSuccess, requestId = newRequestId()) {
  if (busy) return;
  waiting(true);
  repeat = null;
  try {
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, requestId, action }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.status >= 500) throw new Error("connection");
    const { state: updated, result } = await response.json();
    if (updated) state = updated;
    if (result.status === "accepted") {
      onSuccess(result);
      say(result.message);
    } else {
      const expired = result.error.code === "SESSION_MISMATCH";
      const speaker = state.residents.find((npc) => npc.id === ui.npcId);
      if (expired || (speaker && speaker.locationId !== state.locationId)) ui.npcId = null;
      if (expired) repeat = () => start();
      notice(expired ? "세션을 다시 연결해 주세요" : "요청이 거절되었습니다", result.error.message);
    }
  } catch {
    repeat = () => send(action, onSuccess, requestId);
    notice(
      "응답을 받지 못했습니다",
      "연결이 끊겼거나 응답이 늦어지고 있습니다. 같은 요청으로 다시 시도할 수 있습니다.",
    );
  } finally {
    waiting(false);
    render();
  }
}
function showItem(evidenceId, kicker) {
  const e = state.evidence.find((entry) => entry.id === evidenceId);
  const at = state.places.find((p) => p.id === e.acquired.locationId);
  const person = state.residents.find((n) => n.id === e.acquired.sourceId);
  const method = person
    ? person.name + "의 자발적 제공"
    : e.acquired.method === "dispatch"
      ? "파견 서류 인계"
      : "현장 자료 확인";
  const acquisition = at.name + " · " + clock(e.acquired.gameMinute) + " · " + method;
  const image =
    e.acquired.locationId === "archive"
      ? "archive-reading-room"
      : e.id === "E11"
        ? "recorder"
        : "folder";
  notice(e.title, e.detail, {
    kicker,
    source: e.source,
    eventTime: e.eventTime,
    acquisition,
    image,
  });
}
function visit(id, next) {
  ui.selected = id;
  if (state.locationId === id) {
    next();
    render();
  } else send({ type: "travel", locationId: id }, next);
}
function closeSheet() {
  if (ui.modal === "interview") {
    endInterview();
    return;
  }
  repeat = null;
  ui.modal = ui.npcId ? "interview" : null;
  render();
}
function endInterview() {
  send({ type: "end_interview", npcId: ui.npcId }, () => {
    ui.npcId = null;
    ui.modal = null;
    ui.draft = "";
  });
}
const handlers = {
  reload: () => start(),
  map: () => {
    ui.page = "map";
    ui.selected = state.locationId;
    render();
  },
  notes: () => {
    ui.page = "notes";
    ui.tab = "evidence";
    render();
  },
  log: () => {
    ui.page = "notes";
    ui.tab = "events";
    render();
  },
  tab: (id) => {
    ui.tab = id;
    render();
  },
  select: (id) => {
    ui.selected = id;
    render();
    document.querySelector(".pin.selected")?.focus({ preventScroll: true });
  },
  enter: (id) =>
    visit(id, () => {
      ui.page = "scene";
    }),
  inspect: (id) =>
    send({ type: "inspect", objectId: id }, (r) => {
      if (r.evidenceId) showItem(r.evidenceId, "현장 조사");
      else notice(r.title, r.message, { kicker: "현장 관찰", icon: "map" });
    }),
  evidence: (id) => {
    showItem(id, "수첩에 보관한 증거");
    render();
  },
  interview: (id) => {
    const npc = state.residents.find((n) => n.id === id);
    visit(npc.locationId, () => {
      Object.assign(ui, {
        page: "scene",
        npcId: id,
        modal: "interview",
        selectedEvidenceId: null,
        intent: "question",
        draft: "",
      });
    });
  },
  intent: (id) => {
    ui.intent = id;
    render();
    sheet.querySelector("input, select")?.focus();
  },
  close: closeSheet,
  end: endInterview,
  retry: () => {
    const retry = repeat;
    repeat = null;
    retry?.();
  },
  restart: () => {
    ui.modal = "restart";
    render();
  },
  "confirm-restart": () => start(true),
};
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-cmd]");
  if (target && !busy && (state || target.dataset.cmd === "reload"))
    handlers[target.dataset.cmd]?.(target.dataset.id);
});
sheet.addEventListener("cancel", (event) => {
  event.preventDefault();
  if (!busy) closeSheet();
});
sheet.addEventListener("input", (event) => {
  if (event.target.name === "text") ui.draft = event.target.value;
  if (event.target.name === "evidence") ui.selectedEvidenceId = event.target.value;
});
sheet.addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy || event.target.id !== "interview-form") return;
  const form = new FormData(event.target);
  const isEvidence = ui.intent === "present_evidence";
  if (!isEvidence && !ui.draft.trim()) {
    sheet.querySelector("input")?.focus();
    return;
  }
  const data = isEvidence ? { evidenceId: form.get("evidence") } : { text: ui.draft.trim() };
  send({ type: ui.intent, npcId: ui.npcId, ...data }, (r) => {
    ui.draft = "";
    ui.modal = "interview";
    if (r.evidenceId) showItem(r.evidenceId, "자발적으로 제공된 자료");
  });
});
start();
