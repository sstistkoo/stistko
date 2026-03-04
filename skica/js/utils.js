// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Pomocné funkce (snap body, geometrie, labely)      ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Snap body objektů ──
function getObjectSnapPoints(obj) {
  switch (obj.type) {
    case "point":
      return [{ x: obj.x, y: obj.y }];
    case "line":
    case "constr":
      return [
        { x: obj.x1, y: obj.y1 },
        { x: obj.x2, y: obj.y2 },
        { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2 },
      ];
    case "circle":
      return [
        { x: obj.cx, y: obj.cy },
        { x: obj.cx + obj.r, y: obj.cy },
        { x: obj.cx - obj.r, y: obj.cy },
        { x: obj.cx, y: obj.cy + obj.r },
        { x: obj.cx, y: obj.cy - obj.r },
      ];
    case "arc":
      return [
        { x: obj.cx, y: obj.cy },
        {
          x: obj.cx + obj.r * Math.cos(obj.startAngle),
          y: obj.cy + obj.r * Math.sin(obj.startAngle),
        },
        {
          x: obj.cx + obj.r * Math.cos(obj.endAngle),
          y: obj.cy + obj.r * Math.sin(obj.endAngle),
        },
      ];
    case "rect":
      return [
        { x: obj.x1, y: obj.y1 },
        { x: obj.x2, y: obj.y1 },
        { x: obj.x2, y: obj.y2 },
        { x: obj.x1, y: obj.y2 },
        { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2 },
      ];
    default:
      return [];
  }
}

// ── Vzdálenost bodu od úsečky ──
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ── Test úhlu v rozsahu ──
function isAngleBetween(angle, start, end) {
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const a = norm(angle - start);
  const e = norm(end - start);
  return a <= e;
}

// ── Popisky typů ──
function typeLabel(t) {
  return (
    {
      point: "Bod",
      line: "Úsečka",
      constr: "Konstrukční",
      circle: "Kružnice",
      arc: "Oblouk",
      rect: "Obdélník",
    }[t] || t
  );
}

function toolLabel(t) {
  return (
    {
      select: "Výběr",
      move: "Přesun",
      point: "Bod",
      line: "Úsečka",
      constr: "Konstr. čára",
      circle: "Kružnice",
      arc: "Oblouk",
      rect: "Obdélník",
      measure: "Měření",
    }[t] || t
  );
}
