# Transfer Semantics Test

This probe verifies native GEN transfer behavior for the pinned GenLayer runner used by Hedgix:

`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

The production contract is not modified by this test. Deploy `tests/contracts/TransferSemanticsProbe.py` in GenLayer Studio, GLSim, or a `gltest` integration environment.

## What to Verify

1. A successful `emit_transfer` delivers the expected GEN.
2. A failed over-balance `emit_transfer` does not deliver GEN.
3. The final execution result is checked, not only the `ACCEPTED` transaction status.
4. The `marker` value after a failed transfer proves whether state written before `emit_transfer` rolled back.

## Successful Transfer

1. Deploy `TransferSemanticsProbe.py`.
2. Call `fund()` with `2 GEN`.
3. Confirm `get_accounted_balance()` returns `2000000000000000000`.
4. Confirm `get_contract_balance()` reflects the funded balance in the selected environment.
5. Call `successful_transfer(recipient, 1000000000000000000)`.
6. Confirm the transaction execution succeeded.
7. Confirm `get_marker()` returns `2`.
8. Confirm `get_last_transfer_amount()` returns `1000000000000000000`.
9. Confirm the recipient received `1 GEN`.
10. Confirm `get_accounted_balance()` decreased by `1000000000000000000`.

## Failed Transfer

1. Deploy a fresh `TransferSemanticsProbe.py`, or reset to a clean deployment.
2. Call `fund()` with `1 GEN`.
3. Confirm `get_marker()` returns `0`.
4. Call `failing_transfer(recipient)`.
5. Confirm the final transaction execution result. Do not rely on `ACCEPTED` alone.
6. Confirm the recipient did not receive GEN from the failed transfer.
7. Confirm `get_contract_balance()` remains consistent with the pre-failure balance or documented refund behavior.
8. Read `get_marker()`:
   - `0` means the storage write before `emit_transfer` rolled back.
   - `1` means the storage write remained and the emitted transfer failure is asynchronous/refunded.
9. Read `get_accounted_balance()` and `get_last_transfer_amount()` to confirm accounting behavior.

## Evidence to Capture

Capture the transaction receipt or Studio panel showing:

- successful transfer execution result
- failed transfer execution result
- recipient balance before and after each transfer
- probe contract balance before and after each transfer
- `get_marker()` after the failed transfer
- whether any `__on_errored_message__` refund path appeared

The current local repository does not contain enough runtime evidence to classify Hedgix payout and withdrawal ordering as safe or defective without this execution proof.
