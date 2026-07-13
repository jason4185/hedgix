GEN_WEI = 1_000_000_000_000_000_000


def test_probe_successful_transfer_updates_state_and_balance(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.sender = direct_owner
    probe = direct_deploy("tests/contracts/TransferSemanticsProbe.py")

    direct_vm.value = 2 * GEN_WEI
    probe.fund()
    direct_vm.value = 0

    assert probe.get_marker() == 0
    assert probe.get_accounted_balance() == 2 * GEN_WEI

    probe.successful_transfer(str(direct_alice), GEN_WEI)

    assert probe.get_marker() == 2
    assert probe.get_last_transfer_amount() == GEN_WEI
    assert probe.get_accounted_balance() == GEN_WEI


def test_probe_failed_transfer_records_or_rolls_back_marker(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.sender = direct_owner
    probe = direct_deploy("tests/contracts/TransferSemanticsProbe.py")

    direct_vm.value = GEN_WEI
    probe.fund()
    direct_vm.value = 0

    before_balance = probe.get_accounted_balance()
    with direct_vm.expect_revert(""):
        probe.failing_transfer(str(direct_alice))

    marker_after_failure = probe.get_marker()
    assert marker_after_failure in [0, 1]
    assert probe.get_accounted_balance() == before_balance
