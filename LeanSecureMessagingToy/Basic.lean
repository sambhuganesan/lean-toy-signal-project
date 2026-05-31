namespace ToySignal

/-!
This file is a small Lean model of a secure messaging server.

It is not real cryptography. The model says a message is readable by exactly
the user stored in its `encryptedFor` field, then proves that the server
operations preserve that safety property.
-/

-- Users in the toy system.
inductive User where
  | alice
  | bob
  | eve
  deriving DecidableEq, Repr

-- A message records who sent it, who it is intended for, and who can read it.
structure Message where
  sender : User
  recipient : User
  body : String
  encryptedFor : User
  deriving Repr

-- A concrete example message used by the executable demo.
def exMsg : Message := {
  sender := User.alice
  recipient := User.bob
  body := "hi bob"
  encryptedFor := User.bob
}

-- In this model, reading permission is equality with the encryptedFor field.
def canRead (u : User) (m : Message) : Prop :=
  u = m.encryptedFor

-- Construct a message that is encrypted for its recipient.
def sendEncrypted (sender recipient : User) (body : String) : Message :=
  { sender := sender
    recipient := recipient
    body := body
    encryptedFor := recipient
  }

-- The intended recipient can read a correctly encrypted message.
theorem recipient_can_read
    (sender recipient : User)
    (body : String) :
    canRead recipient (sendEncrypted sender recipient body) := by
  unfold canRead
  unfold sendEncrypted
  rfl

-- Any user other than the recipient cannot read the encrypted message.
theorem other_cannot_read
    (sender recipient other : User)
    (body : String)
    (h : Not (other = recipient)) :
    Not (canRead other (sendEncrypted sender recipient body)) := by
  intro hread
  unfold canRead at hread
  unfold sendEncrypted at hread
  exact h hread

-- Server state maps each user to that user's inbox.
structure ServerState where
  inbox : User -> List Message

-- The empty server has no messages in any inbox.
def emptyServer : ServerState :=
  { inbox := fun _ => [] }

-- Every message in user u's inbox must be readable by u.
def InboxSafe (st : ServerState) : Prop :=
  forall (u : User) (m : Message), Membership.mem (st.inbox u) m -> canRead u m

-- The empty server is safe because no message can be found in an empty inbox.
theorem emptyServer_safe : InboxSafe emptyServer := by
  intro u m h
  simp [emptyServer] at h

-- General delivery puts the message in the chosen inboxOwner's inbox.
-- This can model both correct delivery and mistaken delivery.
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

-- Correct delivery preserves the InboxSafe invariant.
theorem deliverCorrect_preserves_safe
    (st : ServerState)
    (sender recipient : User)
    (body : String)
    (hSafe : InboxSafe st) :
    InboxSafe (deliverTo st recipient sender recipient body) := by
  intro u m hMem
  unfold deliverTo at hMem
  by_cases h : u = recipient
  . simp [h] at hMem
    rcases hMem with hNew | hOld
    . rw [hNew]
      rw [h]
      exact recipient_can_read sender recipient body
    . rw [h]
      exact hSafe recipient m hOld
  . simp [h] at hMem
    exact hSafe u m hMem

-- The message really appears in the chosen inbox after deliverTo.
theorem delivered_message_in_inbox
    (st : ServerState)
    (inboxOwner sender recipient : User)
    (body : String) :
    Membership.mem
      ((deliverTo st inboxOwner sender recipient body).inbox inboxOwner)
      (sendEncrypted sender recipient body) := by
  unfold deliverTo
  simp

-- Even if a message is placed in the wrong inbox, the wrong owner cannot read it.
theorem wrong_inbox_owner_cannot_read_message
    (inboxOwner sender recipient : User)
    (body : String)
    (h : Not (inboxOwner = recipient)) :
    Not (canRead inboxOwner (sendEncrypted sender recipient body)) := by
  exact other_cannot_read sender recipient inboxOwner body h

end ToySignal
