// Colours for text and for surfaces that carry text, chosen for WCAG AA contrast
// (4.5:1 for normal text, 3:1 for large text). The bright brand colours stay for
// backgrounds and decorations; these are the stronger shades used where text sits.
export const COLORS = {
  orangeButton: "#FF9800", // with orangeButtonText 6.41:1
  orangeButtonText: "#3E2723", // ink
  orangeText: "#9A4A00", // on white 6.26:1, on #FFF3E0 5.71:1
  tealButton: "#00707A", // white text 5.84:1
  tealText: "#00707A", // on #E0F7FA 5.24:1
  ink: "#3E2723", // on #FF9800 6.41:1, on #FFC107 8.48:1
  navMuted: "#616161", // on #F7F7F7 5.78:1
  labelMuted: "#616161", // on the pale card tints 5.15:1 or more
  textMuted: "#546E7A", // on white 5.40:1
  neutralButton: "#546E7A", // white text 5.40:1
  success: "#2E7D32", // white text 5.13:1
  error: "#C62828", // on white 5.62:1
  encourage: "#C2185B", // on white 5.87:1
  badgeTitle: "#37474F", // on white 9.65:1
} as const;
