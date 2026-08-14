#!/usr/bin/env python3
"""Generate UML 2.0 sequence diagrams (DOT + PNG + draw.io) for SplitWay SAD."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seq import Fragment, Return, Self, Sync, render

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "diagrams"
SKILL_G2D = Path.home() / ".cursor/skills/azure-architecture-diagrams/.venv/bin/graphviz2drawio"


def export(stem: str, title: str, actors: list[str], events: list) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    dot_path = OUT / f"{stem}.dot"
    png_path = OUT / f"{stem}.png"
    drawio_path = OUT / f"{stem}.drawio"
    dot_path.write_text(render(title, actors, events), encoding="utf-8")
    subprocess.run(["dot", "-Tpng", str(dot_path), "-o", str(png_path)], check=True)
    g2d = shutil.which("graphviz2drawio") or str(SKILL_G2D)
    subprocess.run([g2d, str(dot_path), "-o", str(drawio_path)], check=True)
    for p in (dot_path, png_path, drawio_path):
        assert p.is_file() and p.stat().st_size > 0, p


def sd_01() -> None:
    actors = ["User", "UI", "SessionStore"]
    events = [
        Sync("User", "UI", "Add(name)"),
        Fragment(
            "opt",
            "[name empty]",
            [
                Return("UI", "User", "reject"),
            ],
        ),
        Self("UI", "new Person{id, name}"),
        Sync("UI", "SessionStore", "load()"),
        Return("SessionStore", "UI", "Session"),
        Self("UI", "people.push(person)"),
        Sync("UI", "SessionStore", "save(session)"),
        Return("SessionStore", "UI", "ok"),
        Return("UI", "User", "people list updated"),
    ]
    export("sd-01-add-people", "SD-01 Add people", actors, events)


def sd_02() -> None:
    actors = ["User", "UI", "SessionStore", "SplitEngine"]
    events = [
        Sync("User", "UI", "log expense\\n(amount, paidBy, ids, equal)"),
        Self("UI", "toCents(amount)"),
        Sync("UI", "SplitEngine", "equalShares(totalCents, ids)"),
        Self("SplitEngine", "floor; leftover by remainder\\nties: sorted participant id"),
        Return("SplitEngine", "UI", "shares (sum = totalCents)"),
        Sync("UI", "SessionStore", "load()"),
        Return("SessionStore", "UI", "Session"),
        Self("UI", "append Expense{splitType: equal}"),
        Sync("UI", "SessionStore", "save(session)"),
        Return("SessionStore", "UI", "ok"),
        Return("UI", "User", "expense recorded"),
    ]
    export("sd-02-log-equal-expense", "SD-02 Log equal-split expense", actors, events)


def sd_03() -> None:
    actors = ["User", "UI", "SessionStore", "SplitEngine"]
    events = [
        Sync("User", "UI", "log expense\\n(amount, paidBy, ids, exactCents)"),
        Self("UI", "toCents(amount)"),
        Sync("UI", "SplitEngine", "exactShares(totalCents, exactCents)"),
        Fragment(
            "alt",
            "[sum(exactCents) ≠ totalCents]",
            [
                Return("SplitEngine", "UI", "throw"),
                Return("UI", "User", "reject: shares must sum to total"),
            ],
            otherwise=[
                Return("SplitEngine", "UI", "shares"),
                Sync("UI", "SessionStore", "load()"),
                Return("SessionStore", "UI", "Session"),
                Self("UI", "append Expense{splitType: exact}"),
                Sync("UI", "SessionStore", "save(session)"),
                Return("SessionStore", "UI", "ok"),
                Return("UI", "User", "expense recorded"),
            ],
        ),
    ]
    export("sd-03-log-exact-expense", "SD-03 Log exact-amount expense", actors, events)


def sd_04() -> None:
    actors = ["User", "UI", "SessionStore", "SplitEngine"]
    events = [
        Sync("User", "UI", "select expense"),
        Fragment(
            "alt",
            "[edit]",
            [
                Sync("User", "UI", "submit edited fields"),
                Fragment(
                    "alt",
                    "[splitType = equal]",
                    [Sync("UI", "SplitEngine", "equalShares(...)")],
                    otherwise=[Sync("UI", "SplitEngine", "exactShares(...)")],
                ),
                Return("SplitEngine", "UI", "shares or throw"),
                Sync("UI", "SessionStore", "load(); replace; save()"),
                Return("SessionStore", "UI", "ok"),
                Return("UI", "User", "expense updated"),
            ],
            otherwise=[
                Sync("User", "UI", "delete"),
                Sync("UI", "SessionStore", "load()"),
                Return("SessionStore", "UI", "Session"),
                Self("UI", "remove expense by id"),
                Sync("UI", "SessionStore", "save(session)"),
                Return("SessionStore", "UI", "ok"),
                Return("UI", "User", "expense removed"),
            ],
        ),
    ]
    export("sd-04-edit-delete-expense", "SD-04 Edit / delete expense", actors, events)


def sd_05() -> None:
    actors = ["User", "UI", "SessionStore", "SplitEngine"]
    events = [
        Sync("User", "UI", "view balances"),
        Sync("UI", "SessionStore", "load()"),
        Return("SessionStore", "UI", "Session"),
        Sync("UI", "SplitEngine", "balances(session)"),
        Fragment(
            "loop",
            "[each expense]",
            [
                Fragment(
                    "alt",
                    "[equal]",
                    [Self("SplitEngine", "equalShares: floor + leftover cents")],
                    otherwise=[Self("SplitEngine", "exactShares: must sum to total")],
                ),
                Self("SplitEngine", "net[paidBy] += amount\\nnet[p] -= share[p]"),
            ],
        ),
        Self("SplitEngine", "assert sum(nets) == 0"),
        Return("SplitEngine", "UI", "Record<PersonId, cents>"),
        Self("UI", "formatLkr(cents)"),
        Return("UI", "User", "running balances (sum = Rs. 0.00)"),
    ]
    export("sd-05-compute-balances", "SD-05 Compute balances (rounding)", actors, events)


def sd_06() -> None:
    actors = ["User", "UI", "SessionStore", "SplitEngine", "SettleEngine"]
    events = [
        Sync("User", "UI", "view Settle Up"),
        Sync("UI", "SessionStore", "load()"),
        Return("SessionStore", "UI", "Session"),
        Sync("UI", "SplitEngine", "balances(session)"),
        Return("SplitEngine", "UI", "nets"),
        Sync("UI", "SettleEngine", "settle(nets)"),
        Self("SettleEngine", "copy nets; drop 0-cent"),
        Fragment(
            "loop",
            "[debtors and creditors remain]",
            [
                Self("SettleEngine", "largest debtor vs largest creditor"),
                Self("SettleEngine", "amt = min(|debt|, credit)"),
                Self("SettleEngine", "emit Transfer(from, to, amt)"),
            ],
        ),
        Return("SettleEngine", "UI", "Transfer[]  (≤ n−1)"),
        Self("UI", "formatLkr each transfer"),
        Return("UI", "User", "X pays Y Rs. Z"),
    ]
    export("sd-06-settle-up", "SD-06 Settle up (greedy min cash flow)", actors, events)


def main() -> None:
    sd_01()
    sd_02()
    sd_03()
    sd_04()
    sd_05()
    sd_06()
    stems = [
        "sd-01-add-people",
        "sd-02-log-equal-expense",
        "sd-03-log-exact-expense",
        "sd-04-edit-delete-expense",
        "sd-05-compute-balances",
        "sd-06-settle-up",
    ]
    for stem in stems:
        for ext in (".dot", ".png", ".drawio"):
            p = OUT / f"{stem}{ext}"
            assert p.is_file() and p.stat().st_size > 0, p
    print(f"wrote {len(stems)} diagram triples under {OUT}")


if __name__ == "__main__":
    main()
