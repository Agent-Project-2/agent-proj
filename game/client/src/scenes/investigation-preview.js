import { createInvestigationMock } from "../features/investigation/interrogation-mock.mjs";

function element(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

function button(label, onClick, className) {
  const control = element("button", label, className);
  control.type = "button";
  control.addEventListener("click", onClick);
  return control;
}

function formatTime(gameMinute) {
  const hours = String(Math.floor(gameMinute / 60)).padStart(2, "0");
  const minutes = String(gameMinute % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function mountPreview(root, fixture) {
  const { world, interrogation } = fixture;
  const conversations = new Map();
  let mock = createInvestigationMock(fixture);
  let eventNumber = 0;

  function showScreen(title, content, back) {
    const heading = element("h1", title);
    heading.tabIndex = -1;
    const header = element("header", "", "screen-header");
    header.append(heading);
    if (back) {
      header.append(back);
    }
    root.replaceChildren(header, content);
    heading.focus();
  }

  function showStart() {
    const content = element("section", "", "start-panel panel");
    const start = button("새 조사 시작", () => {
      conversations.clear();
      mock = createInvestigationMock(fixture);
      eventNumber = 0;
      showTown();
    });
    content.append(element("p", world.opening), start);
    showScreen(world.caseTitle, content);
  }

  function showTown() {
    const session = mock.getSession();
    const content = element("div");
    const map = element("ul", "", "location-grid");
    const time = formatTime(session.gameMinute);
    const clueCount = session.acquiredEvidenceIds.length;
    content.append(element("p", `게임 시각 ${time} · 확보한 증거 ${clueCount}건`), map);

    for (const location of world.locations) {
      const card = element("li", "", "panel");
      const here = world.npcs.filter((npc) => npc.locationId === location.id);
      const investigate = button("현장 조사", () => showLocation(location), "secondary");
      investigate.setAttribute("aria-label", `${location.name} 현장 조사`);
      card.append(
        element("h2", location.name),
        element("p", location.description),
        element("p", here.map((npc) => npc.name).join(" · "), "muted"),
        investigate,
      );
      map.append(card);
    }
    showScreen("박물관 지도", content, button("시작 화면", showStart, "secondary"));
  }

  function showLocation(location) {
    mock.visit(location.id);
    const { acquiredEvidenceIds } = mock.getSession();
    const { object } = location;
    const isAcquired = acquiredEvidenceIds.includes(object.evidence.id);
    const isLocked =
      object.requiresEvidenceId && !acquiredEvidenceIds.includes(object.requiresEvidenceId);
    const content = element("div", "", "location-view");
    const scene = element("section", "", "panel");
    scene.append(element("p", location.description), element("h2", object.name));

    if (isAcquired) {
      scene.append(
        element("h3", object.evidence.name),
        element("p", object.evidence.detail),
        element("p", "증거 확보", "muted"),
      );
    } else if (isLocked) {
      scene.append(element("p", "후문 문턱을 먼저 조사하면 기록함을 열 수 있습니다."));
    } else {
      scene.append(
        button("조사하기", () => {
          mock.inspect();
          showLocation(location);
        }),
      );
    }

    const residents = element("section", "", "panel");
    residents.append(element("h2", "이곳의 인물"));
    for (const npc of world.npcs.filter((entry) => entry.locationId === location.id)) {
      const row = element("div", "", "resident");
      const talk = button("대화하기", () => showDialogue(npc, location), "secondary");
      talk.setAttribute("aria-label", `${npc.name}과 대화하기`);
      row.append(element("h3", npc.name), element("p", npc.activity, "muted"), talk);
      residents.append(row);
    }

    content.append(scene, residents);
    showScreen(location.name, content, button("지도로", showTown, "secondary"));
  }

  function showDialogue(npc, location) {
    const content = element("section", "", "panel dialogue");
    const back = button("현장으로", () => showLocation(location), "secondary");
    const history = conversations.get(npc.id) ?? [];
    conversations.set(npc.id, history);

    const log = element("ol", "", "dialogue-log");
    log.setAttribute("aria-label", "대화 기록");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-relevant", "additions");
    function appendTurn(turn) {
      const item = element("li");
      item.append(element("p", turn.player, "player-line"), element("p", turn.answer));
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
    const ask = element("button", "보내기");
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
      isPending = true;
      for (const control of controls) control.disabled = true;
      status.textContent = "응답을 기다리고 있습니다.";

      const { sessionId, gameMinute } = mock.getSession();
      eventNumber += 1;
      const request = {
        sessionId,
        eventId: `mock-turn-${eventNumber}`,
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
          status.textContent = result.error.message;
        }
      } catch {
        status.textContent = "응답을 표시하지 못했습니다. 다시 시도해 주세요.";
      } finally {
        isPending = false;
        for (const control of controls) control.disabled = false;
        field.focus();
      }
    }

    questionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = field.value.trim();
      if (text) {
        void send({ type: "question", text }, text);
      }
    });

    content.append(element("p", npc.activity, "muted"), log, questionForm);
    const { acquiredEvidenceIds } = mock.getSession();
    const clues = world.locations.map((place) => place.object.evidence);
    const inventory = clues.filter((clue) => acquiredEvidenceIds.includes(clue.id));
    if (inventory.length > 0) {
      const select = element("select");
      select.id = "evidence";
      for (const clue of inventory) {
        const option = element("option", clue.name);
        option.value = clue.id;
        select.append(option);
      }
      const label = element("label", "확보한 증거");
      label.htmlFor = select.id;
      const present = button("증거 제시", () => {
        const clue = inventory.find((entry) => entry.id === select.value);
        if (clue) {
          void send({ type: "present_evidence", evidenceId: clue.id }, `증거 제시 · ${clue.name}`);
        }
      });
      controls.push(select, present);
      const evidenceForm = element("div", "", "action-form");
      evidenceForm.append(label, select, present);
      content.append(evidenceForm);
    }

    const checks = element("div", "", "mock-actions");
    const unavailable = button(
      "응답 오류 확인",
      () => {
        const { action } = interrogation.unavailable.request;
        void send(action, action.text, true);
      },
      "secondary",
    );
    controls.push(unavailable);
    checks.append(unavailable);

    const unacquiredClue = clues.find((clue) => !acquiredEvidenceIds.includes(clue.id));
    if (unacquiredClue) {
      const denied = button(
        "미획득 증거 거절 확인",
        () => void send({ type: "present_evidence", evidenceId: unacquiredClue.id }, "증거 제시"),
        "secondary",
      );
      controls.push(denied);
      checks.append(denied);
    }
    content.append(status, checks);
    showScreen(`${npc.name}과 대화`, content, back);
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
  const error = element("p", "목업을 불러오지 못했습니다. 저장소 루트에서 정적 서버를 실행해 주세요.");
  error.setAttribute("role", "alert");
  app.replaceChildren(error);
}
