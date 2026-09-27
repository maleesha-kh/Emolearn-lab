# NFR3 evidence: engaging, age-appropriate and accessible interface

Run 20260927-075126 · clean commit `16d00b9` (`git status` showed no changes before the run; see `git.json`) · Chromium (Playwright) at 375×812 and 1280×800 · axe-core 4.13.0

How to reproduce: from the project root, on a clean tree, run
`backend\venv\Scripts\python.exe backend\scripts\nfr3_evidence.py` (writes a new folder under `evidence/nfr3/`).

## Result

**PASS.** Pass means, on every screen at both sizes: no horizontal scrolling, no cut-off or out-of-view controls, no tap targets under 24×24 px, and no serious or critical axe violations. Targets under 44×44 px, controls covered by other elements, overlapping text, and moderate, minor or best-practice axe issues are reported below but don't fail it.

| Criterion | Result | Where |
|---|---|---|
| No horizontal scrolling | pass |  |
| No controls cut off or out of view | pass |  |
| No tap targets under 24x24 px | pass |  |
| No serious or critical axe violations | pass |  |

## Summary by screen

Columns: horizontal scroll · controls cut off or out of view · targets under 24 px · targets under 44 px (child screens) · controls covered (tap blocked) · controls painted over by a decoration · text overlaps · axe violations by impact (critical/serious/moderate/minor).

| Screen | Size | H-scroll | Cut/out | <24 | <44 child | Covered | Painted over | Text overlaps | axe C/S/M/m |
|---|---|---|---|---|---|---|---|---|---|
| Welcome (player list) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Welcome (player list) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Mood check-in (a feeling selected) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Mood check-in (a feeling selected) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Diary | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Diary | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Mood activity (Happy, 1 of 3 done) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Mood activity (Happy, 1 of 3 done) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Game round | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Game round | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Correct feedback | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Correct feedback | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Wrong feedback | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Wrong feedback | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Summary with the First Star badge | 375x812 | no | 0 | 0 | 0 | 0 | 1 | 0 | 0/0/0/0 |
| Summary with the First Star badge | 1280x800 | no | 0 | 0 | 0 | 0 | 1 | 0 | 0/0/0/0 |
| Learn (feeling picker) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Learn (feeling picker) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Learn (a feeling page) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Learn (a feeling page) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Ask Emo (after one answer) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Ask Emo (after one answer) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Me (profile) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Me (profile) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Badges | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Badges | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Welcome (remembered player) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Welcome (remembered player) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0/0 |
| Parent PIN keypad | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent PIN keypad | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent Overview | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent Overview | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent Diary | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent Diary | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent About | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |
| Parent About | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/0/0/0 |

## Problems that fail the result

### Horizontal scrolling

None.

### Controls cut off or out of view

None.

### Tap targets under 24×24 px

None.

### Serious and critical axe violations

None.


## Reported, not failing

### Tap targets under 44×44 px on child screens

None.

### Controls covered by another element (the tap would hit something else)

None.

### Controls painted over by a decoration (taps still work)

- Summary with the First Star badge at 375x812: `button.ff.text-xl.font-bold "Nice! ✨"` under `div.fixed.inset-0.overflow-hidden "● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲` (opacity 1; moving decorations, so this depends on timing)
- Summary with the First Star badge at 1280x800: `button.ff.text-xl.font-bold "Nice! ✨"` under `div.fixed.inset-0.overflow-hidden "● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲` (opacity 1; moving decorations, so this depends on timing)

### Overlapping text

Fixed or sticky bars, decorations and the two faces of flip cards are left out; boxes are trimmed to their scroll or clip area.

None.

### Moderate, minor and best-practice axe issues

None.

### Reachable only by scrolling a row or panel

- `button.fn.font-bold.rounded-full "What does happy mean?"` inside `div.relative.flex-1.min-h-0 "Chat with Emo"`: Ask Emo (after one answer) (375x812)
- `button.fn.font-bold.rounded-full "What does sad mean?"` inside `div.relative.flex-1.min-h-0 "Chat with Emo"`: Ask Emo (after one answer) (375x812)
- `button.fn.font-bold.rounded-full "Why do we cry?"` inside `div.relative.flex-1.min-h-0 "Chat with Emo"`: Ask Emo (after one answer) (375x812)
- `button.fn.font-bold.text-left "ℹ️ About"` inside `div.flex-shrink-0.flex.md:flex-col "📊 Overview 👧 C`: Parent Overview (375x812)
- `button.fn.font-bold.text-left "⚙️ Settings"` inside `div.flex-shrink-0.flex.md:flex-col "📊 Overview 👧 C`: Parent Overview (375x812)
- `button.fn.font-bold.text-left "👧 Children"` inside `div.flex-shrink-0.flex.md:flex-col "📊 Overview 👧 C`: Parent About (375x812); Parent Diary (375x812)
- `button.fn.font-bold.text-left "📊 Overview"` inside `div.flex-shrink-0.flex.md:flex-col "📊 Overview 👧 C`: Parent About (375x812); Parent Diary (375x812)

axe also marked 33 check results as "needs review" (it couldn't decide automatically); they are listed in the axe JSON files.

## Screenshots

| # | Screen | Child screen | 375x812 | 1280x800 |
|---|---|---|---|---|
| 1 | Welcome (player list) | yes | [375x812](screens/375x812/01-welcome.png) | [1280x800](screens/1280x800/01-welcome.png) |
| 2 | Mood check-in (a feeling selected) | yes | [375x812](screens/375x812/02-mood-selection.png) | [1280x800](screens/1280x800/02-mood-selection.png) |
| 3 | Diary | yes | [375x812](screens/375x812/03-diary.png) | [1280x800](screens/1280x800/03-diary.png) |
| 4 | Mood activity (Happy, 1 of 3 done) | yes | [375x812](screens/375x812/04-mood-activity.png) | [1280x800](screens/1280x800/04-mood-activity.png) |
| 5 | Game round | yes | [375x812](screens/375x812/05-game-round.png) | [1280x800](screens/1280x800/05-game-round.png) |
| 6 | Correct feedback | yes | [375x812](screens/375x812/06-feedback-correct.png) | [1280x800](screens/1280x800/06-feedback-correct.png) |
| 7 | Wrong feedback | yes | [375x812](screens/375x812/07-feedback-wrong.png) | [1280x800](screens/1280x800/07-feedback-wrong.png) |
| 8 | Summary with the First Star badge | yes | [375x812](screens/375x812/08-summary-badge.png) | [1280x800](screens/1280x800/08-summary-badge.png) |
| 9 | Learn (feeling picker) | yes | [375x812](screens/375x812/09-learn.png) | [1280x800](screens/1280x800/09-learn.png) |
| 10 | Learn (a feeling page) | yes | [375x812](screens/375x812/10-learn-feeling.png) | [1280x800](screens/1280x800/10-learn-feeling.png) |
| 11 | Ask Emo (after one answer) | yes | [375x812](screens/375x812/11-ask-emo.png) | [1280x800](screens/1280x800/11-ask-emo.png) |
| 12 | Me (profile) | yes | [375x812](screens/375x812/12-me.png) | [1280x800](screens/1280x800/12-me.png) |
| 13 | Badges | yes | [375x812](screens/375x812/13-badges.png) | [1280x800](screens/1280x800/13-badges.png) |
| 14 | Welcome (remembered player) | yes | [375x812](screens/375x812/14-welcome-remembered.png) | [1280x800](screens/1280x800/14-welcome-remembered.png) |
| 15 | Parent PIN keypad | no | [375x812](screens/375x812/15-pin-keypad.png) | [1280x800](screens/1280x800/15-pin-keypad.png) |
| 16 | Parent Overview | no | [375x812](screens/375x812/16-parent-overview.png) | [1280x800](screens/1280x800/16-parent-overview.png) |
| 17 | Parent Diary | no | [375x812](screens/375x812/17-parent-diary.png) | [1280x800](screens/1280x800/17-parent-diary.png) |
| 18 | Parent About | no | [375x812](screens/375x812/18-parent-about.png) | [1280x800](screens/1280x800/18-parent-about.png) |

## Not judged automatically

Whether the interface is *engaging* and *age-appropriate* can't be measured by these checks. Review the screenshots for: clear, friendly wording at a young child's reading level; one obvious main action per screen; feedback that encourages rather than scolds (compare the correct and wrong feedback screens); and visual clutter from decorations.

## Manual checks to do

1. **Keyboard only** (no mouse): from Welcome, play a full game, check in a mood with the diary, use Learn and Ask Emo, and open the parent area with the PIN. Every control must be reachable with Tab, show a visible focus ring, and work with Enter or Space; the badge popup must keep focus inside it and return focus when closed; nothing may trap focus.
2. **Sound off**: turn the sound off with the speaker button and repeat a round and a Learn page. Nothing should depend on sound alone (feedback must also be visible), "Read to me" should say sound is off, and no sound should play.
3. **Reduced motion**: turn on the operating system's reduce-motion setting (Windows: Settings › Accessibility › Visual effects › Animation effects off) and reload. Floating decorations, confetti and card animations should stop or become minimal, and every screen must still make sense.
4. **Zoom to 200%** (Ctrl and +) on a 1280-wide window: text must grow, nothing may be cut off or overlap, no sideways scrolling except for wide tables, and the bottom navigation must not cover content.

## Limitations

- Chromium only; the 375×812 run uses a desktop browser at phone size (no touch emulation or mobile browser UI).
- One visit per screen in one flow; states such as error messages, empty lists and long nicknames were not covered.
- Automated tools find only part of accessibility problems; screen-reader order and wording need a manual check.
- Finite animations were allowed to finish before checking; looping decorations keep moving, so the "painted over" results depend on timing.
- The text-overlap check is a heuristic based on text box positions; each finding should be confirmed in the screenshot.
- Screenshots are full-page, so the fixed bottom navigation appears where the first screen ends rather than at the bottom of the page; that is a screenshot artefact, not the app's layout.
