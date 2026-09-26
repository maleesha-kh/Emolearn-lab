"""Write report.md for an NFR3 evidence folder, checking the evidence is complete first.

Usage: python scripts/nfr3_report.py <evidence folder>

The folder needs git.json, run.log, and per viewport the states-, checks- and
axe-<viewport>.json files and screenshots written by frontend/e2e/nfr3-screens.spec.ts.
Normally run by nfr3_evidence.py, which creates all of these.

Exit code: 0 = pass, 1 = pass criteria not met, 2 = evidence incomplete.
Pass = no horizontal scroll, no cut-off or out-of-view controls, no targets
under 24x24 and no serious or critical axe violations, on any screen.
"""
import json
import os
import re
import sys
from collections import defaultdict

VIEWPORTS = ["375x812", "1280x800"]
EXPECTED_STATES = 18
FAILING_IMPACTS = ("critical", "serious")

o = sys.argv[1]
L = lambda name: json.load(open(os.path.join(o, name), encoding="utf-8"))
git = L("git.json")
log = open(os.path.join(o, "run.log"), encoding="utf-8", errors="replace").read()
states = {vp: L(f"states-{vp}.json") for vp in VIEWPORTS}
checks = {vp: L(f"checks-{vp}.json") for vp in VIEWPORTS}
axe = {vp: L(f"axe-{vp}.json") for vp in VIEWPORTS}
stamp = git.get("run") or os.path.basename(o)

# ---------- evidence integrity ----------
integrity = {
    "spec passed": re.search(r"\b2 passed\b", log) is not None and not re.search(r"\b\d+ failed\b", log),
    "every viewport has all states": all(len(states[vp]) == EXPECTED_STATES for vp in VIEWPORTS),
    "same states at both sizes": [s["state"] for s in states[VIEWPORTS[0]]] == [s["state"] for s in states[VIEWPORTS[1]]],
    "every state has a screenshot": all(os.path.isfile(os.path.join(o, s["screenshot"])) for vp in VIEWPORTS for s in states[vp]),
    "every state has layout checks": all(s["state"] in checks[vp] for vp in VIEWPORTS for s in states[vp]),
    "every state has axe results": all(s["state"] in axe[vp] for vp in VIEWPORTS for s in states[vp]),
    "animations settled before checks": all(s["animationsSettled"] for vp in VIEWPORTS for s in states[vp]),
}
incomplete = [k for k, v in integrity.items() if not v]
clean = git["porcelain_lines"] == 0

order = [s["state"] for s in states[VIEWPORTS[0]]]
info = {s["state"]: s for s in states[VIEWPORTS[0]]}
rows = [(vp, s) for s in order for vp in VIEWPORTS if s in checks[vp]]


def violations(vp, state, impacts=None):
    return [v for v in axe[vp][state]["violations"] if impacts is None or v["impact"] in impacts]


# ---------- pass criteria ----------
criteria = {
    "No horizontal scrolling": [(vp, s) for vp, s in rows if checks[vp][s]["horizontalScroll"]["overflows"]],
    # One entry per control, even if it is both clipped and outside the viewport
    "No controls cut off or out of view": sorted({(vp, s, c["label"]) for vp, s in rows for c in checks[vp][s]["outOfView"] + checks[vp][s]["cutOff"]}),
    "No tap targets under 24x24 px": [(vp, s, c["label"]) for vp, s in rows for c in checks[vp][s]["under24"]],
    "No serious or critical axe violations": [(vp, s, v["id"]) for vp, s in rows for v in violations(vp, s, FAILING_IMPACTS)],
}
failed = [name for name, found in criteria.items() if found]
result = "INCOMPLETE" if incomplete else ("PASS" if not failed else "FAIL")


def esc(text):
    return str(text).replace("|", "\\|").replace("\n", " ")


def screens_list(pairs):
    grouped = defaultdict(list)
    for vp, s in pairs:
        grouped[s].append(vp)
    return "; ".join(f"{info[s]['label']} ({', '.join(v)})" for s, v in grouped.items())


lines = []
add = lines.append
commit_line = (f"clean commit `{git['commit'][:7]}` (`git status` showed no changes before the run; see `git.json`)"
               if clean else f"commit `{git['commit'][:7]}` with {git['porcelain_lines']} uncommitted changes")
add("# NFR3 evidence: engaging, age-appropriate and accessible interface\n")
engines = sorted({axe[vp][s].get("engine", "?") for vp, s in rows})
add(f"Run {stamp} · {commit_line} · Chromium (Playwright) at 375×812 and 1280×800 · axe-core {', '.join(engines)}\n")
add("How to reproduce: from the project root, on a clean tree, run")
add("`backend\\venv\\Scripts\\python.exe backend\\scripts\\nfr3_evidence.py` (writes a new folder under `evidence/nfr3/`).\n")

add("## Result\n")
if incomplete:
    add(f"**INCOMPLETE:** the evidence is missing something: {', '.join(incomplete)}.\n")
add(f"**{result}.** Pass means, on every screen at both sizes: no horizontal scrolling, no cut-off or out-of-view controls, "
    "no tap targets under 24×24 px, and no serious or critical axe violations. Targets under 44×44 px, controls covered by "
    "other elements, overlapping text, and moderate, minor or best-practice axe issues are reported below but don't fail it.\n")
add("| Criterion | Result | Where |")
add("|---|---|---|")
for name, found in criteria.items():
    where = screens_list({(f[0], f[1]) for f in found}) if found else ""
    add(f"| {name} | {'pass' if not found else f'**fail** ({len(found)})'} | {esc(where)} |")
add("")

add("## Summary by screen\n")
add("Columns: horizontal scroll · controls cut off or out of view · targets under 24 px · targets under 44 px (child screens) · "
    "controls covered (tap blocked) · controls painted over by a decoration · text overlaps · axe violations by impact "
    "(critical/serious/moderate/minor).\n")
add("| Screen | Size | H-scroll | Cut/out | <24 | <44 child | Covered | Painted over | Text overlaps | axe C/S/M/m |")
add("|---|---|---|---|---|---|---|---|---|---|")
for vp, s in rows:
    c = checks[vp][s]
    counts = [len(violations(vp, s, (imp,))) for imp in ("critical", "serious", "moderate", "minor")]
    add(f"| {info[s]['label']} | {vp} | {'**yes**' if c['horizontalScroll']['overflows'] else 'no'} | "
        f"{len(c['outOfView']) + len(c['cutOff'])} | {len(c['under24'])} | {len(c['under44']) if info[s]['child'] else '–'} | "
        f"{len(c['covered'])} | {len(c['paintedOver'])} | {len(c['textOverlaps'])} | {'/'.join(map(str, counts))} |")
add("")

add("## Problems that fail the result\n")
add("### Horizontal scrolling\n")
hs = criteria["No horizontal scrolling"]
add("None.\n" if not hs else "\n".join(
    f"- {info[s]['label']} at {vp}: page is {checks[vp][s]['horizontalScroll']['scrollWidth']} px wide in a "
    f"{checks[vp][s]['horizontalScroll']['clientWidth']} px viewport." for vp, s in hs) + "\n")
add("### Controls cut off or out of view\n")
cut = defaultdict(list)
for vp, s in rows:
    for c in checks[vp][s]["outOfView"]:
        cut[(vp, s, c["label"], c["width"], c["height"], c["x"])].append("outside the viewport")
    for c in checks[vp][s]["cutOff"]:
        cut[(vp, s, c["label"], c["width"], c["height"], c["x"])].append(f"clipped by `{esc(c['clippedBy'][:60])}`")
add("None.\n" if not cut else "\n".join(
    f"- {info[s]['label']} at {vp}: `{esc(label)}` ({w}×{h} px at x={x}): {'; '.join(reasons)}"
    for (vp, s, label, w, h, x), reasons in cut.items()) + "\n")
add("### Tap targets under 24×24 px\n")
small = defaultdict(list)
for vp, s in rows:
    for c in checks[vp][s]["under24"]:
        small[(c["label"], c["width"], c["height"])].append(f"{info[s]['label']} ({vp})")
add("None.\n" if not small else "\n".join(f"- `{esc(label)}`: {w}×{h} px, on {'; '.join(sorted(set(where)))}" for (label, w, h), where in small.items()) + "\n")

add("### Serious and critical axe violations\n")
by_rule = defaultdict(lambda: {"impact": "", "help": "", "url": "", "where": set(), "nodes": 0})
contrast = defaultdict(set)
for vp, s in rows:
    for v in violations(vp, s, FAILING_IMPACTS):
        entry = by_rule[v["id"]]
        entry.update(impact=v["impact"], help=v["help"], url=v["helpUrl"])
        entry["where"].add(f"{info[s]['label']} ({vp})")
        entry["nodes"] += len(v["nodes"])
        if v["id"] == "color-contrast":
            for node in v["nodes"]:
                d = node["data"] or {}
                key = (" ".join(node["target"]), d.get("fgColor"), d.get("bgColor"), d.get("contrastRatio"), d.get("expectedContrastRatio"), d.get("fontSize"))
                contrast[key].add(f"{info[s]['label']} ({vp})")
if not by_rule:
    add("None.\n")
for rule, e in sorted(by_rule.items(), key=lambda kv: (kv[1]["impact"] != "critical", kv[0])):
    add(f"- **{rule}** ({e['impact']}): {e['help']}. {e['nodes']} element(s) across {len(e['where'])} screen/size combinations. [{rule}]({e['url']})")
add("")
if contrast:
    pairs = defaultdict(lambda: {"ratio": None, "needed": set(), "elements": 0, "screens": set()})
    for (target, fg, bg, ratio, needed, font), where in contrast.items():
        p = pairs[(fg, bg)]
        p["ratio"], p["elements"] = ratio, p["elements"] + 1
        p["needed"].add(needed)
        p["screens"] |= {w.rsplit(" (", 1)[0] for w in where}
    add(f"#### Colour contrast by colour pair ({len(pairs)} pairs)\n")
    add("| Text | Background | Ratio | Needed | Elements | Screens |")
    add("|---|---|---|---|---|---|")
    for (fg, bg), p in sorted(pairs.items(), key=lambda kv: kv[1]["ratio"] or 0):
        add(f"| {fg} | {bg} | {p['ratio']} | {', '.join(sorted(n for n in p['needed'] if n))} | {p['elements']} | {len(p['screens'])} of {len(order)} |")
    add("")
    add(f"#### Colour contrast by element ({len(contrast)} distinct element/colour combinations)\n")
    add("| Element | Text | Background | Ratio | Needed | Font | Screens |")
    add("|---|---|---|---|---|---|---|")
    for (target, fg, bg, ratio, needed, font), where in sorted(contrast.items(), key=lambda kv: (kv[0][3] or 0)):
        add(f"| `{esc(target)[:70]}` | {fg} | {bg} | {ratio} | {needed} | {font} | {esc('; '.join(sorted(where)))} |")
    add("")

add("## Reported, not failing\n")
add("### Tap targets under 44×44 px on child screens\n")
kid = defaultdict(set)
for vp, s in rows:
    if info[s]["child"]:
        for c in checks[vp][s]["under44"]:
            kid[(c["label"], c["width"], c["height"])].add(f"{info[s]['label']} ({vp})")
add("None.\n" if not kid else "\n".join(f"- `{esc(label)}`: {w}×{h} px, on {'; '.join(sorted(where))}" for (label, w, h), where in sorted(kid.items())) + "\n")
add("### Controls covered by another element (the tap would hit something else)\n")
cov = [(vp, s, c) for vp, s in rows for c in checks[vp][s]["covered"]]
add("None.\n" if not cov else "\n".join(f"- {info[s]['label']} at {vp}: `{esc(c['label'])}` covered by `{esc(c['coveredBy'][:80])}`" for vp, s, c in cov) + "\n")
add("### Controls painted over by a decoration (taps still work)\n")
paint = [(vp, s, c) for vp, s in rows for c in checks[vp][s]["paintedOver"]]
add("None.\n" if not paint else "\n".join(
    f"- {info[s]['label']} at {vp}: `{esc(c['label'])}` under `{esc(c['paintedBy'][:80])}` (opacity {c['opacity']}; moving decorations, so this depends on timing)"
    for vp, s, c in paint) + "\n")
add("### Overlapping text\n")
add("Fixed or sticky bars, decorations and the two faces of flip cards are left out; boxes are trimmed to their scroll or clip area.\n")
over = [(vp, s, t) for vp, s in rows for t in checks[vp][s]["textOverlaps"]]
add("None.\n" if not over else "\n".join(
    f"- {info[s]['label']} at {vp}: `{esc(t['a'][:60])}` and `{esc(t['b'][:60])}` overlap by {t['overlap']['width']}×{t['overlap']['height']} px"
    for vp, s, t in over) + "\n")
add("### Moderate, minor and best-practice axe issues\n")
other = defaultdict(lambda: {"impact": "", "help": "", "where": set()})
for vp, s in rows:
    for v in violations(vp, s):
        if v["impact"] in FAILING_IMPACTS:
            continue
        other[v["id"]].update(impact=v["impact"], help=v["help"])
        other[v["id"]]["where"].add(s)
add("None.\n" if not other else "\n".join(
    f"- **{rule}** ({e['impact']}): {e['help']}. On {len(e['where'])} of {len(order)} screens." for rule, e in sorted(other.items())) + "\n")
add("### Reachable only by scrolling a row or panel\n")
scroll = defaultdict(set)
for vp, s in rows:
    for c in checks[vp][s]["reachableByScrolling"]:
        scroll[(c["label"], c["scrollContainer"][:50])].add(f"{info[s]['label']} ({vp})")
add("None.\n" if not scroll else "\n".join(f"- `{esc(label)}` inside `{esc(box)}`: {'; '.join(sorted(where))}" for (label, box), where in sorted(scroll.items())) + "\n")
needs_review = sum(len(axe[vp][s]["incomplete"]) for vp, s in rows)
add(f"axe also marked {needs_review} check results as \"needs review\" (it couldn't decide automatically); they are listed in the axe JSON files.\n")

add("## Screenshots\n")
add("| # | Screen | Child screen | " + " | ".join(VIEWPORTS) + " |")
add("|---|---|---|" + "---|" * len(VIEWPORTS))
for s in order:
    shots = " | ".join(f"[{vp}]({next(x['screenshot'] for x in states[vp] if x['state'] == s)})" for vp in VIEWPORTS)
    add(f"| {info[s]['n']} | {info[s]['label']} | {'yes' if info[s]['child'] else 'no'} | {shots} |")
add("")

add("## Not judged automatically\n")
add("Whether the interface is *engaging* and *age-appropriate* can't be measured by these checks. Review the screenshots for: "
    "clear, friendly wording at a young child's reading level; one obvious main action per screen; feedback that encourages "
    "rather than scolds (compare the correct and wrong feedback screens); and visual clutter from decorations.\n")

add("## Manual checks to do\n")
add("1. **Keyboard only** (no mouse): from Welcome, play a full game, check in a mood with the diary, use Learn and Ask Emo, and "
    "open the parent area with the PIN. Every control must be reachable with Tab, show a visible focus ring, and work with "
    "Enter or Space; the badge popup must keep focus inside it and return focus when closed; nothing may trap focus.")
add("2. **Sound off**: turn the sound off with the speaker button and repeat a round and a Learn page. Nothing should depend on "
    "sound alone (feedback must also be visible), \"Read to me\" should say sound is off, and no sound should play.")
add("3. **Reduced motion**: turn on the operating system's reduce-motion setting (Windows: Settings › Accessibility › Visual "
    "effects › Animation effects off) and reload. Floating decorations, confetti and card animations should stop or become "
    "minimal, and every screen must still make sense.")
add("4. **Zoom to 200%** (Ctrl and +) on a 1280-wide window: text must grow, nothing may be cut off or overlap, no sideways "
    "scrolling except for wide tables, and the bottom navigation must not cover content.\n")

add("## Limitations\n")
add("- Chromium only; the 375×812 run uses a desktop browser at phone size (no touch emulation or mobile browser UI).")
add("- One visit per screen in one flow; states such as error messages, empty lists and long nicknames were not covered.")
add("- Automated tools find only part of accessibility problems; screen-reader order and wording need a manual check.")
add("- Finite animations were allowed to finish before checking; looping decorations keep moving, so the \"painted over\" "
    "results depend on timing.")
add("- The text-overlap check is a heuristic based on text box positions; each finding should be confirmed in the screenshot.")
add("- Screenshots are full-page, so the fixed bottom navigation appears where the first screen ends rather than at the "
    "bottom of the page; that is a screenshot artefact, not the app's layout.")

open(os.path.join(o, "report.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
summary = {"result": result, "failed_criteria": {k: len(v) for k, v in criteria.items() if v}, "incomplete": incomplete, "clean_commit": clean}
print(json.dumps(summary))
print(f"result: {result} | failed: {failed} | incomplete: {incomplete}")
sys.exit(2 if incomplete else (1 if failed else 0))
