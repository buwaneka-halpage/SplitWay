"""Build GraphViz DOT for UML 2.0 sequence diagrams (lifelines, sync, return, fragments)."""

from __future__ import annotations

from dataclasses import dataclass, field


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


@dataclass
class Sync:
    src: str
    dst: str
    label: str


@dataclass
class Return:
    src: str
    dst: str
    label: str = ""


@dataclass
class Self:
    actor: str
    label: str


@dataclass
class Fragment:
    kind: str  # alt | opt | loop
    guard: str
    body: list[Event] = field(default_factory=list)
    otherwise: list[Event] | None = None


Event = Sync | Return | Self | Fragment

_FRAG_STYLE = {
    "alt": ("#C62828", "#FFEBEE"),
    "opt": ("#F9A825", "#FFF8E1"),
    "loop": ("#2E7D32", "#E8F5E9"),
}

_ACTOR_FILL = {
    "User": "#ECEFF1",
    "UI": "#E3F2FD",
    "SessionStore": "#FFF3E0",
    "SplitEngine": "#F3E5F5",
    "SettleEngine": "#E8F5E9",
}


def _flatten(events: list[Event]) -> list[object]:
    out: list[object] = []
    for ev in events:
        if isinstance(ev, Fragment):
            out.extend(_flatten(ev.body))
            if ev.otherwise is not None:
                out.extend(_flatten(ev.otherwise))
        else:
            out.append(ev)
    return out


def _nid(actor: str, i: int) -> str:
    return f"n_{actor}_{i}"


def render(title: str, actors: list[str], events: list[Event]) -> str:
    steps = _flatten(events)
    index = {id(ev): i for i, ev in enumerate(steps)}
    n = len(steps)
    sep = {3: "2.4", 4: "2.1", 5: "1.85"}.get(len(actors), "1.8")

    lines: list[str] = [
        f'digraph "{_esc(title)}" {{',
        "  graph ["
        f'label="{_esc(title)}", labelloc=t, fontname="Helvetica", fontsize=16, '
        "rankdir=TB, splines=line, newrank=true, compound=true, pad=0.6, "
        f"bgcolor=white, nodesep={sep}, ranksep=0.42, ordering=out];",
        '  node [fontname="Helvetica"];',
        '  edge [fontname="Helvetica", fontsize=9];',
        "",
        "  // participants",
    ]

    for a in actors:
        fill = _ACTOR_FILL.get(a, "#E3F2FD")
        lines.append(
            f'  H_{a} [label="{a}", shape=box, style="rounded,filled", '
            f'fillcolor="{fill}", color="#37474F", fontsize=12, width=1.7, height=0.5, '
            f"group={a}];"
        )
    lines.append("  { rank=same; " + " ".join(f"H_{a}" for a in actors) + "; }")
    lines.append("  edge [style=invis, weight=20];")
    if len(actors) > 1:
        lines.append("  " + " -> ".join(f"H_{a}" for a in actors) + ";")
    lines.append("")
    lines.append("  // lifeline points / self actions")

    for i, ev in enumerate(steps):
        for a in actors:
            nid = _nid(a, i)
            if isinstance(ev, Self) and ev.actor == a:
                lines.append(
                    f'  {nid} [label="{_esc(ev.label)}", shape=box, style="rounded,filled", '
                    f'fillcolor="#FFF8E1", color="#F9A825", fontsize=8, width=1.5, height=0.32, '
                    f"group={a}];"
                )
            else:
                lines.append(
                    f'  {nid} [label="", shape=point, width=0.08, height=0.08, '
                    f'style=filled, fillcolor="#546E7A", color="#546E7A", group={a}];'
                )
        lines.append("  { rank=same; " + " ".join(_nid(a, i) for a in actors) + "; }")

    lines.append("")
    for a in actors:
        fill = _ACTOR_FILL.get(a, "#E3F2FD")
        lines.append(
            f'  F_{a} [label="{a}", shape=box, style="rounded,filled", '
            f'fillcolor="{fill}", color="#37474F", fontsize=11, width=1.7, height=0.4, '
            f"group={a}];"
        )
    lines.append("  { rank=same; " + " ".join(f"F_{a}" for a in actors) + "; }")
    lines.append("")
    lines.append("  // lifelines")
    lines.append(
        '  edge [style=dashed, color="#90A4AE", dir=none, weight=100, penwidth=1.6, constraint=true];'
    )
    for a in actors:
        chain = [f"H_{a}"] + [_nid(a, i) for i in range(n)] + [f"F_{a}"]
        lines.append("  " + " -> ".join(chain) + ";")

    lines.append("")
    lines.append("  // messages")
    for i, ev in enumerate(steps):
        if isinstance(ev, Self):
            continue
        if isinstance(ev, Return):
            style = (
                'style=dashed, color="#546E7A", arrowhead=open, arrowsize=0.8, '
                f'constraint=false, label="{_esc(ev.label)}", fontcolor="#37474F"'
            )
        else:
            style = (
                'style=solid, color="#212121", arrowhead=vee, arrowsize=0.85, '
                f'constraint=false, label="{_esc(ev.label)}", fontcolor="#212121"'
            )
        lines.append(f"  {_nid(ev.src, i)} -> {_nid(ev.dst, i)} [{style}];")

    frag_ids = {"n": 0}
    lines.append("")
    lines.append("  // combined fragments (UML alt / opt / loop)")
    _emit_body(lines, actors, events, index, frag_ids, "  ")
    lines.append("}")
    return "\n".join(lines) + "\n"


def _emit_body(
    lines: list[str],
    actors: list[str],
    events: list[Event],
    index: dict[int, int],
    frag_ids: dict[str, int],
    indent: str,
) -> None:
    for ev in events:
        if isinstance(ev, Fragment):
            _emit_fragment(lines, actors, ev, index, frag_ids, indent)
        else:
            i = index[id(ev)]
            for a in actors:
                lines.append(f"{indent}{_nid(a, i)};")


def _emit_fragment(
    lines: list[str],
    actors: list[str],
    frag: Fragment,
    index: dict[int, int],
    frag_ids: dict[str, int],
    indent: str,
) -> None:
    cid = frag_ids["n"]
    frag_ids["n"] += 1
    color, bg = _FRAG_STYLE.get(frag.kind, ("#546E7A", "#ECEFF1"))
    label = f"{frag.kind} {frag.guard}".strip()
    lines.append(f"{indent}subgraph cluster_{cid} {{")
    lines.append(f'{indent}  label="{_esc(label)}";')
    lines.append(f'{indent}  fontsize=10; fontname="Helvetica"; fontcolor="{color}";')
    lines.append(
        f'{indent}  style="rounded,dashed"; color="{color}"; bgcolor="{bg}"; margin=12;'
    )
    if frag.otherwise is not None:
        lines.append(f"{indent}  subgraph cluster_{cid}_then {{")
        lines.append(f'{indent}    label="{_esc(frag.guard)}"; fontsize=9; style="rounded,dashed";')
        lines.append(f'{indent}    color="{color}"; bgcolor="{bg}";')
        _emit_body(lines, actors, frag.body, index, frag_ids, indent + "    ")
        lines.append(f"{indent}  }}")
        lines.append(f"{indent}  subgraph cluster_{cid}_else {{")
        lines.append(f'{indent}    label="[else]"; fontsize=9; style="rounded,dashed";')
        lines.append(f'{indent}    color="{color}"; bgcolor="#FFF3E0";')
        _emit_body(lines, actors, frag.otherwise, index, frag_ids, indent + "    ")
        lines.append(f"{indent}  }}")
    else:
        _emit_body(lines, actors, frag.body, index, frag_ids, indent + "  ")
    lines.append(f"{indent}}}")
