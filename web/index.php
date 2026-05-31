<?php
$proofs = [
    [
        'id' => 'recipient_can_read',
        'title' => 'recipient_can_read',
        'summary' => 'A message produced by sendEncrypted is readable by the intended recipient.',
        'lean' => 'canRead recipient (sendEncrypted sender recipient body)',
    ],
    [
        'id' => 'other_cannot_read',
        'title' => 'other_cannot_read',
        'summary' => 'Any user different from the recipient cannot read the encrypted message.',
        'lean' => 'Not (canRead other (sendEncrypted sender recipient body))',
    ],
    [
        'id' => 'deliverCorrect_preserves_safe',
        'title' => 'deliverCorrect_preserves_safe',
        'summary' => 'Delivering to the recipient inbox preserves the InboxSafe invariant.',
        'lean' => 'InboxSafe (deliverTo st recipient sender recipient body)',
    ],
    [
        'id' => 'delivered_message_in_inbox',
        'title' => 'delivered_message_in_inbox',
        'summary' => 'deliverTo stores the new message in the chosen inbox.',
        'lean' => 'Membership.mem ((deliverTo st inboxOwner sender recipient body).inbox inboxOwner) msg',
    ],
    [
        'id' => 'wrong_inbox_owner_cannot_read_message',
        'title' => 'wrong_inbox_owner_cannot_read_message',
        'summary' => 'If the inbox owner is not the recipient, that owner still cannot read it.',
        'lean' => 'Not (canRead inboxOwner (sendEncrypted sender recipient body))',
    ],
];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Toy Signal Proof Lab</title>
  <link rel="stylesheet" href="./assets/styles.css">
</head>
<body>
  <header class="app-header">
    <div>
      <p class="eyebrow">Lean 4 secure messaging model</p>
      <h1>Toy Signal Proof Lab</h1>
    </div>
    <div class="status-pill" id="safetyStatus">InboxSafe: checked</div>
  </header>

  <main class="layout">
    <section class="panel controls-panel" aria-label="Message controls">
      <div class="section-title">
        <span>Users</span>
        <span class="count" id="userCount">3</span>
      </div>

      <form class="inline-form" id="addUserForm">
        <input id="newUserName" name="newUserName" type="text" autocomplete="off" placeholder="mallory" aria-label="New user name">
        <button type="submit">Add</button>
      </form>

      <div class="user-list" id="userList"></div>

      <div class="section-title">
        <span>Send Message</span>
      </div>

      <form class="message-form" id="messageForm">
        <label>
          Sender
          <select id="senderSelect"></select>
        </label>

        <label>
          Encrypt for
          <select id="recipientSelect"></select>
        </label>

        <label>
          Deliver to inbox
          <select id="inboxOwnerSelect"></select>
        </label>

        <label>
          Body
          <textarea id="bodyInput" rows="4">secret</textarea>
        </label>

        <div class="button-row">
          <button type="submit" class="primary">Deliver</button>
          <button type="button" id="resetBtn">Reset</button>
        </div>
      </form>

      <form class="scenario-form" id="scenarioForm">
        <label>
          Scenario name
          <input id="scenarioName" type="text" value="Toy Signal demo">
        </label>
        <div class="button-row">
          <button type="submit">Save via PHP/MySQL</button>
          <button type="button" id="loadScenariosBtn">Load saved</button>
        </div>
        <p class="db-note" id="dbStatus">MySQL persistence is optional until configured.</p>
      </form>
    </section>

    <section class="workspace" aria-label="Server state">
      <div class="toolbar">
        <div>
          <p class="eyebrow">ServerState.inbox</p>
          <h2>Inbox Board</h2>
        </div>
        <div class="legend">
          <span><i class="dot dot-safe"></i> readable</span>
          <span><i class="dot dot-blocked"></i> not readable by owner</span>
        </div>
      </div>

      <div class="inbox-grid" id="inboxGrid"></div>
    </section>

    <aside class="panel proof-panel" aria-label="Proof trace">
      <div class="section-title">
        <span>Proof Trace</span>
      </div>

      <div class="proof-summary" id="proofSummary"></div>

      <div class="theorem-list">
        <?php foreach ($proofs as $proof): ?>
          <article class="theorem-card" data-proof-id="<?= htmlspecialchars($proof['id'], ENT_QUOTES) ?>">
            <h3><?= htmlspecialchars($proof['title']) ?></h3>
            <p><?= htmlspecialchars($proof['summary']) ?></p>
            <code><?= htmlspecialchars($proof['lean']) ?></code>
          </article>
        <?php endforeach; ?>
      </div>
    </aside>
  </main>

  <template id="messageTemplate">
    <article class="message-card">
      <div class="message-topline">
        <strong data-field="route"></strong>
        <span data-field="readBadge"></span>
      </div>
      <p data-field="body"></p>
      <dl>
        <div>
          <dt>encryptedFor</dt>
          <dd data-field="encryptedFor"></dd>
        </div>
        <div>
          <dt>storedIn</dt>
          <dd data-field="storedIn"></dd>
        </div>
      </dl>
    </article>
  </template>

  <script id="proofData" type="application/json"><?= json_encode($proofs, JSON_UNESCAPED_SLASHES) ?></script>
  <script src="./assets/app.js"></script>
</body>
</html>
