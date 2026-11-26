import { createInvestigationMock } from "../features/investigation/interrogation-mock.mjs";

const ART_ROOT = new URL("../../assets/museum/", import.meta.url);
const SCENERY = {
  "exhibition-hall": {
    map: { bounds: [5, 27, 38, 42], pin: [26, 60] },
    object: { bounds: [59, 49, 33, 39], pin: [75, 60] },
  },
  "service-passage": {
    map: { bounds: [43, 5, 24, 29], pin: [55, 28] },
    object: { bounds: [32, 72, 17, 27], pin: [40, 91] },
  },
  "archive-room": {
    map: { bounds: [68, 35, 24, 34], pin: [79, 62] },
    object: { bounds: [15, 30, 25, 58], pin: [27, 61] },
  },
};

function element(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function icon(name) {
  const node = element("span", "", "icon " + name);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function button(label, onClick, className = "primary") {
  const control = element("button", label, className);
  control.type = "button";
  control.addEventListener("click", onClick);
  return control;
}

function artImage(file, width, height) {
  const image = element("img", "", "pixel-art");
  image.src = new URL(file + ".png", ART_ROOT);
  image.alt = "";
  image.width = width;
  image.height = height;
  return image;
}

function portrait(npc) {
  const face = element("span", "", "portrait");
  face.dataset.npc = npc.id;
  face.setAttribute("aria-hidden", "true");
  return face;
}

function hotspot(label, onClick, area, symbol) {
  // Bounds and the label tip use percentages of the original scene so both scale with the art.
  const [left, top, width, height] = area.bounds;
  const [pinX, pinY] = area.pin;
  const target = button("", onClick, "hotspot");
  Object.assign(target.style, {
    left: left + "%",
    top: top + "%",
    width: width + "%",
    height: height + "%",
  });
  const pin = element("span", label, "scene-pin");
  pin.style.left = ((pinX - left) / width) * 100 + "%";
  pin.style.top = ((pinY - top) / height) * 100 + "%";
  pin.prepend(icon(symbol));
  target.append(pin);
  return target;
}

function formatTime(gameMinute) {
  const hours = String(Math.floor(gameMinute / 60)).padStart(2, "0");
  const minutes = String(gameMinute % 60).padStart(2, "0");
  return hours + ":" + minutes;
}

function mountPreview(root, fixture) {
  const { world, interrogation } = fixture;
  const conversations = new Map();
  const clues = world.locations.map((place) => place.object.evidence);
  let mock = createInvestigationMock(fixture);
  let eventNumber = 0;

  function showScreen(title, context, content, back) {
    const { gameMinute, acquiredEvidenceIds } = mock.getSession();
    const bar = element("header", "", "case-bar");
    const brand = element("div", "", "brand");
    const badge = element("span", "", "brand-mark");
    badge.append(icon("lens"));
    brand.append(badge, element("span", "박물관 수사 일지"));
    const hud = element("div", "", "hud");
    const time = element("span", "", "hud-part");
    time.append(icon("clock"), element("span", formatTime(gameMinute)));
    time.setAttribute("aria-label", "게임 시각 " + formatTime(gameMinute));
    const total = element("span", "", "hud-part");
    total.append(
      icon("book"),
      element("span", "증거 " + acquiredEvidenceIds.length + " / " + clues.length),
    );
    hud.append(time, total);
    bar.append(brand, hud);

    const heading = element("h1", title);
    heading.tabIndex = -1;
    const titles = element("div", "", "titles");
    titles.append(element("p", context, "eyebrow"), heading);
    const toolbar = element("div", "", "toolbar");
    toolbar.append(titles);
    if (back) toolbar.append(back);
    root.replaceChildren(bar, toolbar, content);
    heading.focus({ preventScroll: true });
  }

  function backButton(label, onClick) {
    const back = button(label, onClick, "back");
    back.prepend(icon("left"));
    return back;
  }

  function showStart() {
    const content = element("section", "", "frame opening");
    const stage = element("div", "", "opening-art");
    stage.append(artImage("exhibition-hall", 624, 208));
    const panel = element("div", "", "opening-note");
    const note = element("div");
    note.append(element("h2", "사건 개요"), element("p", world.opening));
    const start = button("새 조사 시작", () => {
      conversations.clear();
      mock = createInvestigationMock(fixture);
      eventNumber = 0;
      showTown();
    });
    start.append(icon("right"));
    panel.append(note, start);
    content.append(stage, panel);
    showScreen(world.caseTitle, "수사 기록 · 마을 박물관", content);
  }

  function showTown() {
    const { acquiredEvidenceIds } = mock.getSession();
    const content = element("div", "", "map-layout");
    const map = element("section", "", "frame map-frame");
    map.setAttribute("aria-label", "이동할 장소");
    const field = element("div", "", "map-stage");
    field.append(artImage("museum-grounds", 704, 396));
    for (const location of world.locations) {
      const marker = hotspot(
        location.name,
        () => showLocation(location),
        SCENERY[location.id].map,
        "pin",
      );
      marker.setAttribute("aria-label", location.name + " 현장 조사");
      field.append(marker);
    }
    const caption = element("p", "장소 표식을 선택해 이동하세요.", "frame-caption");
    caption.prepend(icon("pin"));
    map.append(field, caption);
    const notebook = element("aside", "", "notebook");
    notebook.append(
      element("h2", "수사 수첩"),
      element("h3", world.caseTitle),
      element("p", world.opening),
    );
    const rule = element("div", "", "notebook-rule");
    rule.append(
      element("h3", "확보한 증거"),
      element("span", acquiredEvidenceIds.length + " / " + clues.length),
    );
    notebook.append(rule);
    if (!acquiredEvidenceIds.length) {
      notebook.append(element("p", "아직 확보한 증거가 없습니다.", "empty-note"));
    } else {
      const list = element("ul", "", "clue-list");
      for (const clue of clues.filter((entry) => acquiredEvidenceIds.includes(entry.id))) {
        const item = element("li");
        item.append(icon("check"), element("span", clue.name));
        list.append(item);
      }
      notebook.append(list);
    }
    content.append(map, notebook);
    showScreen("박물관 지도", world.caseTitle, content, backButton("시작 화면", showStart));
  }

  function showLocation(location, focusReport = false) {
    mock.visit(location.id);
    const { acquiredEvidenceIds } = mock.getSession();
    const { object } = location;
    const isAcquired = acquiredEvidenceIds.includes(object.evidence.id);
    const isLocked =
      object.requiresEvidenceId && !acquiredEvidenceIds.includes(object.requiresEvidenceId);
    const content = element("div", "", "location-view");
    const scene = element("section", "", "frame");
    scene.setAttribute("aria-label", location.name + " 조사 장면");
    const stage = element("div", "", "room-stage");
    stage.append(artImage(location.id, 624, 208));

    const report = element("section", "", "panel object-report");
    report.tabIndex = -1;
    report.id = "object-report";
    function inspect() {
      if (isLocked || isAcquired) {
        report.focus();
        return;
      }
      if (mock.inspect()) showLocation(location, true);
    }
    const marker = hotspot(
      object.name,
      inspect,
      SCENERY[location.id].object,
      isLocked ? "lock" : isAcquired ? "check" : "lens",
    );
    marker.setAttribute(
      "aria-label",
      object.name + (isLocked ? " 잠금 조건 보기" : isAcquired ? " 증거 상세 보기" : " 조사"),
    );
    marker.setAttribute("aria-controls", report.id);
    stage.append(marker);
    const caption = element("p", location.description, "frame-caption");
    caption.prepend(icon("pin"));
    scene.append(stage, caption);

    report.append(element("h2", "현장 조사"));
    if (isAcquired) {
      const acquired = element("div", "", "result-title");
      acquired.append(
        element("h3", object.evidence.name),
        element("span", "증거 확보", "state-tag"),
      );
      report.append(acquired, element("p", object.evidence.detail));
    } else {
      report.append(element("h3", object.name));
      if (isLocked) {
        const hint = element(
          "p",
          "후문 문턱을 먼저 조사하면 기록함을 열 수 있습니다.",
          "locked-hint",
        );
        hint.prepend(icon("lock"));
        report.append(hint);
      } else {
        const search = button("조사하기", inspect);
        search.prepend(icon("lens"));
        report.append(search);
      }
    }
    const residents = element("section", "", "panel residents");
    residents.append(element("h2", "이곳의 인물"));
    for (const npc of world.npcs.filter((entry) => entry.locationId === location.id)) {
      const talk = button("", () => showDialogue(npc, location), "resident");
      talk.setAttribute("aria-label", npc.name + "과 대화하기");
      const details = element("span", "", "resident-text");
      details.append(element("strong", npc.name), element("span", npc.activity));
      talk.append(portrait(npc), details, icon("right"));
      residents.append(talk);
    }
    const lower = element("div", "", "location-lower");
    lower.append(report, residents);
    content.append(scene, lower);
    showScreen(location.name, "박물관 현장 조사", content, backButton("지도로", showTown));
    if (focusReport) report.focus();
  }

  function showDialogue(npc, location) {
    const content = element("div", "", "interview");
    const back = backButton("현장으로", () => showLocation(location));
    const history = conversations.get(npc.id) ?? [];
    conversations.set(npc.id, history);

    const profile = element("aside", "", "frame profile");
    const setting = element("div", "", "profile-setting");
    setting.append(artImage(location.id, 624, 208));
    const bio = element("div", "", "profile-bio");
    const place = element("p", location.name, "profile-place");
    place.prepend(icon("pin"));
    bio.append(portrait(npc), place, element("h2", npc.name), element("p", npc.activity));
    profile.append(setting, bio);

    const desk = element("section", "", "panel conversation");
    desk.append(element("h2", "대화 기록"));
    const log = element("ol", "", "dialogue-log");
    log.setAttribute("aria-label", "대화 기록");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-relevant", "additions");
    log.tabIndex = 0;
    const empty = element("li", "첫 질문을 보내면 이곳에 대화가 기록됩니다.", "empty-log");
    if (!history.length) log.append(empty);

    function speech(speaker, text, style) {
      const bubble = element("div", "", "speech " + style);
      bubble.append(element("strong", speaker, "speaker"), element("p", text));
      return bubble;
    }
    function appendTurn(turn) {
      empty.remove();
      const item = element("li", "", "exchange");
      item.append(speech("수사관", turn.player, "player"), speech(npc.name, turn.answer, "answer"));
      log.append(item);
      log.scrollTop = log.scrollHeight;
    }
    history.forEach(appendTurn);

    const field = element("input");
    field.id = "question";
    field.name = "question";
    field.type = "text";
    field.maxLength = 240;
    field.required = true;
    field.placeholder = "질문을 입력하세요";
    const ask = element("button", "보내기", "primary");
    ask.type = "submit";
    const inputLabel = element("label", "자유 질문");
    inputLabel.htmlFor = field.id;
    const questionForm = element("form", "", "action-form");
    questionForm.append(inputLabel, field, ask);

    const status = element("p", "", "request-status");
    status.setAttribute("role", "status");
    const controls = [back, field, ask];
    let isPending = false;

    async function send(action, player, simulateFailure = false) {
      if (isPending) return;
      const previousFocus = document.activeElement;
      isPending = true;
      for (const control of controls) control.disabled = true;
      status.dataset.state = "pending";
      status.textContent = "응답을 기다리고 있습니다.";

      const { sessionId, gameMinute } = mock.getSession();
      eventNumber += 1;
      const request = {
        sessionId,
        eventId: "mock-turn-" + eventNumber,
        npcId: npc.id,
        gameMinute,
        action,
      };
      try {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const result = mock.respond(request, { simulateFailure });
        if (result.status === "answered") {
          const turn = { player, answer: result.statement.text };
          history.push(turn);
          appendTurn(turn);
          status.textContent = "";
          if (action.type === "question") field.value = "";
        } else {
          status.dataset.state = "error";
          status.textContent = result.error.message;
        }
      } catch {
        status.dataset.state = "error";
        status.textContent = "응답을 표시하지 못했습니다. 다시 시도해 주세요.";
      } finally {
        isPending = false;
        for (const control of controls) control.disabled = false;
        const target = previousFocus === ask ? field : previousFocus;
        if (target instanceof HTMLElement) target.focus({ preventScroll: true });
      }
    }

    questionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = field.value.trim();
      if (text) void send({ type: "question", text }, text);
    });
    desk.append(log, questionForm);

    const { acquiredEvidenceIds } = mock.getSession();
    const inventory = clues.filter((clue) => acquiredEvidenceIds.includes(clue.id));
    if (inventory.length) {
      const select = element("select");
      select.id = "evidence";
      for (const clue of inventory) {
        const option = element("option", clue.name);
        option.value = clue.id;
        select.append(option);
      }
      const label = element("label", "확보한 증거");
      label.htmlFor = select.id;
      const present = button(
        "증거 제시",
        () => {
          const clue = inventory.find((entry) => entry.id === select.value);
          if (clue)
            void send(
              { type: "present_evidence", evidenceId: clue.id },
              "증거 제시 · " + clue.name,
            );
        },
        "secondary",
      );
      controls.push(select, present);
      const evidenceForm = element("div", "", "action-form");
      evidenceForm.append(label, select, present);
      desk.append(evidenceForm);
    }

    const checks = element("details", "", "mock-checks");
    checks.append(element("summary", "목업 응답 확인"));
    const buttons = element("div", "", "check-buttons");
    const unavailable = button(
      "응답 오류 확인",
      () => {
        const { action } = interrogation.unavailable.request;
        void send(action, action.text, true);
      },
      "secondary",
    );
    controls.push(unavailable);
    buttons.append(unavailable);
    const unacquiredClue = clues.find((clue) => !acquiredEvidenceIds.includes(clue.id));
    if (unacquiredClue) {
      const denied = button(
        "미획득 증거 거절 확인",
        () => void send({ type: "present_evidence", evidenceId: unacquiredClue.id }, "증거 제시"),
        "secondary",
      );
      controls.push(denied);
      buttons.append(denied);
    }
    checks.append(buttons);
    desk.append(status, checks);
    content.append(profile, desk);
    showScreen(npc.name + "과 대화", world.caseTitle + " · 인물 심문", content, back);
    log.scrollTop = log.scrollHeight;
  }

  showStart();
}

const app = document.querySelector("#app");
const fixtureUrl = new URL("../../../../shared/contracts/investigation-mock.json", import.meta.url);
try {
  const response = await fetch(fixtureUrl);
  if (!response.ok) throw new Error("Mock fixture could not be loaded.");
  mountPreview(app, await response.json());
} catch {
  const error = element(
    "p",
    "목업을 불러오지 못했습니다. 저장소 루트에서 정적 서버를 실행해 주세요.",
  );
  error.setAttribute("role", "alert");
  app.replaceChildren(error);
}
