const EXPERIMENTS = {
  double_star: {
    title: "Двойная звезда",
    kind: "Количество траекторий",
    note: "Завершённые касания с событием UP или CANCEL",
    unit: "траекторий",
  },
  line_with_lift: {
    title: "Линия с отрывом",
    kind: "Количество траекторий",
    note: "Каждое непрерывное касание считается отдельной траекторией",
    unit: "траекторий",
  },
  free_draw: {
    title: "Свободное ведение",
    kind: "Количество точек",
    note: "Учитываются все сохранённые строки событий касания",
    unit: "точек",
  },
};

const state = { data: null, experiment: "double_star" };
const body = document.querySelector("#results-body");
const stateMessage = document.querySelector("#state-message");
const board = document.querySelector("#leaderboard");

function pluralParticipants(value) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "участников";
  if (mod10 === 1) return "участник";
  if (mod10 >= 2 && mod10 <= 4) return "участника";
  return "участников";
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDelta(value) {
  return `${value >= 0 ? "+" : "−"}${formatNumber(Math.abs(value))}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cell(text, className = "") {
  const element = document.createElement("td");
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function render() {
  if (!state.data) return;
  const key = state.experiment;
  const definition = EXPERIMENTS[key];
  document.querySelector("#board-title").textContent = definition.title;
  document.querySelector("#board-kind").textContent = definition.kind;
  document.querySelector("#board-note").textContent = definition.note;
  const participants = [...state.data.participants].sort((a, b) => {
    const scoreDifference = b.scores[key] - a.scores[key];
    return scoreDifference || a.name.localeCompare(b.name, "ru");
  });
  body.replaceChildren();
  stateMessage.hidden = participants.length !== 0;
  stateMessage.textContent = participants.length ? "" : "Принятых результатов пока нет.";
  participants.forEach((participant, index) => {
    const row = document.createElement("tr");
    row.append(cell(String(index + 1), `rank${index < 3 ? " top" : ""}`));
    row.append(cell(participant.name, "participant-name"));
    row.append(cell(formatNumber(participant.scores[key]), "numeric score"));
    const change = cell(formatDelta(participant.deltas[key]), `numeric change${participant.deltas[key] < 0 ? " negative" : ""}`);
    row.append(change);
    row.append(cell(formatDate(participant.updated_at), "updated"));
    body.append(row);
  });
  document.querySelector("#participant-count").textContent = formatNumber(participants.length);
  document.querySelector("#participant-label").textContent = pluralParticipants(participants.length);
  board.setAttribute("aria-labelledby", `tab-${key}`);
}

function selectExperiment(key, updateHash = true) {
  if (!EXPERIMENTS[key]) return;
  state.experiment = key;
  document.querySelectorAll(".tab").forEach((tab) => {
    const selected = tab.dataset.experiment === key;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  if (updateHash) history.replaceState(null, "", `#${key}`);
  render();
}

async function loadResults() {
  try {
    const response = await fetch(`results.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.participants)) throw new Error("Некорректный формат данных");
    state.data = data;
    document.querySelector("#freshness").textContent = `Обновлено ${formatDate(data.generated_at)}`;
    render();
  } catch (error) {
    document.querySelector("#freshness").textContent = "Не удалось обновить данные";
    if (!state.data) {
      stateMessage.hidden = false;
      stateMessage.textContent = "Таблица временно недоступна. Попробуйте обновить страницу позднее.";
    }
    console.error(error);
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => selectExperiment(tab.dataset.experiment));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const keys = Object.keys(EXPERIMENTS);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (keys.indexOf(state.experiment) + direction + keys.length) % keys.length;
    selectExperiment(keys[next]);
    document.querySelector(`#tab-${keys[next]}`).focus();
  });
});

const requested = location.hash.slice(1);
selectExperiment(EXPERIMENTS[requested] ? requested : "double_star", false);
loadResults();
setInterval(loadResults, 60_000);

