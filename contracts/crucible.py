# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
CRUCIBLE - Staked 1v1 Debate, Judged by an AI Jury
===================================================
Two challengers put GEN on the line and argue opposite sides of a motion. When
both cases are in, the contract convenes an AI jury: the validator set reads
both arguments against the motion and must independently agree on which case was
stronger (the Equivalence Principle). The winner takes the whole pot. A genuine
tie refunds both. No human moderator picks the winner.

Lifecycle:
    WAITING   -> challenger filed, an opponent can accept and match the stake
    LOCKED    -> both sides in, ready for the jury
    DECIDED   -> jury ruled, winner paid (or tie -> both refunded)
"""

from genlayer import *
from dataclasses import dataclass
import json
import typing


STATUS_WAITING = 0
STATUS_LOCKED = 1
STATUS_DECIDED = 2

SIDE_NONE = 0
SIDE_A = 1
SIDE_B = 2


@allow_storage
@dataclass
class Duel:
    motion: str
    creator: Address          # side A
    opponent: Address         # side B
    stake: u256               # each side stakes this
    case_a: str
    case_b: str
    status: u8
    winner: u8                # SIDE_A / SIDE_B / SIDE_NONE(tie)
    rationale: str


class Crucible(gl.Contract):
    duels: DynArray[Duel]

    def __init__(self) -> None:
        pass

    @gl.public.write.payable
    def open_duel(self, motion: str, case_a: str) -> int:
        """Challenger A states the motion, argues the FOR side, and sets the
        stake (the GEN sent with this call). An opponent must match it."""
        if len(motion.strip()) == 0:
            raise gl.vm.UserError("a motion is required")
        if len(case_a.strip()) == 0:
            raise gl.vm.UserError("your opening case is required")
        stake = gl.message.value
        if stake == u256(0):
            raise gl.vm.UserError("you must stake GEN to open a duel")
        d = self.duels.append_new_get()
        d.motion = motion
        d.creator = gl.message.sender_address
        d.opponent = Address(bytes(20))
        d.stake = stake
        d.case_a = case_a
        d.case_b = ""
        d.status = u8(STATUS_WAITING)
        d.winner = u8(SIDE_NONE)
        d.rationale = ""
        return len(self.duels) - 1

    @gl.public.write.payable
    def accept_duel(self, duel_id: int, case_b: str) -> None:
        """Opponent B matches the stake exactly and argues the AGAINST side."""
        d = self._get(duel_id)
        if d.status != STATUS_WAITING:
            raise gl.vm.UserError("this duel is not open to challengers")
        if gl.message.sender_address == d.creator:
            raise gl.vm.UserError("you cannot duel yourself")
        if len(case_b.strip()) == 0:
            raise gl.vm.UserError("your opening case is required")
        if gl.message.value != d.stake:
            raise gl.vm.UserError("you must match the stake exactly")
        d.opponent = gl.message.sender_address
        d.case_b = case_b
        d.status = u8(STATUS_LOCKED)

    @gl.public.write
    def rule(self, duel_id: int) -> None:
        """Convene the jury. Anyone may trigger it once a duel is locked."""
        d = self._get(duel_id)
        if d.status != STATUS_LOCKED:
            raise gl.vm.UserError("both cases must be filed first")

        motion = d.motion
        case_a = d.case_a
        case_b = d.case_b

        def leader_fn() -> str:
            prompt = (
                f"Motion under debate: {motion}\n\n"
                f"DEBATER A (arguing FOR the motion):\n{case_a}\n\n"
                f"DEBATER B (arguing AGAINST the motion):\n{case_b}\n\n"
                "You are an impartial debate judge. Score logic, evidence, and "
                "persuasiveness. Decide who argued better. Reply with ONLY JSON: "
                '{"winner": "A"} or {"winner": "B"} or {"winner": "TIE"}, plus a '
                'short "reason". Example: {"winner": "A", "reason": "..."}'
            )
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            return self._winner_of(leader_res.calldata)[0] == self._winner_of(leader_fn())[0]

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        side, reason = self._winner_of(verdict)
        d.winner = u8(side)
        d.rationale = reason[:400]
        d.status = u8(STATUS_DECIDED)

        if side == SIDE_A:
            self._pay(d.creator, d.stake + d.stake)
        elif side == SIDE_B:
            self._pay(d.opponent, d.stake + d.stake)
        else:
            # tie: refund each side their own stake
            self._pay(d.creator, d.stake)
            self._pay(d.opponent, d.stake)

    # ------------------------------------------------------------------ views
    @gl.public.view
    def get_duel_count(self) -> int:
        return len(self.duels)

    @gl.public.view
    def get_duel(self, duel_id: int) -> dict:
        d = self._get(duel_id)
        return {
            "motion": d.motion,
            "creator": d.creator.as_hex,
            "opponent": d.opponent.as_hex,
            "stake": str(d.stake),
            "case_a": d.case_a,
            "case_b": d.case_b,
            "status": int(d.status),
            "winner": int(d.winner),
            "rationale": d.rationale,
        }

    # -------------------------------------------------------------- internals
    def _get(self, duel_id: int) -> Duel:
        if duel_id < 0 or duel_id >= len(self.duels):
            raise gl.vm.UserError("no such duel")
        return self.duels[duel_id]

    def _winner_of(self, verdict: typing.Any) -> tuple:
        data = verdict
        if isinstance(data, str):
            data = self._extract_json(data)
        if not isinstance(data, dict):
            return (SIDE_NONE, "")
        raw = str(data.get("winner", "")).strip().upper()
        reason = str(data.get("reason", ""))
        if raw == "A":
            return (SIDE_A, reason)
        if raw == "B":
            return (SIDE_B, reason)
        return (SIDE_NONE, reason)

    def _extract_json(self, text: str) -> typing.Any:
        try:
            return json.loads(text)
        except (ValueError, TypeError):
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                return None
        return None

    def _pay(self, recipient: Address, amount: u256) -> None:
        if amount == u256(0):
            return
        _Payee(recipient).emit_transfer(value=amount)


@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass
