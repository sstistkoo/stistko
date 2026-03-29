// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Centralizované konstanty                           ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Catppuccin Mocha – barvy tématu ─────────────────────────
export const COLORS = {
  // Objekt / vrstvy
  primary:       '#89b4fa',   // Modrá – výchozí barva vrstvy, obrysy
  construction:  '#6c7086',   // Šedá – konstrukční čáry
  dimension:     '#a6e3a1',   // Zelená – kótovací čáry, průsečíky
  selected:      '#f9e2af',   // Žlutá – zvýrazněný výběr
  preview:       '#f5c2e7',   // Růžová – dočasné čáry při kreslení
  snapPoint:     '#fab387',   // Oranžová – indikátor kurzorového přichycení
  snapEdge:      '#cba6f7',   // Fialová – snap k hraně objektu
  delete:        '#f38ba8',   // Červená – smazání, vertikální osa

  // Osy
  axisH:         '#a6e3a1',   // Vodorovná osa (Z / karusel-X)
  axisV:         '#f38ba8',   // Svislá osa (X / karusel-Z)

  // Texty
  text:          '#cdd6f4',   // Hlavní text
  textSecondary: '#9399b2',   // Sekundární / kóty / info
  label:         '#a6adc8',   // Popisky v dialozích
  textMuted:     '#6c7086',   // Neaktivní / disabled

  // Pozadí & povrchy
  bgDark:        '#1e1e2e',   // Tmavé pozadí (Base)
  bgDarker:      '#11111b',   // Nejtmavší pozadí (Crust)
  surface:       '#313244',   // Pozadí kontextového menu (Surface0)
  surfaceHover:  '#45475a',   // Hover efekt, oddělovače (Surface1)
  border:        '#585b70',   // Okraje, rámečky (Surface2)
};

// ── Přichycení (snap) ───────────────────────────────────────
export const SNAP_POINT_THRESHOLD = 20;   // px (děleno zoom) – přichycení k bodu
export const SNAP_EDGE_THRESHOLD  = 12;   // px (děleno zoom) – přichycení k hraně

// ── Zoom ────────────────────────────────────────────────────
export const ZOOM_FACTOR = 1.15;
export const ZOOM_MIN    = 0.05;
export const ZOOM_MAX    = 200;

// ── Mřížka ──────────────────────────────────────────────────
export const GRID_BASE_STEP      = 10;    // počáteční rozteč mřížky
export const GRID_MIN_PX         = 15;    // min px vzdálenost pro zobrazení

// ── Dotek / mobil ───────────────────────────────────────────
export const MOBILE_BREAKPOINT   = 900;   // px šířka pro mobilní rozhraní
export const LONG_PRESS_MS       = 400;   // ms pro aktivaci přesného kříže
export const CROSSHAIR_OFFSET_Y  = -80;   // px posun kříže nad prst
export const TOUCH_MOVE_THRESHOLD = 5;    // px min. pohyb prstu pro detekci tahu
export const PAN_ACTIVATE_THRESHOLD = 10; // px min. pohyb pro aktivaci pannování

// ── Vibrace (haptic) ────────────────────────────────────────
export const VIBRATE_LONG_PRESS  = 30;    // ms
export const VIBRATE_SNAP_POINT  = 15;    // ms
export const VIBRATE_SNAP_EDGE   = 10;    // ms

// ── Renderování ─────────────────────────────────────────────
export const LINE_WIDTH          = 1.5;   // standardní šířka čáry
export const LINE_WIDTH_SELECTED = 2.5;   // šířka čáry při výběru
export const CONSTRUCTION_DASH   = [6, 4];
export const PREVIEW_DASH        = [4, 4];
export const ARROW_LENGTH        = 8;     // px délka šipky kóty
export const ARROW_ANGLE         = Math.PI / 7;

// ── Geometrie / výběr ───────────────────────────────────────
export const SELECT_THRESHOLD     = 15;   // px (děleno zoom) – výběr objektu klikem
export const CONSTRAINT_OFFSET_PX = 22;   // px odsazení vazební značky od segmentu
export const ARC_OUTSIDE_PENALTY  = 100;  // penalizace vzdálenosti mimo oblouk

// ── Ostatní ─────────────────────────────────────────────────
export const PASTE_OFFSET        = 10;    // px posun při vložení
export const AUTO_CENTER_PADDING = 0.15;  // 15 % padding při zoomToFit
