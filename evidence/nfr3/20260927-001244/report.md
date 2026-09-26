# NFR3 evidence: engaging, age-appropriate and accessible interface

Run 20260927-001244 · clean commit `40915de` (`git status` showed no changes before the run; see `git.json`) · Chromium (Playwright) at 375×812 and 1280×800 · axe-core 4.13.0

How to reproduce: from the project root, on a clean tree, run
`backend\venv\Scripts\python.exe backend\scripts\nfr3_evidence.py` (writes a new folder under `evidence/nfr3/`).

## Result

**FAIL.** Pass means, on every screen at both sizes: no horizontal scrolling, no cut-off or out-of-view controls, no tap targets under 24×24 px, and no serious or critical axe violations. Targets under 44×44 px, controls covered by other elements, overlapping text, and moderate, minor or best-practice axe issues are reported below but don't fail it.

| Criterion | Result | Where |
|---|---|---|
| No horizontal scrolling | **fail** (1) | Me (profile) (375x812) |
| No controls cut off or out of view | **fail** (1) | Mood activity (Happy, 1 of 3 done) (375x812) |
| No tap targets under 24x24 px | **fail** (12) | Me (profile) (375x812, 1280x800); Wrong feedback (1280x800, 375x812); Welcome (remembered player) (375x812, 1280x800); Correct feedback (375x812, 1280x800); Welcome (player list) (375x812, 1280x800); Parent PIN keypad (1280x800, 375x812) |
| No serious or critical axe violations | **fail** (37) | Game round (375x812, 1280x800); Welcome (remembered player) (375x812, 1280x800); Learn (feeling picker) (375x812, 1280x800); Mood activity (Happy, 1 of 3 done) (375x812, 1280x800); Summary with the First Star badge (375x812, 1280x800); Parent About (375x812, 1280x800); Parent Diary (375x812, 1280x800); Ask Emo (after one answer) (375x812, 1280x800); Me (profile) (375x812, 1280x800); Parent Overview (375x812, 1280x800); Welcome (player list) (375x812, 1280x800); Wrong feedback (375x812, 1280x800); Badges (375x812, 1280x800); Parent PIN keypad (375x812, 1280x800); Diary (375x812, 1280x800); Learn (a feeling page) (375x812, 1280x800); Correct feedback (375x812, 1280x800); Mood check-in (a feeling selected) (375x812, 1280x800) |

## Summary by screen

Columns: horizontal scroll · controls cut off or out of view · targets under 24 px · targets under 44 px (child screens) · controls covered (tap blocked) · controls painted over by a decoration · text overlaps · axe violations by impact (critical/serious/moderate/minor).

| Screen | Size | H-scroll | Cut/out | <24 | <44 child | Covered | Painted over | Text overlaps | axe C/S/M/m |
|---|---|---|---|---|---|---|---|---|---|
| Welcome (player list) | 375x812 | no | 0 | 1 | 1 | 0 | 0 | 0 | 0/1/3/0 |
| Welcome (player list) | 1280x800 | no | 0 | 1 | 1 | 0 | 0 | 0 | 0/1/3/0 |
| Mood check-in (a feeling selected) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Mood check-in (a feeling selected) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Diary | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Diary | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Mood activity (Happy, 1 of 3 done) | 375x812 | no | 2 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Mood activity (Happy, 1 of 3 done) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Game round | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/3/0 |
| Game round | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/3/0 |
| Correct feedback | 375x812 | no | 0 | 1 | 2 | 0 | 0 | 1 | 0/1/3/0 |
| Correct feedback | 1280x800 | no | 0 | 1 | 2 | 0 | 0 | 0 | 0/1/3/0 |
| Wrong feedback | 375x812 | no | 0 | 1 | 2 | 0 | 0 | 1 | 0/1/3/0 |
| Wrong feedback | 1280x800 | no | 0 | 1 | 2 | 0 | 0 | 0 | 0/1/3/0 |
| Summary with the First Star badge | 375x812 | no | 0 | 0 | 0 | 0 | 1 | 0 | 0/1/1/0 |
| Summary with the First Star badge | 1280x800 | no | 0 | 0 | 0 | 0 | 1 | 0 | 0/1/1/0 |
| Learn (feeling picker) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Learn (feeling picker) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Learn (a feeling page) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Learn (a feeling page) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Ask Emo (after one answer) | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Ask Emo (after one answer) | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Me (profile) | 375x812 | **yes** | 0 | 1 | 3 | 0 | 0 | 0 | 0/1/2/0 |
| Me (profile) | 1280x800 | no | 0 | 1 | 3 | 0 | 0 | 0 | 0/1/2/0 |
| Badges | 375x812 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Badges | 1280x800 | no | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/2/0 |
| Welcome (remembered player) | 375x812 | no | 0 | 1 | 2 | 0 | 0 | 0 | 0/1/3/0 |
| Welcome (remembered player) | 1280x800 | no | 0 | 1 | 2 | 0 | 0 | 0 | 0/1/3/0 |
| Parent PIN keypad | 375x812 | no | 0 | 1 | – | 0 | 0 | 0 | 1/0/2/0 |
| Parent PIN keypad | 1280x800 | no | 0 | 1 | – | 0 | 0 | 0 | 1/0/2/0 |
| Parent Overview | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/2/2/0 |
| Parent Overview | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/1/2/0 |
| Parent Diary | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/1/2/0 |
| Parent Diary | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/1/2/0 |
| Parent About | 375x812 | no | 0 | 0 | – | 0 | 0 | 0 | 0/1/2/0 |
| Parent About | 1280x800 | no | 0 | 0 | – | 0 | 0 | 0 | 0/1/2/0 |

## Problems that fail the result

### Horizontal scrolling

- Me (profile) at 375x812: page is 381 px wide in a 375 px viewport.

### Controls cut off or out of view

- Mood activity (Happy, 1 of 3 done) at 375x812: `button.ff.text-xl.font-bold "Complete 2 more activities first"` (400×64 px at x=-12.5): outside the viewport; clipped by `div.min-h-screen.w-full.relative "● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ `

### Tap targets under 24×24 px

- `button.fn.font-bold.self-start "👨‍👩‍👧 Manage players"`: 124.4×21 px, on Welcome (player list) (1280x800); Welcome (player list) (375x812)
- `button.fn.font-semibold.underline "How did the AI decide? 🤖"`: 158.4×19.5 px, on Correct feedback (1280x800); Correct feedback (375x812); Wrong feedback (1280x800); Wrong feedback (375x812)
- `button.fn.font-bold "Switch Player"`: 89.6×21 px, on Me (profile) (1280x800); Me (profile) (375x812)
- `button.fn.font-bold "Not you?"`: 57.3×21 px, on Welcome (remembered player) (1280x800); Welcome (remembered player) (375x812)
- `button.fn.font-bold "Forgot PIN?"`: 76.7×21 px, on Parent PIN keypad (1280x800); Parent PIN keypad (375x812)

### Serious and critical axe violations

- **button-name** (critical): Buttons must have discernible text. 2 element(s) across 2 screen/size combinations. [button-name](https://dequeuniversity.com/rules/axe/4.13/button-name?application=playwright)
- **color-contrast** (serious): Elements must meet minimum color contrast ratio thresholds. 220 element(s) across 34 screen/size combinations. [color-contrast](https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright)
- **scrollable-region-focusable** (serious): Scrollable region must have keyboard access. 1 element(s) across 1 screen/size combinations. [scrollable-region-focusable](https://dequeuniversity.com/rules/axe/4.13/scrollable-region-focusable?application=playwright)

#### Colour contrast by colour pair (39 pairs)

| Text | Background | Ratio | Needed | Elements | Screens |
|---|---|---|---|---|---|
| #ffd700 | #ffffff | 1.4 | 3:1 | 1 | 1 of 18 |
| #ffc107 | #fff9c4 | 1.52 | 3:1, 4.5:1 | 3 | 2 of 18 |
| #ffffff | #ffc107 | 1.63 | 4.5:1 | 1 | 1 of 18 |
| #ffc107 | #ffffff | 1.63 | 4.5:1 | 1 | 1 of 18 |
| #00bcd4 | #e0f7fa | 2.06 | 3:1, 4.5:1 | 7 | 7 of 18 |
| #ffffff | #ff9800 | 2.15 | 3:1, 4.5:1 | 11 | 8 of 18 |
| #ff9800 | #ffffff | 2.15 | 4.5:1 | 1 | 1 of 18 |
| #ffffff | #00bcd4 | 2.29 | 3:1, 4.5:1 | 4 | 6 of 18 |
| #42a5f5 | #e3f2fd | 2.31 | 3:1, 4.5:1 | 2 | 1 of 18 |
| #9e9e9e | #f7f7f7 | 2.5 | 4.5:1 | 3 | 1 of 18 |
| #9e9e9e | #fff7eb | 2.52 | 4.5:1 | 3 | 1 of 18 |
| #ffffff | #90a4ae | 2.59 | 3:1 | 1 | 1 of 18 |
| #90a4ae | #ffffff | 2.59 | 4.5:1 | 1 | 1 of 18 |
| #9e9e9e | #fdfdfd | 2.63 | 4.5:1 | 5 | 1 of 18 |
| #9e9e9e | #fffdfe | 2.64 | 4.5:1 | 1 | 1 of 18 |
| #9e9e9e | #fefdfe | 2.64 | 4.5:1 | 1 | 1 of 18 |
| #9e9e9e | #fefefd | 2.65 | 4.5:1 | 5 | 1 of 18 |
| #9e9e9e | #fdfeff | 2.65 | 4.5:1 | 4 | 1 of 18 |
| #9e9e9e | #fffefe | 2.66 | 4.5:1 | 2 | 1 of 18 |
| #9e9e9e | #ffffff | 2.67 | 4.5:1 | 29 | 8 of 18 |
| #9e9e9e | #fffffd | 2.67 | 4.5:1 | 4 | 1 of 18 |
| #ffffff | #4caf50 | 2.77 | 3:1, 4.5:1 | 2 | 1 of 18 |
| #4caf50 | #ffffff | 2.77 | 4.5:1 | 3 | 1 of 18 |
| #ef5350 | #ffebee | 3.04 | 4.5:1 | 1 | 1 of 18 |
| #78909c | #ffffff | 3.35 | 4.5:1 | 10 | 4 of 18 |
| #e65100 | #fff3e0 | 3.45 | 4.5:1 | 2 | 2 of 18 |
| #ef5350 | #ffffff | 3.48 | 4.5:1 | 1 | 1 of 18 |
| #e65100 | #fff9c4 | 3.53 | 4.5:1 | 2 | 2 of 18 |
| #e65100 | #ffffff | 3.78 | 4.5:1 | 2 | 2 of 18 |
| #757575 | #fce4ec | 3.82 | 4.5:1 | 1 | 1 of 18 |
| #757575 | #e8eaf6 | 3.84 | 4.5:1 | 1 | 1 of 18 |
| #ab47bc | #f3e5f5 | 3.97 | 4.5:1 | 1 | 1 of 18 |
| #00838f | #e0f7fa | 4.06 | 4.5:1 | 1 | 1 of 18 |
| #757575 | #e8f5e9 | 4.09 | 4.5:1 | 1 | 1 of 18 |
| #757575 | #e0f7fa | 4.13 | 4.5:1 | 1 | 1 of 18 |
| #757575 | #fff9c4 | 4.3 | 4.5:1 | 1 | 1 of 18 |
| #e91e63 | #ffffff | 4.34 | 4.5:1 | 3 | 3 of 18 |
| #607d8b | #ffffff | 4.37 | 4.5:1 | 1 | 2 of 18 |
| #757575 | #fafafa | 4.41 | 4.5:1 | 2 | 2 of 18 |

#### Colour contrast by element (126 distinct element/colour combinations)

| Element | Text | Background | Ratio | Needed | Font | Screens |
|---|---|---|---|---|---|---|
| `#\:rn\:` | #ffd700 | #ffffff | 1.4 | 3:1 | 19.5pt (26px) | Summary with the First Star badge (375x812) |
| `.p-3.text-center.rounded-2xl:nth-child(1)` | #ffc107 | #fff9c4 | 1.52 | 4.5:1 | 11.3pt (15px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.p-3.text-center.rounded-2xl:nth-child(1) > .text-2xl.ff` | #ffc107 | #fff9c4 | 1.52 | 3:1 | 18.0pt (24px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.p-5.rounded-2xl.font-bold:nth-child(2) > div:nth-child(2)` | #ffc107 | #fff9c4 | 1.52 | 3:1 | 16.5pt (22px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.ff.hover\:scale-105.active\:scale-95:nth-child(1)` | #ffffff | #ffc107 | 1.63 | 4.5:1 | 16.5pt (22px) | Diary (1280x800); Diary (375x812) |
| `#\:ro\:` | #ffc107 | #ffffff | 1.63 | 4.5:1 | 16.5pt (22px) | Summary with the First Star badge (1280x800) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(1)` | #00bcd4 | #e0f7fa | 2.06 | 4.5:1 | 8.3pt (11px) | Mood check-in (a feeling selected) (1280x800); Mood check-in (a feeling selected) (375x812) |
| `.py-1.rounded-2xl.transition-all:nth-child(4)` | #00bcd4 | #e0f7fa | 2.06 | 4.5:1 | 8.3pt (11px) | Learn (feeling picker) (1280x800); Learn (feeling picker) (375x812) |
| `.hover\:bg-cyan-50.px-4.py-1:nth-child(4)` | #00bcd4 | #e0f7fa | 2.06 | 4.5:1 | 8.3pt (11px) | Learn (a feeling page) (1280x800); Learn (a feeling page) (375x812) |
| `.py-1.hover\:bg-cyan-50.rounded-2xl:nth-child(4)` | #00bcd4 | #e0f7fa | 2.06 | 4.5:1 | 8.3pt (11px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(3)` | #00bcd4 | #e0f7fa | 2.06 | 4.5:1 | 8.3pt (11px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(5)` | #00bcd4 | #e0f7fa | 2.06 | 4.5:1 | 8.3pt (11px) | Badges (1280x800); Badges (375x812) |
| `.p-5.rounded-2xl.font-bold:nth-child(3) > div:nth-child(2)` | #00bcd4 | #e0f7fa | 2.06 | 3:1 | 16.5pt (22px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.text-xl` | #ffffff | #ff9800 | 2.15 | 3:1 | 15.0pt (20px) | Correct feedback (1280x800); Correct feedback (375x812); Me (profile) (1280x800); Me (profile) (375x812); Mood check-in (a feeling selected) (1280x800); Mood check-in (a feeling selected) (375x812); Wrong feedback (1280x800); Wrong feedback (375x812) |
| `.mb-4` | #ffffff | #ff9800 | 2.15 | 3:1 | 24.0pt (32px) | Game round (1280x800); Game round (375x812) |
| `.mb-4 > span` | #ffffff | #ff9800 | 2.15 | 3:1 | 24.0pt (32px) | Game round (1280x800); Game round (375x812) |
| `.top-4` | #ffffff | #ff9800 | 2.15 | 4.5:1 | 13.5pt (18px) | Correct feedback (1280x800); Correct feedback (375x812); Wrong feedback (1280x800); Wrong feedback (375x812) |
| `.px-8` | #ffffff | #ff9800 | 2.15 | 4.5:1 | 13.5pt (18px) | Wrong feedback (375x812) |
| `.text-xs` | #ff9800 | #ffffff | 2.15 | 4.5:1 | 9.0pt (12px) | Wrong feedback (1280x800); Wrong feedback (375x812) |
| `.px-8` | #ffffff | #ff9800 | 2.15 | 3:1 | 24.0pt (32px) | Wrong feedback (1280x800) |
| `.text-xl.hover\:brightness-110.cursor-pointer:nth-child(2)` | #ffffff | #ff9800 | 2.15 | 3:1 | 15.0pt (20px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.badge-dialog > .text-xl.hover\:brightness-110.cursor-pointer` | #ffffff | #ff9800 | 2.15 | 3:1 | 15.0pt (20px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.mb-3` | #ffffff | #ff9800 | 2.15 | 4.5:1 | 13.5pt (18px) | Welcome (remembered player) (375x812) |
| `.mb-3` | #ffffff | #ff9800 | 2.15 | 3:1 | 16.5pt (22px) | Welcome (remembered player) (1280x800) |
| `.gap-2.flex-wrap.items-center > .py-2.text-white.rounded-full` | #ffffff | #ff9800 | 2.15 | 4.5:1 | 10.5pt (14px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.px-5` | #ffffff | #00bcd4 | 2.29 | 4.5:1 | 12.0pt (16px) | Parent Diary (1280x800); Parent Diary (375x812); Parent Overview (1280x800); Parent Overview (375x812); Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.mt-8` | #ffffff | #00bcd4 | 2.29 | 3:1 | 18.0pt (24px) | Learn (feeling picker) (1280x800); Learn (feeling picker) (375x812) |
| `.px-5` | #ffffff | #00bcd4 | 2.29 | 4.5:1 | 13.5pt (18px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.rounded-full` | #ffffff | #00bcd4 | 2.29 | 4.5:1 | 12.0pt (16px) | Parent About (1280x800); Parent About (375x812) |
| `.p-3.text-center.rounded-2xl:nth-child(2)` | #42a5f5 | #e3f2fd | 2.31 | 4.5:1 | 11.3pt (15px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.p-3.text-center.rounded-2xl:nth-child(2) > .text-2xl.ff` | #42a5f5 | #e3f2fd | 2.31 | 3:1 | 18.0pt (24px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(2)` | #9e9e9e | #f7f7f7 | 2.5 | 4.5:1 | 8.3pt (11px) | Badges (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(4)` | #9e9e9e | #f7f7f7 | 2.5 | 4.5:1 | 8.3pt (11px) | Badges (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(3)` | #9e9e9e | #f7f7f7 | 2.5 | 4.5:1 | 8.3pt (11px) | Badges (1280x800) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(3)` | #9e9e9e | #fff7eb | 2.52 | 4.5:1 | 8.3pt (11px) | Wrong feedback (1280x800) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(4)` | #9e9e9e | #fff7eb | 2.52 | 4.5:1 | 8.3pt (11px) | Wrong feedback (1280x800) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(5)` | #9e9e9e | #fff7eb | 2.52 | 4.5:1 | 8.3pt (11px) | Wrong feedback (1280x800) |
| `.cursor-pointer` | #ffffff | #90a4ae | 2.59 | 3:1 | 15.0pt (20px) | Diary (1280x800); Diary (375x812) |
| `.mb-3` | #90a4ae | #ffffff | 2.59 | 4.5:1 | 9.8pt (13px) | Parent Diary (1280x800); Parent Diary (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(1)` | #9e9e9e | #fdfdfd | 2.63 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (1280x800) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(2)` | #9e9e9e | #fdfdfd | 2.63 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (1280x800) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(3)` | #9e9e9e | #fdfdfd | 2.63 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (1280x800) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(4)` | #9e9e9e | #fdfdfd | 2.63 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (1280x800) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(5)` | #9e9e9e | #fdfdfd | 2.63 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (1280x800) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(2)` | #9e9e9e | #fffdfe | 2.64 | 4.5:1 | 8.3pt (11px) | Me (profile) (375x812) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(4)` | #9e9e9e | #fefdfe | 2.64 | 4.5:1 | 8.3pt (11px) | Me (profile) (375x812) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(1)` | #9e9e9e | #fefefd | 2.65 | 4.5:1 | 8.3pt (11px) | Correct feedback (1280x800) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(2)` | #9e9e9e | #fefefd | 2.65 | 4.5:1 | 8.3pt (11px) | Correct feedback (1280x800) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(3)` | #9e9e9e | #fefefd | 2.65 | 4.5:1 | 8.3pt (11px) | Correct feedback (1280x800) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(4)` | #9e9e9e | #fefefd | 2.65 | 4.5:1 | 8.3pt (11px) | Correct feedback (1280x800) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(5)` | #9e9e9e | #fefefd | 2.65 | 4.5:1 | 8.3pt (11px) | Correct feedback (1280x800) |
| `.py-1.hover\:bg-cyan-50.rounded-2xl:nth-child(1)` | #9e9e9e | #fdfeff | 2.65 | 4.5:1 | 8.3pt (11px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `.py-1.hover\:bg-cyan-50.rounded-2xl:nth-child(2)` | #9e9e9e | #fdfeff | 2.65 | 4.5:1 | 8.3pt (11px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `.py-1.hover\:bg-cyan-50.rounded-2xl:nth-child(3)` | #9e9e9e | #fdfeff | 2.65 | 4.5:1 | 8.3pt (11px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `.py-1.hover\:bg-cyan-50.rounded-2xl:nth-child(5)` | #9e9e9e | #fdfeff | 2.65 | 4.5:1 | 8.3pt (11px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(1)` | #9e9e9e | #fffefe | 2.66 | 4.5:1 | 8.3pt (11px) | Wrong feedback (1280x800) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(2)` | #9e9e9e | #fffefe | 2.66 | 4.5:1 | 8.3pt (11px) | Wrong feedback (1280x800) |
| `.py-1.hover\:bg-cyan-50.px-4:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Diary (375x812); Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.py-1.hover\:bg-cyan-50.px-4:nth-child(2)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Diary (375x812); Summary with the First Star badge (375x812) |
| `.py-1.hover\:bg-cyan-50.px-4:nth-child(3)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Diary (1280x800); Diary (375x812); Summary with the First Star badge (375x812) |
| `.py-1.hover\:bg-cyan-50.px-4:nth-child(4)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Diary (375x812); Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.py-1.hover\:bg-cyan-50.px-4:nth-child(5)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Diary (375x812); Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (375x812) |
| `.py-1.rounded-2xl.hover\:bg-cyan-50:nth-child(5)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Mood activity (Happy, 1 of 3 done) (375x812) |
| `.py-1.hover\:bg-cyan-50.fn:nth-child(2)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Game round (375x812) |
| `.py-1.hover\:bg-cyan-50.fn:nth-child(3)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Game round (375x812) |
| `.py-1.hover\:bg-cyan-50.fn:nth-child(4)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Game round (375x812) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Correct feedback (375x812) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(2)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Correct feedback (375x812) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(3)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Correct feedback (375x812) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(4)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Correct feedback (375x812) |
| `.hover\:bg-cyan-50.flex-col.px-4:nth-child(5)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Correct feedback (375x812) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Wrong feedback (375x812) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(2)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Wrong feedback (375x812) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(3)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Wrong feedback (375x812) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(4)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Wrong feedback (375x812) |
| `.hover\:bg-cyan-50.px-4.transition-all:nth-child(5)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Wrong feedback (375x812) |
| `.py-1.rounded-2xl.transition-all:nth-child(1)` | #9e9e9e | #fffffd | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (feeling picker) (1280x800); Learn (feeling picker) (375x812) |
| `.py-1.rounded-2xl.transition-all:nth-child(5)` | #9e9e9e | #fffffd | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (feeling picker) (1280x800); Learn (feeling picker) (375x812) |
| `.py-1.rounded-2xl.transition-all:nth-child(2)` | #9e9e9e | #fffffd | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (feeling picker) (1280x800) |
| `.py-1.rounded-2xl.transition-all:nth-child(3)` | #9e9e9e | #fffffd | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (feeling picker) (1280x800) |
| `.hover\:bg-cyan-50.px-4.py-1:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (a feeling page) (1280x800); Learn (a feeling page) (375x812) |
| `.hover\:bg-cyan-50.px-4.py-1:nth-child(2)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (a feeling page) (1280x800); Learn (a feeling page) (375x812) |
| `.hover\:bg-cyan-50.px-4.py-1:nth-child(3)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (a feeling page) (1280x800); Learn (a feeling page) (375x812) |
| `.hover\:bg-cyan-50.px-4.py-1:nth-child(5)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Learn (a feeling page) (1280x800); Learn (a feeling page) (375x812) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(5)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.mt-1 > button:nth-child(1)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 10.5pt (14px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(2)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Me (profile) (1280x800) |
| `.py-1.hover\:bg-cyan-50.transition-all:nth-child(4)` | #9e9e9e | #ffffff | 2.67 | 4.5:1 | 8.3pt (11px) | Me (profile) (1280x800) |
| `.px-8` | #ffffff | #4caf50 | 2.77 | 4.5:1 | 15.0pt (20px) | Correct feedback (375x812) |
| `.px-8` | #ffffff | #4caf50 | 2.77 | 3:1 | 27.0pt (36px) | Correct feedback (1280x800) |
| `.gap-3.mb-4.items-center:nth-child(2) > .fn.font-bold:nth-child(3)` | #4caf50 | #ffffff | 2.77 | 4.5:1 | 12.0pt (16px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.gap-3.mb-4.items-center:nth-child(4) > .fn.font-bold:nth-child(3)` | #4caf50 | #ffffff | 2.77 | 4.5:1 | 12.0pt (16px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.gap-3.mb-4.items-center:nth-child(5) > .fn.font-bold:nth-child(3)` | #4caf50 | #ffffff | 2.77 | 4.5:1 | 12.0pt (16px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.p-3.text-center.rounded-2xl:nth-child(3)` | #ef5350 | #ffebee | 3.04 | 4.5:1 | 11.3pt (15px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `#diary-note-count` | #78909c | #ffffff | 3.35 | 4.5:1 | 11.3pt (15px) | Diary (1280x800); Diary (375x812) |
| `p` | #78909c | #ffffff | 3.35 | 4.5:1 | 12.0pt (16px) | Diary (1280x800); Diary (375x812) |
| `.items-start.self-start.gap-2:nth-child(4) > .min-w-0.gap-2.flex-col >` | #78909c | #ffffff | 3.35 | 4.5:1 | 10.5pt (14px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `#ask-emo-count` | #78909c | #ffffff | 3.35 | 4.5:1 | 9.8pt (13px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `p` | #78909c | #ffffff | 3.35 | 4.5:1 | 10.5pt (14px) | Ask Emo (after one answer) (1280x800); Ask Emo (after one answer) (375x812) |
| `.items-start.self-start.gap-2:nth-child(2) > .min-w-0.gap-2.flex-col >` | #78909c | #ffffff | 3.35 | 4.5:1 | 10.5pt (14px) | Ask Emo (after one answer) (1280x800) |
| `.mt-10 > .py-2.rounded-full.px-4` | #78909c | #ffffff | 3.35 | 4.5:1 | 10.5pt (14px) | Parent Diary (1280x800); Parent Diary (375x812) |
| `.gap-2 > span` | #78909c | #ffffff | 3.35 | 4.5:1 | 9.8pt (13px) | Parent Diary (1280x800); Parent Diary (375x812) |
| `button[aria-label="Delete this question"]` | #78909c | #ffffff | 3.35 | 4.5:1 | 10.5pt (14px) | Parent Diary (1280x800); Parent Diary (375x812) |
| `.mt-2` | #78909c | #ffffff | 3.35 | 4.5:1 | 11.3pt (15px) | Parent About (1280x800); Parent About (375x812) |
| `.gap-2.rounded-2xl.p-3:nth-child(2) > .font-bold.fn` | #e65100 | #fff3e0 | 3.45 | 4.5:1 | 9.8pt (13px) | Welcome (player list) (1280x800); Welcome (player list) (375x812) |
| `.hover\:brightness-110.py-2.px-4` | #e65100 | #fff3e0 | 3.45 | 4.5:1 | 10.5pt (14px) | Wrong feedback (1280x800); Wrong feedback (375x812) |
| `.gap-3.mb-4.items-center:nth-child(3) > .fn.font-bold:nth-child(3)` | #ef5350 | #ffffff | 3.48 | 4.5:1 | 12.0pt (16px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.ff.hover\:scale-105.active\:scale-95:nth-child(2)` | #e65100 | #fff9c4 | 3.53 | 4.5:1 | 16.5pt (22px) | Diary (1280x800); Diary (375x812) |
| `.inline-flex` | #e65100 | #fff9c4 | 3.53 | 4.5:1 | 11.3pt (15px) | Wrong feedback (1280x800) |
| `.gap-1 > span` | #e65100 | #ffffff | 3.78 | 4.5:1 | 9.8pt (13px) | Mood activity (Happy, 1 of 3 done) (1280x800); Mood activity (Happy, 1 of 3 done) (375x812) |
| `b:nth-child(1)` | #e65100 | #ffffff | 3.78 | 4.5:1 | 12.8pt (17px) | Wrong feedback (1280x800) |
| `.p-5.rounded-2xl.font-bold:nth-child(4) > div:nth-child(1)` | #757575 | #fce4ec | 3.82 | 4.5:1 | 9.8pt (13px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.p-5.rounded-2xl.font-bold:nth-child(5) > div:nth-child(1)` | #757575 | #e8eaf6 | 3.84 | 4.5:1 | 9.8pt (13px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.p-3.text-center.rounded-2xl:nth-child(4)` | #ab47bc | #f3e5f5 | 3.97 | 4.5:1 | 11.3pt (15px) | Me (profile) (1280x800); Me (profile) (375x812) |
| `.hover\:brightness-110.py-2.px-4` | #00838f | #e0f7fa | 4.06 | 4.5:1 | 10.5pt (14px) | Correct feedback (1280x800); Correct feedback (375x812) |
| `.p-5.rounded-2xl.font-bold:nth-child(1) > div:nth-child(1)` | #757575 | #e8f5e9 | 4.09 | 4.5:1 | 9.8pt (13px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.p-5.rounded-2xl.font-bold:nth-child(3) > div:nth-child(1)` | #757575 | #e0f7fa | 4.13 | 4.5:1 | 9.8pt (13px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.p-5.rounded-2xl.font-bold:nth-child(2) > div:nth-child(1)` | #757575 | #fff9c4 | 4.3 | 4.5:1 | 9.8pt (13px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.mt-2.fn.font-bold` | #e91e63 | #ffffff | 4.34 | 4.5:1 | 13.5pt (18px) | Correct feedback (1280x800); Correct feedback (375x812) |
| `.mt-3.fn.font-bold` | #e91e63 | #ffffff | 4.34 | 4.5:1 | 12.0pt (16px) | Wrong feedback (1280x800); Wrong feedback (375x812) |
| `.mb-2` | #e91e63 | #ffffff | 4.34 | 4.5:1 | 15.0pt (20px) | Summary with the First Star badge (1280x800); Summary with the First Star badge (375x812) |
| `.font-semibold` | #607d8b | #ffffff | 4.37 | 4.5:1 | 9.8pt (13px) | Correct feedback (1280x800); Correct feedback (375x812); Wrong feedback (1280x800); Wrong feedback (375x812) |
| `.font-semibold` | #757575 | #fafafa | 4.41 | 4.5:1 | 12.0pt (16px) | Parent Overview (1280x800); Parent Overview (375x812) |
| `.min-w-0 > p` | #757575 | #fafafa | 4.41 | 4.5:1 | 12.0pt (16px) | Parent Diary (1280x800); Parent Diary (375x812) |

## Reported, not failing

### Tap targets under 44×44 px on child screens

- `button.fn.font-bold "Not you?"`: 57.3×21 px, on Welcome (remembered player) (1280x800); Welcome (remembered player) (375x812)
- `button.fn.font-bold "Switch Player"`: 89.6×21 px, on Me (profile) (1280x800); Me (profile) (375x812)
- `button.fn.font-bold.rounded-full "Hide AI Vision"`: 129.3×41 px, on Correct feedback (1280x800); Correct feedback (375x812); Wrong feedback (1280x800); Wrong feedback (375x812)
- `button.fn.font-bold.self-start "👨‍👩‍👧 Manage players"`: 124.4×21 px, on Welcome (player list) (1280x800); Welcome (player list) (375x812)
- `button.fn.font-bold.text-center "View Achievements 🏆"`: 253.8×24 px, on Me (profile) (375x812)
- `button.fn.font-bold.text-center "View Achievements 🏆"`: 468×24 px, on Me (profile) (1280x800)
- `button.fn.font-semibold.underline "How did the AI decide? 🤖"`: 158.4×19.5 px, on Correct feedback (1280x800); Correct feedback (375x812); Wrong feedback (1280x800); Wrong feedback (375x812)
- `button.fn.mt-3 "Manage players"`: 92.8×27.5 px, on Welcome (remembered player) (1280x800); Welcome (remembered player) (375x812)
- `button.text-2xl.hover:scale-110.transition-transform "⚙️"`: 33×32 px, on Me (profile) (1280x800); Me (profile) (375x812)

### Controls covered by another element (the tap would hit something else)

None.

### Controls painted over by a decoration (taps still work)

- Summary with the First Star badge at 375x812: `button.ff.text-xl.font-bold "Nice! ✨"` under `div.fixed.inset-0.overflow-hidden "● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲` (opacity 1; moving decorations, so this depends on timing)
- Summary with the First Star badge at 1280x800: `button.ff.text-xl.font-bold "Nice! ✨"` under `div.fixed.inset-0.overflow-hidden "● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲ ♦ ✦ ● ■ ▲` (opacity 1; moving decorations, so this depends on timing)

### Overlapping text

Fixed or sticky bars, decorations and the two faces of flip cards are left out; boxes are trimmed to their scroll or clip area.

- Correct feedback at 375x812: `div.absolute.top-4.right-20 "⭐ 1/4"` and `div.rounded-2xl.py-4.px-8 "✅ CORRECT! ⭐ Amazing teaching!"` overlap by 6×17 px
- Wrong feedback at 375x812: `div.absolute.top-4.right-20 "⭐ 1/4"` and `div.rounded-2xl.py-4.px-8 "💛 Good try! Let us learn together` overlap by 10.7×14 px

### Moderate, minor and best-practice axe issues

- **landmark-one-main** (moderate): Document should have one main landmark. On 17 of 18 screens.
- **page-has-heading-one** (moderate): Page should contain a level-one heading. On 5 of 18 screens.
- **region** (moderate): All page content should be contained by landmarks. On 18 of 18 screens.

### Reachable only by scrolling a row or panel

- `button.fn.font-bold.rounded-full "What does happy mean?"` inside `div.relative.flex-1.min-h-0 "Chat with Emo"`: Ask Emo (after one answer) (375x812)
- `button.fn.font-bold.rounded-full "What does sad mean?"` inside `div.relative.flex-1.min-h-0 "Chat with Emo"`: Ask Emo (after one answer) (375x812)
- `button.fn.font-bold.rounded-full "What does surprised mean?"` inside `div.relative.flex-1.min-h-0 "Chat with Emo"`: Ask Emo (after one answer) (375x812)
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
