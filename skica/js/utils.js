// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Pomocné funkce (snap body, geometrie, labely)      ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Snap body objektů ──
export function getObjectSnapPoints(obj) {
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
    case "polyline": {
      const pts = obj.vertices.map(v => ({ x: v.x, y: v.y }));
      // Midpoints of each segment
      const n = obj.vertices.length;
      const segCount = obj.closed ? n : n - 1;
      for (let i = 0; i < segCount; i++) {
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        const b = obj.bulges[i] || 0;
        if (b === 0) {
          pts.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
        } else {
          const arc = bulgeToArc(p1, p2, b);
          if (arc) {
            const midAngle = (arc.startAngle + arc.endAngle) / 2;
            // Adjust midAngle for arc direction
            let ma;
            if (b > 0) {
              ma = arc.startAngle + normalizeAngleDiff(arc.endAngle - arc.startAngle, true) / 2;
            } else {
              ma = arc.startAngle + normalizeAngleDiff(arc.endAngle - arc.startAngle, false) / 2;
            }
            pts.push({ x: arc.cx + arc.r * Math.cos(ma), y: arc.cy + arc.r * Math.sin(ma) });
          } else {
            pts.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
          }
        }
      }
      return pts;
    }
    default:
      return [];
  }
}

// Helper: normalize angle difference for CCW or CW direction
function normalizeAngleDiff(diff, ccw) {
  if (ccw) {
    while (diff < 0) diff += 2 * Math.PI;
    if (diff === 0) diff = 2 * Math.PI;
  } else {
    while (diff > 0) diff -= 2 * Math.PI;
    if (diff === 0) diff = -2 * Math.PI;
  }
  return diff;
}

// ── Vzdálenost bodu od úsečky ──
export function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ── Test úhlu v rozsahu ──
export function isAngleBetween(angle, start, end) {
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const a = norm(angle - start);
  const e = norm(end - start);
  return a <= e;
}

// ── Popisky typů ──
export function typeLabel(t) {
  return (
    {
      point: "Bod",
      line: "Úsečka",
      constr: "Konstrukční",
      circle: "Kružnice",
      arc: "Oblouk",
      rect: "Obdélník",
      polyline: "Kontura",
    }[t] || t
  );
}

export function toolLabel(t) {
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
      polyline: "Kontura",
      measure: "Měření",
      tangent: "Tečna",
      offset: "Offset",
    }[t] || t
  );
}

// ── Bulge → Arc konverze (DXF standard) ──
// bulge = tan(θ/4), kladný = CCW, záporný = CW
export function bulgeToArc(p1, p2, bulge) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-10 || bulge === 0) return null;

  const theta = 4 * Math.atan(Math.abs(bulge));
  const r = d / (2 * Math.sin(theta / 2));

  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Unit normal to chord (pointing left of P1→P2)
  const nx = -dy / d;
  const ny = dx / d;

  const h = r * Math.cos(theta / 2);
  const sign = bulge > 0 ? 1 : -1;
  const cx = mx + sign * h * nx;
  const cy = my + sign * h * ny;

  const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
  const endAngle = Math.atan2(p2.y - cy, p2.x - cx);

  return { cx, cy, r, startAngle, endAngle, ccw: bulge > 0 };
}

// ── Radius + direction → bulge ──
export function radiusToBulge(p1, p2, radius, cw) {
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (d < 1e-10 || radius < d / 2 - 1e-10) return 0;
  const halfAngle = Math.asin(Math.min(1, d / (2 * radius)));
  const bulge = Math.tan(halfAngle / 2);
  return cw ? -bulge : bulge;
}
