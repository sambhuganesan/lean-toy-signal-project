import LeanSecureMessagingToy

def main : IO Unit := do
  let encryptedMsg := ToySignal.sendEncrypted ToySignal.User.alice ToySignal.User.bob "hi"
  let deliveredServer := ToySignal.deliverTo ToySignal.emptyServer ToySignal.User.bob ToySignal.User.alice ToySignal.User.bob "hello"
  let deliveredTwiceServer := ToySignal.deliverTo deliveredServer ToySignal.User.alice ToySignal.User.bob ToySignal.User.alice "reply"
  let misdeliveredServer := ToySignal.deliverTo ToySignal.emptyServer ToySignal.User.eve ToySignal.User.alice ToySignal.User.bob "secret"
  let misdeliveredMsg := ToySignal.sendEncrypted ToySignal.User.alice ToySignal.User.bob "secret"
  let _misdeliveredMsgInEveInbox :
      Membership.mem (misdeliveredServer.inbox ToySignal.User.eve) misdeliveredMsg :=
    ToySignal.delivered_message_in_inbox
      ToySignal.emptyServer
      ToySignal.User.eve
      ToySignal.User.alice
      ToySignal.User.bob
      "secret"
  let _bobProof : ToySignal.canRead ToySignal.User.bob encryptedMsg :=
    ToySignal.recipient_can_read ToySignal.User.alice ToySignal.User.bob "hi"
  let _eveCannotReadProof : Not (ToySignal.canRead ToySignal.User.eve encryptedMsg) :=
    ToySignal.other_cannot_read
      ToySignal.User.alice
      ToySignal.User.bob
      ToySignal.User.eve
      "hi"
      (by
        intro h
        cases h)
  let _emptyServerSafe : ToySignal.InboxSafe ToySignal.emptyServer :=
    ToySignal.emptyServer_safe
  let _deliveredServerSafe : ToySignal.InboxSafe deliveredServer :=
    ToySignal.deliverCorrect_preserves_safe
      ToySignal.emptyServer
      ToySignal.User.alice
      ToySignal.User.bob
      "hello"
      ToySignal.emptyServer_safe
  let _deliveredTwiceServerSafe : ToySignal.InboxSafe deliveredTwiceServer :=
    ToySignal.deliverCorrect_preserves_safe
      deliveredServer
      ToySignal.User.bob
      ToySignal.User.alice
      "reply"
      _deliveredServerSafe
  let _eveCannotReadMisdeliveredProof : Not (ToySignal.canRead ToySignal.User.eve misdeliveredMsg) :=
    ToySignal.wrong_inbox_owner_cannot_read_message
      ToySignal.User.eve
      ToySignal.User.alice
      ToySignal.User.bob
      "secret"
      (by
        intro h
        cases h)
  IO.println s!"Users: {repr ToySignal.User.alice},
                       {repr ToySignal.User.bob},
                       {repr ToySignal.User.eve}"
  IO.println s!"Message: {repr encryptedMsg}"
  IO.println s!"Sender: {repr encryptedMsg.sender}"
  IO.println s!"Bob can read: {decide (ToySignal.User.bob = encryptedMsg.encryptedFor)}"
  IO.println s!"Eve can read: {decide (ToySignal.User.eve = encryptedMsg.encryptedFor)}"
  IO.println s!"Alice inbox on empty server: {repr (ToySignal.emptyServer.inbox ToySignal.User.alice)}"
  IO.println s!"Bob inbox on empty server: {repr (ToySignal.emptyServer.inbox ToySignal.User.bob)}"
  IO.println "emptyServer satisfies InboxSafe: checked by Lean"
  IO.println s!"Bob inbox after delivery: {repr (deliveredServer.inbox ToySignal.User.bob)}"
  IO.println s!"Eve inbox after delivery: {repr (deliveredServer.inbox ToySignal.User.eve)}"
  IO.println "deliveredServer satisfies InboxSafe: checked by Lean"
  IO.println s!"Alice inbox after second delivery: {repr (deliveredTwiceServer.inbox ToySignal.User.alice)}"
  IO.println s!"Bob inbox after second delivery: {repr (deliveredTwiceServer.inbox ToySignal.User.bob)}"
  IO.println "deliveredTwiceServer satisfies InboxSafe: checked by Lean"
  IO.println s!"Eve inbox after wrong delivery: {repr (misdeliveredServer.inbox ToySignal.User.eve)}"
  IO.println s!"Bob inbox after wrong delivery: {repr (misdeliveredServer.inbox ToySignal.User.bob)}"
  IO.println "wrong-delivered message is in Eve's inbox: checked by Lean"
  IO.println s!"Eve can read wrong-delivered message: {decide (ToySignal.User.eve = misdeliveredMsg.encryptedFor)}"
  IO.println "wrong inbox owner cannot read message: checked by Lean"
