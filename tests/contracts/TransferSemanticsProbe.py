# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class TransferSemanticsProbe(gl.Contract):
    marker: u256
    accounted_balance: u256
    last_transfer_amount: u256

    def __init__(self):
        self.marker = u256(0)
        self.accounted_balance = u256(0)
        self.last_transfer_amount = u256(0)

    @gl.public.write.payable
    def fund(self) -> None:
        if gl.message.value == u256(0):
            raise gl.vm.UserError("INVALID_AMOUNT")
        self.accounted_balance = self.accounted_balance + gl.message.value

    @gl.public.view
    def get_marker(self) -> u256:
        return self.marker

    @gl.public.view
    def get_accounted_balance(self) -> u256:
        return self.accounted_balance

    @gl.public.view
    def get_contract_balance(self) -> u256:
        return self.balance

    @gl.public.view
    def get_last_transfer_amount(self) -> u256:
        return self.last_transfer_amount

    @gl.public.write
    def successful_transfer(self, recipient: str, amount_wei: u256) -> None:
        if amount_wei == u256(0):
            raise gl.vm.UserError("INVALID_AMOUNT")
        if amount_wei > self.accounted_balance:
            raise gl.vm.UserError("INSUFFICIENT_ACCOUNTED_BALANCE")
        self.marker = u256(2)
        self.last_transfer_amount = amount_wei
        self.accounted_balance = self.accounted_balance - amount_wei
        _Recipient(Address(recipient)).emit_transfer(value=amount_wei)

    @gl.public.write
    def failing_transfer(self, recipient: str) -> None:
        self.marker = u256(1)
        self.last_transfer_amount = self.accounted_balance + u256(1)
        _Recipient(Address(recipient)).emit_transfer(value=self.accounted_balance + u256(1))
