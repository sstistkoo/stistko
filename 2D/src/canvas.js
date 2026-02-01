/**
 * CANVAS.JS - Canvas event handlers a kreslicí logika (ES6 hybridní)
 * - Mouse events (draw, pan, select)
 * - Touch events
 * - Keyboard shortcuts
 * - Drawing operations
 * - Error boundaries for all event handlers
 * @module canvas
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const CANVAS = {}; // Bude aktivováno po plné migraci

// ===== CANVAS SETUP =====

window.logDebug && window.logDebug("✅ src/canvas.js loaded");

/**
 * Wrapper for safe event handling
 */
function safeEventHandler(handler) {
  return function(e) {
    try {
      handler.call(this, e);
    } catch (error) {
      console.error('🔴 Canvas Event Error:', error);
      if (window.showErrorNotification) {
        window.showErrorNotification('Chyba při zpracování události');
      }
    }
  };
}

function setupCanvasEvents() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  // Mouse events - wrapped with error handling
  canvas.addEventListener("mousedown", safeEventHandler(onCanvasMouseDown));
  canvas.addEventListener("mousemove", safeEventHandler(onCanvasMouseMove));
  canvas.addEventListener("mouseup", safeEventHandler(onCanvasMouseUp));
  canvas.addEventListener("wheel", safeEventHandler(onCanvasWheel), { passive: false });

  // Touch events - wrapped with error handling
  canvas.addEventListener("touchstart", safeEventHandler(onCanvasTouchStart), { passive: false });
  canvas.addEventListener("touchmove", safeEventHandler(onCanvasTouchMove), { passive: false });
  canvas.addEventListener("touchend", safeEventHandler(onCanvasTouchEnd), { passive: false });
  canvas.addEventListener("touchcancel", safeEventHandler(onCanvasTouchCancel), { passive: false });

  // Context menu
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ✅ Keyboard nyní spravuje unified keyboard.js
  // document.addEventListener("keydown", onKeyDown); - REMOVED
  // document.addEventListener("keyup", onKeyUp); - REMOVED
}

// ===== MOUSE HANDLERS =====

function onCanvasMouseDown(e) {
  // === PICK POINT MODE ===
  // Speciální režim pro výběr EXISTUJÍCÍHO bodu z mapy (pro controller)
  // NEVYTVÁŘÍ nové body - pouze vybírá existující snap pointy
  if (window.pickPointMode && window.pickPointCallback) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();

    // Podpora pro touch i mouse
    let screenX, screenY;
    if (e.touches && e.touches.length > 0) {
      screenX = e.touches[0].clientX - rect.left;
      screenY = e.touches[0].clientY - rect.top;
      console.log('[PICK POINT] TOUCH event');
    } else {
      screenX = e.clientX - rect.left;
      screenY = e.clientY - rect.top;
      console.log('[PICK POINT] MOUSE event');
    }

    console.log('[PICK POINT] Click at screen:', screenX, screenY);
    console.log('[PICK POINT] Available snap points:', window.cachedSnapPoints?.length || 0);
    console.log('[PICK POINT] Snap points:', window.cachedSnapPoints);

    // Najít nejbližší snap point (zvětšený dosah na 50px)
    const nearestPoint = window.findNearestSnapPoint(screenX, screenY, 50);

    console.log('[PICK POINT] Nearest point found:', nearestPoint);

    if (nearestPoint) {
      // Vybraný existující bod
      console.log('[PICK POINT] ✅ Point selected:', nearestPoint.x, nearestPoint.y);
      window.pickPointCallback(nearestPoint);
    } else {
      // Žádný bod v dosahu - zobrazit zprávu, NEVYTVÁŘET nový bod
      console.log('[PICK POINT] ❌ No point in range');
      if (typeof window.showToast === "function") {
        window.showToast("⚠️ Žádný bod v dosahu (50px). Klikni blíže k bodu.", 2500);
      }
      // Nepokračovat - neukončit pick mode
    }
    return;
  }

  if (!window.snapPoint) {
    console.error("[onCanvasMouseDown] ❌ snapPoint chybí!", { snapPoint: !!window.snapPoint });
    return;
  }

  // Pokud mode není nastaven, nastav "pan"
  if (!window.mode) {
    window.mode = "pan";
  }

  window.logDebug && window.logDebug("[onCanvasMouseDown] mode =", window.mode, "colorPickerMode =", window.colorPickerMode);

  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  const worldPt = window.screenToWorld(screenX, screenY);
  const snapped = window.snapPoint(worldPt.x, worldPt.y);

  if (e.button === 2) {
    // Pravé tlačítko = zrušit
    window.clearMode();
    return;
  }

  if (e.button === 1) {
    // Prostřední tlačítko = pan
    window.panStart = { x: screenX, y: screenY };
    window.panning = true;
    return;
  }

  switch (window.mode) {
    case "pan":
      window.panStart = { x: screenX, y: screenY };
      // Nezahajovat panning hned - zahájíme až po pohybu myši (prevent accidental clicks)
      window.panning = false;
      break;

    case "point":
      handlePointMode(snapped.x, snapped.y);
      break;

    case "line":
      handleLineMode(snapped.x, snapped.y);
      break;

    case "circle":
      handleCircleMode(snapped.x, snapped.y);
      break;

    case "rectangle":
      handleRectangleMode(snapped.x, snapped.y);
      break;

    case "circumcircle":
      handleCircumcircleMode(snapped.x, snapped.y);
      break;

    case "select":
      handleSelectMode(snapped.x, snapped.y, e.shiftKey);
      break;

    case "tangent":
      handleTangentMode(snapped.x, snapped.y);
      break;

    case "perpendicular":
      handlePerpendicularMode(snapped.x, snapped.y);
      break;

    case "parallel":
      handleParallelMode(snapped.x, snapped.y);
      break;

    case "trim":
      handleTrimMode(snapped.x, snapped.y);
      break;

    case "extend":
      handleExtendMode(snapped.x, snapped.y);
      break;

    case "offset":
      handleOffsetMode(snapped.x, snapped.y);
      break;

    case "mirror":
      handleMirrorMode(snapped.x, snapped.y);
      break;

    case "erase":
      handleEraseMode(snapped.x, snapped.y);
      break;

    case "measure":
      handleMeasureMode(snapped.x, snapped.y);
      break;

    case "arc":
      handleArcMode(snapped.x, snapped.y);
      break;

    case "dimension":
      handleDimensionMode(snapped.x, snapped.y);
      break;

    case "colorPicker":
      handleColorPickerMode(snapped.x, snapped.y);
      break;
  }

  if (window.draw) window.draw();
}

function onCanvasMouseMove(e) {
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  // === PICK POINT MODE - Vizuální highlighting snap pointů ===
  if (window.pickPointMode) {
    const nearestPoint = window.findNearestSnapPoint(screenX, screenY, 40);

    // Uložíme pro vykreslení v draw()
    window.highlightedSnapPoint = nearestPoint;

    // Překreslit pro aktualizaci highlightu
    if (window.draw) window.draw();
    return; // V pick point mode neprovádět ostatní operace
  }

  // Pokud máme připravený panStart ale panning ještě nebyl aktivován, aktivujeme
  if (window.panStart && !window.panning) {
    const dxTest = Math.abs(screenX - window.panStart.x);
    const dyTest = Math.abs(screenY - window.panStart.y);
    const threshold = 4; // px
    if (dxTest > threshold || dyTest > threshold) {
      window.panning = true;
    }
  }

  if (window.panning) {
    if (window.panStart) {
      const dx = screenX - window.panStart.x;
      const dy = screenY - window.panStart.y;
      if (window.panX !== undefined) window.panX += dx;
      if (window.panY !== undefined) window.panY += dy;
      window.panStart = { x: screenX, y: screenY };
      if (window.draw) window.draw();
    }
    return;
  }

  window.cursorPos = { x: screenX, y: screenY };

  const worldPt = window.screenToWorld ? window.screenToWorld(screenX, screenY) : { x: 0, y: 0 };
  const snapped = window.snapPoint ? window.snapPoint(worldPt.x, worldPt.y) : worldPt;

  // Update touch cursor
  const touchCursor = document.getElementById("touchCursor");
  if (touchCursor) {
    touchCursor.style.left = screenX + "px";
    touchCursor.style.top = screenY + "px";
  }

  if (window.mode === "line" && window.startPt) {
    let endX = snapped.x;
    let endY = snapped.y;
    let lineColor = window.defaultDrawColor || "#4a9eff";

    // Polární přichycení pokud je zapnuto (checkbox NEBO fixní úhel)
    const polarCheckbox = document.getElementById("polarSnapCheckboxLegacy");
    const isPolarActive = (polarCheckbox && polarCheckbox.checked) || (window.polarLineAngleFixed !== null && window.polarLineAngleFixed !== undefined);
    if (isPolarActive && window.updateSnap) {
      const snapResult = window.updateSnap(window.startPt, { x: endX, y: endY });
      if (snapResult.snapped) {
        // Přichyceno - upravit koncový bod podle přichyceného úhlu
        const length = Math.hypot(endX - window.startPt.x, endY - window.startPt.y);
        const angleRad = (snapResult.angle * Math.PI) / 180;
        endX = window.startPt.x + length * Math.cos(angleRad);
        endY = window.startPt.y + length * Math.sin(angleRad);
        lineColor = snapResult.color; // Žlutá barva
      }
    }

    window.tempShape = {
      type: "line",
      x1: window.startPt.x,
      y1: window.startPt.y,
      x2: endX,
      y2: endY,
      color: lineColor,
    };
    if (window.draw) window.draw();
  } else if (window.mode === "circle" && window.startPt) {
    const r = Math.sqrt(
      (snapped.x - window.startPt.x) ** 2 + (snapped.y - window.startPt.y) ** 2
    );
    window.tempShape = {
      type: "circle",
      cx: window.startPt.x,
      cy: window.startPt.y,
      r: r,
    };
    if (window.draw) window.draw();
  } else if (window.mode === "rectangle" && window.startPt) {
    window.tempShape = {
      type: "rectangle",
      x1: window.startPt.x,
      y1: window.startPt.y,
      x2: snapped.x,
      y2: snapped.y,
    };
    if (window.draw) window.draw();
  } else if (window.mode === "circumcircle" && window.circumcirclePoints && window.circumcirclePoints.length > 0) {
    // Zobrazení dočasné linky a bodů pro circumcircle
    if (!window.tempCircumcirclePoints) {
      window.tempCircumcirclePoints = [];
    }
    window.tempCircumcirclePoints = [...window.circumcirclePoints];
    if (window.draw) window.draw();
  }
}

function onCanvasMouseUp(e) {
  // Dokončení obdélníku (tažení)
  if (window.mode === "rectangle" && window.drawing && window.startPt) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldPt = window.screenToWorld ? window.screenToWorld(screenX, screenY) : { x: 0, y: 0 };
    const snapped = window.snapPoint ? window.snapPoint(worldPt.x, worldPt.y) : worldPt;

    if (!window.shapes) return;

    // Vytvoř obdélník pouze pokud má nenulovou velikost
    if (snapped.x !== window.startPt.x && snapped.y !== window.startPt.y) {
      let x2 = snapped.x;
      let y2 = snapped.y;

      // Pokud je "Míra" zapnuta, zeptej se na rozměry
      if (window.measureInputEnabled) {
        const measureData = window.showMeasureInputDialog("rectangle");
        if (measureData !== null) {
          const processedData = window.processMeasureInput(measureData);
          if (processedData && processedData.width && processedData.height) {
            // Nastav x2 a y2 podle zadaných rozměrů
            x2 = window.startPt.x + processedData.width;
            y2 = window.startPt.y + processedData.height;
          }
        }
      }

      window.shapes.push({
        type: "rectangle",
        x1: window.startPt.x,
        y1: window.startPt.y,
        x2: x2,
        y2: y2,
        color: window.defaultDrawColor || "#4a9eff",
        lineStyle: window.defaultDrawLineStyle || "solid",
      });
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
    }

    window.startPt = null;
    window.tempShape = null;
    window.drawing = false;
    if (window.draw) window.draw();
    return;
  }

  // Pokud jsme v režimu `pan` a uživatel pouze klikl (není aktivní panning),
  // považuj to za výběr (krátký klik) — umožní to označit body i když je aktivní režim pan.
  try {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPt = window.screenToWorld ? window.screenToWorld(screenX, screenY) : { x: 0, y: 0 };
    const snapped = window.snapPoint ? window.snapPoint(worldPt.x, worldPt.y) : worldPt;

    if (window.mode === "pan" && window.panStart && !window.panning && e.button === 0) {
      // Krátký klik - pokud klikáme přímo na snap-point (bod / průsečík), vyber ho
      try {
        if (window.cachedSnapPoints && window.cachedSnapPoints.length > 0) {
          const tolerance = 5 / (window.zoom || 2);
          let best = null;
          let bestDist = Infinity;
          for (let p of window.cachedSnapPoints) {
            const dx = p.x - snapped.x;
            const dy = p.y - snapped.y;
            const d = Math.hypot(dx, dy);
            if (d < tolerance && d < bestDist) {
              bestDist = d;
              best = p;
            }
          }

          if (best && (best.type === "point" || best.type === "endpoint" || best.type === "intersection")) {
            if (typeof handleSelectMode === "function") {
              handleSelectMode(best.x, best.y, e.shiftKey);
            }
          }
        }
      } catch (err) {
        console.warn("pan-click selection failed", err);
      }
    }
  } catch (err) {
    console.warn("onCanvasMouseUp selection in pan failed", err);
  }

  window.panning = false;
  window.panStart = null;
}

function onCanvasWheel(e) {
  e.preventDefault();

  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  // Získat světové souřadnice PŘED změnou zoom
  const worldPoint = window.screenToWorld ? window.screenToWorld(screenX, screenY) : { x: 0, y: 0 };

  // Změnit zoom
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  if (window.zoom !== undefined) {
    window.zoom *= zoomFactor;
    window.zoom = Math.max(0.1, Math.min(window.zoom, 100));
  }

  // Vypočítat kde by měl být screen bod, aby zůstal na stejném světovém bodě
  // screenX = worldPoint.x * newZoom + newPanX
  // worldPoint.y = (newPanY - screenY) / newZoom
  // Z toho plyne:
  // newPanX = screenX - worldPoint.x * newZoom
  // newPanY = worldPoint.y * newZoom + screenY

  if (window.panX !== undefined) {
    window.panX = screenX - worldPoint.x * window.zoom;
  }
  if (window.panY !== undefined) {
    window.panY = worldPoint.y * window.zoom + screenY;
  }

  if (window.draw) window.draw();
}

// ===== TOUCH HANDLERS =====

let touchStart = null;
let touchIsPanning = false;
let touchActionStarted = false; // Zaznamenává, zda jsme už provedli akci (např. bod, čára)
let lastTouchDrawTime = 0; // Pro throttling překreslení
const TOUCH_DRAW_THROTTLE = 16; // ~60fps

// ===== PRECISION CURSOR MODE =====
let precisionModeActive = false;
let precisionModeTimer = null;
const PRECISION_MODE_DELAY = 400; // ms - doba podržení pro aktivaci
const PRECISION_CURSOR_OFFSET_Y = -80; // px - offset nahoru od prstu (záporné = nahoru)
const PRECISION_CURSOR_OFFSET_X = 0; // px - offset do strany

/**
 * Aktivuje precision mode - zobrazí kurzor s offsetem
 */
function activatePrecisionMode(touch, canvas) {
  precisionModeActive = true;

  const touchCursor = document.getElementById("touchCursor");
  const precisionLine = document.getElementById("precisionLine");
  const precisionFinger = document.getElementById("precisionFinger");
  const rect = canvas.getBoundingClientRect();

  // Pozice prstu relativně k canvasu
  const fingerX = touch.clientX - rect.left;
  const fingerY = touch.clientY - rect.top;

  // Pozice kurzoru (s offsetem)
  const cursorX = fingerX + PRECISION_CURSOR_OFFSET_X;
  const cursorY = fingerY + PRECISION_CURSOR_OFFSET_Y;

  if (touchCursor) {
    touchCursor.classList.add("active");
    touchCursor.classList.add("precision-mode");
    touchCursor.style.left = cursorX + "px";
    touchCursor.style.top = cursorY + "px";
  }

  // Indikátor pozice prstu
  if (precisionFinger) {
    precisionFinger.classList.add("active");
    precisionFinger.style.left = fingerX + "px";
    precisionFinger.style.top = fingerY + "px";
  }

  // Spojovací čára od prstu ke kurzoru
  if (precisionLine) {
    const lineLength = Math.abs(PRECISION_CURSOR_OFFSET_Y);
    precisionLine.classList.add("active");
    precisionLine.style.height = lineLength + "px";
    precisionLine.style.left = fingerX + "px";
    precisionLine.style.top = (fingerY + PRECISION_CURSOR_OFFSET_Y) + "px";
  }

  // Vibrační feedback pokud je dostupný
  if (navigator.vibrate) {
    navigator.vibrate(30);
  }

  console.log('[Touch] Precision mode aktivován');
}

/**
 * Deaktivuje precision mode
 */
function deactivatePrecisionMode() {
  precisionModeActive = false;

  if (precisionModeTimer) {
    clearTimeout(precisionModeTimer);
    precisionModeTimer = null;
  }

  const touchCursor = document.getElementById("touchCursor");
  const precisionLine = document.getElementById("precisionLine");
  const precisionFinger = document.getElementById("precisionFinger");

  if (touchCursor) {
    touchCursor.classList.remove("active");
    touchCursor.classList.remove("precision-mode");
  }

  if (precisionLine) {
    precisionLine.classList.remove("active");
  }

  if (precisionFinger) {
    precisionFinger.classList.remove("active");
  }
}

/**
 * Získá souřadnice pro precision mode (s offsetem)
 */
function getPrecisionCoords(touch, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Pozice kurzoru (s offsetem)
  const cursorX = touch.clientX - rect.left + PRECISION_CURSOR_OFFSET_X;
  const cursorY = touch.clientY - rect.top + PRECISION_CURSOR_OFFSET_Y;

  // Přepočet na canvas souřadnice
  const screenX = cursorX * scaleX;
  const screenY = cursorY * scaleY;

  return { screenX, screenY, scaleX, scaleY, cursorX, cursorY };
}

/**
 * Aktualizuje pozici precision kurzoru a spojovací čáry
 */
function updatePrecisionCursor(touch, canvas) {
  if (!precisionModeActive) return;

  const touchCursor = document.getElementById("touchCursor");
  const precisionLine = document.getElementById("precisionLine");
  const precisionFinger = document.getElementById("precisionFinger");
  const rect = canvas.getBoundingClientRect();

  // Pozice prstu relativně k canvasu
  const fingerX = touch.clientX - rect.left;
  const fingerY = touch.clientY - rect.top;

  // Pozice kurzoru (s offsetem)
  const cursorX = fingerX + PRECISION_CURSOR_OFFSET_X;
  const cursorY = fingerY + PRECISION_CURSOR_OFFSET_Y;

  if (touchCursor) {
    touchCursor.style.left = cursorX + "px";
    touchCursor.style.top = cursorY + "px";
  }

  // Aktualizace indikátoru prstu
  if (precisionFinger) {
    precisionFinger.style.left = fingerX + "px";
    precisionFinger.style.top = fingerY + "px";
  }

  // Aktualizace spojovací čáry
  if (precisionLine) {
    const lineLength = Math.abs(PRECISION_CURSOR_OFFSET_Y);
    precisionLine.style.height = lineLength + "px";
    precisionLine.style.left = fingerX + "px";
    precisionLine.style.top = (fingerY + PRECISION_CURSOR_OFFSET_Y) + "px";
  }
}

/**
 * Získá správné souřadnice z touch eventu s korekcí pro canvas scale
 */
function getTouchCanvasCoords(touch, canvas) {
  const rect = canvas.getBoundingClientRect();

  // Korekce pro škálování canvasu (CSS vs skutečná velikost)
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Pozice dotyku relativně k canvasu
  const screenX = (touch.clientX - rect.left) * scaleX;
  const screenY = (touch.clientY - rect.top) * scaleY;

  return { screenX, screenY, scaleX, scaleY };
}

function onCanvasTouchStart(e) {
  e.preventDefault();
  e.stopPropagation();

  // Vždy použijeme canvas element přímo, ne e.target
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  // === PICK POINT MODE - Touch podpora ===
  if (window.pickPointMode && window.pickPointCallback && e.touches.length === 1) {
    console.log('[PICK POINT] Touch start - calling onCanvasMouseDown');
    // Volat mouseDown handler s touch eventem
    onCanvasMouseDown(e);
    return;
  }

  // Zrušit předchozí precision mode timer
  if (precisionModeTimer) {
    clearTimeout(precisionModeTimer);
    precisionModeTimer = null;
  }

  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const { screenX, screenY } = getTouchCanvasCoords(touch, canvas);

    touchStart = { x: screenX, y: screenY, time: Date.now(), touch: touch };
    touchIsPanning = false;
    touchActionStarted = false;

    // Spustit timer pro precision mode (pokud nejsme v pan módu)
    if (window.mode !== "pan") {
      precisionModeTimer = setTimeout(() => {
        if (touchStart && !touchIsPanning && !touchActionStarted) {
          activatePrecisionMode(touch, canvas);
        }
      }, PRECISION_MODE_DELAY);
    }

    // V pan módu neprovádíme žádnou akci hned - počkáme na touchEnd nebo touchMove
    if (window.mode === "pan") {
      return;
    }

    // DŮLEŽITÉ: V precision mode neprovádíme akci hned - čekáme na touchEnd
    // Pokud precision mode není aktivní a není to první dotyk pro čáru/kružnici, provedeme akci
    // Ale pro line/circle v precision mode chceme počkat

    const worldPt = window.screenToWorld ? window.screenToWorld(screenX, screenY) : { x: 0, y: 0 };
    const snapped = window.snapPoint ? window.snapPoint(worldPt.x, worldPt.y) : worldPt;

    // Pro kreslicí módy provedeme akci (ale ne pro line/circle/select pokud čekáme na precision)
    if (window.mode === "point") {
      // Pro bod - počkáme na touchEnd kvůli precision mode
      // handlePointMode(snapped.x, snapped.y);
      // touchActionStarted = true;
    } else if (window.mode === "line") {
      // Pro čáru - pokud není startPt, nastavíme ho při touchEnd
      // handleLineMode(snapped.x, snapped.y);
      // touchActionStarted = true;
    } else if (window.mode === "circle") {
      // Pro kružnici - pokud není startPt, nastavíme ho při touchEnd
      // handleCircleMode(snapped.x, snapped.y);
      // touchActionStarted = true;
    } else if (window.mode === "select") {
      // Pro výběr - počkáme na touchEnd kvůli precision mode (křížek s offsetem)
      // handleSelectMode(snapped.x, snapped.y, false);
      // touchActionStarted = true;
    }

    if (window.draw) window.draw();
  } else if (e.touches.length === 2) {
    // Pinch zoom - uložíme počáteční vzdálenost a střed
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    // Střed mezi dvěma prsty (v souřadnicích obrazovky) - s korekcí pro scale
    const { screenX: centerX, screenY: centerY, scaleX, scaleY } = getTouchCanvasCoords(
      { clientX: (t1.clientX + t2.clientX) / 2, clientY: (t1.clientY + t2.clientY) / 2 },
      canvas
    );

    // Světové souřadnice středu pro správný zoom
    const worldCenter = window.screenToWorld ? window.screenToWorld(centerX, centerY) : { x: 0, y: 0 };

    window.pinchStart = {
      dist: dist,
      zoom: window.zoom,
      centerX: centerX,
      centerY: centerY,
      worldCenter: worldCenter,
      panX: window.panX,
      panY: window.panY,
      scaleX: scaleX,
      scaleY: scaleY
    };

    // Zrušíme single-touch panning
    touchStart = null;
    touchIsPanning = false;
  }
}

function onCanvasTouchMove(e) {
  e.preventDefault();
  e.stopPropagation();

  // Vždy použijeme canvas element přímo
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  if (e.touches.length === 1 && touchStart) {
    const touch = e.touches[0];

    // Pokud je precision mode aktivní, použijeme offsetované souřadnice
    let screenX, screenY, scaleX, scaleY;

    if (precisionModeActive) {
      const coords = getPrecisionCoords(touch, canvas);
      screenX = coords.screenX;
      screenY = coords.screenY;
      scaleX = coords.scaleX;
      scaleY = coords.scaleY;

      // Aktualizovat pozici kurzoru
      updatePrecisionCursor(touch, canvas);

      // Zrušit precision timer - už jsme v precision mode
      if (precisionModeTimer) {
        clearTimeout(precisionModeTimer);
        precisionModeTimer = null;
      }
    } else {
      const coords = getTouchCanvasCoords(touch, canvas);
      screenX = coords.screenX;
      screenY = coords.screenY;
      scaleX = coords.scaleX;
      scaleY = coords.scaleY;
    }

    // Delta je v CSS pixelech, ne v canvas pixelech - pro panning
    const rect = canvas.getBoundingClientRect();
    const cssX = touch.clientX - rect.left;
    const cssY = touch.clientY - rect.top;

    // Pro panning použijeme CSS souřadnice (neškálované)
    const touchStartCSS = {
      x: touchStart.x / scaleX,
      y: touchStart.y / scaleY
    };

    const dx = (cssX - touchStartCSS.x) * scaleX;
    const dy = (cssY - touchStartCSS.y) * scaleY;
    const moveDistance = Math.hypot(dx, dy);

    // Pokud je pohyb větší než práh, začneme pannovat (ale ne v precision mode!)
    const panThreshold = 10 * scaleX; // Práh s korekcí pro scale
    if (!touchIsPanning && !precisionModeActive && moveDistance > panThreshold) {
      touchIsPanning = true;
      // Zrušit precision timer pokud se začne pohyb
      if (precisionModeTimer) {
        clearTimeout(precisionModeTimer);
        precisionModeTimer = null;
      }
    }

    // Panning - v pan módu VŽDY, v ostatních módech jen pokud nekresíme a není precision mode
    if (touchIsPanning && !precisionModeActive && (window.mode === "pan" || (!window.startPt && !touchActionStarted))) {
      if (window.panX !== undefined) window.panX += dx;
      if (window.panY !== undefined) window.panY += dy;
      touchStart.x = screenX;
      touchStart.y = screenY;

      // Throttle překreslení pro plynulejší panning
      const now = Date.now();
      if (now - lastTouchDrawTime > TOUCH_DRAW_THROTTLE) {
        lastTouchDrawTime = now;
        if (window.draw) window.draw();
      }
      return;
    }

    // Kreslení - tempShape pro line/circle
    const worldPt = window.screenToWorld ? window.screenToWorld(screenX, screenY) : { x: 0, y: 0 };
    const snapped = window.snapPoint ? window.snapPoint(worldPt.x, worldPt.y) : worldPt;

    if (window.mode === "line" && window.startPt) {
      window.tempShape = {
        type: "line",
        x1: window.startPt.x,
        y1: window.startPt.y,
        x2: snapped.x,
        y2: snapped.y,
        color: window.defaultDrawColor || "#4a9eff",
      };

      // Throttle překreslení
      const now = Date.now();
      if (now - lastTouchDrawTime > TOUCH_DRAW_THROTTLE) {
        lastTouchDrawTime = now;
        if (window.draw) window.draw();
      }
    } else if (window.mode === "circle" && window.startPt) {
      const r = Math.sqrt(
        (snapped.x - window.startPt.x) ** 2 + (snapped.y - window.startPt.y) ** 2
      );
      window.tempShape = {
        type: "circle",
        cx: window.startPt.x,
        cy: window.startPt.y,
        r: r,
      };

      // Throttle překreslení
      const now = Date.now();
      if (now - lastTouchDrawTime > TOUCH_DRAW_THROTTLE) {
        lastTouchDrawTime = now;
        if (window.draw) window.draw();
      }
    }
  } else if (e.touches.length === 2 && window.pinchStart) {
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    // Nový střed mezi prsty - s korekcí pro scale
    const { screenX: newCenterX, screenY: newCenterY } = getTouchCanvasCoords(
      { clientX: (t1.clientX + t2.clientX) / 2, clientY: (t1.clientY + t2.clientY) / 2 },
      canvas
    );

    // Vypočítáme nový zoom
    const ratio = dist / window.pinchStart.dist;
    const newZoom = Math.max(0.1, Math.min(window.pinchStart.zoom * ratio, 100));

    if (window.zoom !== undefined) {
      // Zoom ke středu pinch gesta (jako u wheel zoom)
      // worldCenter zůstává na místě, přepočítáme panX a panY
      const worldCenter = window.pinchStart.worldCenter;

      window.zoom = newZoom;

      // Přepočet pan tak, aby worldCenter zůstal na novém středu pinche
      if (window.panX !== undefined) {
        window.panX = newCenterX - worldCenter.x * newZoom;
      }
      if (window.panY !== undefined) {
        window.panY = worldCenter.y * newZoom + newCenterY;
      }
    }

    // Throttle překreslení pro plynulejší zoom
    const now = Date.now();
    if (now - lastTouchDrawTime > TOUCH_DRAW_THROTTLE) {
      lastTouchDrawTime = now;
      if (window.draw) window.draw();
    }
  }
}

function onCanvasTouchEnd(e) {
  e.preventDefault();
  e.stopPropagation();

  const canvas = document.getElementById("canvas");

  // Zrušit precision timer
  if (precisionModeTimer) {
    clearTimeout(precisionModeTimer);
    precisionModeTimer = null;
  }

  // Finální překreslení po ukončení gesta
  if (window.draw) window.draw();

  // Zpracování akce na konci dotyku
  if (touchStart && !touchIsPanning) {
    // Získáme finální souřadnice
    let finalScreenX = touchStart.x;
    let finalScreenY = touchStart.y;

    // Pokud byl precision mode aktivní a máme poslední dotyk, použijeme ho
    if (precisionModeActive && e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const coords = getPrecisionCoords(touch, canvas);
      finalScreenX = coords.screenX;
      finalScreenY = coords.screenY;
    }

    const worldPt = window.screenToWorld ? window.screenToWorld(finalScreenX, finalScreenY) : { x: 0, y: 0 };
    const snapped = window.snapPoint ? window.snapPoint(worldPt.x, worldPt.y) : worldPt;

    // Pokud je pan mód a byl to krátký tap, vybrat bod
    if (window.mode === "pan") {
      const elapsed = Date.now() - touchStart.time;
      if (elapsed < 300) { // Krátký tap
        // Zkusíme vybrat bod pokud existuje
        if (window.cachedSnapPoints && window.cachedSnapPoints.length > 0) {
          const tolerance = 10 / (window.zoom || 2);
          let best = null;
          let bestDist = Infinity;
          for (let p of window.cachedSnapPoints) {
            const dx = p.x - snapped.x;
            const dy = p.y - snapped.y;
            const d = Math.hypot(dx, dy);
            if (d < tolerance && d < bestDist) {
              bestDist = d;
              best = p;
            }
          }
          if (best && (best.type === "point" || best.type === "endpoint" || best.type === "intersection")) {
            if (typeof handleSelectMode === "function") {
              handleSelectMode(best.x, best.y, false);
            }
          }
        }
      }
    }
    // Pro kreslicí módy provedeme akci při touchEnd
    else if (window.mode === "point" && !touchActionStarted) {
      handlePointMode(snapped.x, snapped.y);
      touchActionStarted = true;
    }
    else if (window.mode === "line" && !touchActionStarted) {
      handleLineMode(snapped.x, snapped.y);
      touchActionStarted = true;
    }
    else if (window.mode === "circle" && !touchActionStarted) {
      handleCircleMode(snapped.x, snapped.y);
      touchActionStarted = true;
    }
    else if (window.mode === "select" && !touchActionStarted) {
      // Pro výběr - použijeme precision mode souřadnice (s offsetem od prstu)
      handleSelectMode(snapped.x, snapped.y, false);
      touchActionStarted = true;
    }
  }

  // Deaktivovat precision mode
  deactivatePrecisionMode();

  touchStart = null;
  touchIsPanning = false;
  touchActionStarted = false;
  window.pinchStart = null;
}

/**
 * Handler pro přerušené touch gesto (např. systémové gesto, notifikace)
 */
function onCanvasTouchCancel(e) {
  e.preventDefault();

  // Deaktivovat precision mode
  deactivatePrecisionMode();

  // Reset všech stavů - gesto bylo přerušeno
  touchStart = null;
  touchIsPanning = false;
  touchActionStarted = false;
  window.pinchStart = null;
  window.tempShape = null;

  // Překreslit canvas bez dočasného tvaru
  if (window.draw) window.draw();

  console.log('[Touch] Gesto přerušeno (touchcancel)');
}

// ===== MODE HANDLERS =====

function handlePointMode(x, y) {
  if (!window.points) {
    console.error("[handlePointMode] ❌ window.points neexistuje!");
    return;
  }
  const pt = { x, y, temp: false };
  window.points.push(pt);
  window.logDebug && window.logDebug('[handlePointMode] created point', pt);
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.saveState) window.saveState();
  if (window.draw) window.draw();
}

function handleLineMode(x, y) {
  if (!window.startPt) {
    window.startPt = { x, y };
  } else {
    if (!window.shapes) return;

    // Pokud je "Míra" zapnuta, zeptej se na délku
    let finalX = x;
    let finalY = y;

    if (window.measureInputEnabled) {
      const measureData = window.showMeasureInputDialog("line");
      if (measureData === null) {
        window.startPt = null;
        return; // User cancelled
      }

      const processedData = window.processMeasureInput(measureData);
      if (processedData && processedData.distance) {
        // Vypočítej směr od startPt k aktuální pozici
        const dx = x - window.startPt.x;
        const dy = y - window.startPt.y;
        const currentAngle = Math.atan2(dy, dx);

        // Nastav nový endpoint podle zadané vzdálenosti
        finalX = window.startPt.x + processedData.distance * Math.cos(currentAngle);
        finalY = window.startPt.y + processedData.distance * Math.sin(currentAngle);
      }
    } else {
      // Polární přichycení pokud je zapnuto (checkbox NEBO fixní úhel)
      const polarCheckbox = document.getElementById("polarSnapCheckboxLegacy");
      const isPolarActive = (polarCheckbox && polarCheckbox.checked) || (window.polarLineAngleFixed !== null && window.polarLineAngleFixed !== undefined);
      if (isPolarActive && window.updateSnap) {
        const snapResult = window.updateSnap(window.startPt, { x: finalX, y: finalY });
        if (snapResult.snapped) {
          // Přichyceno - upravit koncový bod podle přichyceného úhlu
          const length = Math.hypot(finalX - window.startPt.x, finalY - window.startPt.y);
          const angleRad = (snapResult.angle * Math.PI) / 180;
          finalX = window.startPt.x + length * Math.cos(angleRad);
          finalY = window.startPt.y + length * Math.sin(angleRad);
        }
      }
    }

    window.shapes.push({
      type: "line",
      x1: window.startPt.x,
      y1: window.startPt.y,
      x2: finalX,
      y2: finalY,
      color: window.defaultDrawColor || "#4a9eff",
      lineStyle: window.defaultDrawLineStyle || "solid",
    });
    window.startPt = null;
    window.tempShape = null;
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.saveState) window.saveState();
  }
}

function handleCircleMode(x, y) {
  if (!window.startPt) {
    window.startPt = { x, y };
  } else {
    if (!window.shapes) return;

    // Pokud je "Míra" zapnuta, zeptej se na poloměr
    let radius = Math.sqrt((x - window.startPt.x) ** 2 + (y - window.startPt.y) ** 2);

    if (window.measureInputEnabled) {
      const measureData = window.showMeasureInputDialog("circle");
      if (measureData === null) {
        window.startPt = null;
        return; // User cancelled
      }

      const processedData = window.processMeasureInput(measureData);
      if (processedData && processedData.radius) {
        radius = processedData.radius;
      }
    }

    window.shapes.push({
      type: "circle",
      cx: window.startPt.x,
      cy: window.startPt.y,
      r: radius,
      color: window.defaultDrawColor || "#4a9eff",
      lineStyle: window.defaultDrawLineStyle || "solid",
    });
    window.startPt = null;
    window.tempShape = null;
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.saveState) window.saveState();
  }
}

function handleRectangleMode(x, y) {
  // Při kliknutí se začne kreslení tažením
  window.startPt = { x, y };
  window.drawing = true;
}

function handleCircumcircleMode(x, y) {
  // Nejdříve zkontroluj, zda jsou vybrané 3 body (A, B, C)
  if (window.selectedItems && window.selectedItems.length === 3) {
    const itemA = window.selectedItems[0];
    const itemB = window.selectedItems[1];
    const itemC = window.selectedItems[2];

    // Všechny tři musejí být body
    if (itemA.category === "point" && itemB.category === "point" && itemC.category === "point") {
      const p1 = { x: itemA.x, y: itemA.y };
      const p2 = { x: itemB.x, y: itemB.y };
      const p3 = { x: itemC.x, y: itemC.y };

      // Výpočet circumcircle (kružnice procházející 3 body)
      const ax = p1.x;
      const ay = p1.y;
      const bx = p2.x;
      const by = p2.y;
      const cx = p3.x;
      const cy = p3.y;

      const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

      if (Math.abs(d) < 0.0001) {
        // Body jsou kolineární - nemohu udělat kružnici
        alert("⚠️ Body A, B, C jsou na jedné přímce - kružnice nelze vytvořit!");
        window.selectedItems = [];
        if (window.draw) window.draw();
        return;
      }

      const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
      const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
      const r = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

      if (!window.shapes) window.shapes = [];
      window.shapes.push({
        type: "circle",
        cx: ux,
        cy: uy,
        r: r,
        color: window.defaultDrawColor || "#4a9eff",
        lineStyle: window.defaultDrawLineStyle || "solid",
      });

      window.selectedItems = []; // Vymaž výběr
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
      if (window.draw) window.draw();
      return;
    }
  }

  // Normální režim - sbírání 3 bodů klikáním
  if (!window.circumcirclePoints) {
    window.circumcirclePoints = [];
  }

  window.circumcirclePoints.push({ x, y });

  if (window.circumcirclePoints.length === 3) {
    // Máme 3 body - spočítej kružnici
    const p1 = window.circumcirclePoints[0];
    const p2 = window.circumcirclePoints[1];
    const p3 = window.circumcirclePoints[2];

    // Výpočet circumcircle (kružnice procházející 3 body)
    const ax = p1.x;
    const ay = p1.y;
    const bx = p2.x;
    const by = p2.y;
    const cx = p3.x;
    const cy = p3.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    if (Math.abs(d) < 0.0001) {
      // Body jsou kolineární - nemohu udělat kružnici
      alert("⚠️ Body jsou na jedné přímce - kružnice nelze vytvořit!");
      window.circumcirclePoints = [];
      if (window.draw) window.draw();
      return;
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const r = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

    if (!window.shapes) window.shapes = [];
    window.shapes.push({
      type: "circle",
      cx: ux,
      cy: uy,
      r: r,
      color: window.defaultDrawColor || "#4a9eff",
      lineStyle: window.defaultDrawLineStyle || "solid",
    });

    window.circumcirclePoints = [];
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.saveState) window.saveState();
  }
}

// Pomocná funkce pro vytvoření circumcircle ze 3 vybraných bodů
window.createCircumcircleFromSelectedPoints = function() {
  if (!window.selectedItems || window.selectedItems.length !== 3) return;

  const itemA = window.selectedItems[0];
  const itemB = window.selectedItems[1];
  const itemC = window.selectedItems[2];

  // Všechny tři musejí být body
  if (itemA.category !== "point" || itemB.category !== "point" || itemC.category !== "point") {
    alert("⚠️ Všechny 3 prvky musejí být body!");
    return;
  }

  const p1 = { x: itemA.x, y: itemA.y };
  const p2 = { x: itemB.x, y: itemB.y };
  const p3 = { x: itemC.x, y: itemC.y };

  // Výpočet circumcircle (kružnice procházející 3 body)
  const ax = p1.x;
  const ay = p1.y;
  const bx = p2.x;
  const by = p2.y;
  const cx = p3.x;
  const cy = p3.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

  if (Math.abs(d) < 0.0001) {
    // Body jsou kolineární - nemohu udělat kružnici
    alert("⚠️ Body A, B, C jsou na jedné přímce - kružnice nelze vytvořit!");
    window.selectedItems = [];
    if (window.draw) window.draw();
    return;
  }

  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const r = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

  if (!window.shapes) window.shapes = [];
  window.shapes.push({
    type: "circle",
    cx: ux,
    cy: uy,
    r: r,
    color: window.defaultDrawColor || "#4a9eff",
    lineStyle: window.defaultDrawLineStyle || "solid",
  });

  window.selectedItems = []; // Vymaž výběr
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.saveState) window.saveState();
  if (window.draw) window.draw();
};

function handleSelectMode(x, y, shiftKey) {
  if (!window.selectedItems) window.selectedItems = [];
  let found = null;

  // Debug info to help diagnose selection issues
  window.logDebug && window.logDebug("[handleSelectMode] click:", { x, y, zoom: window.zoom, panX: window.panX, panY: window.panY });

  // Hledat blízký bod (tolerance 5px)
  const tolerance = 5 / (window.zoom || 2);
  const found_point = window.points && window.points.find((p) => {
    return Math.hypot(p.x - x, p.y - y) < tolerance;
  });

  // Screen-space fallback: pokud world-space check nic nenašel,
  // porovnej vzdálenost v pixelech (robustnější při různém zoomu/zaokrouhlování)
  let found_point_screen = null;
  if (!found_point && window.points && window.points.length > 0 && window.worldToScreen) {
    try {
      const clickScreen = window.worldToScreen(x, y);
      let bestPx = Infinity;
      for (const p of window.points) {
        const pScreen = window.worldToScreen(p.x, p.y);
        const dpx = Math.hypot(pScreen.x - clickScreen.x, pScreen.y - clickScreen.y);
        if (dpx < 8 && dpx < bestPx) { bestPx = dpx; found_point_screen = p; }
      }
      if (found_point_screen) window.logDebug && window.logDebug('[handleSelectMode] screen-space matched point', bestPx);
    } catch (e) { window.logDebug && window.logDebug('[handleSelectMode] screen-space fallback error', e); }
  }

  if (found_point || found_point_screen) {
    const fp = found_point || found_point_screen;
    found = {
      category: "point",
      x: fp.x,
      y: fp.y,
      ref: fp,
    };
    window.logDebug && window.logDebug("[handleSelectMode] found manual point", fp, "mode=", window.mode);

    // Pokud je to bod a nejsme v persistentním select režimu, použij rychlý výběr
    // Jinak pokračuj normální logikou níže (která přidává písmena)
    const persistentSelect = window.mode === "select" || window.colorPickerMode;
    window.logDebug && window.logDebug("[handleSelectMode] persistentSelect=", persistentSelect);

    if (!persistentSelect) {
      // Dočasný single-select pro režimy jako tangent, perpendicular atd.
      try {
        window.selectedItems = [{ category: 'point', x: fp.x, y: fp.y, ref: fp, highlightColor: '#facc15' }];
        window._lastSelectionTime = Date.now();
        window.logDebug && window.logDebug('[handleSelectMode] QUICK-ASSIGN (temp mode) selectedItems=', window.selectedItems);
        if (window.draw) window.draw();

        // Ukaž info
        try {
          const infoEl = document.getElementById('snapInfo');
          if (infoEl) {
            const sx = (fp.x).toFixed(2);
            const sy = (fp.y).toFixed(2);
            infoEl.textContent = `📍 Bod (${sx}, ${sy}) • Bod`;
            infoEl.style.display = 'block';
          }
        } catch (e) {}
        return; // Zastav další zpracování pro temp režim
      } catch (e) {
        console.error('[handleSelectMode] QUICK-ASSIGN failed', e);
      }
    }
    window.logDebug && window.logDebug("[handleSelectMode] continuing with persistent select, found=", found);
    // Pro persistentní select mode pokračuj normální logikou s písmeny (níže)
  }

  // Pokud jsme ještě nenašli bod v window.points, hledej dál
  if (!found) {
    // Pokud cached snap points nejsou dostupné, pokus se je aktualizovat
    if ((!window.cachedSnapPoints || window.cachedSnapPoints.length === 0) && window.updateSnapPoints) {
      window.updateSnapPoints();
    }

    // Hledat nejbližší snap-point (endpoints, intersections, centers)
    if (window.cachedSnapPoints && window.cachedSnapPoints.length > 0) {
      let best = null;
      let bestDist = Infinity;
      for (let p of window.cachedSnapPoints) {
        const dx = p.x - x;
        const dy = p.y - y;
        const d = Math.hypot(dx, dy);
        if (d < tolerance && d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      if (best) {
        found = {
          category: "point",
          x: best.x,
          y: best.y,
          ref: best,
        };
        window.logDebug && window.logDebug("[handleSelectMode] found cached snap-point", best);
      }
    }

    // Pokud jsme nenašli cached snap-point, zkusit explicitně středy kružnic
    if (!found && window.shapes && window.shapes.length > 0) {
      for (let s of window.shapes) {
        if (s.type === 'circle') {
          const dx = s.cx - x;
          const dy = s.cy - y;
          const d = Math.hypot(dx, dy);
          // použít stejnou toleranci jako výše
          if (d < tolerance) {
            found = {
              category: 'point',
              x: s.cx,
              y: s.cy,
              ref: { type: 'center', circle: s }
            };
            window.logDebug && window.logDebug('[handleSelectMode] found circle center by proximity', found);
            break;
          }
        }
      }
    }
    // Hledat blízký tvar (pokud jsme nenašli žádný bod)
    if (!found) {
      const found_shape = window.shapes && window.shapes.find((s) => {
      if (s.type === "dimension") return false; // Přeskočit kóty
      if (s.type === "line") {
        const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
        return d < tolerance;
      } else if (s.type === "circle") {
        return Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r) < tolerance;
      } else if (s.type === "rectangle") {
        // Zkontroluj každou stranu obdélníku jako úsečku
        const x1 = s.x1;
        const y1 = s.y1;
        const x2 = s.x2;
        const y2 = s.y2;

        // Strany: top (x1,y1)-(x2,y1), right (x2,y1)-(x2,y2), bottom (x2,y2)-(x1,y2), left (x1,y2)-(x1,y1)
        const dTop = pointToLineDistance(x, y, x1, y1, x2, y1);
        const dRight = pointToLineDistance(x, y, x2, y1, x2, y2);
        const dBottom = pointToLineDistance(x, y, x2, y2, x1, y2);
        const dLeft = pointToLineDistance(x, y, x1, y2, x1, y1);

        return dTop < tolerance || dRight < tolerance || dBottom < tolerance || dLeft < tolerance;
      }
      return false;
    });

      if (found_shape) {
        if (found_shape.type === "rectangle") {
          // Urči, která hrana byla kliknuta (top/right/bottom/left)
          const rx1 = Math.min(found_shape.x1, found_shape.x2);
          const rx2 = Math.max(found_shape.x1, found_shape.x2);
          const ry1 = Math.min(found_shape.y1, found_shape.y2);
          const ry2 = Math.max(found_shape.y1, found_shape.y2);

          const dTop = pointToLineDistance(x, y, rx1, ry1, rx2, ry1);
          const dRight = pointToLineDistance(x, y, rx2, ry1, rx2, ry2);
          const dBottom = pointToLineDistance(x, y, rx2, ry2, rx1, ry2);
          const dLeft = pointToLineDistance(x, y, rx1, ry2, rx1, ry1);

          let edge = null;
          let edgeCoords = null;
          const minD = Math.min(dTop, dRight, dBottom, dLeft);
          if (minD === dTop) {
            edge = "top";
            edgeCoords = { x1: rx1, y1: ry1, x2: rx2, y2: ry1 };
          } else if (minD === dRight) {
            edge = "right";
            edgeCoords = { x1: rx2, y1: ry1, x2: rx2, y2: ry2 };
          } else if (minD === dBottom) {
            edge = "bottom";
            edgeCoords = { x1: rx2, y1: ry2, x2: rx1, y2: ry2 };
          } else {
            edge = "left";
            edgeCoords = { x1: rx1, y1: ry2, x2: rx1, y2: ry1 };
          }

          // Vytvořím syntetický line-ref s odkazem na parent rectangle
          const syntheticLine = {
            type: "line",
            x1: edgeCoords.x1,
            y1: edgeCoords.y1,
            x2: edgeCoords.x2,
            y2: edgeCoords.y2,
            parentRect: found_shape,
            parentEdge: edge,
          };

          found = {
            category: "shape",
            type: "line",
            ref: syntheticLine,
          };
        } else {
          found = {
            category: "shape",
            type: found_shape.type,
            ref: found_shape,
          };
        }
        window.logDebug && window.logDebug("[handleSelectMode] found shape", found.type, found.ref);
      }
    }
  }

  // V režimu select se vždycky přidávají položky, ne aby se čistily
  // (jen pokud není explicitně smazáno)

  if (found) {
      window.logDebug && window.logDebug('[handleSelectMode] ENTERING SELECTION LOGIC, found=', found);
      window.logDebug && window.logDebug('[handleSelectMode] window.selectedItems BEFORE=', window.selectedItems);
      window.logDebug && window.logDebug('[handleSelectMode] BEFORE selection logic, window.selectedItems=', window.selectedItems);
      try { if (window.debugMode) console.trace('[handleSelectMode] trace'); } catch (e) {}
      window.logDebug && window.logDebug('[handleSelectMode] entering selection logic, found=', found);
    // Hledat, zda je už vybraný
    const index = window.selectedItems.findIndex((i) => {
      if (found.category === "point" && i.category === "point") {
        return Math.abs(i.x - found.x) < 0.0001 && Math.abs(i.y - found.y) < 0.0001;
      } else if (found.category === "shape" && i.category === "shape") {
        // Pokud jde o syntetickou hranu obdélníku, porovnej parentRect + parentEdge
        const fRef = found.ref;
        const iRef = i.ref;
        if (fRef && fRef.parentRect && iRef && iRef.parentRect) {
          return iRef.parentRect === fRef.parentRect && iRef.parentEdge === fRef.parentEdge;
        }
        return iRef === fRef;
      }
      return false;
    });

    // Pokud není aktivní persistentní režim výběru (mode !== 'select'),
    // použijeme dočasný single-select bez písmen — překliknutím se předchozí zruší.
    const persistentSelect = window.mode === "select" || window.colorPickerMode;
    window.logDebug && window.logDebug('[handleSelectMode] SECOND CHECK: persistentSelect=', persistentSelect, 'index=', index);
    if (!persistentSelect) {
      // dočasné označení: jediný item, bez labelu
      try {
        if (found.category === "point") {
          found.highlightColor = "#facc15";
        }
        // Explicitně přiřadit pole (nikoli length=0 + push) - vyhnout se nechtěným referencím
        window.selectedItems = [{ ...found }];
        window._lastSelectionTime = Date.now();
        window.logDebug && window.logDebug("[handleSelectMode] selectedItems (temp) ASSIGNED:", window.selectedItems, "_lastSelectionTime=", window._lastSelectionTime);
      } catch (e) {
        console.error("[handleSelectMode] failed to assign selectedItems:", e);
      }
    } else {
      window.logDebug && window.logDebug('[handleSelectMode] PERSISTENT SELECT MODE, index=', index);
      if (index > -1) {
        // Už je vybraný - odeber ho když se klikne znovu
        window.logDebug && window.logDebug('[handleSelectMode] REMOVING item at index', index);
        window.selectedItems.splice(index, 1);
      } else {
        // Přidej unikátní label (A..Z) - vyhnout se duplicitám
        window.logDebug && window.logDebug('[handleSelectMode] ADDING NEW item with label');
        const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const used = new Set((window.selectedItems || []).map(s => s.label).filter(Boolean));
        let label = null;
        for (let i = 0; i < labels.length; i++) {
          if (!used.has(labels[i])) { label = labels[i]; break; }
        }
        if (!label) label = labels[(window.selectedItems.length) % labels.length];
        window.logDebug && window.logDebug('[handleSelectMode] Assigned label:', label);
        // Pokud je to bod, přidej highlightColor (žluté kolečko)
        if (found.category === "point") {
          found.highlightColor = "#facc15";
        }
        window.selectedItems.push({ ...found, label });
        window.logDebug && window.logDebug('[handleSelectMode] selectedItems AFTER push:', window.selectedItems);
      }
      window.logDebug && window.logDebug("[handleSelectMode] selectedItems (persistent):", window.selectedItems);
    }
  }

  // Aktualizovat info-panel nahoře (souřadnice / typ)
  try {
    const infoEl = document.getElementById("snapInfo");
    if (infoEl) {
      // Překlad typů snap-pointů do češtiny
      function translateSnapType(t) {
        if (!t) return t;
        const map = {
          point: "Bod",
          endpoint: "Koncový bod",
          intersection: "Průsečík",
          center: "Střed",
          grid: "Mřížka",
        };
        return map[t] || t;
      }

      // Helper: bezpečně získat souřadnice z objektu (found nebo sel)
      function coordsOf(o) {
        const vx = o.x ?? o.ref?.x ?? o.ref?.cx ?? 0;
        const vy = o.y ?? o.ref?.y ?? o.ref?.cy ?? 0;
        const sx = typeof vx === 'number' && vx.toFixed ? vx.toFixed(2) : String(vx);
        const sy = typeof vy === 'number' && vy.toFixed ? vy.toFixed(2) : String(vy);
        return { sx, sy };
      }

      if (!found) {
        // Nic nenalezeno; ukaž info pro první vybranou položku pokud existuje
        if (window.selectedItems && window.selectedItems.length > 0) {
          const sel = window.selectedItems[0];
          let selMsg = "";
          if (sel.category === "point" || (sel.type === 'point') || (sel.ref && sel.ref.type === 'point')) {
            const c = coordsOf(sel);
            selMsg = `📍 Bod (${c.sx}, ${c.sy})`;
            const stype = sel.type || sel.ref?.type || 'point';
            if (stype) selMsg += ` • ${translateSnapType(stype)}`;
          } else if (sel.category === "shape") {
            if (sel.type === "line" && sel.ref) {
              if (sel.ref.parentRect) {
                selMsg = `▭ Hrana: ${sel.ref.parentEdge} (obdélník)`;
              } else {
                const mx = ((sel.ref.x1 + sel.ref.x2) / 2).toFixed(2);
                const my = ((sel.ref.y1 + sel.ref.y2) / 2).toFixed(2);
                const len = Math.hypot(sel.ref.x2 - sel.ref.x1, sel.ref.y2 - sel.ref.y1).toFixed(2);
                selMsg = `— Úsečka; střed (${mx}, ${my}); délka ${len}`;
              }
            } else if (sel.type === 'circle' || sel.ref?.type === 'circle') {
              const ccenter = { x: sel.ref?.cx ?? (sel.x||0), y: sel.ref?.cy ?? (sel.y||0) };
              selMsg = `⭕ Kružnice; střed (${(ccenter.x).toFixed(2)}, ${(ccenter.y).toFixed(2)})`;
            }
          }
          infoEl.textContent = selMsg;
          infoEl.style.display = "block";
          window.logDebug && window.logDebug('[handleSelectMode] snapInfo (selected) =', selMsg);
        } else {
          infoEl.style.display = "none";
        }
      } else {
        // Máme nalezený objekt z kliknutí
        let msg = "";
        if (found.category === "point" || found.type === 'point' || found.ref?.type === 'point') {
          const c = coordsOf(found);
          msg = `📍 Bod (${c.sx}, ${c.sy})`;
          const ftype = found.type || found.ref?.type || 'point';
          if (ftype) msg += ` • ${translateSnapType(ftype)}`;
        } else if (found.category === "shape") {
          if (found.type === "line" && found.ref) {
            if (found.ref.parentRect) {
              msg = `▭ Hrana: ${found.ref.parentEdge} (obdélník)`;
            } else {
              const mx = ((found.ref.x1 + found.ref.x2) / 2).toFixed(2);
              const my = ((found.ref.y1 + found.ref.y2) / 2).toFixed(2);
              const len = Math.hypot(found.ref.x2 - found.ref.x1, found.ref.y2 - found.ref.y1).toFixed(2);
              msg = `— Úsečka; střed (${mx}, ${my}); délka ${len}`;
            }
          } else if ((found.type === "circle" || found.ref?.type === 'circle') && found.ref) {
            msg = `⭕ Kružnice; střed (${found.ref.cx.toFixed(2)}, ${found.ref.cy.toFixed(2)}); r=${found.ref.r.toFixed(2)}`;
          } else if (found.type === "rectangle" && found.ref) {
            const cx = ((found.ref.x1 + found.ref.x2) / 2).toFixed(2);
            const cy = ((found.ref.y1 + found.ref.y2) / 2).toFixed(2);
            msg = `▭ Obdélník; střed (${cx}, ${cy})`;
          } else {
            // fallback: pokud má found.x/y
            if (found.x !== undefined && found.y !== undefined) {
              const c = coordsOf(found);
              msg = `📍 Bod (${c.sx}, ${c.sy})`;
              const ftype = found.type || found.ref?.type;
              if (ftype) msg += ` • ${translateSnapType(ftype)}`;
            } else {
              msg = `${found.type || 'shape'}`;
            }
          }
        }

        infoEl.textContent = msg;
        infoEl.style.display = "block";
        window.logDebug && window.logDebug('[handleSelectMode] snapInfo (found) =', msg, 'found=', found);

        if (!window.selectedItems || window.selectedItems.length === 0) {
          setTimeout(() => {
            try {
              infoEl.style.display = "none";
            } catch (e) {}
          }, 2500);
        }
      }
    }
  } catch (e) {
    console.warn("snapInfo update failed", e);
  }

  if (window.draw) {
    window.logDebug && window.logDebug('[handleSelectMode] calling draw(), selectedItems.length=', (window.selectedItems||[]).length);
    window.draw();
  }
}

function handleTangentMode(x, y) {
  // Nejdříve zkontroluj, zda jsou vybrané prvky (A, B)
  if (window.selectedItems && window.selectedItems.length >= 2) {
    const itemA = window.selectedItems[0];
    const itemB = window.selectedItems[1];

    // Tečna: bod (A) a kružnice (B) NEBO kružnice (A) a bod (B)
    let point = null;
    let circle = null;

    if (itemA.category === "point" && itemB.category === "shape" && itemB.type === "circle") {
      point = itemA;
      circle = itemB.ref;
    } else if (itemB.category === "point" && itemA.category === "shape" && itemA.type === "circle") {
      point = itemB;
      circle = itemA.ref;
    }

    if (point && circle && window.tangentFromPoint) {
      const tangents = window.tangentFromPoint(
        point.x,
        point.y,
        circle.cx,
        circle.cy,
        circle.r
      );

      tangents.forEach((t) => {
        window.shapes.push({
          type: "line",
          x1: point.x,
          y1: point.y,
          x2: t.x,
          y2: t.y,
          color: window.currentColor || "#ff00ff",
        });
      });

      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
      window.selectedItems = []; // Vymaž výběr
      if (window.draw) window.draw();
      return;
    }
  }

  // Normální režim - bez vybraných prvků
  if (!window.startPt) {
    window.startPt = { x, y };
  } else {
    // Hledat kružnici pro tečnu
    if (!window.shapes) return;
    const circle = window.shapes.find(
      (s) =>
        s.type === "circle" &&
        Math.hypot(x - s.cx, y - s.cy) <
          Math.max(s.r * 0.2, 5 / (window.zoom || 2))
    );

    if (circle && window.tangentFromPoint) {
      const tangents = window.tangentFromPoint(
        window.startPt.x,
        window.startPt.y,
        circle.cx,
        circle.cy,
        circle.r
      );

      tangents.forEach((t) => {
        window.shapes.push({
          type: "line",
          x1: window.startPt.x,
          y1: window.startPt.y,
          x2: t.x,
          y2: t.y,
          color: window.currentColor || "#ff00ff",
        });
      });

      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
    }

    window.startPt = null;
  }
}

function handlePerpendicularMode(x, y) {
  // Nejdříve zkontroluj, zda jsou vybrané prvky (A, B)
  if (window.selectedItems && window.selectedItems.length >= 2) {
    const itemA = window.selectedItems[0];
    const itemB = window.selectedItems[1];

    // Kolmice: bod (A) a čára (B) NEBO čára (A) a bod (B)
    let point = null;
    let line = null;

    if (itemA.category === "point" && itemB.category === "shape" && itemB.type === "line") {
      point = itemA;
      line = itemB.ref;
    } else if (itemB.category === "point" && itemA.category === "shape" && itemA.type === "line") {
      point = itemB;
      line = itemA.ref;
    }

    if (point && line && window.perpendicular) {
      const perpLine = window.perpendicular(
        point.x,
        point.y,
        line.x1,
        line.y1,
        line.x2,
        line.y2
      );

      if (perpLine) {
        window.shapes.push({
          type: "line",
          x1: perpLine.x1,
          y1: perpLine.y1,
          x2: perpLine.x2,
          y2: perpLine.y2,
          color: window.currentColor || "#00ffff",
        });
        if (window.updateSnapPoints) window.updateSnapPoints();
        if (window.saveState) window.saveState();
        window.selectedItems = []; // Vymaž výběr
        if (window.draw) window.draw();
        return;
      }
    }
  }

  // Normální režim - bez vybraných prvků
  if (!window.startPt) {
    window.startPt = { x, y };
  } else {
    if (!window.shapes) return;
    const line = window.shapes.find((s) => {
      if (s.type !== "line") return false;
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < 10 / (window.zoom || 2);
    });

    if (line && window.perpendicular) {
      const perpLine = window.perpendicular(
        window.startPt.x,
        window.startPt.y,
        line.x1,
        line.y1,
        line.x2,
        line.y2
      );

      if (perpLine) {
        window.shapes.push({
          type: "line",
          x1: perpLine.x1,
          y1: perpLine.y1,
          x2: perpLine.x2,
          y2: perpLine.y2,
          color: window.currentColor || "#00ffff",
        });
        if (window.updateSnapPoints) window.updateSnapPoints();
        if (window.saveState) window.saveState();
      }
    }

    window.startPt = null;
  }
}

function handleParallelMode(x, y) {
  // Nejdříve zkontroluj, zda jsou vybrané prvky (A, B)
  if (window.selectedItems && window.selectedItems.length >= 2) {
    const itemA = window.selectedItems[0];
    const itemB = window.selectedItems[1];

    // Rovnoběžka: bod (A) a čára (B) NEBO čára (A) a bod (B)
    let point = null;
    let line = null;

    if (itemA.category === "point" && itemB.category === "shape" && itemB.type === "line") {
      point = itemA;
      line = itemB.ref;
    } else if (itemB.category === "point" && itemA.category === "shape" && itemA.type === "line") {
      point = itemB;
      line = itemA.ref;
    }

    if (point && line && window.parallel) {
      // Vzdálenost = vzdálenost bodu od čáry
      const offsetDist = Math.abs(pointToLineDistance(point.x, point.y, line.x1, line.y1, line.x2, line.y2));
      const parLine = window.parallel(line, offsetDist);

      if (parLine) {
        window.shapes.push({
          type: "line",
          x1: parLine.x1,
          y1: parLine.y1,
          x2: parLine.x2,
          y2: parLine.y2,
          color: window.currentColor || "#ffff00",
        });
        if (window.updateSnapPoints) window.updateSnapPoints();
        if (window.saveState) window.saveState();
        window.selectedItems = []; // Vymaž výběr
        if (window.draw) window.draw();
        return;
      }
    }
  }

  // Normální režim - bez vybraných prvků
  if (!window.startPt) {
    window.startPt = { x, y };
  } else {
    if (!window.shapes) return;
    const line = window.shapes.find((s) => {
      if (s.type !== "line") return false;
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < 10 / (window.zoom || 2);
    });

    if (line && window.parallel) {
      const offsetDist = 10; // Default distance
      const parLine = window.parallel(line, offsetDist);

      if (parLine) {
        window.shapes.push({
          type: "line",
          x1: parLine.x1,
          y1: parLine.y1,
          x2: parLine.x2,
          y2: parLine.y2,
          color: window.currentColor || "#ffff00",
        });
        if (window.updateSnapPoints) window.updateSnapPoints();
        if (window.saveState) window.saveState();
      }
    }

    window.startPt = null;
  }
}

function handleExtendMode(x, y) {
  if (!window.shapes) return;

  // Najdi čáru kterou prodlužujeme
  const line = window.shapes.find((s) => {
    if (s.type !== "line") return false;
    const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
    return d < 10 / (window.zoom || 2);
  });

  if (!line) return;

  // Rozhodnej, kterým koncem prodlužujeme (podle blízkosti ke kurzoru)
  const dist1 = Math.hypot(x - line.x1, y - line.y1);
  const dist2 = Math.hypot(x - line.x2, y - line.y2);
  const extendFromStart = dist1 < dist2;

  // Hledej nejbližší průsečík
  let closestIntersect = null;
  let minDist = Infinity;

  for (let i = 0; i < window.shapes.length; i++) {
    const other = window.shapes[i];
    if (other === line) continue;

    let intersects = [];

    if (other.type === "line") {
      const pt = window.lineLineIntersect ? window.lineLineIntersect(line, other) : null;
      if (pt) intersects.push(pt);
    } else if (other.type === "circle") {
      if (window.lineCircleIntersect) {
        intersects = window.lineCircleIntersect(line, other) || [];
      }
    }

    intersects.forEach((pt) => {
      const d = extendFromStart
        ? Math.hypot(pt.x - line.x1, pt.y - line.y1)
        : Math.hypot(pt.x - line.x2, pt.y - line.y2);
      if (d < minDist) {
        minDist = d;
        closestIntersect = pt;
      }
    });
  }

  if (closestIntersect) {
    if (extendFromStart) {
      line.x1 = closestIntersect.x;
      line.y1 = closestIntersect.y;
    } else {
      line.x2 = closestIntersect.x;
      line.y2 = closestIntersect.y;
    }
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.saveState) window.saveState();
  }
}

function handleTrimMode(x, y) {
  // Nejdříve zkontroluj, zda jsou vybrané prvky (A, B...)
  if (window.selectedItems && window.selectedItems.length >= 1) {
    // Pokud jsou vybrané čáry, ořízni je k bodu/průsečíku
    const linesToTrim = window.selectedItems.filter(item =>
      item.category === "shape" && item.type === "line"
    );

    if (linesToTrim.length > 0) {
      // Pokud je vybrán bod, ořízni všechny čáry k tomuto bodu
      const pointItems = window.selectedItems.filter(item => item.category === "point");

      linesToTrim.forEach(lineItem => {
        const line = lineItem.ref;

        if (pointItems.length > 0) {
          // Ořízni k prvnímu vybranému bodu
          const point = pointItems[0];
          const trimmedLine = window.trimLine(line, { x: point.x, y: point.y });
          const idx = window.shapes.indexOf(line);
          if (idx >= 0) window.shapes[idx] = trimmedLine;
        } else if (linesToTrim.length > 1) {
          // Pokud máš více čar vybraných, ořízni k prvnímu průsečíku
          const otherLines = linesToTrim.filter(l => l !== lineItem).map(l => l.ref);

          for (let otherLine of otherLines) {
            const intersection = window.lineLineIntersect ? window.lineLineIntersect(line, otherLine) : null;
            if (intersection) {
              const trimmedLine = window.trimLine(line, intersection);
              const idx = window.shapes.indexOf(line);
              if (idx >= 0) window.shapes[idx] = trimmedLine;
              break;
            }
          }
        }
      });

      window.selectedItems = []; // Vymaž výběr
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
      if (window.draw) window.draw();
      return;
    }
  }

  // Normální režim - bez vybraných prvků
  if (!window.shapes) return;
  const line = window.shapes.find((s) => {
    if (s.type !== "line") return false;
    const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
    return d < 10 / (window.zoom || 2);
  });

  if (line && window.trimLine) {
    // Ořezat linku v místě kliknutí
    const trimmedLine = window.trimLine(line, { x, y });
    const idx = window.shapes.indexOf(line);
    window.shapes[idx] = trimmedLine;
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.saveState) window.saveState();
  }
}

function handleOffsetMode(x, y) {
  if (!window.shapes) return;
  const tolerance = 10 / (window.zoom || 2);

  const line = window.shapes.find((s) => {
    if (s.type !== "line") return false;
    const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
    return d < tolerance;
  });

  if (line) {
    // Zeptat se uživatele na vzdálenost offsetu
    const userInput = prompt(
      "Zadej vzdálenost odsazení (mm):",
      window.offsetDistance || 10
    );

    if (userInput !== null) {
      const newDist = parseFloat(userInput);
      if (!isNaN(newDist) && newDist > 0) {
        if (!window.offsetDistance) window.offsetDistance = newDist;

        // Použít parallel funkci pro vytvoření rovnoběžky
        if (window.parallel) {
          const newLine = window.parallel(line, newDist);
          window.shapes.push(newLine);
        } else {
          // Fallback na ruční výpočet
          const dx = line.x2 - line.x1;
          const dy = line.y2 - line.y1;
          const len = Math.hypot(dx, dy);
          const offsetX = (-dy / len) * newDist;
          const offsetY = (dx / len) * newDist;

          window.shapes.push({
            type: "line",
            x1: line.x1 + offsetX,
            y1: line.y1 + offsetY,
            x2: line.x2 + offsetX,
            y2: line.y2 + offsetY,
          });
        }

        if (window.updateSnapPoints) window.updateSnapPoints();
        if (window.saveState) window.saveState();
      } else {
        alert("Neplatná hodnota! Zadej kladné číslo.");
      }
    }
  }
}

function handleMirrorMode(x, y) {
  if (!window.shapes) return;

  // KROK 1: Vybrat objekt k zrcadlení (Line nebo Circle)
  if (!window.selectedShape) {
    const found = window.shapes.find((s) => {
      if (s.type === "line") {
        const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
        return d < 10 / (window.zoom || 2);
      } else if (s.type === "circle") {
        return (
          Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r) < 10 / (window.zoom || 2)
        );
      }
      return false;
    });

    if (found) {
      window.selectedShape = found;
      // Zvýraznit vybraný objekt vizuálně
      found._highlighted = true;
      if (typeof window.showToast === "function") {
        window.showToast("Objekt vybrán. Nyní klikni na osu zrcadlení (čáru).", 3000);
      }
      if (window.draw) window.draw();
    }
  }
  // KROK 2: Vybrat osu zrcadlení (musí to být Line)
  else {
    const axisLine = window.shapes.find((s) => {
      if (s.type !== "line") return false;
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < 10 / (window.zoom || 2);
    });

    if (axisLine && window.getMirrorPoint) {
      // Provést zrcadlení
      if (window.selectedShape.type === "line") {
        const p1 = window.getMirrorPoint(
          window.selectedShape.x1,
          window.selectedShape.y1,
          axisLine.x1,
          axisLine.y1,
          axisLine.x2,
          axisLine.y2
        );
        const p2 = window.getMirrorPoint(
          window.selectedShape.x2,
          window.selectedShape.y2,
          axisLine.x1,
          axisLine.y1,
          axisLine.x2,
          axisLine.y2
        );

        if (p1 && p2) {
          window.shapes.push({
            type: "line",
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
          });
        }
      } else if (window.selectedShape.type === "circle") {
        const c = window.getMirrorPoint(
          window.selectedShape.cx,
          window.selectedShape.cy,
          axisLine.x1,
          axisLine.y1,
          axisLine.x2,
          axisLine.y2
        );

        if (c) {
          window.shapes.push({
            type: "circle",
            cx: c.x,
            cy: c.y,
            r: window.selectedShape.r,
          });
        }
      }

      // Reset
      window.selectedShape = null;
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
    }
  }
}

function handleEraseMode(x, y) {
  if (!window.shapes) return;
  const tolerance = 10 / (window.zoom || 2);

  // Najít v shapes
  const shapeIdx = window.shapes.findIndex((s) => {
    if (s.type === "line") {
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < tolerance;
    } else if (s.type === "circle") {
      return Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r) < tolerance;
    }
    return false;
  });

  if (shapeIdx >= 0) {
    window.shapes.splice(shapeIdx, 1);
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.saveState) window.saveState();
    return;
  }

  // Najít v points
  if (window.points) {
    for (let i = 0; i < window.points.length; i++) {
      const p = window.points[i];
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < tolerance) {
        window.points.splice(i, 1);
        if (window.updateSnapPoints) window.updateSnapPoints();
        if (window.saveState) window.saveState();
        return;
      }
    }
  }
}

function handleMeasureMode(x, y) {
  const tolerance = 10 / (window.zoom || 2);
  const shape = window.shapes && window.shapes.find((s) => {
    if (s.type === "line") {
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < tolerance;
    } else if (s.type === "circle") {
      return Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r) < tolerance;
    }
    return false;
  });

  if (shape) {
    let msg = "";
    if (shape.type === "line") {
      const len = Math.hypot(
        shape.x2 - shape.x1,
        shape.y2 - shape.y1
      ).toFixed(2);
      msg = `Čára: ${len}`;
    } else if (shape.type === "circle") {
      const d = (shape.r * 2).toFixed(2);
      msg = `Kružnice: Ø${d} (r=${shape.r.toFixed(2)})`;
    }

    const infoPanel = document.getElementById("measureInfo");
    if (infoPanel) {
      infoPanel.textContent = msg;
      infoPanel.style.display = "block";
    }
  }
}

function handleDimensionMode(x, y) {
  const tolerance = 10 / (window.zoom || 2);

  // 1. Hledej existující kóty pro úpravu
  const existingDim = window.shapes && window.shapes.find((s) => {
    if (s.type !== "dimension") return false;

    if (s.dimType === "linear") {
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < tolerance;
    } else if (s.dimType === "radius") {
      const dToCenter = Math.hypot(x - s.cx, y - s.cy);
      return Math.abs(dToCenter - s.r * window.zoom) < tolerance;
    } else if (s.dimType === "center") {
      return Math.hypot(x - s.cx, y - s.cy) < tolerance;
    }
    return false;
  });

  if (existingDim) {
    // Úprava existující kóty - BEZ PROMPTU, pouze se přidá nová kóta
    return;
  }

  // 2. Vytváří nové kóty - hledej objekty k okótování
  const shape = window.shapes && window.shapes.find((s) => {
    if (s.type === "line") {
      const d = pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2);
      return d < tolerance;
    } else if (s.type === "circle") {
      const dToCenter = Math.hypot(x - s.cx, y - s.cy);
      return Math.abs(dToCenter - s.r) < tolerance;
    } else if (s.type === "rectangle") {
      // Detekce kliknutí na strany obdélníku
      const x1 = Math.min(s.x1, s.x2);
      const x2 = Math.max(s.x1, s.x2);
      const y1 = Math.min(s.y1, s.y2);
      const y2 = Math.max(s.y1, s.y2);

      // Vodorovné strany (top/bottom)
      const dHorizontal = Math.abs(y - y1) < tolerance || Math.abs(y - y2) < tolerance;
      if (dHorizontal && x >= x1 - tolerance && x <= x2 + tolerance) {
        return true;
      }

      // Svislé strany (left/right)
      const dVertical = Math.abs(x - x1) < tolerance || Math.abs(x - x2) < tolerance;
      if (dVertical && y >= y1 - tolerance && y <= y2 + tolerance) {
        return true;
      }
    }
    return false;
  });

  if (!shape) {
    return;
  }

  if (shape.type === "line") {
    // Lineární kóta
    const len = Math.hypot(
      shape.x2 - shape.x1,
      shape.y2 - shape.y1
    );

    window.shapes.push({
      type: "dimension",
      dimType: "linear",
      target: shape,
      value: len,
      x1: shape.x1,
      y1: shape.y1,
      x2: shape.x2,
      y2: shape.y2,
      color: "#ffa500",
    });
  } else if (shape.type === "circle") {
    // Radius kóta + center
    const displayR = window.xMeasureMode === "diameter" ? shape.r * 2 : shape.r;
    const label = window.xMeasureMode === "diameter" ? "⌀" : "R";

    window.shapes.push({
      type: "dimension",
      dimType: "radius",
      target: shape,
      value: displayR,
      label: label,
      cx: shape.cx,
      cy: shape.cy,
      r: shape.r,
      color: "#ffa500",
    });

    window.shapes.push({
      type: "dimension",
      dimType: "center",
      cx: shape.cx,
      cy: shape.cy,
      color: "#ffa500",
    });
  } else if (shape.type === "rectangle") {
    // Detekuj kterou stranu klikl
    const x1 = Math.min(shape.x1, shape.x2);
    const x2 = Math.max(shape.x1, shape.x2);
    const y1 = Math.min(shape.y1, shape.y2);
    const y2 = Math.max(shape.y1, shape.y2);

    const tolerance2 = 15 / (window.zoom || 2);

    if (Math.abs(y - y1) < tolerance2 || Math.abs(y - y2) < tolerance2) {
      // Klikl na vodorovnou stranu - okótuj šířku
      const w = Math.abs(shape.x2 - shape.x1);
      window.shapes.push({
        type: "dimension",
        dimType: "rectWidth",
        target: shape,
        value: w,
        x1: shape.x1,
        y1: shape.y1,
        x2: shape.x2,
        y2: shape.y1,
        color: "#ffa500",
      });
    } else {
      // Klikl na svislou stranu - okótuj výšku
      const h = Math.abs(shape.y2 - shape.y1);
      window.shapes.push({
        type: "dimension",
        dimType: "rectHeight",
        target: shape,
        value: h,
        x1: shape.x1,
        y1: shape.y1,
        x2: shape.x1,
        y2: shape.y2,
        color: "#ffa500",
      });
    }
  }

  if (window.saveState) window.saveState();
  if (window.draw) window.draw();
}

function handleArcMode(x, y) {
  if (!window.startPt) {
    window.startPt = { x, y };
  } else {
    window.tempShape = {
      type: "arc",
      x1: window.startPt.x,
      y1: window.startPt.y,
      x2: x,
      y2: y,
      angle: 45,
    };
    showArcInputModal();
  }
}

function showArcInputModal() {
  const modal = document.getElementById("quickInputModal");
  if (!modal) return;

  const input = modal.querySelector("input");
  if (input) {
    input.value = "45";
    input.onchange = function () {
      if (window.tempShape) {
        window.tempShape.angle = parseFloat(this.value) || 45;
      }
    };
  }

  modal.style.display = "flex";

  const btn = modal.querySelector("button");
  if (btn) {
    btn.onclick = function () {
      if (!window.shapes || !window.tempShape) return;
      window.shapes.push({
        type: "arc",
        x1: window.tempShape.x1,
        y1: window.tempShape.y1,
        x2: window.tempShape.x2,
        y2: window.tempShape.y2,
        angle: window.tempShape.angle,
        color: window.currentColor || "#ffff00",
      });
      window.startPt = null;
      window.tempShape = null;
      modal.style.display = "none";
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
      if (window.draw) window.draw();
    };
  }
}

// ===== KEYBOARD HANDLERS =====
// ✅ Keyboard events nyní spravuje unified keyboard.js
// Jednotlivé handlers (undo, redo, delete, atd.) se volají odtud

// ===== HELPER FUNCTIONS =====

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return Math.hypot(px - xx, py - yy);
}

// ===== HELPER FUNKCE PRO GEOMETRII =====

function tangentFromPoint(circle, point) {
  const dx = point.x - circle.cx;
  const dy = point.y - circle.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < circle.r) return null; // Bod uvnitř kružnice

  const angle = Math.atan2(dy, dx);
  const tangentAngle = Math.asin(circle.r / dist);

  const tangents = [];
  for (let sign of [-1, 1]) {
    const a = angle + sign * tangentAngle;
    const touchX =
      circle.cx + circle.r * Math.cos(a + (sign * Math.PI) / 2);
    const touchY =
      circle.cy + circle.r * Math.sin(a + (sign * Math.PI) / 2);
    tangents.push({
      x1: point.x,
      y1: point.y,
      x2: touchX,
      y2: touchY,
    });
  }
  return tangents;
}

function perpendicular(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Směrový vektor kolmice
  const perpX = (-dy / len) * 50; // Délka kolmice 50mm
  const perpY = (dx / len) * 50;

  return {
    x1: px - perpX,
    y1: py - perpY,
    x2: px + perpX,
    y2: py + perpY,
  };
}

function parallel(line, distance) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  const offsetX = (-dy / len) * distance;
  const offsetY = (dx / len) * distance;

  return {
    x1: line.x1 + offsetX,
    y1: line.y1 + offsetY,
    x2: line.x2 + offsetX,
    y2: line.y2 + offsetY,
  };
}

function trimLine(x1, y1, x2, y2, cutX, cutY) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  const t = ((cutX - x1) * dx + (cutY - y1) * dy) / (len * len);

  if (t < 0.5) {
    return {
      x1: cutX,
      y1: cutY,
      x2: x2,
      y2: y2,
    };
  } else {
    return {
      x1: x1,
      y1: y1,
      x2: cutX,
      y2: cutY,
    };
  }
}

function getMirrorPoint(px, py, lx1, ly1, lx2, ly2) {
  // Line: A*x + B*y + C = 0
  const A = ly1 - ly2;
  const B = lx2 - lx1;
  const C = -A * lx1 - B * ly1;

  // Vzdálenost bodu od přímky
  const dist = (A * px + B * py + C) / Math.sqrt(A * A + B * B);

  // Zrcadlový bod
  const k = -2 * dist / Math.sqrt(A * A + B * B);

  return {
    x: px + k * A,
    y: py + k * B,
  };
}

// ===== COLOR PICKER MODE =====

function handleColorPickerMode(x, y) {
  window.logDebug && window.logDebug("[handleColorPickerMode] START - colorPickerMode =", window.colorPickerMode);

  // Kontrola colorPickerMode
  if (!window.colorPickerMode) {
    console.log("[handleColorPickerMode] colorPickerMode je false, vracím se");
    return;
  }

  // Najít objekt pod kurzorem
  const clickPoint = { x, y };
  let foundItem = null;

  window.logDebug && window.logDebug("[handleColorPickerMode] hledám tvary, máme", window.shapes ? window.shapes.length : 0, "tvarů");

  // Hledat v tvary
  for (let s of window.shapes) {
    if (isPointNearShape(clickPoint, s)) {
      console.log("[handleColorPickerMode] Našel jsem tvar:", s.type);
      foundItem = { ref: s, category: "shape", label: null };
      break;
    }
  }

  if (foundItem) {
  window.logDebug && window.logDebug("[handleColorPickerMode] Aplikuji barvu a styl");

    // Aplikovat vybranou barvu a styl na objekt
      if (window.colorStyleSelected && window.colorStyleSelected.color) {
      window.logDebug && window.logDebug("[handleColorPickerMode] Nastavuji barvu na", window.colorStyleSelected.color);
      foundItem.ref.color = window.colorStyleSelected.color;
    }
    if (window.colorStyleSelected && window.colorStyleSelected.lineStyle) {
      window.logDebug && window.logDebug("[handleColorPickerMode] Nastavuji styl na", window.colorStyleSelected.lineStyle);
      foundItem.ref.lineStyle = window.colorStyleSelected.lineStyle;
    }

    // Ukončit colorPicker režim
    window.colorPickerMode = false;
    window.mode = "pan";

    if (window.saveState) window.saveState();
    window.showInfoNotification("✅ Změna aplikována!", 1000);
  } else {
    window.logDebug && window.logDebug("[handleColorPickerMode] Nic nenalezeno pod kurzorem");
    window.showInfoNotification("Klikli jste mimo objekt. Zkuste znovu.", 1000);
  }

  if (window.draw) window.draw();
}

function distancePointToLine(point, line) {
  // Vzdálenost bodu od úsečky (line.x1, line.y1) - (line.x2, line.y2)
  const x1 = line.x1;
  const y1 = line.y1;
  const x2 = line.x2;
  const y2 = line.y2;
  const px = point.x;
  const py = point.y;

  const num = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1);
  const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

  return den === 0 ? 0 : num / den;
}

function isPointNearShape(point, shape) {
  const tolerance = 10 / window.zoom; // 10 pixelů

  if (shape.type === "line") {
    const dist = distancePointToLine(point, shape);
    return dist < tolerance;
  } else if (shape.type === "circle") {
    const dist = Math.sqrt(
      (point.x - shape.cx) ** 2 + (point.y - shape.cy) ** 2
    );
    return Math.abs(dist - shape.r) < tolerance;
  } else if (shape.type === "rectangle") {
    const minX = Math.min(shape.x1, shape.x2);
    const maxX = Math.max(shape.x1, shape.x2);
    const minY = Math.min(shape.y1, shape.y2);
    const maxY = Math.max(shape.y1, shape.y2);

    const onLine =
      (point.x >= minX - tolerance &&
        point.x <= maxX + tolerance &&
        Math.abs(point.y - minY) < tolerance) ||
      (point.x >= minX - tolerance &&
        point.x <= maxX + tolerance &&
        Math.abs(point.y - maxY) < tolerance) ||
      (point.y >= minY - tolerance &&
        point.y <= maxY + tolerance &&
        Math.abs(point.x - minX) < tolerance) ||
      (point.y >= minY - tolerance &&
        point.y <= maxY + tolerance &&
        Math.abs(point.x - maxX) < tolerance);

    return onLine;
  } else if (shape.type === "arc") {
    const dist = Math.sqrt(
      (point.x - shape.cx) ** 2 + (point.y - shape.cy) ** 2
    );
    return Math.abs(dist - shape.r) < tolerance;
  }

  return false;
}

// Rozštípne `rectangle` na 4 `line` tvary v `window.shapes` a vrátí nové linie
function splitRectangle(rect) {
  if (!rect || rect.type !== "rectangle") return null;
  if (!window.shapes) window.shapes = [];

  const idx = window.shapes.indexOf(rect);
  if (idx === -1) return null;

  const x1 = rect.x1;
  const y1 = rect.y1;
  const x2 = rect.x2;
  const y2 = rect.y2;

  const rx1 = Math.min(x1, x2);
  const rx2 = Math.max(x1, x2);
  const ry1 = Math.min(y1, y2);
  const ry2 = Math.max(y1, y2);

  const lines = [];

  // top
  lines.push({ type: "line", x1: rx1, y1: ry1, x2: rx2, y2: ry1, color: rect.color || window.defaultDrawColor, lineStyle: rect.lineStyle || window.defaultDrawLineStyle });
  // right
  lines.push({ type: "line", x1: rx2, y1: ry1, x2: rx2, y2: ry2, color: rect.color || window.defaultDrawColor, lineStyle: rect.lineStyle || window.defaultDrawLineStyle });
  // bottom
  lines.push({ type: "line", x1: rx2, y1: ry2, x2: rx1, y2: ry2, color: rect.color || window.defaultDrawColor, lineStyle: rect.lineStyle || window.defaultDrawLineStyle });
  // left
  lines.push({ type: "line", x1: rx1, y1: ry2, x2: rx1, y2: ry1, color: rect.color || window.defaultDrawColor, lineStyle: rect.lineStyle || window.defaultDrawLineStyle });

  // Replace rectangle with lines
  window.shapes.splice(idx, 1, ...lines);

  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.saveState) window.saveState();
  if (window.draw) window.draw();

  return lines;
}

// Export splitRectangle
window.splitRectangle = splitRectangle;

// ===== INITIALIZATION =====

// ✅ setupCanvasEvents je nyní volaná z init.js
// Aby se předešlo dvojitému volání a zajistilo se, že jsou globální funkce připraveny

// ===== EXPORT HELPER FUNCTIONS =====
window.perpendicular = perpendicular;
window.parallel = parallel;
window.trimLine = trimLine;
window.getMirrorPoint = getMirrorPoint;
window.tangentFromPoint = tangentFromPoint;

// ===== EXPORT =====
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setupCanvasEvents,
  };
}

// EOF - canvas.js
