export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/gu,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export function art(name, className = "") {
  return (
    '<img alt="" draggable="false" class="' +
    esc(className) +
    '" src="/assets/case-01/' +
    esc(name) +
    '.png">'
  );
}
export function clock(minute) {
  const dayMinute = minute % 1440;
  return [Math.floor(dayMinute / 60), dayMinute % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
const arrow = '<span class="arrow" aria-hidden="true">→</span>';
export function button(cmd, label, id = "", kind = "soft") {
  return (
    '<button class="' +
    kind +
    '" data-cmd="' +
    cmd +
    '" data-id="' +
    esc(id) +
    '">' +
    esc(label) +
    "</button>"
  );
}
function panelHead(icon, title, aside = "") {
  return '<div class="panel-head"><h2>' + art(icon) + esc(title) + "</h2>" + aside + "</div>";
}
const current = (state) => state.places.find((p) => p.id === state.locationId);
function marker(place, selected, here) {
  return (
    '<button class="pin' +
    (selected ? " selected" : "") +
    (here ? " here" : "") +
    '" data-cmd="select" data-id="' +
    place.id +
    '" style="--x:' +
    place.x +
    "%;--y:" +
    place.y +
    '%" aria-pressed="' +
    selected +
    '" aria-label="' +
    esc(place.name + (here ? " (현재 위치)" : "")) +
    '"><span class="pin-bulb"></span><span class="pin-caption">' +
    esc(place.short) +
    "</span></button>"
  );
}
function hotspot(item) {
  return (
    '<button class="hotspot' +
    (item.inspected ? " seen" : "") +
    '" data-cmd="inspect" data-id="' +
    esc(item.id) +
    '" style="--x:' +
    item.x +
    "%;--y:" +
    item.y +
    '%" aria-label="' +
    esc(item.label) +
    '"><b aria-hidden="true">' +
    (item.inspected ? "✓" : "+") +
    "</b><span>" +
    esc(item.label) +
    "</span></button>"
  );
}
function residentOnMap(npc, place) {
  const title = npc.name + " · " + npc.activity;
  return (
    '<button class="map-resident" data-cmd="interview" data-id="' +
    esc(npc.id) +
    '" style="--x:' +
    place.residentX +
    "%;--y:" +
    place.residentY +
    '%" title="' +
    esc(title) +
    '" aria-label="' +
    esc(title + " · 면담") +
    '">' +
    art(npc.portrait + "-sprite") +
    "</button>"
  );
}
function mapPanel(state, ui) {
  const inside = ui.page === "scene";
  const place = inside
    ? current(state)
    : (state.places.find((p) => p.id === ui.selected) ?? current(state));
  const head = inside
    ? panelHead("map", place.name, button("map", "← 마을 지도", "", "text-btn"))
    : panelHead("map", "마을 지도", '<span class="map-key"><i></i> 현재 위치</span>');
  const pins = inside
    ? place.objects.map(hotspot)
    : state.places.map((p) => marker(p, p.id === place.id, p.id === state.locationId));
  if (!inside) {
    for (const npc of state.residents) {
      const at = state.places.find((p) => p.id === npc.locationId);
      pins.push(residentOnMap(npc, at));
    }
  }
  const characters = state.residents.filter((n) => n.locationId === place.id);
  const footer = inside
    ? '<div><p class="eyeline">조사 대상</p><div class="object-list">' +
      place.objects.map((o) => button("inspect", o.label, o.id, "small-btn")).join("") +
      "</div></div>" +
      characters.map((n) => button("interview", n.name + " 면담", n.id, "gold")).join("")
    : '<div class="place-detail"><p class="eyeline">' +
      (place.id === state.locationId ? "현재 위치" : "선택한 장소") +
      "</p><h3>" +
      esc(place.name) +
      "</h3><p>" +
      esc(place.summary) +
      '</p></div><button class="gold" data-cmd="enter" data-id="' +
      place.id +
      '">' +
      (place.id === state.locationId ? "현장 조사" : "이동하여 조사") +
      arrow +
      "</button>";
  return (
    '<section class="panel map-panel">' +
    head +
    '<div class="scene-art" aria-label="' +
    (inside ? "현장 조사 대상" : "무연리 탐색 지도") +
    '">' +
    art(inside ? place.art : "village", "backdrop") +
    pins.join("") +
    '</div><div class="map-foot">' +
    footer +
    "</div></section>"
  );
}
function objective(state) {
  const owned = new Set(state.evidence.map((e) => e.id));
  const presented = state.interviews.dohyeon?.some((t) => t.presentedEvidenceId === "E04");
  const tasks = [
    [owned.has("E01"), "도현의 자백서 확보"],
    [owned.has("E04"), owned.has("E04") ? "19시 통화 기록 확보" : "통화 자료 조회"],
    [presented, "도현에게 통화 기록 제시"],
  ];
  const next = tasks.find((t) => !t[0]);
  return (
    '<section class="panel objective">' +
    panelHead(
      "folder",
      "수사 목표",
      '<span class="tally">' + tasks.filter((t) => t[0]).length + " / 3</span>",
    ) +
    '<div class="objective-body"><h3>자백의 시각을 확인하라</h3><p>' +
    (!owned.has("E04")
      ? "도현은 전날 18시경이라고 진술했다. 기록관에서 통화 내역을 대조해 보자."
      : next
        ? "확보한 통화 기록을 도현에게 제시하고, 자백 시각에 대한 진술을 들어 보자."
        : "자백과 생존 기록을 대조했다. 수첩에서 두 시각과 새 진술을 다시 읽을 수 있다.") +
    '</p><ul class="goals">' +
    tasks
      .map(
        ([done, label]) =>
          '<li class="' +
          (done ? "done" : "") +
          '"><i aria-hidden="true">' +
          (done ? "✓" : "") +
          "</i>" +
          esc(label) +
          "</li>",
      )
      .join("") +
    "</ul></div></section>"
  );
}
function residents(state) {
  return (
    '<section class="panel residents">' +
    panelHead("portraits", "마을 주민", '<span class="tally">4명</span>') +
    state.residents
      .map((n) => {
        const p = state.places.find((p) => p.id === n.locationId);
        return (
          '<button class="resident" data-cmd="interview" data-id="' +
          n.id +
          '" aria-label="' +
          esc(p.name + "에서 " + n.name + " 면담") +
          '">' +
          art(n.portrait, "avatar") +
          '<span class="who"><strong>' +
          esc(n.name) +
          "</strong><small>" +
          esc(n.occupation) +
          " · " +
          esc(p.short) +
          '</small><small class="activity">' +
          esc(n.activity) +
          '</small></span><span class="chevron" aria-hidden="true">›</span></button>'
        );
      })
      .join("") +
    "</section>"
  );
}
export function fieldView(state, ui) {
  const latest = state.events.at(-1);
  return (
    '<div class="field-grid"><div class="map-column">' +
    mapPanel(state, ui) +
    '<section class="recent"><span class="recent-label">최근 기록</span><time>' +
    clock(latest.gameMinute) +
    "</time><span>" +
    esc(latest.text) +
    '</span><button data-cmd="log" class="text-btn">기록 보기 ' +
    arrow +
    "</button></section></div><aside>" +
    objective(state) +
    residents(state) +
    "</aside></div>"
  );
}
export function notebook(state, tab) {
  const tabs = [
    ["evidence", "확보한 증거", state.evidence.length],
    ["statements", "주민 진술", Object.values(state.interviews).flat().length],
    ["events", "활동 기록", state.events.length],
  ];
  let rows;
  if (tab === "evidence") {
    rows = state.evidence
      .map(
        (e) =>
          '<button class="note-card" data-cmd="evidence" data-id="' +
          e.id +
          '">' +
          art(e.id === "E11" ? "recorder" : "folder") +
          "<span><small>" +
          esc(e.kind) +
          " · " +
          e.id +
          "</small><strong>" +
          esc(e.title) +
          "</strong><span>" +
          esc(e.source) +
          "</span></span>" +
          arrow +
          "</button>",
      )
      .join("");
  } else if (tab === "statements") {
    const turns = Object.values(state.interviews)
      .flat()
      .sort((a, b) => b.gameMinute - a.gameMinute);
    rows =
      turns
        .map((turn) => {
          const npc = state.residents.find((n) => n.id === turn.sourceId);
          return (
            '<article class="record"><time>' +
            clock(turn.gameMinute) +
            "</time><div><strong>" +
            esc(npc.name) +
            " · 진술</strong><p>" +
            esc(turn.text) +
            "</p>" +
            (turn.presentedEvidenceId
              ? "<small>제시한 증거 · " +
                esc(state.evidence.find((e) => e.id === turn.presentedEvidenceId)?.title) +
                "</small>"
              : "") +
            "</div></article>"
          );
        })
        .join("") || '<p class="empty">주민과 대화하면 발언자와 면담 시각이 이곳에 기록됩니다.</p>';
  } else {
    rows = [...state.events]
      .reverse()
      .map(
        (e) =>
          '<article class="record"><time>' +
          clock(e.gameMinute) +
          "</time><span>" +
          esc(e.text) +
          "</span></article>",
      )
      .join("");
  }
  return (
    '<section class="panel notebook">' +
    panelHead("notebook", "수사 수첩", button("restart", "새 조사", "", "text-btn")) +
    '<div class="book-tabs">' +
    tabs
      .map(
        ([id, title, count]) =>
          '<button data-cmd="tab" data-id="' +
          id +
          '" aria-pressed="' +
          (tab === id) +
          '">' +
          title +
          " <b>" +
          count +
          "</b></button>",
      )
      .join("") +
    '</div><div class="notes-body">' +
    rows +
    "</div></section>"
  );
}
export function dialogHead(icon, title, kicker = "") {
  return (
    '<header class="dialog-head">' +
    art(icon) +
    "<div>" +
    (kicker ? '<p class="eyeline">' + esc(kicker) + "</p>" : "") +
    '<h2 id="sheet-title">' +
    esc(title) +
    '</h2></div><button class="close" data-cmd="close" aria-label="닫기">×</button></header>'
  );
}
export function interview(state, ui) {
  const npc = state.residents.find((n) => n.id === ui.npcId);
  const place = state.places.find((p) => p.id === npc.locationId);
  const history = state.interviews[npc.id] ?? [];
  const messages = history
    .map((t) => {
      const evidence = state.evidence.find((e) => e.id === t.presentedEvidenceId);
      const prompt = evidence ? "증거 제시 · " + evidence.title : t.question;
      return (
        '<div class="utterance mine"><small>조사관 · ' +
        clock(t.gameMinute) +
        "</small><p>" +
        esc(prompt) +
        '</p></div><div class="utterance"><small>' +
        esc(npc.name) +
        " · 진술</small><p>" +
        esc(t.text) +
        "</p></div>"
      );
    })
    .join("");
  const options = [
    ["question", "질문"],
    ["persuade", "설득"],
    ["promise", "약속"],
    ["present_evidence", "증거 제시"],
  ];
  const input =
    ui.intent === "present_evidence"
      ? '<label class="sr-only" for="evidence-select">확보한 증거</label><select id="evidence-select" name="evidence">' +
        state.evidence
          .map(
            (e) =>
              `<option value="${esc(e.id)}"${e.id === ui.selectedEvidenceId ? " selected" : ""}>${esc(e.title)}</option>`,
          )
          .join("") +
        "</select>"
      : '<label class="sr-only" for="speech-input">조사관 발언</label><input id="speech-input" name="text" maxlength="240" autocomplete="off" required placeholder="' +
        {
          question: "질문을 입력하세요…",
          persuade: "협조를 구하는 말을 입력하세요…",
          promise: "지킬 약속을 입력하세요…",
        }[ui.intent] +
        '" value="' +
        esc(ui.draft) +
        '">';
  return (
    dialogHead("portraits", "주민 면담", place.name) +
    '<div class="interview-profile">' +
    art(npc.portrait, "large-avatar") +
    "<div><small>" +
    esc(npc.occupation) +
    "</small><h3>" +
    esc(npc.name) +
    "</h3><p>" +
    esc(npc.activity) +
    " · " +
    esc(npc.attitude) +
    '</p></div></div><div id="transcript" tabindex="0" aria-label="이전 대화"><div class="utterance"><small>' +
    esc(npc.name) +
    "</small><p>" +
    esc(npc.opening) +
    "</p></div>" +
    messages +
    '</div><form id="interview-form"><div class="intents">' +
    options
      .map(
        ([id, label]) =>
          '<button type="button" data-cmd="intent" data-id="' +
          id +
          '" aria-pressed="' +
          (ui.intent === id) +
          '">' +
          label +
          "</button>",
      )
      .join("") +
    '</div><div class="compose">' +
    input +
    '<button class="gold" type="submit">' +
    (ui.intent === "present_evidence" ? "제시" : "전송") +
    '</button></div></form><div class="dialog-foot"><small>공개 진술은 수사 수첩에 기록됩니다.</small>' +
    button("end", "면담 종료", "", "text-btn") +
    "</div>"
  );
}
