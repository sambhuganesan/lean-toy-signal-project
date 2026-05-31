# Lean Secure Messaging Toy

This is a small Lean 4 project that models a toy secure messaging server.

The goal is not to implement real cryptography. Instead, the project uses a
simple model where a message is readable by exactly the user stored in its
`encryptedFor` field. On top of that model, it proves small safety properties
about message construction and server delivery.

I built this as a learning demo for Lean: starting from basic data types,
moving to executable functions, then writing propositions and proofs about the
system.

## Story

The system has three users:

- `alice`
- `bob`
- `eve`

A message has:

- a `sender`
- a `recipient`
- a text `body`
- an `encryptedFor` user

The central security rule is:

```text
A user can read a message only when that user equals message.encryptedFor.
```

In other words, this model separates two ideas:

```text
Where a message is stored
```

from:

```text
Who the message is encrypted for
```

That lets the project model both correct delivery and mistaken delivery.

## Files

- `LeanSecureMessagingToy/Basic.lean` contains the model and proofs.
- `Main.lean` contains an executable demo that constructs messages/server
  states and asks Lean to check proof values.
- `lakefile.toml` defines the Lean library and executable.

## Running

Build the project:

```sh
lake build
```

Run the executable demo:

```sh
lake exe lean-secure-messaging-toy
```

## Core Model

### Users

```lean
inductive User where
  | alice
  | bob
  | eve
  deriving DecidableEq, Repr
```

`User` is an inductive type with three possible values.

`DecidableEq` lets Lean decide whether two users are equal. That is useful for
`if u = inboxOwner then ...` and for runtime checks in `Main.lean`.

`Repr` lets Lean print/debug values like `User.alice`.

### Messages

```lean
structure Message where
  sender : User
  recipient : User
  body : String
  encryptedFor : User
  deriving Repr
```

`Message` is a record. A value of type `Message` stores who sent the message,
who it was intended for, the body text, and who can read it according to this
toy model.

### Readability

```lean
def canRead (u : User) (m : Message) : Prop :=
  u = m.encryptedFor
```

`canRead` is a proposition, not a runtime function returning `Bool`.

It says:

```text
u can read m exactly when u equals m.encryptedFor.
```

### Creating Encrypted Messages

```lean
def sendEncrypted (sender recipient : User) (body : String) : Message :=
  { sender := sender
    recipient := recipient
    body := body
    encryptedFor := recipient
  }
```

`sendEncrypted` creates a message encrypted for its recipient.

It does not put the message into an inbox. It only creates the `Message`.

## Message Proofs

### The Recipient Can Read

```lean
theorem recipient_can_read
    (sender recipient : User)
    (body : String) :
    canRead recipient (sendEncrypted sender recipient body) := by
  unfold canRead
  unfold sendEncrypted
  rfl
```

This proves that a message made by `sendEncrypted` can be read by the intended
recipient.

After unfolding the definitions, the goal becomes:

```lean
recipient = recipient
```

That is why `rfl` finishes the proof.

### Other Users Cannot Read

```lean
theorem other_cannot_read
    (sender recipient other : User)
    (body : String)
    (h : Not (other = recipient)) :
    Not (canRead other (sendEncrypted sender recipient body)) := by
  intro hread
  unfold canRead at hread
  unfold sendEncrypted at hread
  exact h hread
```

This proves that if `other` is not the recipient, then `other` cannot read the
message.

Important proof idea:

```lean
intro hread
```

creates a temporary assumption:

```lean
hread : canRead other (sendEncrypted sender recipient body)
```

Because proving `Not P` means proving `P -> False`, Lean lets us assume `P` and
derive a contradiction.

After unfolding, `hread` becomes:

```lean
hread : other = recipient
```

But the theorem already has:

```lean
h : Not (other = recipient)
```

So:

```lean
exact h hread
```

uses the contradiction to finish the proof.

## Server State

```lean
structure ServerState where
  inbox : User -> List Message
```

A server state maps each user to that user's inbox.

The empty server is:

```lean
def emptyServer : ServerState :=
  { inbox := fun _ => [] }
```

`fun _ => []` means:

```text
for any user, ignore the user and return an empty inbox
```

## Inbox Safety

```lean
def InboxSafe (st : ServerState) : Prop :=
  forall (u : User) (m : Message), Membership.mem (st.inbox u) m -> canRead u m
```

`InboxSafe st` is a property of the whole server state.

It means:

```text
For every user u,
for every message m,
if m is in u's inbox,
then u can read m.
```

This is the main invariant of the project.

### Empty Server Is Safe

```lean
theorem emptyServer_safe : InboxSafe emptyServer := by
  intro u m h
  simp [emptyServer] at h
```

The empty server is safe because there are no messages in any inbox.

The proof introduces:

- `u`: an arbitrary user
- `m`: an arbitrary message
- `h`: a proof that `m` is in `u`'s inbox

But in the empty server, every inbox is `[]`, so `h` is impossible.

## Delivery

```lean
def deliverTo
    (st : ServerState)
    (inboxOwner : User)
    (sender recipient : User)
    (body : String) : ServerState :=
  { inbox := fun u =>
      if u = inboxOwner then
        sendEncrypted sender recipient body :: st.inbox u
      else
        st.inbox u
  }
```

`deliverTo` is the only delivery function.

It creates an encrypted message from `sender` to `recipient`, then puts that
message into `inboxOwner`'s inbox.

Correct delivery is the case where:

```lean
inboxOwner = recipient
```

Mistaken delivery is the case where:

```lean
inboxOwner != recipient
```

The model keeps those separate on purpose: it lets us prove what happens when a
message is stored in the correct inbox and what happens when it is stored in
the wrong one.

## Delivery Proofs

### Correct Delivery Preserves Safety

```lean
theorem deliverCorrect_preserves_safe
    (st : ServerState)
    (sender recipient : User)
    (body : String)
    (hSafe : InboxSafe st) :
    InboxSafe (deliverTo st recipient sender recipient body) := by
```

This theorem says:

```text
If the old server is safe,
then delivering a message to the recipient's inbox keeps the server safe.
```

The proof starts:

```lean
intro u m hMem
```

This comes from the definition of `InboxSafe`.

It means:

```text
Take any user u.
Take any message m.
Assume hMem says m is in u's inbox after delivery.
Now prove u can read m.
```

Then:

```lean
by_cases h : u = recipient
```

splits the proof into two cases.

Case 1:

```text
u is the recipient.
```

Then the inbox contains either:

- the newly delivered message, which is readable by `recipient_can_read`
- an old message, which is readable because `hSafe` says the old server was safe

Case 2:

```text
u is not the recipient.
```

Then `deliverTo st recipient sender recipient body` did not change `u`'s inbox,
so the old safety proof `hSafe` applies directly.

### Delivered Message Is In The Chosen Inbox

```lean
theorem delivered_message_in_inbox
    (st : ServerState)
    (inboxOwner sender recipient : User)
    (body : String) :
    Membership.mem
      ((deliverTo st inboxOwner sender recipient body).inbox inboxOwner)
      (sendEncrypted sender recipient body) := by
  unfold deliverTo
  simp
```

This proves the mechanical behavior of `deliverTo`:

```text
After deliverTo, the newly created encrypted message is in inboxOwner's inbox.
```

This theorem does not say the inbox owner can read the message. It only proves
where the message was stored.

### Wrong Inbox Owner Cannot Read

```lean
theorem wrong_inbox_owner_cannot_read_message
    (inboxOwner sender recipient : User)
    (body : String)
    (h : Not (inboxOwner = recipient)) :
    Not (canRead inboxOwner (sendEncrypted sender recipient body)) := by
  exact other_cannot_read sender recipient inboxOwner body h
```

This proves:

```text
If a message is encrypted for recipient but placed in inboxOwner's inbox,
and inboxOwner is not recipient,
then inboxOwner cannot read it.
```

The proof reuses the earlier theorem `other_cannot_read`.

## What The Demo Shows

The executable in `Main.lean` demonstrates:

- Bob can read a message encrypted for Bob.
- Eve cannot read a message encrypted for Bob.
- The empty server satisfies `InboxSafe`.
- Correct delivery preserves `InboxSafe`.
- Repeated correct delivery still preserves `InboxSafe`.
- A message can be placed into Eve's inbox while still being encrypted for Bob.
- Lean proves that Eve cannot read that Bob-encrypted message.

Some checks happen at runtime using printed booleans like:

```lean
decide (ToySignal.User.eve = misdeliveredMsg.encryptedFor)
```

Other checks happen at compile time by binding theorem results to values like:

```lean
let _deliveredServerSafe : ToySignal.InboxSafe deliveredServer :=
  ToySignal.deliverCorrect_preserves_safe ...
```

If Lean accepts the file, those proof checks succeeded.

## What This Project Demonstrates

This project demonstrates basic Lean fluency with:

- custom data types using `inductive`
- records using `structure`
- executable functions using `def`
- propositions using `Prop`
- universal claims using `forall`
- implication using `->`
- proof scripts using `intro`, `unfold`, `by_cases`, `simp`, `rcases`, `rw`,
  `exact`, and `rfl`
- maintaining a safety invariant across state updates
- separating executable testing from theorem proving

## Limits

This is a toy formal model. It does not prove real cryptographic security,
network security, authentication, secrecy under an attacker model, or anything
about actual encryption algorithms.

The useful claim is narrower:

```text
Under this simplified model, messages are readable only by the user in their
encryptedFor field, and correct delivery preserves the inbox safety invariant.
```

That narrow claim is exactly what the Lean proofs check.
