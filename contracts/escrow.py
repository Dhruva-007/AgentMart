from pyteal import *


def escrow_contract():
    CREATOR   = Bytes("creator")
    RECEIVER  = Bytes("receiver")
    DEPOSITOR = Bytes("depositor")
    AMOUNT    = Bytes("amount")
    RELEASED  = Bytes("released")

    on_create = Seq([
        Assert(Txn.application_args.length() == Int(1)),  
        App.globalPut(CREATOR,  Txn.sender()),
        App.globalPut(RECEIVER, Txn.application_args[0]), 
        App.globalPut(AMOUNT,   Int(0)),
        App.globalPut(RELEASED, Int(0)),
        Approve()
    ])

    deposit_payment = Gtxn[1]

    on_deposit = Seq([
        Assert(Global.group_size() == Int(2)),
        Assert(deposit_payment.type_enum() == TxnType.Payment),
        Assert(deposit_payment.receiver() == Global.current_application_address()),
        Assert(deposit_payment.amount()   >= Int(1000)),  
        Assert(App.globalGet(RELEASED)   == Int(0)),     
        App.globalPut(DEPOSITOR, deposit_payment.sender()),
        App.globalPut(AMOUNT,    deposit_payment.amount()),
        Approve()
    ])

    on_release = Seq([
        Assert(Txn.sender()            == App.globalGet(CREATOR)),
        Assert(App.globalGet(RELEASED) == Int(0)),
        Assert(App.globalGet(AMOUNT)   >  Int(0)),
        InnerTxnBuilder.Execute({
            TxnField.type_enum    : TxnType.Payment,
            TxnField.receiver     : App.globalGet(RECEIVER),
            TxnField.amount       : App.globalGet(AMOUNT) - Int(1000),
            TxnField.fee          : Int(1000),
        }),
        App.globalPut(RELEASED, Int(1)),
        Approve()
    ])

    on_optin    = Approve()
    on_closeout = Approve()
    on_clear    = Approve()

    router = Cond(
        [Txn.application_id() == Int(0),                         on_create ],
        [Txn.on_completion()  == OnComplete.OptIn,               on_optin  ],
        [Txn.on_completion()  == OnComplete.CloseOut,            on_closeout],
        [Txn.application_args[0] == Bytes("deposit"),            on_deposit ],
        [Txn.application_args[0] == Bytes("release"),            on_release ],
    )

    return router


def compile_contract():
    import json

    approval_program = escrow_contract()
    clear_program    = Approve()

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

    with open("escrow_approval.teal", "w") as f:
        f.write(approval_teal)

    with open("escrow_clear.teal", "w") as f:
        f.write(clear_teal)

    print("✅ Compiled escrow_approval.teal")
    print("✅ Compiled escrow_clear.teal")
    
    return approval_teal, clear_teal


if __name__ == "__main__":
    compile_contract()