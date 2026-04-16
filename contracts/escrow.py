"""
AgentMart Escrow Contract
─────────────────────────
Minimal escrow contract for AI task payment flow.

Flow:
  1. Creator deploys contract (sets receiver address)
  2. User calls deposit() → sends ALGO to contract
  3. Creator calls release() → contract sends ALGO to receiver

Global state:
  - creator   : address (who deployed the contract)
  - receiver  : address (who receives funds on release)
  - depositor : address (who sent the deposit)
  - amount    : uint64 (deposited amount in microALGO)
  - released  : uint64 (0 = not released, 1 = released)
"""

from pyteal import *


def escrow_contract():
    # ── Global state keys ──────────────────────────────────────────────────────
    CREATOR   = Bytes("creator")
    RECEIVER  = Bytes("receiver")
    DEPOSITOR = Bytes("depositor")
    AMOUNT    = Bytes("amount")
    RELEASED  = Bytes("released")

    # ── On Create ──────────────────────────────────────────────────────────────
    # Called once when the app is first deployed.
    # Sets creator and receiver from transaction arguments.
    on_create = Seq([
        Assert(Txn.application_args.length() == Int(1)),   # receiver address must be passed
        App.globalPut(CREATOR,  Txn.sender()),
        App.globalPut(RECEIVER, Txn.application_args[0]),  # arg[0] = receiver address bytes
        App.globalPut(AMOUNT,   Int(0)),
        App.globalPut(RELEASED, Int(0)),
        Approve()
    ])

    # ── Deposit ────────────────────────────────────────────────────────────────
    # User sends a grouped transaction:
    #   txn[0] = ApplicationCall (this call)
    #   txn[1] = PaymentTxn     (ALGO to contract account)
    deposit_payment = Gtxn[1]

    on_deposit = Seq([
        # Validate group
        Assert(Global.group_size() == Int(2)),
        Assert(deposit_payment.type_enum() == TxnType.Payment),
        Assert(deposit_payment.receiver() == Global.current_application_address()),
        Assert(deposit_payment.amount()   >= Int(1000)),  # minimum 1000 microALGO
        Assert(App.globalGet(RELEASED)   == Int(0)),       # not already released
        # Store deposit info
        App.globalPut(DEPOSITOR, deposit_payment.sender()),
        App.globalPut(AMOUNT,    deposit_payment.amount()),
        Approve()
    ])

    # ── Release ────────────────────────────────────────────────────────────────
    # Only the original creator can call release.
    # Sends contract balance to receiver.
    on_release = Seq([
        Assert(Txn.sender()            == App.globalGet(CREATOR)),
        Assert(App.globalGet(RELEASED) == Int(0)),
        Assert(App.globalGet(AMOUNT)   >  Int(0)),
        # Inner transaction: send ALGO to receiver
        InnerTxnBuilder.Execute({
            TxnField.type_enum    : TxnType.Payment,
            TxnField.receiver     : App.globalGet(RECEIVER),
            TxnField.amount       : App.globalGet(AMOUNT) - Int(1000),  # keep 1000 for fees
            TxnField.fee          : Int(1000),
        }),
        App.globalPut(RELEASED, Int(1)),
        Approve()
    ])

    # ── Opt-In / Close-Out / Clear ─────────────────────────────────────────────
    on_optin    = Approve()
    on_closeout = Approve()
    on_clear    = Approve()

    # ── Route ─────────────────────────────────────────────────────────────────
    router = Cond(
        [Txn.application_id() == Int(0),                         on_create ],
        [Txn.on_completion()  == OnComplete.OptIn,               on_optin  ],
        [Txn.on_completion()  == OnComplete.CloseOut,            on_closeout],
        [Txn.application_args[0] == Bytes("deposit"),            on_deposit ],
        [Txn.application_args[0] == Bytes("release"),            on_release ],
    )

    return router


def compile_contract():
    """Compile approval and clear programs and write to JSON."""
    import json

    approval_program = escrow_contract()
    clear_program    = Approve()

    # Compile with AVM 8+ (supports inner transactions)
    approval_teal = compileTeal(
        approval_program,
        mode=Mode.Application,
        version=8
    )
    clear_teal = compileTeal(
        clear_program,
        mode=Mode.Application,
        version=8
    )

    # Write TEAL files
    with open("escrow_approval.teal", "w") as f:
        f.write(approval_teal)

    with open("escrow_clear.teal", "w") as f:
        f.write(clear_teal)

    print("✅ Compiled escrow_approval.teal")
    print("✅ Compiled escrow_clear.teal")
    
    return approval_teal, clear_teal


if __name__ == "__main__":
    compile_contract()