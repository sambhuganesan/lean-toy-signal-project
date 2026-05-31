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
  savedScenarioSelect: document.getElementById("savedScenarioSelect"),
  dbStatus: document.getElementById("dbStatus"),
  loadScenariosBtn: document.getElementById("loadScenariosBtn"),
};

let savedScenarios = [];

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
  const ids = new Set();
  const latest = state.messages[0];

  if (!latest) {
    return ids;
  }

  ids.add("recipient_can_read");
  ids.add("delivered_message_in_inbox");

  if (latest.storedIn === latest.recipient) {
    ids.add("deliverCorrect_preserves_safe");
  }

  if (latest.storedIn !== latest.recipient) {
    ids.add("other_cannot_read");
    ids.add("wrong_inbox_owner_cannot_read_message");
  }

  return ids;
}

function renderProofs() {
  const safe = inboxSafe();
  els.safetyStatus.textContent = safe ? "InboxSafe: holds" : "InboxSafe: violated";
  els.safetyStatus.classList.toggle("is-broken", !safe);

  const lines = [];

  const latest = state.messages[0];
  if (latest) {
    const correctInbox = latest.storedIn === latest.recipient;
    lines.push(
      {
        kind: "verified",
        title: "Placement proved",
        body: `delivered_message_in_inbox: the message is stored in ${titleName(latest.storedIn)}'s inbox.`,
      },
      {
        kind: "verified",
        title: "Recipient can read",
        body: `recipient_can_read: ${titleName(latest.recipient)} can read it because encryptedFor = ${titleName(latest.recipient)}.`,
      }
    );

    if (correctInbox) {
      lines.push(
        {
          kind: "verified",
          title: "Inbox owner can read",
          body: `${titleName(latest.storedIn)} owns the inbox and is also the recipient.`,
        },
        {
          kind: "verified",
          title: "InboxSafe preserved",
          body: "deliverCorrect_preserves_safe applies because deliverTo was used with inboxOwner = recipient.",
        }
      );
    } else {
      lines.push(
        {
          kind: "warning",
          title: "Inbox owner cannot read",
          body: `wrong_inbox_owner_cannot_read_message: ${titleName(latest.storedIn)} cannot read it because encryptedFor = ${titleName(latest.recipient)}.`,
        },
        {
          kind: "warning",
          title: "InboxSafe violated",
          body: "The message is in the wrong inbox, so the global InboxSafe invariant does not hold for this server state.",
        }
      );
    }
  } else {
    lines.push(
      {
        kind: "verified",
        title: "Empty server",
        body: "emptyServer_safe: no inbox contains any messages, so InboxSafe holds.",
      },
      {
        kind: "neutral",
        title: "Readability rule",
        body: "canRead u m is true exactly when u equals m.encryptedFor.",
      }
    );
  }

  els.proofSummary.replaceChildren();
  lines.forEach((line) => {
    const item = document.createElement("div");
    item.className = `proof-line is-${line.kind || "neutral"}`;
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

function loadScenarioIntoState(scenario) {
  const users = Array.isArray(scenario.users) && scenario.users.length > 0
    ? scenario.users.map(String)
    : ["alice", "bob", "eve"];
  const messages = Array.isArray(scenario.messages) ? scenario.messages : [];

  state.users = [...new Set(users.map(normalizeUserName).filter(Boolean))];
  if (state.users.length === 0) {
    state.users = ["alice", "bob", "eve"];
  }

  state.messages = messages
    .filter((message) => message && typeof message === "object")
    .map((message, index) => ({
      id: Number.isFinite(Number(message.id)) ? Number(message.id) : index + 1,
      sender: normalizeUserName(String(message.sender || state.users[0])),
      recipient: normalizeUserName(String(message.recipient || state.users[0])),
      body: String(message.body || ""),
      encryptedFor: normalizeUserName(String(message.encryptedFor || message.recipient || state.users[0])),
      storedIn: normalizeUserName(String(message.storedIn || message.recipient || state.users[0])),
    }));

  state.messages.forEach((message) => {
    [message.sender, message.recipient, message.encryptedFor, message.storedIn].forEach((user) => {
      if (user && !state.users.includes(user)) {
        state.users.push(user);
      }
    });
  });

  state.nextMessageId = state.messages.reduce((max, message) => Math.max(max, message.id), 0) + 1;
  els.scenarioName.value = scenario.name || "Loaded scenario";
  render();
}

function scenarioLabel(scenario) {
  const when = scenario.created_at ? new Date(scenario.created_at).toLocaleString() : "unsaved time";
  const count = Array.isArray(scenario.messages) ? scenario.messages.length : 0;
  return `${scenario.name || "Untitled scenario"} (${count} message${count === 1 ? "" : "s"}, ${when})`;
}

function renderSavedScenarioOptions(scenarios) {
  savedScenarios = scenarios;
  els.savedScenarioSelect.replaceChildren();

  if (savedScenarios.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved scenarios found";
    els.savedScenarioSelect.append(option);
    return;
  }

  savedScenarios.forEach((scenario, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = scenarioLabel(scenario);
    els.savedScenarioSelect.append(option);
  });
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
    if (data.ok && data.storage === "json-file") {
      els.dbStatus.textContent = `Saved JSON file: ${data.path}`;
      await refreshSavedScenarios();
    } else if (data.ok && data.storage === "mysql") {
      els.dbStatus.textContent = `Saved MySQL scenario #${data.id} in ${data.path}.`;
      await refreshSavedScenarios();
    } else {
      els.dbStatus.textContent = data.error || "Scenario was not saved.";
    }
  } catch (error) {
    els.dbStatus.textContent = "Save endpoint unavailable. Check the PHP server terminal.";
  }
}

async function refreshSavedScenarios() {
  try {
    const response = await fetch("./api/list_scenarios.php");
    const data = await response.json();
    if (!data.ok) {
      els.dbStatus.textContent = data.error || "No saved scenarios loaded.";
      renderSavedScenarioOptions([]);
      return [];
    }

    renderSavedScenarioOptions(data.scenarios);
    if (!data.scenarios.length) {
      els.dbStatus.textContent = `No saved scenarios yet in ${data.storage}.`;
      return [];
    }

    return data.scenarios;
  } catch (error) {
    els.dbStatus.textContent = "Load endpoint unavailable. Check the PHP server terminal.";
    renderSavedScenarioOptions([]);
    return [];
  }
}

async function loadSelectedScenario() {
  if (savedScenarios.length === 0) {
    await refreshSavedScenarios();
  }

  const index = Number(els.savedScenarioSelect.value);
  const scenario = savedScenarios[index];

  if (!scenario) {
    els.dbStatus.textContent = "Choose a saved scenario first.";
    return;
  }

  loadScenarioIntoState(scenario);
  els.dbStatus.textContent = `Loaded "${scenario.name}" from ${scenario.path || scenario.storage}.`;
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
els.loadScenariosBtn.addEventListener("click", loadSelectedScenario);
els.recipientSelect.addEventListener("change", () => {
  els.inboxOwnerSelect.value = els.recipientSelect.value;
});

render();
refreshSavedScenarios();
