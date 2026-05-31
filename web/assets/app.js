const state = {
  users: ["alice", "bob", "eve"],
  messages: [],
  nextMessageId: 1,
};

const proofData = JSON.parse(document.getElementById("proofData").textContent);
const els = {
  addUserForm: document.getElementById("addUserForm"),
  newUserName: document.getElementById("newUserName"),
  userList: document.getElementById("userList"),
  userCount: document.getElementById("userCount"),
  senderSelect: document.getElementById("senderSelect"),
  recipientSelect: document.getElementById("recipientSelect"),
  inboxOwnerSelect: document.getElementById("inboxOwnerSelect"),
  bodyInput: document.getElementById("bodyInput"),
  messageForm: document.getElementById("messageForm"),
  resetBtn: document.getElementById("resetBtn"),
  inboxGrid: document.getElementById("inboxGrid"),
  messageTemplate: document.getElementById("messageTemplate"),
  proofSummary: document.getElementById("proofSummary"),
  safetyStatus: document.getElementById("safetyStatus"),
  scenarioForm: document.getElementById("scenarioForm"),
  scenarioName: document.getElementById("scenarioName"),
  dbStatus: document.getElementById("dbStatus"),
  loadScenariosBtn: document.getElementById("loadScenariosBtn"),
};

function titleName(name) {
  return name.slice(0, 1).toUpperCase() + name.slice(1);
}

function normalizeUserName(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function canRead(user, message) {
  return user === message.encryptedFor;
}

function inboxSafe() {
  return state.messages.every((message) => canRead(message.storedIn, message));
}

function sendEncrypted(sender, recipient, body) {
  return {
    id: state.nextMessageId++,
    sender,
    recipient,
    body,
    encryptedFor: recipient,
    storedIn: null,
  };
}

function deliverTo(inboxOwner, sender, recipient, body) {
  const message = sendEncrypted(sender, recipient, body);
  message.storedIn = inboxOwner;
  state.messages.unshift(message);
  render();
}

function setSelectOptions(select, users, selected) {
  select.replaceChildren();
  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user;
    option.textContent = titleName(user);
    if (user === selected) option.selected = true;
    select.append(option);
  });
}

function renderUsers() {
  els.userCount.textContent = String(state.users.length);
  els.userList.replaceChildren();

  state.users.forEach((user) => {
    const chip = document.createElement("span");
    chip.className = "user-chip";
    chip.textContent = titleName(user);
    els.userList.append(chip);
  });

  const sender = els.senderSelect.value || "alice";
  const recipient = els.recipientSelect.value || "bob";
  const inboxOwner = els.inboxOwnerSelect.value || recipient;
  setSelectOptions(els.senderSelect, state.users, state.users.includes(sender) ? sender : state.users[0]);
  setSelectOptions(els.recipientSelect, state.users, state.users.includes(recipient) ? recipient : state.users[1] || state.users[0]);
  setSelectOptions(els.inboxOwnerSelect, state.users, state.users.includes(inboxOwner) ? inboxOwner : els.recipientSelect.value);
}

function renderInboxGrid() {
  els.inboxGrid.replaceChildren();

  state.users.forEach((user) => {
    const column = document.createElement("section");
    column.className = "inbox-column";

    const messages = state.messages.filter((message) => message.storedIn === user);
    const safeCount = messages.filter((message) => canRead(user, message)).length;

    const header = document.createElement("header");
    header.className = "inbox-header";
    header.innerHTML = `<h3>${titleName(user)}</h3><span class="count">${safeCount}/${messages.length}</span>`;

    const body = document.createElement("div");
    body.className = "inbox-body";

    if (messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "empty inbox";
      body.append(empty);
    } else {
      messages.forEach((message) => body.append(renderMessageCard(message, user)));
    }

    column.append(header, body);
    els.inboxGrid.append(column);
  });
}

function renderMessageCard(message, owner) {
  const card = els.messageTemplate.content.firstElementChild.cloneNode(true);
  const readable = canRead(owner, message);
  card.classList.toggle("is-blocked", !readable);
  card.querySelector('[data-field="route"]').textContent = `${titleName(message.sender)} -> ${titleName(message.recipient)}`;
  card.querySelector('[data-field="body"]').textContent = message.body;
  card.querySelector('[data-field="encryptedFor"]').textContent = titleName(message.encryptedFor);
  card.querySelector('[data-field="storedIn"]').textContent = titleName(message.storedIn);

  const badge = card.querySelector('[data-field="readBadge"]');
  badge.className = readable ? "read-badge safe" : "read-badge blocked";
  badge.textContent = readable ? "can read" : "blocked";
  return card;
}

function activeProofIds() {
  const ids = new Set(["recipient_can_read", "other_cannot_read", "delivered_message_in_inbox"]);
  if (state.messages.some((message) => message.storedIn === message.recipient)) {
    ids.add("deliverCorrect_preserves_safe");
  }
  if (state.messages.some((message) => message.storedIn !== message.recipient)) {
    ids.add("wrong_inbox_owner_cannot_read_message");
  }
  return ids;
}

function renderProofs() {
  const safe = inboxSafe();
  els.safetyStatus.textContent = safe ? "InboxSafe: holds" : "InboxSafe: violated";
  els.safetyStatus.classList.toggle("is-broken", !safe);

  const lines = [
    {
      title: "Readability rule",
      body: "canRead u m is true exactly when u equals m.encryptedFor.",
    },
    {
      title: "Current invariant",
      body: safe
        ? "Every stored message is readable by its inbox owner."
        : "At least one inbox contains a message encrypted for someone else.",
    },
  ];

  const latest = state.messages[0];
  if (latest) {
    lines.push({
      title: latest.storedIn === latest.recipient ? "Correct delivery" : "Wrong inbox delivery",
      body:
        latest.storedIn === latest.recipient
          ? `The latest message was delivered to ${titleName(latest.recipient)}, so deliverCorrect_preserves_safe applies.`
          : `The latest message is in ${titleName(latest.storedIn)}'s inbox but encrypted for ${titleName(latest.recipient)}.`,
    });
  }

  els.proofSummary.replaceChildren();
  lines.forEach((line) => {
    const item = document.createElement("div");
    item.className = "proof-line";
    item.innerHTML = `<strong>${line.title}</strong><span>${line.body}</span>`;
    els.proofSummary.append(item);
  });

  const active = activeProofIds();
  document.querySelectorAll(".theorem-card").forEach((card) => {
    card.classList.toggle("is-active", active.has(card.dataset.proofId));
  });
}

function render() {
  renderUsers();
  renderInboxGrid();
  renderProofs();
}

function resetState() {
  state.users = ["alice", "bob", "eve"];
  state.messages = [];
  state.nextMessageId = 1;
  els.bodyInput.value = "secret";
  render();
}

async function saveScenario(event) {
  event.preventDefault();
  const payload = {
    name: els.scenarioName.value.trim() || "Untitled scenario",
    users: state.users,
    messages: state.messages,
  };

  try {
    const response = await fetch("./api/save_scenario.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    els.dbStatus.textContent = data.ok
      ? `Saved scenario #${data.id}.`
      : data.error || "Scenario was not saved.";
  } catch (error) {
    els.dbStatus.textContent = "Save endpoint unavailable. Configure PHP/MySQL to enable persistence.";
  }
}

async function loadScenarios() {
  try {
    const response = await fetch("./api/list_scenarios.php");
    const data = await response.json();
    if (!data.ok) {
      els.dbStatus.textContent = data.error || "No saved scenarios loaded.";
      return;
    }
    els.dbStatus.textContent = data.scenarios.length
      ? `Loaded ${data.scenarios.length} saved scenario record(s).`
      : "No saved scenarios yet.";
  } catch (error) {
    els.dbStatus.textContent = "Load endpoint unavailable. Configure PHP/MySQL to enable persistence.";
  }
}

els.addUserForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = normalizeUserName(els.newUserName.value);
  if (!name || state.users.includes(name)) return;
  state.users.push(name);
  els.newUserName.value = "";
  render();
});

els.messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  deliverTo(
    els.inboxOwnerSelect.value,
    els.senderSelect.value,
    els.recipientSelect.value,
    els.bodyInput.value.trim() || "(empty message)"
  );
});

els.resetBtn.addEventListener("click", resetState);
els.scenarioForm.addEventListener("submit", saveScenario);
els.loadScenariosBtn.addEventListener("click", loadScenarios);
els.recipientSelect.addEventListener("change", () => {
  els.inboxOwnerSelect.value = els.recipientSelect.value;
});

render();
