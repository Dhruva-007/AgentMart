import os
import sys
import json
import base64
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))

from dotenv import load_dotenv
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import (
    ApplicationCreateTxn,
    StateSchema,
    OnComplete,
    wait_for_confirmation
)

load_dotenv()

ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN   = "" 
ALGOD_HEADERS = {"X-Algo-API-Token": ALGOD_TOKEN}

DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
RECEIVER_ADDRESS  = os.getenv("RECEIVER_ADDRESS",  "")

if not DEPLOYER_MNEMONIC:
    print(" DEPLOYER_MNEMONIC not set in .env")
    sys.exit(1)

if not RECEIVER_ADDRESS:
    print(" RECEIVER_ADDRESS not set in .env")
    sys.exit(1)


def get_algod_client():
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS, ALGOD_HEADERS)


def compile_teal(client, teal_source):
    """Compile TEAL source to bytes via algod."""
    result   = client.compile(teal_source)
    return base64.b64decode(result["result"])


def deploy():
    client        = get_algod_client()
    private_key   = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
    deployer_addr = account.address_from_private_key(private_key)

    print(f"\n Deploying AgentMart Escrow Contract")
    print(f"   Deployer : {deployer_addr}")
    print(f"   Receiver : {RECEIVER_ADDRESS}")
    print(f"   Network  : Algorand TestNet\n")

    from escrow import compile_contract
    os.chdir(os.path.join(os.path.dirname(__file__), '..', 'contracts'))
    compile_contract()

    with open("escrow_approval.teal", "r") as f:
        approval_teal = f.read()
    with open("escrow_clear.teal", "r") as f:
        clear_teal = f.read()

    approval_bytes = compile_teal(client, approval_teal)
    clear_bytes    = compile_teal(client, clear_teal)
    print(" TEAL compiled successfully")

    global_schema = StateSchema(num_uints=2, num_byte_slices=3)  
    local_schema  = StateSchema(num_uints=0, num_byte_slices=0)

    params = client.suggested_params()
    params.flat_fee = True
    params.fee      = 2000  

    receiver_bytes = [RECEIVER_ADDRESS.encode()]

    txn = ApplicationCreateTxn(
        sender      = deployer_addr,
        sp          = params,
        on_complete = OnComplete.NoOpOC,
        approval_program = approval_bytes,
        clear_program    = clear_bytes,
        global_schema    = global_schema,
        local_schema     = local_schema,
        app_args         = receiver_bytes
    )

    signed_txn = txn.sign(private_key)
    tx_id      = client.send_transaction(signed_txn)
    print(f" Transaction submitted: {tx_id}")

    result = wait_for_confirmation(client, tx_id, 4)
    app_id = result["application-index"]

    print(f"\n Contract deployed successfully!")
    print(f"   App ID  : {app_id}")
    print(f"   Tx ID   : {tx_id}")

    print(f"\n Fund the contract account to activate it:")
    from algosdk.encoding import encode_address
    from algosdk.logic import get_application_address
    app_address = get_application_address(app_id)
    print(f"   Contract Address: {app_address}")
    print(f"   Fund at: https://bank.testnet.algorand.network/")
    print(f"   Minimum required: 0.1 ALGO (100,000 microALGO)\n")

    config_output = f"""
# ── Add these to your .env file ──────────────────────────────────────────────
VITE_APP_ID={app_id}
VITE_RECEIVER_ADDRESS={RECEIVER_ADDRESS}
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_NETWORK=testnet
APP_ID={app_id}
RECEIVER_ADDRESS={RECEIVER_ADDRESS}
"""
    print(config_output)

    with open("../.env.deployed", "w", encoding="utf-8") as f:
        f.write(config_output.strip())
    print("Config saved to .env.deployed — copy values to .env")

    return app_id


if __name__ == "__main__":
    deploy()