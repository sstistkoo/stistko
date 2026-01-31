/**
 * FREE-CONTOUR.JS - Volná kontura s dopočítáváním chybějících hodnot
 * Inspirováno Heidenhain FK (Free Contour) programováním
 *
 * Princip:
 * - Uživatel zadává elementy kontury postupně
 * - Některé hodnoty může vynechat (systém je dopočítá)
 * - Podporuje tangenciální a kolmé napojení
 * - Vizualizace v reálném čase
 * - Podpora G90 (absolutní) a G91 (přírůstkové) režimu
 *
 * @module free-contour
 */

// ===== DATOVÉ STRUKTURY =====

/**
 * Element kontury (úsečka nebo oblouk)
 * @typedef {Object} ContourElement
 * @property {string} type - "line" nebo "arc"
 * @property {number|null|"?"} x - Cílová X souřadnice (může být null nebo "?")
 * @property {number|null|"?"} z - Cílová Z souřadnice (může být null nebo "?")
 * @property {number|null|"?"} angle - Úhel úsečky ve stupních (může být null nebo "?")
 * @property {number|null|"?"} length - Délka úsečky (může být null nebo "?")
 * @property {number|null|"?"} radius - Poloměr oblouku (může být null nebo "?")
 * @property {string|null} direction - "CW" nebo "CCW" pro oblouky
 * @property {string|null} connection - "tangent-prev", "tangent-next", "perpendicular", "none"
 * @property {boolean} solved - Zda byly dopočítány chybějící hodnoty
 * @property {Object|null} computed - Dopočítané hodnoty { startX, startZ, endX, endZ, ... }
 */

// ===== GLOBÁLNÍ STAV =====

window.freeContourElements = [];
window.freeContourStartPoint = null; // { x, z }
window.freeContourPreviewCtx = null;
window.freeContourCircleCenter = null; // CC - definovaný střed kružnice { x, z }
window.fcPreviewZoom = 1.0; // Zoom úroveň preview
window.fcPreviewPan = { x: 0, y: 0 }; // Pan offset

// ===== MODAL MANAGEMENT =====

/**
 * Otevře Free Contour editor
 */
window.openFreeContourModal = function () {
  const modal = document.getElementById("freeContourModal");
  if (modal) {
    modal.classList.remove("d-none");
    modal.style.display = "flex";

    // Inicializovat start point z posledního bodu
    const lastPoint = window.getLastPoint();
    if (lastPoint) {
      window.freeContourStartPoint = { x: lastPoint.x, z: lastPoint.y };
      document.getElementById("fcStartX").value = (lastPoint.y * (window.xMeasureMode === "diameter" ? 2 : 1)).toFixed(2);
      document.getElementById("fcStartZ").value = lastPoint.x.toFixed(2);
    } else {
      window.freeContourStartPoint = { x: 0, z: 0 };
      document.getElementById("fcStartX").value = "0";
      document.getElementById("fcStartZ").value = "0";
    }

    // Vyčistit elementy
    window.freeContourElements = [];
    window.updateFreeContourList();
    window.updateFreeContourPreview();
  }
};

/**
 * Zavře Free Contour editor
 */
window.closeFreeContourModal = function () {
  const modal = document.getElementById("freeContourModal");
  if (modal) {
    modal.classList.add("d-none");
    modal.style.display = "none";
  }
};

/**
 * Exportuje FK konturu do G-kódu
 */
window.exportFreeContourToGCode = function () {
  const elements = window.freeContourElements;
  const startPoint = window.freeContourStartPoint;

  if (!startPoint || elements.length === 0) {
    window.showToast("Kontura je prázdná", "warning");
    return;
  }

  // Zkontrolovat zda jsou všechny prvky vyřešeny
  const unsolved = elements.filter(el => !el.solved);
  if (unsolved.length > 0) {
    window.showToast(`${unsolved.length} prvků není vyřešeno`, "warning");
    return;
  }

  let gcode = [];
  gcode.push("; FK Kontura - Export");
  gcode.push("; Start: X" + (startPoint.z * (window.xMeasureMode === "diameter" ? 2 : 1)).toFixed(3) + " Z" + startPoint.x.toFixed(3));
  gcode.push("");

  // G0 na start
  gcode.push("G0 X" + (startPoint.z * (window.xMeasureMode === "diameter" ? 2 : 1)).toFixed(3) + " Z" + startPoint.x.toFixed(3));
  gcode.push("");

  elements.forEach((el, i) => {
    if (!el.computed || !el.solved) return;

    const endX = el.computed.endX * (window.xMeasureMode === "diameter" ? 2 : 1);
    const endZ = el.computed.endZ;

    gcode.push("; Element #" + (i + 1) + ": " + (el.type === "line" ? "Úsečka" : "Oblouk"));

    if (el.type === "line") {
      gcode.push("G1 X" + endX.toFixed(3) + " Z" + endZ.toFixed(3) + " F" + (window.feedRate || 100));
    } else if (el.type === "arc" || el.type === "arc-cc") {
      const isCW = el.direction === "CW";
      const gCmd = isCW ? "G2" : "G3";
      const centerX = el.computed.centerX * (window.xMeasureMode === "diameter" ? 2 : 1);
      const centerZ = el.computed.centerZ;
      const startX = el.computed.startX * (window.xMeasureMode === "diameter" ? 2 : 1);
      const startZ = el.computed.startZ;

      const I = centerX - startX;
      const K = centerZ - startZ;

      gcode.push(gCmd + " X" + endX.toFixed(3) + " Z" + endZ.toFixed(3) + " I" + I.toFixed(3) + " K" + K.toFixed(3) + " F" + (window.feedRate || 100));
    }
  });

  gcode.push("");
  gcode.push("; Konec FK kontury");

  // Zkopírovat do schránky nebo stáhnout
  const gcodeText = gcode.join("\n");

  // Pokus o zkopírování do schránky
  if (navigator.clipboard) {
    navigator.clipboard.writeText(gcodeText).then(() => {
      window.showToast("G-kód zkopírován do schránky", "success");
    }).catch(() => {
      downloadGCode(gcodeText);
    });
  } else {
    downloadGCode(gcodeText);
  }

  function downloadGCode(text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fk_kontura.nc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast("G-kód stažen jako soubor", "success");
  }
};

/**
 * Použije FK konturu - přidá všechny prvky do mapy
 */
window.applyFreeContour = function () {
  const elements = window.freeContourElements;
  const startPoint = window.freeContourStartPoint;

  if (!startPoint || elements.length === 0) {
    window.showToast("Kontura je prázdná", "warning");
    return;
  }

  const unsolved = elements.filter(el => !el.solved);
  if (unsolved.length > 0) {
    window.showToast(`${unsolved.length} prvků není vyřešeno`, "warning");
    return;
  }

  // Přidat všechny prvky do mapy
  elements.forEach(el => {
    if (!el.computed || !el.solved) return;

    const shape = {
      x: el.computed.startX,
      y: el.computed.startZ,
      x2: el.computed.endX,
      y2: el.computed.endZ
    };

    if (el.type === "line") {
      shape.type = "line";
      window.shapes.push(shape);
    } else if (el.type === "arc" || el.type === "arc-cc") {
      shape.type = "arc";
      shape.cx = el.computed.centerX;
      shape.cy = el.computed.centerZ;
      shape.radius = el.computed.radius;
      shape.startAngle = el.computed.startAngle;
      shape.endAngle = el.computed.endAngle;
      shape.direction = el.direction;
      window.shapes.push(shape);
    }
  });

  window.redrawCanvas();
  window.closeFreeContourModal();
  window.showToast(`FK kontura přidána (${elements.length} prvků)`, "success");
};

// ===== TRANSFORMACE KONTURY =====

/**
 * Zrcadlí konturu kolem osy
 * @param {string} axis - "X" nebo "Z"
 */
window.mirrorFreeContour = function (axis) {
  const elements = window.freeContourElements;
  if (elements.length === 0) {
    window.showToast("Kontura je prázdná", "warning");
    return;
  }

  elements.forEach(el => {
    if (axis === "X") {
      // Zrcadlit kolem osy X (změnit znaménko Z)
      if (typeof el.z === "number") el.z = -el.z;
      if (typeof el.angle === "number") el.angle = -el.angle;
      // Změnit směr oblouku
      if (el.type === "arc") el.direction = el.direction === "CW" ? "CCW" : "CW";
    } else if (axis === "Z") {
      // Zrcadlit kolem osy Z (změnit znaménko X)
      if (typeof el.x === "number") el.x = -el.x;
      if (typeof el.angle === "number") el.angle = 180 - el.angle;
      // Změnit směr oblouku
      if (el.type === "arc") el.direction = el.direction === "CW" ? "CCW" : "CW";
    }
  });

  window.solveFreeContour();
  window.showToast(`Kontura zrcadlena kolem osy ${axis}`, "success");
};

/**
 * Otočí konturu o zadaný úhel
 * @param {number} angleDeg - Úhel ve stupních
 */
window.rotateFreeContour = function (angleDeg) {
  const elements = window.freeContourElements;
  if (elements.length === 0) {
    window.showToast("Kontura je prázdná", "warning");
    return;
  }

  const angleRad = angleDeg * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Otočit start point
  if (window.freeContourStartPoint) {
    const sp = window.freeContourStartPoint;
    const newX = sp.x * cos - sp.z * sin;
    const newZ = sp.x * sin + sp.z * cos;
    sp.x = newX;
    sp.z = newZ;
  }

  elements.forEach(el => {
    // Otočit koncové souřadnice
    if (typeof el.x === "number" && typeof el.z === "number") {
      const newX = el.x * cos - el.z * sin;
      const newZ = el.x * sin + el.z * cos;
      el.x = newX;
      el.z = newZ;
    }
    // Upravit úhel
    if (typeof el.angle === "number") {
      el.angle = el.angle + angleDeg;
    }
  });

  window.solveFreeContour();
  window.showToast(`Kontura otočena o ${angleDeg}°`, "success");
};

/**
 * Posune konturu o offset
 * @param {number} dx - Posun v X
 * @param {number} dz - Posun v Z
 */
window.translateFreeContour = function (dx, dz) {
  const elements = window.freeContourElements;

  // Posunout start point
  if (window.freeContourStartPoint) {
    window.freeContourStartPoint.x += dx;
    window.freeContourStartPoint.z += dz;
  }

  elements.forEach(el => {
    if (el.mode === "G90") {
      // Absolutní souřadnice - posunout
      if (typeof el.x === "number") el.x += dx;
      if (typeof el.z === "number") el.z += dz;
    }
    // G91 relativní - nechat být
  });

  window.solveFreeContour();
  window.showToast(`Kontura posunuta o [${dx}, ${dz}]`, "success");
};

/**
 * Škáluje konturu
 * @param {number} factor - Faktor škálování
 */
window.scaleFreeContour = function (factor) {
  const elements = window.freeContourElements;
  if (factor <= 0) return;

  elements.forEach(el => {
    if (typeof el.x === "number") el.x *= factor;
    if (typeof el.z === "number") el.z *= factor;
    if (typeof el.length === "number") el.length *= factor;
    if (typeof el.radius === "number") el.radius *= factor;
    if (typeof el.rnd === "number") el.rnd *= factor;
    if (typeof el.chf === "number") el.chf *= factor;
  });

  window.solveFreeContour();
  window.showToast(`Kontura škálována ${factor}×`, "success");
};

// ===== CC - CIRCLE CENTER =====

/**
 * Definuje střed kružnice pro následující oblouky (CC)
 * @param {number} x - X souřadnice středu
 * @param {number} z - Z souřadnice středu
 */
window.setCircleCenter = function (x, z) {
  window.freeContourCircleCenter = { x, z };
  window.showToast(`CC definován: X=${x}, Z=${z}`, "info");
  window.updateFreeContourPreview();
};

/**
 * Přidá oblouk s použitím definovaného středu CC
 * @param {string} direction - "CW" nebo "CCW"
 */
window.addArcWithCC = function (direction = "CW") {
  if (!window.freeContourCircleCenter) {
    window.showToast("Nejprve definuj střed CC", "warning");
    return;
  }

  const element = {
    type: "arc-cc",
    mode: "G90",
    x: null,
    z: null,
    centerX: window.freeContourCircleCenter.x,
    centerZ: window.freeContourCircleCenter.z,
    direction: direction,
    connection: "none",
    rnd: null,
    chf: null,
    unknowns: [],
    solved: false,
    computed: null
  };

  window.freeContourElements.push(element);
  window.updateFreeContourList();
  window.solveFreeContour();
};

// ===== PREVIEW ZOOM & PAN =====

/**
 * Zoom preview
 * @param {number} delta - Změna zoomu (kladná = přiblížit)
 */
window.fcZoom = function (delta) {
  window.fcPreviewZoom = Math.max(0.1, Math.min(10, window.fcPreviewZoom + delta));
  window.updateFreeContourPreview();
};

/**
 * Reset zoom a pan
 */
window.fcResetView = function () {
  window.fcPreviewZoom = 1.0;
  window.fcPreviewPan = { x: 0, y: 0 };
  window.updateFreeContourPreview();
};

/**
 * Zobrazí dialog pro zadání CC (Circle Center)
 */
window.showCCDialog = function () {
  const currentCC = window.freeContourCircleCenter;
  const defaultX = currentCC ? currentCC.x : 0;
  const defaultZ = currentCC ? currentCC.z : 0;

  const xStr = prompt(`CC - Střed kružnice X (průměr=${window.xMeasureMode === "diameter" ? "ano" : "ne"}):`, defaultX);
  if (xStr === null) return;

  const zStr = prompt("CC - Střed kružnice Z:", defaultZ);
  if (zStr === null) return;

  const x = parseFloat(xStr);
  const z = parseFloat(zStr);

  if (isNaN(x) || isNaN(z)) {
    window.showToast("Neplatné souřadnice CC", "error");
    return;
  }

  window.setCircleCenter(x, z);
  window.showToast(`CC definováno: X=${x}, Z=${z}`, "success");
};

/**
 * Nastaví zaoblení (RND) na všechny rohy najednou
 * @param {number} radius - Poloměr zaoblení
 */
window.fcRoundAllCorners = function (radius) {
  if (typeof radius !== "number" || isNaN(radius)) {
    const input = prompt("Poloměr zaoblení RND pro všechny rohy:", "2");
    if (input === null) return;
    radius = parseFloat(input);
    if (isNaN(radius) || radius <= 0) {
      window.showToast("Neplatný poloměr", "error");
      return;
    }
  }

  window.freeContourElements.forEach(el => {
    if (el.type === "line") {
      el.rnd = radius;
    }
  });

  window.updateFreeContourList();
  window.solveFreeContour();
  window.showToast(`RND ${radius} nastaveno na všechny rohy`, "success");
};

/**
 * Nastaví sražení (CHF) na všechny rohy najednou
 * @param {number} size - Velikost sražení
 */
window.fcChamferAllCorners = function (size) {
  if (typeof size !== "number" || isNaN(size)) {
    const input = prompt("Velikost sražení CHF pro všechny rohy:", "1");
    if (input === null) return;
    size = parseFloat(input);
    if (isNaN(size) || size <= 0) {
      window.showToast("Neplatná velikost", "error");
      return;
    }
  }

  window.freeContourElements.forEach(el => {
    if (el.type === "line") {
      el.chf = size;
    }
  });

  window.updateFreeContourList();
  window.solveFreeContour();
  window.showToast(`CHF ${size} nastaveno na všechny rohy`, "success");
};

/**
 * Odstraní všechny RND a CHF
 */
window.fcClearAllBlends = function () {
  window.freeContourElements.forEach(el => {
    el.rnd = null;
    el.chf = null;
  });

  window.updateFreeContourList();
  window.solveFreeContour();
  window.showToast("Všechna zaoblení a sražení odstraněna", "success");
};

/**
 * Přidá kolmou úsečku (AN - Angle Normal)
 * Kolmá na předchozí prvek
 */
window.fcAddPerpendicularLine = function () {
  const element = {
    type: "line",
    mode: "G90",
    x: null,
    z: null,
    angle: null,
    length: null,
    radius: null,
    direction: null,
    connection: "perpendicular",
    rnd: null,
    chf: null,
    unknowns: [],
    solved: false,
    computed: null
  };

  window.freeContourElements.push(element);
  window.updateFreeContourList();
  window.solveFreeContour();
};

/**
 * Duplikuje poslední element
 */
window.fcDuplicateLastElement = function () {
  if (window.freeContourElements.length === 0) {
    window.showToast("Žádný element k duplikaci", "warning");
    return;
  }

  const last = window.freeContourElements[window.freeContourElements.length - 1];
  const copy = JSON.parse(JSON.stringify(last));
  copy.solved = false;
  copy.computed = null;

  window.freeContourElements.push(copy);
  window.updateFreeContourList();
  window.solveFreeContour();
};

/**
 * Obrátí pořadí elementů (pro změnu směru kontury)
 */
window.fcReverseContour = function () {
  if (window.freeContourElements.length < 2) {
    window.showToast("Není co obrátit", "warning");
    return;
  }

  window.freeContourElements.reverse();

  // Upravit napojení
  window.freeContourElements.forEach(el => {
    if (el.connection === "tangent-prev") el.connection = "tangent-next";
    else if (el.connection === "tangent-next") el.connection = "tangent-prev";
  });

  window.updateFreeContourList();
  window.solveFreeContour();
  window.showToast("Kontura obrácena", "success");
};

// ===== PŘIDÁVÁNÍ ELEMENTŮ =====

/**
 * Přidá nový element kontury
 * @param {string} type - "line" nebo "arc"
 */
window.addFreeContourElement = function (type) {
  const element = {
    type: type,
    mode: "G90", // Každý element má vlastní režim G90/G91
    x: null,
    z: null,
    angle: null,
    length: null,
    radius: null,
    direction: type === "arc" ? "CW" : null,
    connection: "none",
    rnd: null, // Poloměr zaoblení rohu (RND)
    chf: null, // Velikost sražení rohu (CHF)
    unknowns: [], // Které hodnoty jsou označeny jako "?" k dopočítání
    solved: false,
    computed: null
  };

  window.freeContourElements.push(element);
  window.updateFreeContourList();
  window.solveFreeContour();
};

/**
 * Odstraní element kontury
 * @param {number} index
 */
window.removeFreeContourElement = function (index) {
  window.freeContourElements.splice(index, 1);
  window.updateFreeContourList();
  window.solveFreeContour();
};

/**
 * Aktualizuje hodnotu elementu
 * @param {number} index
 * @param {string} field
 * @param {string} value
 */
window.updateFreeContourElement = function (index, field, value) {
  const element = window.freeContourElements[index];
  if (!element) return;

  // Zajistit že unknowns existuje
  if (!element.unknowns) {
    element.unknowns = [];
  }

  if (field === "connection" || field === "direction" || field === "type" || field === "mode") {
    element[field] = value || null;
  } else if (field === "rnd" || field === "chf") {
    // RND a CHF jsou číselné hodnoty (ne "?")
    const num = parseFloat(value);
    element[field] = isNaN(num) || num === 0 ? null : num;
  } else {
    // Podpora pro "?" - označení neznámé hodnoty k dopočítání
    if (value === "?" || value === "??" || value.toLowerCase() === "x") {
      element[field] = "?";
      if (!element.unknowns.includes(field)) {
        element.unknowns.push(field);
      }
    } else if (value === "" || value === null) {
      element[field] = null;
      element.unknowns = element.unknowns.filter(f => f !== field);
    } else {
      element[field] = parseFloat(value);
      element.unknowns = element.unknowns.filter(f => f !== field);
    }
  }

  window.solveFreeContour();
};

/**
 * Aktualizuje start point
 */
window.updateFreeContourStartPoint = function () {
  const xInput = document.getElementById("fcStartX");
  const zInput = document.getElementById("fcStartZ");

  const x = parseFloat(xInput.value) || 0;
  const z = parseFloat(zInput.value) || 0;

  // Konverze z průměru na poloměr pokud je třeba
  window.freeContourStartPoint = {
    x: z, // Z je naše interní X (podélná osa)
    z: x / (window.xMeasureMode === "diameter" ? 2 : 1) // X je naše interní Y (radiální)
  };

  window.solveFreeContour();
};

// ===== GEOMETRICKÝ SOLVER =====

/**
 * Hlavní solver - dopočítá chybějící hodnoty
 * Podporuje G90 (absolutní) a G91 (přírůstkové) souřadnice per element
 *
 * Dvouprůchodové řešení:
 * 1. průchod: zkusí vyřešit každý element s dostupnými daty
 * 2. průchod: zpětné dopočítání (oblouk s tangentem může určit délku předchozí úsečky)
 */
window.solveFreeContour = function () {
  const elements = window.freeContourElements;
  const startPoint = window.freeContourStartPoint;

  if (!startPoint || elements.length === 0) {
    window.updateFreeContourPreview();
    return;
  }

  // Reset všech computed
  for (const el of elements) {
    if (!el.unknowns) el.unknowns = [];
    el.computed = { solved: false, error: null };
    el.solved = false;
  }

  // === PRŮCHOD 1: Standardní řešení dopředu ===
  let currentX = startPoint.x;
  let currentZ = startPoint.z;
  let currentAngle = 0;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const nextEl = elements[i + 1] || null;
    const elMode = el.mode || "G90";

    el.computed.startX = currentX;
    el.computed.startZ = currentZ;

    // Konverze G91 na absolutní souřadnice
    let absX = el.x;
    let absZ = el.z;
    if (elMode === "G91") {
      if (typeof el.x === "number") absX = currentX + el.x;
      if (typeof el.z === "number") absZ = currentZ + el.z;
    }

    const workEl = { ...el, x: absX, z: absZ };

    if (el.type === "line") {
      const result = window.solveLineElement(workEl, currentX, currentZ, currentAngle, nextEl);
      if (result.solved) {
        Object.assign(el.computed, result, { solved: true });
        currentX = result.endX;
        currentZ = result.endZ;
        currentAngle = result.angle;
        el.solved = true;
      } else {
        el.computed.error = result.error;
        el.computed.hint = result.hint;
        // Pokud má úhel a délku "?", čeká na následující prvek
        if (workEl.angle !== null && workEl.length === "?") {
          el.computed.waitingForNext = true;
          el.computed.knownAngle = workEl.angle;
        }
      }
    } else if (el.type === "arc") {
      const result = window.solveArcElement(workEl, currentX, currentZ, currentAngle, nextEl);
      if (result.solved) {
        Object.assign(el.computed, result, { solved: true });
        currentX = result.endX;
        currentZ = result.endZ;
        currentAngle = result.exitAngle;
        el.solved = true;
      } else {
        el.computed.error = result.error;
      }
    } else if (el.type === "arc-cc") {
      // Oblouk s definovaným středem CC
      const result = window.solveArcCCElement(workEl, currentX, currentZ, currentAngle);
      if (result.solved) {
        Object.assign(el.computed, result, { solved: true });
        currentX = result.endX;
        currentZ = result.endZ;
        currentAngle = result.exitAngle;
        el.solved = true;
      } else {
        el.computed.error = result.error;
      }
    }
  }

  // === PRŮCHOD 2: Zpětné dopočítání ===
  // Pokud oblouk má tangent na předchozí úsečku s délkou "?", dopočítáme délku
  for (let i = 1; i < elements.length; i++) {
    const el = elements[i];
    const prevEl = elements[i - 1];

    // Oblouk s tangenciálním napojením
    if (el.type === "arc" && (el.connection === "tangent" || el.connection === "tangent-prev")) {
      // Předchozí úsečka čeká na dopočítání délky
      if (prevEl.type === "line" && prevEl.computed?.waitingForNext) {
        const radius = el.radius;
        const direction = el.direction || "CW";

        if (typeof radius === "number" && radius > 0) {
          const startX = prevEl.computed.startX;
          const startZ = prevEl.computed.startZ;
          const angle = prevEl.computed.knownAngle;
          const angleRad = angle * Math.PI / 180;

          // Směr úsečky (jednotkový vektor)
          const dirX = Math.cos(angleRad);
          const dirZ = Math.sin(angleRad);

          // Střed oblouku je kolmo k úsečce ve vzdálenosti radius
          // Pro CW je střed vpravo, pro CCW vlevo
          const isCW = direction === "CW";
          const perpAngle = angleRad + (isCW ? -Math.PI / 2 : Math.PI / 2);

          // Koncový bod úsečky je tam, kde oblouk začne tangenciálně
          // Pokud oblouk má koncový bod, můžeme dopočítat
          let absEndX = el.x;
          let absEndZ = el.z;
          if (el.mode === "G91") {
            // G91 - ale nevíme ještě odkud, takže zkusíme absolutní
          }

          if (typeof absEndX === "number" && typeof absEndZ === "number") {
            // Máme koncový bod oblouku - spočítáme délku úsečky
            // Střed oblouku je od koncového bodu úsečky kolmo ve vzdálenosti R
            // Koncový bod oblouku musí ležet na kružnici

            // Řešíme: bod P na přímce ze startu směrem angle
            // tak, že oblouk z P do (absEndX, absEndZ) má poloměr R a je tangenciální

            const result = window.solveTangentLineArc(
              startX, startZ, angle, radius, isCW, absEndX, absEndZ
            );

            if (result.solved) {
              // Aktualizovat předchozí úsečku
              prevEl.computed.endX = result.lineEndX;
              prevEl.computed.endZ = result.lineEndZ;
              prevEl.computed.length = result.lineLength;
              prevEl.computed.solved = true;
              prevEl.computed.waitingForNext = false;
              prevEl.solved = true;

              // Aktualizovat oblouk
              el.computed.startX = result.lineEndX;
              el.computed.startZ = result.lineEndZ;
              el.computed.endX = absEndX;
              el.computed.endZ = absEndZ;
              el.computed.centerX = result.arcCenterX;
              el.computed.centerZ = result.arcCenterZ;
              el.computed.radius = radius;
              el.computed.startAngle = result.arcStartAngle;
              el.computed.endAngle = result.arcEndAngle;
              el.computed.exitAngle = result.arcExitAngle;
              el.computed.solved = true;
              el.computed.error = null;
              el.solved = true;
            }
          }
        }
      }
    }
  }

  window.updateFreeContourList();
  window.updateFreeContourPreview();
};

/**
 * Řeší kombinaci úsečka + tangenciální oblouk
 * Úsečka má známý úhel ale neznámou délku
 * Oblouk má poloměr a koncový bod
 * Najde bod kde úsečka končí tak, aby oblouk byl tangenciální
 *
 * @param {number} lineStartX - Počátek úsečky X
 * @param {number} lineStartZ - Počátek úsečky Z
 * @param {number} lineAngle - Úhel úsečky ve stupních
 * @param {number} arcRadius - Poloměr oblouku
 * @param {boolean} isCW - Směr oblouku (true = CW)
 * @param {number} arcEndX - Koncový bod oblouku X
 * @param {number} arcEndZ - Koncový bod oblouku Z
 * @returns {Object} - Výsledek řešení
 */
window.solveTangentLineArc = function (lineStartX, lineStartZ, lineAngle, arcRadius, isCW, arcEndX, arcEndZ) {
  const angleRad = lineAngle * Math.PI / 180;

  // Směrový vektor úsečky
  const dirX = Math.cos(angleRad);
  const dirZ = Math.sin(angleRad);

  // Kolmý vektor (směr ke středu oblouku)
  // CW = střed vpravo, CCW = střed vlevo
  const perpX = isCW ? dirZ : -dirZ;
  const perpZ = isCW ? -dirX : dirX;

  // Hledáme bod P na úsečce: P = lineStart + t * dir
  // Střed oblouku: C = P + R * perp
  // Podmínka: |C - arcEnd| = R

  // P = (lineStartX + t*dirX, lineStartZ + t*dirZ)
  // C = (lineStartX + t*dirX + R*perpX, lineStartZ + t*dirZ + R*perpZ)
  //
  // (Cx - arcEndX)² + (Cz - arcEndZ)² = R²
  //
  // Substituujeme:
  // ax = lineStartX + R*perpX - arcEndX
  // az = lineStartZ + R*perpZ - arcEndZ
  //
  // (ax + t*dirX)² + (az + t*dirZ)² = R²
  // ax² + 2*ax*t*dirX + t²*dirX² + az² + 2*az*t*dirZ + t²*dirZ² = R²
  // t²*(dirX² + dirZ²) + t*2*(ax*dirX + az*dirZ) + (ax² + az² - R²) = 0
  // t² + t*2*(ax*dirX + az*dirZ) + (ax² + az² - R²) = 0  (protože dirX² + dirZ² = 1)

  const ax = lineStartX + arcRadius * perpX - arcEndX;
  const az = lineStartZ + arcRadius * perpZ - arcEndZ;

  const a = 1;
  const b = 2 * (ax * dirX + az * dirZ);
  const c = ax * ax + az * az - arcRadius * arcRadius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return { solved: false, error: "Koncový bod oblouku je nedosažitelný s daným poloměrem" };
  }

  // Dvě řešení - bereme kladné t (směr dopředu)
  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b + sqrtD) / (2 * a);
  const t2 = (-b - sqrtD) / (2 * a);

  // Vybrat řešení s kladným t (nebo větší kladné)
  let t = t1;
  if (t1 < 0 && t2 >= 0) t = t2;
  else if (t1 >= 0 && t2 >= 0) t = Math.min(t1, t2); // Bližší řešení
  else if (t1 < 0 && t2 < 0) {
    return { solved: false, error: "Koncový bod oblouku je za počátkem úsečky" };
  }

  // Koncový bod úsečky = počátek oblouku
  const lineEndX = lineStartX + t * dirX;
  const lineEndZ = lineStartZ + t * dirZ;
  const lineLength = t;

  // Střed oblouku
  const arcCenterX = lineEndX + arcRadius * perpX;
  const arcCenterZ = lineEndZ + arcRadius * perpZ;

  // Úhly oblouku
  const arcStartAngle = Math.atan2(lineEndZ - arcCenterZ, lineEndX - arcCenterX);
  const arcEndAngle = Math.atan2(arcEndZ - arcCenterZ, arcEndX - arcCenterX);

  // Výstupní úhel (tangenta na konci oblouku)
  const arcExitAngle = (arcEndAngle + (isCW ? -Math.PI / 2 : Math.PI / 2)) * 180 / Math.PI;

  return {
    solved: true,
    lineEndX,
    lineEndZ,
    lineLength,
    arcCenterX,
    arcCenterZ,
    arcStartAngle,
    arcEndAngle,
    arcExitAngle
  };
};

/**
 * Řeší úsečkový element
 * Hodnota "?" značí neznámou hodnotu k dopočítání
 * Tangenciální/kolmé napojení poskytuje úhel jako známou hodnotu
 *
 * Heidenhain FK logika:
 * - S tangenciálním napojením stačí zadat JEDNU další hodnotu (délka, X nebo Z)
 * - Úhel se bere z předchozího prvku automaticky
 * - "?" označuje hodnotu k dopočítání z následujícího prvku
 */
window.solveLineElement = function (el, startX, startZ, incomingAngle, nextEl) {
  // Získat hodnoty (ignorovat "?" - ty jsou neznámé)
  let endX = el.x === "?" ? null : el.x;
  let endZ = el.z === "?" ? null : el.z;
  let angle = el.angle === "?" ? null : el.angle;
  let length = el.length === "?" ? null : el.length;

  // Příznak zda úhel pochází z napojení
  let angleFromConnection = false;
  const hasTangent = el.connection === "tangent" || el.connection === "tangent-prev";
  const hasPerp = el.connection === "perpendicular";

  // Tangenciální napojení - VŽDY použij příchozí úhel (přepíše explicitní)
  if (hasTangent) {
    angle = incomingAngle;
    angleFromConnection = true;
  }

  // Kolmé napojení - úhel +/- 90°
  if (hasPerp) {
    angle = incomingAngle + 90;
    angleFromConnection = true;
  }

  // Počet známých hodnot (včetně úhlu z napojení)
  const known = {
    endX: endX !== null,
    endZ: endZ !== null,
    angle: angle !== null,
    length: length !== null
  };
  const knownCount = Object.values(known).filter(v => v).length;

  // Počet hodnot označených jako "?" (k dopočítání)
  const unknownCount = [el.x, el.z, el.angle, el.length].filter(v => v === "?").length;

  // S tangenciálním napojením máme úhel ZDARMA
  // Takže stačí JEDNA další známá hodnota
  if (knownCount < 2) {
    if (angleFromConnection) {
      // Máme úhel z napojení - potřebujeme jen délku NEBO X NEBO Z
      const angleStr = angle !== null ? `${angle.toFixed(1)}°` : "?";
      if (length === null && endX === null && endZ === null) {
        return {
          solved: false,
          error: `Tangent=${angleStr}. Zadej: délku, X nebo Z`,
          hint: "tangent"
        };
      }
    }
    return { solved: false, error: "Potřeba: 2 hodnoty, nebo tangent + 1 hodnota" };
  }

  // Různé kombinace řešení
  if (known.endX && known.endZ) {
    // Máme koncový bod - dopočítat úhel a délku
    const dx = endX - startX;
    const dz = endZ - startZ;
    angle = Math.atan2(dz, dx) * 180 / Math.PI;
    length = Math.sqrt(dx * dx + dz * dz);
  } else if (known.angle && known.length) {
    // Máme úhel a délku - dopočítat koncový bod
    const angleRad = angle * Math.PI / 180;
    endX = startX + length * Math.cos(angleRad);
    endZ = startZ + length * Math.sin(angleRad);
  } else if (known.endX && known.angle) {
    // Máme X a úhel - dopočítat Z a délku
    const angleRad = angle * Math.PI / 180;
    const dx = endX - startX;
    if (Math.abs(Math.cos(angleRad)) < 0.001) {
      // Úhel je 90° nebo 270° - Z nelze určit z X
      return { solved: false, error: "Úhel 90°: zadej Z místo X" };
    }
    length = dx / Math.cos(angleRad);
    if (length < 0) length = -length; // Absolutní hodnota
    endZ = startZ + length * Math.sin(angleRad);
  } else if (known.endZ && known.angle) {
    // Máme Z a úhel - dopočítat X a délku
    const angleRad = angle * Math.PI / 180;
    const dz = endZ - startZ;
    if (Math.abs(Math.sin(angleRad)) < 0.001) {
      // Úhel je 0° nebo 180° - X nelze určit z Z
      return { solved: false, error: "Úhel 0°: zadej X místo Z" };
    }
    length = dz / Math.sin(angleRad);
    if (length < 0) length = -length;
    endX = startX + length * Math.cos(angleRad);
  } else if (known.endX && known.length) {
    // Máme X a délku - dopočítat Z a úhel (2 řešení, bereme kladné Z)
    const dx = endX - startX;
    if (Math.abs(dx) > length + 0.001) {
      return { solved: false, error: "Délka je kratší než vzdálenost v X" };
    }
    const dz = Math.sqrt(Math.max(0, length * length - dx * dx));
    endZ = startZ + dz; // Bereme kladný směr
    angle = Math.atan2(dz, dx) * 180 / Math.PI;
  } else if (known.endZ && known.length) {
    // Máme Z a délku - dopočítat X a úhel (2 řešení)
    const dz = endZ - startZ;
    if (Math.abs(dz) > length + 0.001) {
      return { solved: false, error: "Délka je kratší než vzdálenost v Z" };
    }
    const dx = Math.sqrt(Math.max(0, length * length - dz * dz));
    endX = startX + dx; // Bereme kladný směr
    angle = Math.atan2(dz, dx) * 180 / Math.PI;
  }

  // Validace výsledků - prevence NaN
  if (isNaN(endX) || isNaN(endZ) || isNaN(angle) || isNaN(length)) {
    return { solved: false, error: "Nelze vypočítat - neplatná kombinace hodnot" };
  }

  return {
    solved: true,
    endX: endX,
    endZ: endZ,
    angle: angle,
    length: length
  };
};

/**
 * Řeší obloukový element
 */
window.solveArcElement = function (el, startX, startZ, incomingAngle, nextEl) {
  let endX = el.x === "?" ? null : el.x;
  let endZ = el.z === "?" ? null : el.z;
  let radius = el.radius === "?" ? null : el.radius;
  const direction = el.direction || "CW";
  const isCW = direction === "CW";

  // Tangenciální napojení pro oblouk (tangent i tangent-prev)
  let tangentAngle = null;
  if (el.connection === "tangent" || el.connection === "tangent-prev") {
    tangentAngle = incomingAngle;
  }

  // Potřebujeme: radius + (koncový bod NEBO tangenciální směr)
  if (radius === null) {
    return { solved: false, error: "Oblouk vyžaduje poloměr R" };
  }

  if (endX === null && endZ === null && tangentAngle === null) {
    return { solved: false, error: "Zadej koncový bod (X, Z) nebo vyber tangenciální napojení" };
  }

  // Tangenciální oblouk - střed je kolmo na příchozí směr
  if (tangentAngle !== null && (endX !== null || endZ !== null)) {
    const tangentRad = tangentAngle * Math.PI / 180;

    // Střed je kolmo na tečnu ve vzdálenosti radius
    // Pro CW je střed vpravo od směru, pro CCW vlevo
    const perpAngle = tangentRad + (isCW ? -Math.PI / 2 : Math.PI / 2);
    const centerX = startX + radius * Math.cos(perpAngle);
    const centerZ = startZ + radius * Math.sin(perpAngle);

    // Pokud máme koncový bod, ověříme že leží na kružnici
    if (endX !== null && endZ !== null) {
      const distToEnd = Math.sqrt((endX - centerX) ** 2 + (endZ - centerZ) ** 2);
      if (Math.abs(distToEnd - radius) > 0.1) {
        // Koncový bod neleží na kružnici - zkusíme najít průsečík
        // Pro teď vrátíme chybu
        return { solved: false, error: "Koncový bod neleží na kružnici s daným poloměrem" };
      }
    } else if (endX !== null) {
      // Máme jen X - najít Z na kružnici
      const dx = endX - centerX;
      if (Math.abs(dx) > radius) {
        return { solved: false, error: "X souřadnice je mimo dosah oblouku" };
      }
      const dz = Math.sqrt(radius * radius - dx * dx);
      // Vybrat správné Z podle směru
      endZ = centerZ + (isCW ? -dz : dz);
    } else if (endZ !== null) {
      // Máme jen Z - najít X na kružnici
      const dz = endZ - centerZ;
      if (Math.abs(dz) > radius) {
        return { solved: false, error: "Z souřadnice je mimo dosah oblouku" };
      }
      const dx = Math.sqrt(radius * radius - dz * dz);
      endX = centerX + dx;
    }

    // Vypočítat úhly
    const startAngle = Math.atan2(startZ - centerZ, startX - centerX);
    const endAngle = Math.atan2(endZ - centerZ, endX - centerX);

    // Výstupní úhel (tangenta na konci)
    const exitAngle = (endAngle + (isCW ? -Math.PI / 2 : Math.PI / 2)) * 180 / Math.PI;

    return {
      solved: true,
      endX: endX,
      endZ: endZ,
      centerX: centerX,
      centerZ: centerZ,
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      exitAngle: exitAngle
    };
  }

  // Bez tangenciálního napojení - potřebujeme koncový bod
  if (endX === null || endZ === null) {
    return { solved: false, error: "Bez tangenciálního napojení je třeba zadat koncový bod" };
  }

  // Najít střed kružnice procházející start a end s daným poloměrem
  const midX = (startX + endX) / 2;
  const midZ = (startZ + endZ) / 2;
  const chordLength = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);

  if (chordLength > 2 * radius) {
    return { solved: false, error: "Poloměr je příliš malý pro daný koncový bod" };
  }

  const h = Math.sqrt(radius * radius - (chordLength / 2) ** 2);
  const chordAngle = Math.atan2(endZ - startZ, endX - startX);

  // Dva možné středy - vybereme podle směru
  const perpAngle = chordAngle + Math.PI / 2;
  const center1X = midX + h * Math.cos(perpAngle);
  const center1Z = midZ + h * Math.sin(perpAngle);
  const center2X = midX - h * Math.cos(perpAngle);
  const center2Z = midZ - h * Math.sin(perpAngle);

  // Vybrat střed podle směru (CW/CCW)
  // Pro CW chceme, aby oblouk šel po směru hodinových ručiček
  let centerX, centerZ;
  const cross1 = (endX - startX) * (center1Z - startZ) - (endZ - startZ) * (center1X - startX);

  if ((isCW && cross1 < 0) || (!isCW && cross1 > 0)) {
    centerX = center1X;
    centerZ = center1Z;
  } else {
    centerX = center2X;
    centerZ = center2Z;
  }

  const startAngle = Math.atan2(startZ - centerZ, startX - centerX);
  const endAngle = Math.atan2(endZ - centerZ, endX - centerX);
  const exitAngle = (endAngle + (isCW ? -Math.PI / 2 : Math.PI / 2)) * 180 / Math.PI;

  return {
    solved: true,
    endX: endX,
    endZ: endZ,
    centerX: centerX,
    centerZ: centerZ,
    radius: radius,
    startAngle: startAngle,
    endAngle: endAngle,
    exitAngle: exitAngle
  };
};

/**
 * Řeší obloukový element s definovaným středem CC
 */
window.solveArcCCElement = function (el, startX, startZ, incomingAngle) {
  const centerX = el.centerX;
  const centerZ = el.centerZ;
  let endX = el.x === "?" ? null : el.x;
  let endZ = el.z === "?" ? null : el.z;
  const direction = el.direction || "CW";
  const isCW = direction === "CW";

  // Střed je definován - poloměr je vzdálenost od startu ke středu
  const radius = Math.sqrt((startX - centerX) ** 2 + (startZ - centerZ) ** 2);

  if (radius < 0.001) {
    return { solved: false, error: "Start point je na středu CC" };
  }

  // Pokud máme jen X, dopočítáme Z
  if (endX !== null && endZ === null) {
    const dx = endX - centerX;
    if (Math.abs(dx) > radius) {
      return { solved: false, error: "X souřadnice je mimo dosah oblouku" };
    }
    const dz = Math.sqrt(radius * radius - dx * dx);
    // Vybrat správné Z podle směru oblouku
    endZ = centerZ + (isCW ? -dz : dz);
  }

  // Pokud máme jen Z, dopočítáme X
  if (endZ !== null && endX === null) {
    const dz = endZ - centerZ;
    if (Math.abs(dz) > radius) {
      return { solved: false, error: "Z souřadnice je mimo dosah oblouku" };
    }
    const dx = Math.sqrt(Math.max(0, radius * radius - dz * dz)); // Math.max pro prevenci NaN
    // Vybrat správné X podle směru oblouku
    endX = centerX + (isCW ? dx : -dx);
  }

  if (endX === null || endZ === null) {
    return { solved: false, error: "Oblouk CC vyžaduje koncový bod (X a/nebo Z)" };
  }

  // Ověřit že koncový bod leží na kružnici
  const endRadius = Math.sqrt((endX - centerX) ** 2 + (endZ - centerZ) ** 2);
  if (Math.abs(endRadius - radius) > 0.1) {
    return { solved: false, error: "Koncový bod neleží na kružnici definované CC" };
  }

  const startAngle = Math.atan2(startZ - centerZ, startX - centerX);
  const endAngle = Math.atan2(endZ - centerZ, endX - centerX);
  const exitAngle = (endAngle + (isCW ? -Math.PI / 2 : Math.PI / 2)) * 180 / Math.PI;

  return {
    solved: true,
    endX: endX,
    endZ: endZ,
    centerX: centerX,
    centerZ: centerZ,
    radius: radius,
    startAngle: startAngle,
    endAngle: endAngle,
    exitAngle: exitAngle
  };
};

// ===== UI UPDATES =====

/**
 * Aktualizuje seznam elementů v UI
 */
window.updateFreeContourList = function () {
  const container = document.getElementById("fcElementList");
  if (!container) return;

  if (window.freeContourElements.length === 0) {
    container.innerHTML = '<div class="fc-empty">Přidej elementy kontury pomocí tlačítek níže</div>';
    return;
  }

  let html = "";
  window.freeContourElements.forEach((el, i) => {
    const isLine = el.type === "line";
    const isArcCC = el.type === "arc-cc";
    const isArc = el.type === "arc" || isArcCC;
    const solved = el.solved;
    const statusClass = solved ? "fc-solved" : "fc-unsolved";
    const statusIcon = solved ? "✅" : "⚠️";
    const hasUnknowns = el.unknowns && el.unknowns.length > 0;
    const elMode = el.mode || "G90";
    const isG91 = elMode === "G91";
    const hasTangent = el.connection === "tangent-prev" || el.connection === "tangent" || el.connection === "tangent-next";

    // Label pro typ elementu
    const typeLabel = isLine ? "📏 Úsečka" : (isArcCC ? "⭕ Oblouk CC" : "🔄 Oblouk");

    // Zobrazit hodnotu nebo "?" pro neznámé
    const getDisplayValue = (field) => {
      if (el[field] === "?") return "?";
      if (el[field] !== null && el[field] !== undefined) return el[field];
      return "";
    };

    const getPlaceholder = (field, computedField) => {
      if (el[field] === "?" && el.computed?.[computedField] != null) {
        return `=${el.computed[computedField].toFixed(2)}`;
      }
      return el.computed?.[computedField] != null ? el.computed[computedField].toFixed(2) : "";
    };

    // Vytvoř input s tlačítkem "?"
    const inputWithQuestion = (field, label, computedField, extraClass = "") => {
      const val = getDisplayValue(field);
      const ph = getPlaceholder(field, computedField);
      const isUnknown = el[field] === "?";
      return `
        <div class="fc-field fc-field-param ${extraClass}">
          <label>${label}</label>
          <div class="fc-input-wrap">
            <input type="text" value="${val}"
              id="fc-input-${i}-${field}"
              onchange="window.updateFreeContourElement(${i}, '${field}', this.value)"
              placeholder="${ph}"
              class="${isUnknown ? 'fc-unknown' : ''}">
            <button type="button" class="fc-q-btn" onclick="window.setFcUnknown(${i}, '${field}')" title="Označit jako neznámé (?)">?</button>
          </div>
        </div>
      `;
    };

    html += `
      <div class="fc-element ${statusClass}" data-index="${i}">
        <div class="fc-element-header">
          <span class="fc-element-type">${typeLabel} #${i + 1}</span>
          <button class="fc-mode-btn ${isG91 ? 'g91' : 'g90'}" onclick="window.toggleElementMode(${i})" title="Přepnout G90/G91">${elMode}</button>
          <span class="fc-element-status">${statusIcon}${hasUnknowns ? " 🔍" : ""}</span>
          <button class="fc-remove-btn" onclick="window.removeFreeContourElement(${i})">✕</button>
        </div>
        <div class="fc-element-fields">
          ${!isArcCC ? `<div class="fc-field-row fc-connection-row">
            <label>Napojení:</label>
            <select onchange="window.updateFreeContourElement(${i}, 'connection', this.value)">
              <option value="none" ${el.connection === "none" ? "selected" : ""}>Žádné</option>
              <option value="tangent-prev" ${el.connection === "tangent-prev" || el.connection === "tangent" ? "selected" : ""}>← Tangenc. (předchozí)</option>
              <option value="tangent-next" ${el.connection === "tangent-next" ? "selected" : ""}>→ Tangenc. (následující)</option>
              <option value="perpendicular" ${el.connection === "perpendicular" ? "selected" : ""}>⊥ Kolmé</option>
            </select>
          </div>` : ''}

          ${isLine ? `
          <!-- ÚSEČKA - pouze úhel, délka, souřadnice -->
          <div class="fc-field-row fc-line-params">
            ${inputWithQuestion('angle', 'Úhel°:', 'angle')}
            ${inputWithQuestion('length', 'Délka:', 'length')}
          </div>
          <div class="fc-field-row fc-coords">
            ${inputWithQuestion('x', 'X:', 'endX', 'fc-field-coord')}
            ${inputWithQuestion('z', 'Z:', 'endZ', 'fc-field-coord')}
          </div>
          <div class="fc-field-row fc-blend-row">
            <div class="fc-field fc-field-param">
              <label>RND (zaoblení):</label>
              <input type="number" step="0.1" value="${el.rnd || ''}" placeholder="0"
                onchange="window.updateFreeContourElement(${i}, 'rnd', this.value)">
            </div>
            <div class="fc-field fc-field-param">
              <label>CHF (sražení):</label>
              <input type="number" step="0.1" value="${el.chf || ''}" placeholder="0"
                onchange="window.updateFreeContourElement(${i}, 'chf', this.value)">
            </div>
          </div>
          ${hasTangent ? `<div class="fc-hint-row"><span class="fc-hint">💡 Tangent: úhel přebírá z předchozího prvku</span></div>` : ''}
          ` : isArcCC ? `
          <!-- OBLOUK S CC (definovaným středem) -->
          <div class="fc-field-row fc-arc-cc-info">
            <span class="fc-cc-label">⭕ CC: X=${el.centerX?.toFixed(2) || '?'}, Z=${el.centerZ?.toFixed(2) || '?'}</span>
            <div class="fc-field fc-field-param">
              <label>Směr:</label>
              <select onchange="window.updateFreeContourElement(${i}, 'direction', this.value)">
                <option value="CW" ${el.direction === "CW" ? "selected" : ""}>CW ↻</option>
                <option value="CCW" ${el.direction === "CCW" ? "selected" : ""}>CCW ↺</option>
              </select>
            </div>
          </div>
          <div class="fc-field-row fc-coords">
            ${inputWithQuestion('x', 'Konc. X:', 'endX', 'fc-field-coord')}
            ${inputWithQuestion('z', 'Konc. Z:', 'endZ', 'fc-field-coord')}
          </div>
          <div class="fc-hint-row"><span class="fc-hint">💡 Oblouk z aktuální pozice do (X,Z) se středem v CC</span></div>
          ` : `
          <!-- OBLOUK - poloměr, směr, tangenciální napojení -->
          <div class="fc-field-row fc-arc-params">
            ${inputWithQuestion('radius', 'Poloměr R:', 'radius')}
            <div class="fc-field fc-field-param">
              <label>Směr:</label>
              <select onchange="window.updateFreeContourElement(${i}, 'direction', this.value)">
                <option value="CW" ${el.direction === "CW" ? "selected" : ""}>CW ↻</option>
                <option value="CCW" ${el.direction === "CCW" ? "selected" : ""}>CCW ↺</option>
              </select>
            </div>
          </div>
          <div class="fc-field-row fc-coords">
            ${inputWithQuestion('x', 'X:', 'endX', 'fc-field-coord')}
            ${inputWithQuestion('z', 'Z:', 'endZ', 'fc-field-coord')}
          </div>
          <div class="fc-field-row fc-blend-row">
            <div class="fc-field fc-field-param">
              <label>RND (zaoblení):</label>
              <input type="number" step="0.1" value="${el.rnd || ''}" placeholder="0"
                onchange="window.updateFreeContourElement(${i}, 'rnd', this.value)">
            </div>
            <div class="fc-field fc-field-param">
              <label>CHF (sražení):</label>
              <input type="number" step="0.1" value="${el.chf || ''}" placeholder="0"
                onchange="window.updateFreeContourElement(${i}, 'chf', this.value)">
            </div>
          </div>
          ${hasTangent ? `<div class="fc-hint-row"><span class="fc-hint">💡 Tangent: oblouk začíná ve směru předchozího prvku</span></div>` : ''}
          `}

          ${el.computed?.error ? `<div class="fc-error">❌ ${el.computed.error}</div>` : ""}
          ${hasUnknowns && el.solved ? `<div class="fc-calculated">🔍 Dopočítáno: ${el.unknowns.join(", ")}</div>` : ""}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

/**
 * Nastaví hodnotu pole jako neznámou (?)
 */
window.setFcUnknown = function (index, field) {
  window.updateFreeContourElement(index, field, "?");
  window.updateFreeContourList();
};

/**
 * Přepne G90/G91 režim pro konkrétní element
 */
window.toggleElementMode = function (index) {
  const el = window.freeContourElements[index];
  if (!el) return;

  if (!el.unknowns) el.unknowns = [];
  el.mode = el.mode === "G91" ? "G90" : "G91";
  window.solveFreeContour();
};

// ===== PRŮSEČÍKY A GEOMETRICKÉ FUNKCE =====

/**
 * Najde průsečík dvou úseček
 * @param {number} x1, y1 - Start úsečky 1
 * @param {number} x2, y2 - Konec úsečky 1
 * @param {number} x3, y3 - Start úsečky 2
 * @param {number} x4, y4 - Konec úsečky 2
 * @returns {Object|null} - {x, y} nebo null pokud se neprotínají
 */
window.lineLineIntersection = function (x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Rovnoběžné nebo shodné
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Průsečík leží na obou úsečkách
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  // Průsečík mimo úsečky - vrátit parametrický bod
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
    extended: true // Mimo úsečky
  };
};

/**
 * Najde průsečíky úsečky a kružnice
 * @param {number} x1, y1 - Start úsečky
 * @param {number} x2, y2 - Konec úsečky
 * @param {number} cx, cy - Střed kružnice
 * @param {number} r - Poloměr kružnice
 * @returns {Array} - Pole průsečíků [{x, y}, ...]
 */
window.lineCircleIntersection = function (x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return []; // Žádný průsečík
  }

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  const points = [];

  if (t1 >= 0 && t1 <= 1) {
    points.push({
      x: x1 + t1 * dx,
      y: y1 + t1 * dy,
      t: t1
    });
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    points.push({
      x: x1 + t2 * dx,
      y: y1 + t2 * dy,
      t: t2
    });
  }

  return points;
};

/**
 * Najde průsečíky dvou kružnic
 * @param {number} cx1, cy1 - Střed kružnice 1
 * @param {number} r1 - Poloměr kružnice 1
 * @param {number} cx2, cy2 - Střed kružnice 2
 * @param {number} r2 - Poloměr kružnice 2
 * @returns {Array} - Pole průsečíků [{x, y}, ...]
 */
window.circleCircleIntersection = function (cx1, cy1, r1, cx2, cy2, r2) {
  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Kružnice se nedotýkají
  if (dist > r1 + r2 || dist < Math.abs(r1 - r2) || dist < 1e-10) {
    return [];
  }

  // Vzdálenost od středu 1 k průsečíkové přímce
  const a = (r1 * r1 - r2 * r2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(r1 * r1 - a * a);

  // Bod na spojnici středů
  const px = cx1 + a * dx / dist;
  const py = cy1 + a * dy / dist;

  // Dva průsečíky (nebo jeden pokud se dotýkají)
  const points = [];

  points.push({
    x: px + h * dy / dist,
    y: py - h * dx / dist
  });

  if (h > 1e-10) {
    points.push({
      x: px - h * dy / dist,
      y: py + h * dx / dist
    });
  }

  return points;
};

/**
 * Aplikuje RND (zaoblení) nebo CHF (sražení) mezi dva prvky
 * @param {Object} el1 - První element (předchozí)
 * @param {Object} el2 - Druhý element (následující) s definovaným RND nebo CHF
 * @returns {Object|null} - { el1End, el2Start, blendElement } nebo null při chybě
 */
window.applyCornerBlend = function (el1, el2) {
  // Kontrola vstupů
  if (!el1 || !el2) return null;

  const rnd = el2.rnd || 0;
  const chf = el2.chf || 0;

  // Pokud není ani RND ani CHF, nic neděláme
  if (rnd <= 0 && chf <= 0) return null;

  // Získej koncový bod el1 a počáteční bod el2
  const p1End = { x: el1.endZ, y: el1.endX };
  const p2Start = { x: el2.startZ, y: el2.startX };

  // Roh musí být v podobném místě
  const cornerDist = Math.hypot(p1End.x - p2Start.x, p1End.y - p2Start.y);
  if (cornerDist > 0.001) {
    // Body se neshodují - prvky na sebe nenavazují
    return null;
  }

  // Určíme směrové vektory
  let dir1, dir2;

  if (el1.type === "line") {
    const len1 = Math.hypot(el1.endZ - el1.startZ, el1.endX - el1.startX);
    dir1 = len1 > 0 ? { x: (el1.endZ - el1.startZ) / len1, y: (el1.endX - el1.startX) / len1 } : { x: 1, y: 0 };
  } else {
    // Pro oblouk - tečný směr v koncovém bodě
    const angle1 = Math.atan2(el1.endX - el1.ccX, el1.endZ - el1.ccZ);
    dir1 = el1.direction === "cw"
      ? { x: Math.cos(angle1 + Math.PI/2), y: Math.sin(angle1 + Math.PI/2) }
      : { x: Math.cos(angle1 - Math.PI/2), y: Math.sin(angle1 - Math.PI/2) };
  }

  if (el2.type === "line") {
    const len2 = Math.hypot(el2.endZ - el2.startZ, el2.endX - el2.startX);
    dir2 = len2 > 0 ? { x: (el2.endZ - el2.startZ) / len2, y: (el2.endX - el2.startX) / len2 } : { x: 1, y: 0 };
  } else {
    // Pro oblouk - tečný směr v počátečním bodě
    const angle2 = Math.atan2(el2.startX - el2.ccX, el2.startZ - el2.ccZ);
    dir2 = el2.direction === "cw"
      ? { x: Math.cos(angle2 + Math.PI/2), y: Math.sin(angle2 + Math.PI/2) }
      : { x: Math.cos(angle2 - Math.PI/2), y: Math.sin(angle2 - Math.PI/2) };
  }

  // CHF - zkosení (chamfer)
  if (chf > 0) {
    // Posuneme koncový bod el1 zpět o CHF
    const newEl1End = {
      x: p1End.x - dir1.x * chf,
      y: p1End.y - dir1.y * chf
    };

    // Posuneme počáteční bod el2 dopředu o CHF
    const newEl2Start = {
      x: p2Start.x + dir2.x * chf,
      y: p2Start.y + dir2.y * chf
    };

    return {
      el1End: { z: newEl1End.x, x: newEl1End.y },
      el2Start: { z: newEl2Start.x, x: newEl2Start.y },
      blendElement: {
        type: "line",
        startZ: newEl1End.x,
        startX: newEl1End.y,
        endZ: newEl2Start.x,
        endX: newEl2Start.y,
        isBlend: true,
        blendType: "chf",
        blendValue: chf
      }
    };
  }

  // RND - zaoblení (rounding)
  if (rnd > 0) {
    // Najdeme střed zaoblovacího oblouku
    // Střed leží na bisektrise úhlu mezi směry, ve vzdálenosti rnd/sin(alpha/2)

    // Úhel mezi směry
    const dot = -dir1.x * dir2.x - dir1.y * dir2.y; // Záporné protože dir1 směřuje DO rohu
    const crossZ = -dir1.x * dir2.y + dir1.y * dir2.x;

    // Kontrola - směry nesmí být rovnoběžné
    if (Math.abs(crossZ) < 1e-10) return null;

    const alpha = Math.acos(Math.max(-1, Math.min(1, dot)));
    const halfAlpha = alpha / 2;

    if (Math.abs(Math.sin(halfAlpha)) < 1e-10) return null;

    const distToCenter = rnd / Math.sin(halfAlpha);
    const tangentLen = rnd / Math.tan(halfAlpha);

    // Bisektrisa (směr ke středu)
    const bisX = (-dir1.x + dir2.x);
    const bisY = (-dir1.y + dir2.y);
    const bisLen = Math.hypot(bisX, bisY);
    if (bisLen < 1e-10) return null;

    const bisNormX = bisX / bisLen;
    const bisNormY = bisY / bisLen;

    // Střed oblouku
    const ccZ = p1End.x + bisNormX * distToCenter;
    const ccX = p1End.y + bisNormY * distToCenter;

    // Nové koncové body
    const newEl1End = {
      x: p1End.x - dir1.x * tangentLen,
      y: p1End.y - dir1.y * tangentLen
    };

    const newEl2Start = {
      x: p2Start.x + dir2.x * tangentLen,
      y: p2Start.y + dir2.y * tangentLen
    };

    // Směr oblouku - určíme podle cross produktu
    const arcDir = crossZ > 0 ? "ccw" : "cw";

    return {
      el1End: { z: newEl1End.x, x: newEl1End.y },
      el2Start: { z: newEl2Start.x, x: newEl2Start.y },
      blendElement: {
        type: "arc",
        startZ: newEl1End.x,
        startX: newEl1End.y,
        endZ: newEl2Start.x,
        endX: newEl2Start.y,
        ccZ: ccZ,
        ccX: ccX,
        radius: rnd,
        direction: arcDir,
        isBlend: true,
        blendType: "rnd",
        blendValue: rnd
      }
    };
  }

  return null;
};

/**
 * Aktualizuje preview canvas
 */
window.updateFreeContourPreview = function () {
  const canvas = document.getElementById("fcPreviewCanvas");
  if (!canvas) return;

  // Nastavit touch eventy pokud ještě nejsou
  if (!canvas.fcTouchInit) {
    initFcPreviewTouch(canvas);
    canvas.fcTouchInit = true;
  }

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Vyčistit
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Mřížka
  ctx.strokeStyle = "#2a2a4a";
  ctx.lineWidth = 0.5;
  const gridSize = 20;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Osy s popisky (soustruh: Z vodorovná, X svislá)
  ctx.strokeStyle = "#4a4a6a";
  ctx.lineWidth = 1;
  // Svislá osa (X - radiální)
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  // Vodorovná osa (Z - podélná)
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Popisky os
  ctx.fillStyle = "#8888aa";
  ctx.font = "bold 12px Arial";
  // Z osa - vodorovná (vpravo)
  ctx.fillText("Z →", width - 35, height / 2 - 8);
  // X osa - svislá (nahoře)
  ctx.fillText("↑ X", width / 2 + 8, 18);

  // Šipky os
  ctx.strokeStyle = "#6666aa";
  ctx.lineWidth = 1.5;
  // Šipka Z (doprava)
  ctx.beginPath();
  ctx.moveTo(width - 15, height / 2);
  ctx.lineTo(width - 25, height / 2 - 5);
  ctx.moveTo(width - 15, height / 2);
  ctx.lineTo(width - 25, height / 2 + 5);
  ctx.stroke();
  // Šipka X (nahoru)
  ctx.beginPath();
  ctx.moveTo(width / 2, 15);
  ctx.lineTo(width / 2 - 5, 25);
  ctx.moveTo(width / 2, 15);
  ctx.lineTo(width / 2 + 5, 25);
  ctx.stroke();

  // Pokud nemáme start point nebo elementy, skončit
  if (!window.freeContourStartPoint || window.freeContourElements.length === 0) {
    // Nakreslit jen start point pokud existuje
    if (window.freeContourStartPoint) {
      const scale = window.calculateFreeContourScale(canvas);
      const sp = window.fcWorldToScreen(window.freeContourStartPoint.x, window.freeContourStartPoint.z, canvas, scale);
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Vypočítat scale
  const scale = window.calculateFreeContourScale(canvas);

  // Nakreslit start point
  const startScreen = window.fcWorldToScreen(
    window.freeContourStartPoint.x,
    window.freeContourStartPoint.z,
    canvas,
    scale
  );
  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.arc(startScreen.x, startScreen.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "10px Arial";
  ctx.fillText("START", startScreen.x + 8, startScreen.y - 8);

  // Nakreslit elementy
  window.freeContourElements.forEach((el, i) => {
    if (!el.computed || !el.computed.solved) return;

    const startX = el.computed.startX;
    const startZ = el.computed.startZ;
    const endX = el.computed.endX;
    const endZ = el.computed.endZ;

    const p1 = window.fcWorldToScreen(startX, startZ, canvas, scale);
    const p2 = window.fcWorldToScreen(endX, endZ, canvas, scale);

    if (el.type === "line") {
      // Úsečka
      ctx.strokeStyle = "#4a9eff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Šipka na konci
      window.drawFcArrow(ctx, p1.x, p1.y, p2.x, p2.y);

      // Zobrazení rozměru (délka)
      if (el.computed.length) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = "#4a9eff88";
        ctx.font = "9px Arial";
        ctx.fillText(`L=${el.computed.length.toFixed(1)}`, midX + 5, midY - 5);
      }
    } else if (el.type === "arc" || el.type === "arc-cc") {
      // Oblouk
      const centerScreen = window.fcWorldToScreen(el.computed.centerX, el.computed.centerZ, canvas, scale);
      const radiusScreen = el.computed.radius * scale.scale;

      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Pozor: canvas má obrácené Y
      const startAngle = -el.computed.startAngle;
      const endAngle = -el.computed.endAngle;
      const isCW = el.direction === "CW";

      ctx.arc(centerScreen.x, centerScreen.y, radiusScreen, startAngle, endAngle, !isCW);
      ctx.stroke();

      // Střed oblouku
      ctx.fillStyle = "#f9731666";
      ctx.beginPath();
      ctx.arc(centerScreen.x, centerScreen.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Zobrazení poloměru
      ctx.fillStyle = "#f9731688";
      ctx.font = "9px Arial";
      ctx.fillText(`R=${el.computed.radius.toFixed(1)}`, centerScreen.x + 5, centerScreen.y - 5);
    }

    // Koncový bod
    ctx.fillStyle = el.solved ? "#4ade80" : "#f97316";
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Číslo elementu
    ctx.fillStyle = "#888";
    ctx.font = "10px Arial";
    ctx.fillText(`${i + 1}`, p2.x + 6, p2.y - 6);
  });
};

/**
 * Vypočítá scale pro preview
 * Vždy zahrnuje počátek (0,0) aby střed kříže byl na nule
 * Aplikuje zoom a pan z globálních proměnných
 */
window.calculateFreeContourScale = function (canvas) {
  const padding = 40;
  const availableWidth = canvas.width - 2 * padding;
  const availableHeight = canvas.height - 2 * padding;

  // Validace start pointu
  if (!window.freeContourStartPoint) {
    return { scale: 1, offsetX: canvas.width / 2, offsetZ: canvas.height / 2 };
  }

  // Najít bounding box - vždy zahrnout nulu!
  let minX = Math.min(0, window.freeContourStartPoint.x || 0);
  let maxX = Math.max(0, window.freeContourStartPoint.x || 0);
  let minZ = Math.min(0, window.freeContourStartPoint.z || 0);
  let maxZ = Math.max(0, window.freeContourStartPoint.z || 0);

  window.freeContourElements.forEach(el => {
    if (el.computed && el.computed.solved) {
      minX = Math.min(minX, el.computed.startX, el.computed.endX);
      maxX = Math.max(maxX, el.computed.startX, el.computed.endX);
      minZ = Math.min(minZ, el.computed.startZ, el.computed.endZ);
      maxZ = Math.max(maxZ, el.computed.startZ, el.computed.endZ);

      if (el.type === "arc" && el.computed.centerX !== undefined) {
        const r = el.computed.radius;
        minX = Math.min(minX, el.computed.centerX - r);
        maxX = Math.max(maxX, el.computed.centerX + r);
        minZ = Math.min(minZ, el.computed.centerZ - r);
        maxZ = Math.max(maxZ, el.computed.centerZ + r);
      }
    }
  });

  // Symetrický rozsah kolem nuly pro lepší zobrazení
  const absMaxX = Math.max(Math.abs(minX), Math.abs(maxX));
  const absMaxZ = Math.max(Math.abs(minZ), Math.abs(maxZ));

  // Použít symetrický rozsah nebo skutečný, podle toho co je větší
  const rangeX = Math.max(maxX - minX, absMaxX * 2) || 100;
  const rangeZ = Math.max(maxZ - minZ, absMaxZ * 2) || 100;

  const scaleX = availableWidth / rangeX;
  const scaleZ = availableHeight / rangeZ;
  const scale = Math.min(scaleX, scaleZ, 5); // Max zoom

  // Aplikovat zoom
  const finalScale = scale * (window.fcPreviewZoom || 1);

  // Offset tak aby nula byla uprostřed canvasu + pan offset
  return {
    scale: finalScale,
    offsetX: canvas.width / 2 + (window.fcPreviewPan?.x || 0),  // Nula je uprostřed X + pan
    offsetZ: canvas.height / 2 + (window.fcPreviewPan?.y || 0)  // Nula je uprostřed Y + pan
  };
};

/**
 * Převod world -> screen pro preview
 * Pro soustruh: Z je vodorovná osa (roste doprava), X je svislá (roste nahoru)
 * World: x = Z (podélná), z = X (radiální)
 */
window.fcWorldToScreen = function (worldX, worldZ, canvas, scaleInfo) {
  // worldX = Z souřadnice (vodorovná na obrazovce, roste doprava)
  // worldZ = X souřadnice (svislá na obrazovce, roste nahoru)
  return {
    x: worldX * scaleInfo.scale + scaleInfo.offsetX,  // Z -> screen X
    y: scaleInfo.offsetZ - worldZ * scaleInfo.scale   // X -> screen Y (invertované)
  };
};

/**
 * Nakreslí šipku
 */
window.drawFcArrow = function (ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;

  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

// ===== EXPORT DO SHAPES (starší verze - zachováno pro kompatibilitu) =====
// Hlavní implementace je v applyFreeContour výše

/**
 * Generuje G-kód z Free Contour
 */
window.exportFreeContourGCode = function () {
  const elements = window.freeContourElements;
  const allSolved = elements.every(el => el.solved);

  if (!allSolved || elements.length === 0) {
    alert("Nelze exportovat - kontura není kompletní.");
    return;
  }

  let gcode = "";
  const sp = window.freeContourStartPoint;

  // Start point
  const startX = sp.z * (window.xMeasureMode === "diameter" ? 2 : 1);
  const startZ = sp.x;
  gcode += `G0 X${startX.toFixed(3)} Z${startZ.toFixed(3)}\n`;

  // Elementy
  elements.forEach(el => {
    if (!el.computed || !el.computed.solved) return;

    const endX = el.computed.endZ * (window.xMeasureMode === "diameter" ? 2 : 1);
    const endZ = el.computed.endX;

    if (el.type === "line") {
      gcode += `G1 X${endX.toFixed(3)} Z${endZ.toFixed(3)}\n`;
    } else if (el.type === "arc") {
      const gCode = el.direction === "CW" ? "G2" : "G3";
      const r = el.computed.radius;
      gcode += `${gCode} X${endX.toFixed(3)} Z${endZ.toFixed(3)} R${r.toFixed(3)}\n`;
    }
  });

  // Zobrazit v alert nebo zkopírovat
  const textarea = document.createElement("textarea");
  textarea.value = gcode;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);

  alert("G-kód zkopírován do schránky:\n\n" + gcode);
};

// ===== QUICK ADD PRESETS =====

/**
 * Přidá horizontální úsečku
 */
window.fcAddHorizontalLine = function () {
  const el = {
    type: "line",
    mode: "G90",
    x: null,
    z: null,
    angle: 0,
    length: null,
    radius: null,
    direction: null,
    connection: "none",
    rnd: null,
    chf: null,
    unknowns: [],
    solved: false,
    computed: null
  };
  window.freeContourElements.push(el);
  window.updateFreeContourList();
  window.solveFreeContour();
};

/**
 * Přidá vertikální úsečku
 */
window.fcAddVerticalLine = function () {
  const el = {
    type: "line",
    mode: "G90",
    x: null,
    z: null,
    angle: 90,
    length: null,
    radius: null,
    direction: null,
    connection: "none",
    rnd: null,
    chf: null,
    unknowns: [],
    solved: false,
    computed: null
  };
  window.freeContourElements.push(el);
  window.updateFreeContourList();
  window.solveFreeContour();
};

/**
 * Přidá tangenciální oblouk
 */
window.fcAddTangentArc = function (direction = "CW") {
  const el = {
    type: "arc",
    mode: "G90",
    x: null,
    z: null,
    angle: null,
    length: null,
    radius: null,
    direction: direction,
    connection: "tangent",
    rnd: null,
    chf: null,
    unknowns: [],
    solved: false,
    computed: null
  };
  window.freeContourElements.push(el);
  window.updateFreeContourList();
  window.solveFreeContour();
};

// ===== TOUCH EVENTS PRO PREVIEW =====

/**
 * Inicializuje touch eventy pro FC preview canvas
 */
function initFcPreviewTouch(canvas) {
  let touchStart = null;
  let lastTouchDistance = 0;
  let isPanning = false;

  canvas.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) {
      // Single touch - pan
      isPanning = true;
      touchStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: window.fcPreviewPan.x,
        panY: window.fcPreviewPan.y
      };
    } else if (e.touches.length === 2) {
      // Pinch - zoom
      isPanning = false;
      lastTouchDistance = getTouchDistance(e.touches);
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1 && isPanning && touchStart) {
      // Pan
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      window.fcPreviewPan.x = touchStart.panX + dx;
      window.fcPreviewPan.y = touchStart.panY + dy;
      window.updateFreeContourPreview();
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        window.fcPreviewZoom = Math.max(0.2, Math.min(5, window.fcPreviewZoom * scale));
        window.updateFreeContourPreview();
      }
      lastTouchDistance = distance;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", function (e) {
    if (e.touches.length === 0) {
      isPanning = false;
      touchStart = null;
      lastTouchDistance = 0;
    } else if (e.touches.length === 1) {
      // Pokračovat v pan
      isPanning = true;
      touchStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: window.fcPreviewPan.x,
        panY: window.fcPreviewPan.y
      };
    }
  }, { passive: false });

  // Double tap to reset
  let lastTap = 0;
  canvas.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTap < 300 && e.touches.length === 0) {
      window.fcResetView();
    }
    lastTap = now;
  }, { passive: true });

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

console.log("✅ Free Contour module loaded");
