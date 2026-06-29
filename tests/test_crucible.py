"""
Tests for CRUCIBLE (direct runner). The AI jury is mocked deterministically.

Run with:  python -m pytest -v
"""

import json
from pathlib import Path

CONTRACT = str(Path(__file__).resolve().parents[1] / "contracts" / "crucible.py")

GEN = 10 ** 18
WAITING, LOCKED, DECIDED = 0, 1, 2
SIDE_NONE, SIDE_A, SIDE_B = 0, 1, 2

MOTION = "AI agents should hold their own crypto wallets."


def _open(c, vm, who, stake=5 * GEN, motion=MOTION, case="Agents need to transact autonomously."):
    vm.sender = who
    vm.value = stake
    did = c.open_duel(motion, case)
    vm.value = 0
    return did


def _accept(c, vm, who, did, stake=5 * GEN, case="Custody risk is too high for autonomous keys."):
    vm.sender = who
    vm.value = stake
    c.accept_duel(did, case)
    vm.value = 0


# ----------------------------------------------------------------- open
def test_open_duel_escrows(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice, stake=5 * GEN)
    assert did == 0
    d = c.get_duel(0)
    assert d["status"] == WAITING
    assert d["stake"] == str(5 * GEN)
    assert d["case_b"] == ""


def test_open_requires_stake(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("stake GEN"):
        c.open_duel(MOTION, "case")


def test_open_requires_motion(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("motion"):
        c.open_duel("   ", "case")
    direct_vm.value = 0


# ----------------------------------------------------------------- accept
def test_accept_locks_duel(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    _accept(c, direct_vm, direct_bob, did)
    d = c.get_duel(0)
    assert d["status"] == LOCKED
    assert d["case_b"] != ""


def test_cannot_duel_self(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 5 * GEN
    with direct_vm.expect_revert("yourself"):
        c.accept_duel(did, "case")
    direct_vm.value = 0


def test_accept_must_match_stake(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice, stake=5 * GEN)
    direct_vm.sender = direct_bob
    direct_vm.value = 3 * GEN
    with direct_vm.expect_revert("match the stake"):
        c.accept_duel(did, "case")
    direct_vm.value = 0


def test_cannot_accept_twice(deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    _accept(c, direct_vm, direct_bob, did)
    direct_vm.sender = direct_charlie
    direct_vm.value = 5 * GEN
    with direct_vm.expect_revert("not open"):
        c.accept_duel(did, "late case")
    direct_vm.value = 0


# ----------------------------------------------------------------- rule (mocked)
def test_rule_a_wins(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    _accept(c, direct_vm, direct_bob, did)
    direct_vm.mock_llm(r"impartial debate judge", json.dumps({"winner": "A", "reason": "stronger evidence"}))
    direct_vm.sender = direct_bob
    c.rule(did)
    d = c.get_duel(0)
    assert d["status"] == DECIDED
    assert d["winner"] == SIDE_A
    assert "evidence" in d["rationale"]


def test_rule_b_wins(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    _accept(c, direct_vm, direct_bob, did)
    direct_vm.mock_llm(r"impartial debate judge", json.dumps({"winner": "B", "reason": "B rebutted well"}))
    c.rule(did)
    assert c.get_duel(0)["winner"] == SIDE_B


def test_rule_tie_refunds(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    _accept(c, direct_vm, direct_bob, did)
    direct_vm.mock_llm(r"impartial debate judge", json.dumps({"winner": "TIE", "reason": "evenly matched"}))
    c.rule(did)
    d = c.get_duel(0)
    assert d["status"] == DECIDED
    assert d["winner"] == SIDE_NONE


def test_cannot_rule_before_locked(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    did = _open(c, direct_vm, direct_alice)
    with direct_vm.expect_revert("both cases"):
        c.rule(did)


def test_unknown_duel_reverts(deploy, direct_vm):
    c = deploy(CONTRACT)
    with direct_vm.expect_revert("no such duel"):
        c.get_duel(0)
