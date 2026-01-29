/**
 * CONTROLLER.JS - 🎮 Ovladač pro rychlé kreslení úseček a CNC příkazy
 * Plná funkcionalita ze originálního AI_2D_full.html
 */

// ===== GLOBÁLNÍ STÁTY =====
window.controllerMode = "G90"; // G90 = absolutní, G91 = přírůstkové
window.controllerInputBuffer = ""; // Aktuální vstup do controlleru
window.pendingDirection = null; // Čekající směr z directionModal
window.displayDecimals = 2; // Počet desetinných míst

// ===== MODAL FUNKCE =====

window.showControllerModal = function () {
  const modal = document.getElementById("controllerModal");
  if (modal) modal.style.display = "flex";
  updateControllerLastPoint();
};

window.closeControllerModal = function () {
  const modal = document.getElementById("controllerModal");
  if (modal) modal.style.display = "none";
};

window.showDirectionModal = function () {
  const modal = document.getElementById("directionModal");
  if (modal) modal.style.display = "flex";
};

window.closeDirectionModal = function () {
  const modal = document.getElementById("directionModal");
  if (modal) modal.style.display = "none";
};

window.showControllerHelp = function () {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) modal.style.display = "flex";
};

window.closeControllerHelp = function () {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) modal.style.display = "none";
};

// ===== CONTROLLER MODE =====

window.setControllerMode = function (mode) {
  window.controllerMode = mode;

  // Update button styles
  const btnG90 = document.getElementById("btnG90");
  const btnG91 = document.getElementById("btnG91");

  if (mode === "G90") {
    if (btnG90) {
      btnG90.style.background = "#3a7bc8";
      btnG90.style.borderColor = "#5a9be8";
      btnG90.style.color = "white";
    }
    if (btnG91) {
      btnG91.style.background = "#2a2a2a";
      btnG91.style.borderColor = "#444";
      btnG91.style.color = "#888";
    }
  } else {
    if (btnG91) {
      btnG91.style.background = "#3a7bc8";
      btnG91.style.borderColor = "#5a9be8";
      btnG91.style.color = "white";
    }
    if (btnG90) {
      btnG90.style.background = "#2a2a2a";
      btnG90.style.borderColor = "#444";
      btnG90.style.color = "#888";
    }
  }

  // Update display
  const modeDisplay = document.getElementById("controllerModeDisplay");
  if (modeDisplay) {
    modeDisplay.textContent =
      mode === "G90" ? "G90 (Absolutní)" : "G91 (Přírůstkové)";
  }
};

// ===== LAST POINT TRACKING =====

window.updateControllerLastPoint = function () {
  // Najít poslední bod
  let lastPoint = null;

  if (window.shapes && window.shapes.length > 0) {
    const lastShape = window.shapes[window.shapes.length - 1];
    if (lastShape.type === "line") {
      lastPoint = { x: lastShape.x2, y: lastShape.y2 };
    } else if (lastShape.type === "circle") {
      lastPoint = { x: lastShape.cx, y: lastShape.cy };
    }
  }

  if (!lastPoint && window.points && window.points.length > 0) {
    const p = window.points[window.points.length - 1];
    lastPoint = { x: p.x, y: p.y };
  }

  const inlineDisplay = document.getElementById(
    "controllerLastPointInline"
  );
  if (inlineDisplay) {
    if (lastPoint) {
      const displayY =
        window.xMeasureMode === "diameter"
          ? lastPoint.y * 2
          : lastPoint.y;
      inlineDisplay.textContent = `Z${lastPoint.x.toFixed(
        window.displayDecimals
      )} X${displayY.toFixed(window.displayDecimals)}`;
    } else {
      inlineDisplay.textContent = "—";
    }
  }
};

window.updateControllerInputDisplay = function () {
  const input = document.getElementById("controllerInput");
  if (input) {
    input.value = window.controllerInputBuffer;
  }
};

// ===== INPUT TOKEN MANIPULATION =====

window.insertControllerToken = function (text) {
  window.controllerInputBuffer += text;
  window.updateControllerInputDisplay();
};

window.backspaceControllerToken = function () {
  if (window.controllerInputBuffer.length > 0) {
    window.controllerInputBuffer =
      window.controllerInputBuffer.slice(0, -1);
    window.updateControllerInputDisplay();
  }
};

window.clearControllerInput = function () {
  window.controllerInputBuffer = "";
  window.updateControllerInputDisplay();
};

// ===== CONFIRM & PARSE =====

window.confirmControllerInput = function () {
  const input = window.controllerInputBuffer.trim();

  if (!input) {
    alert("Zadej příkaz (např. G0 X50 Z100 nebo G1 X100)");
    return;
  }

  // Zkusit zpracovat jako G-kód příkaz
  const parsed = window.parseGCode(input, window.controllerMode);

  if (parsed) {
    // Reset
    window.controllerInputBuffer = "";
    window.pendingDirection = null;
    window.updateControllerInputDisplay();
    window.updateControllerLastPoint();
  } else {
    // Pokud není G-kód a máme pendingDirection, použít směrový režim
    if (window.pendingDirection) {
      window.executeDirectionDraw(
        window.pendingDirection,
        input
      );
      window.controllerInputBuffer = "";
      window.pendingDirection = null;
      window.updateControllerInputDisplay();
    } else {
      alert(
        "Neplatný příkaz! Použij G-kód (G0, G1, G2, G3) nebo klikni na šipku a zadej parametry."
      );
    }
  }
};

// ===== G-CODE PARSING - KOMPLEXNÍ LOGIKA =====

window.parseGCode = function (input, mode) {
  // NOVĚ: Odstranit všechny mezery před zpracováním
  input = input
    .replace(/\s+/g, "")
    .toUpperCase()
    .trim();

  // Validace: Zkontrolovat zda obsahuje alespoň nějaký parametr
  if (!input || input.length < 2) {
    alert(
      "❌ Příliš krátký příkaz!\n\nZadej např.: G0X50Z100 nebo G1X100"
    );
    return false;
  }

  // Najít poslední bod
  let lastPoint = null;
  if (window.shapes && window.shapes.length > 0) {
    const lastShape = window.shapes[window.shapes.length - 1];
    if (lastShape.type === "line") {
      lastPoint = { x: lastShape.x2, y: lastShape.y2 };
    } else if (lastShape.type === "circle") {
      lastPoint = { x: lastShape.cx, y: lastShape.cy };
    }
  }
  if (!lastPoint && window.points && window.points.length > 0) {
    const p = window.points[window.points.length - 1];
    lastPoint = { x: p.x, y: p.y };
  }
  if (!lastPoint) {
    lastPoint = { x: 0, y: 0 }; // Default
  }

  // Rozdělit na příkazy (středník)
  const commands = input
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c);

  let commandExecuted = false;

  for (const cmd of commands) {
    // Detekce G-kódu
    const gMatch = cmd.match(/^G(\d+)/);
    if (!gMatch) {
      // Pokud není G-kód, zkusit pouze souřadnice (např. X50Z100)
      // To znamená použít G1 (přímku) implicitně
      if (cmd.match(/[XZ]/)) {
        // Rekurzivně zavolat s G1
        return window.parseGCode("G1" + cmd, mode);
      }
      continue;
    }

    const gCode = parseInt(gMatch[1]);

    // Parse parametrů
    const xMatch = cmd.match(/X(-?\d+\.?\d*)/);
    const zMatch = cmd.match(/Z(-?\d+\.?\d*)/);
    const rMatch = cmd.match(/(?<![C])R(-?\d+\.?\d*)/); // R ale ne CR
    const crMatch = cmd.match(/CR(-?\d+\.?\d*)/); // CR - radius menšího úhlu
    const dMatch = cmd.match(/D(-?\d+\.?\d*)/);
    const lMatch = cmd.match(/L(-?\d+\.?\d*)/);
    const aMatch = cmd.match(/A(-?\d+\.?\d*)/);
    const rpMatch = cmd.match(/RP(-?\d+\.?\d*)/);
    const apMatch = cmd.match(/AP(-?\d+\.?\d*)/);
    const iMatch = cmd.match(/I(-?\d+\.?\d*)/);
    const jMatch = cmd.match(/J(-?\d+\.?\d*)/);

    if (gCode === 0) {
      // G0 - Vytvoření bodu
      let x = lastPoint.x;
      let y = lastPoint.y;

      if (mode === "G91") {
        x += zMatch ? parseFloat(zMatch[1]) : 0;
        y += xMatch ? parseFloat(xMatch[1]) : 0;
      } else {
        x = zMatch ? parseFloat(zMatch[1]) : x;
        y = xMatch ? parseFloat(xMatch[1]) : y;
      }

      window.shapes.push({ type: "point", x, y });
      lastPoint = { x, y };
      window.updateSnapPoints?.();
      window.draw?.();
      commandExecuted = true;
    } else if (gCode === 1) {
      // G1 - Přímka
      let x = lastPoint.x;
      let y = lastPoint.y;

      // Polární souřadnice
      const length = lMatch
        ? parseFloat(lMatch[1])
        : rpMatch
        ? parseFloat(rpMatch[1])
        : null;
      const angle = apMatch
        ? parseFloat(apMatch[1])
        : aMatch
        ? parseFloat(aMatch[1])
        : null;

      if (length !== null && angle !== null) {
        const rad = (angle * Math.PI) / 180;
        x = lastPoint.x + length * Math.cos(rad);
        y = lastPoint.y + length * Math.sin(rad);
      } else {
        if (mode === "G91") {
          x += zMatch ? parseFloat(zMatch[1]) : 0;
          y += xMatch ? parseFloat(xMatch[1]) : 0;
        } else {
          x = zMatch ? parseFloat(zMatch[1]) : x;
          y = xMatch ? parseFloat(xMatch[1]) : y;
        }
      }

      window.shapes.push({
        type: "line",
        x1: lastPoint.x,
        y1: lastPoint.y,
        x2: x,
        y2: y,
      });

      lastPoint = { x, y };

      // Auto-select endpoint
      window.autoSelectEndpoint?.(x, y);

      window.updateSnapPoints?.();
      window.draw?.();
      commandExecuted = true;
    } else if (gCode === 2 || gCode === 3) {
      // G2/G3 - Oblouky (zjednodušená verze - kružnice)
      // R = běžný poloměr, CR = poloměr s menším úhlem rozevření
      const r = crMatch
        ? parseFloat(crMatch[1])
        : rMatch
        ? parseFloat(rMatch[1])
        : dMatch
        ? parseFloat(dMatch[1]) / 2
        : null;

      if (!r) {
        alert(
          "❌ Chybí poloměr!\n\nZadej R nebo CR, např.: G2R50 nebo G2CR30"
        );
        continue;
      }

      if (r) {
        window.shapes.push({
          type: "circle",
          cx: lastPoint.x,
          cy: lastPoint.y,
          r: r,
        });

        commandExecuted = true;
        window.updateSnapPoints?.();
        window.draw?.();
      }
    }

    if (gCode === 0 || gCode === 1) {
      commandExecuted = true;
    }
  }

  // Validace: Pokud nebyl proveden žádný příkaz
  if (!commandExecuted) {
    alert(
      "❌ Neplatný příkaz!\n\nPoužij:\n• G0 X50 Z100 (bod)\n• G1 X100 Z200 (čára)\n• G2 R50 (kružnice)\n\nNebo otevři ❓ Help"
    );
    return false;
  }

  return commands.length > 0;
};

// ===== DIRECTION MODAL SUPPORT =====

window.insertDirectionCommand = function (direction) {
  // Směrové úhly
  const directionAngles = {
    E: 0, // →
    NE: 45, // ↗
    N: 90, // ↑
    NW: 135, // ↖
    W: 180, // ←
    SW: 225, // ↙
    S: 270, // ↓
    SE: 315, // ↘
  };

  const angle = directionAngles[direction];

  // Vložit příkaz podle aktuálního režimu
  if (window.controllerMode === "G91") {
    // Přírůstkový režim: G1 G91 AP90 L
    window.controllerInputBuffer = `G1 G91 AP${angle} L`;
  } else {
    // Absolutní režim: G1 AP90 L (méně často používané, ale OK)
    window.controllerInputBuffer = `G1 AP${angle} L`;
  }

  window.updateControllerInputDisplay();
  window.closeDirectionModal();

  // Focus na input
  const input = document.getElementById("controllerInput");
  if (input) input.focus();
};

window.drawDirection = function (direction) {
  // Najít startovní bod
  let startPoint = null;

  if (window.shapes && window.shapes.length > 0) {
    const lastShape = window.shapes[window.shapes.length - 1];
    if (lastShape.type === "line") {
      startPoint = { x: lastShape.x2, y: lastShape.y2 };
    } else if (lastShape.type === "circle") {
      startPoint = { x: lastShape.cx, y: lastShape.cy };
    }
  }

  if (!startPoint && window.points && window.points.length > 0) {
    const p = window.points[window.points.length - 1];
    startPoint = { x: p.x, y: p.y };
  }

  if (!startPoint) {
    alert(
      "Není definován žádný bod! Nejprve vytvoř bod pomocí G0 nebo nakresli první úsečku."
    );
    return;
  }

  // Uložit čekající směr
  window.pendingDirection = direction;

  // Focus na input
  const input = document.getElementById("controllerInput");
  if (input) input.focus();
};

window.executeDirectionDraw = function (direction, input) {
  // Najít startovní bod
  let startPoint = null;

  if (window.shapes && window.shapes.length > 0) {
    const lastShape = window.shapes[window.shapes.length - 1];
    if (lastShape.type === "line") {
      startPoint = { x: lastShape.x2, y: lastShape.y2 };
    } else if (lastShape.type === "circle") {
      startPoint = { x: lastShape.cx, y: lastShape.cy };
    }
  }

  if (!startPoint && window.points && window.points.length > 0) {
    const p = window.points[window.points.length - 1];
    startPoint = { x: p.x, y: p.y };
  }

  if (!startPoint) {
    alert("Není definován žádný bod!");
    return;
  }

  // Parsovat vstup
  const endPoint = window.parseControllerInput(
    input,
    startPoint,
    direction,
    window.controllerMode
  );

  if (endPoint) {
    // Vytvořit úsečku
    window.shapes.push({
      type: "line",
      x1: startPoint.x,
      y1: startPoint.y,
      x2: endPoint.x,
      y2: endPoint.y,
    });

    window.updateSnapPoints?.();
    window.draw?.();
    window.updateControllerLastPoint();
  }
};

window.parseControllerInput = function (
  input,
  startPoint,
  direction,
  mode
) {
  input = input.trim().toUpperCase();

  // Směrové úhly pro jednotlivé směry
  const directionAngles = {
    E: 0, // →
    NE: 45, // ↗
    N: 90, // ↑
    NW: 135, // ↖
    W: 180, // ←
    SW: 225, // ↙
    S: 270, // ↓
    SE: 315, // ↘
  };

  // Pokud je to jen číslo - délka ve směru
  if (/^-?\d+\.?\d*$/.test(input)) {
    const length = parseFloat(input);
    const angle = directionAngles[direction];
    const rad = (angle * Math.PI) / 180;

    return {
      x: startPoint.x + length * Math.cos(rad),
      y: startPoint.y + length * Math.sin(rad),
    };
  }

  // Parsovat X a Z souřadnice
  const xMatch = input.match(/X(-?\d+\.?\d*)/);
  const zMatch = input.match(/Z(-?\d+\.?\d*)/);

  if (xMatch || zMatch) {
    if (mode === "G91") {
      // Přírůstkové souřadnice
      return {
        x: startPoint.x + (zMatch ? parseFloat(zMatch[1]) : 0),
        y: startPoint.y + (xMatch ? parseFloat(xMatch[1]) : 0),
      };
    } else {
      // Absolutní souřadnice (G90)
      return {
        x: zMatch ? parseFloat(zMatch[1]) : startPoint.x,
        y: xMatch ? parseFloat(xMatch[1]) : startPoint.y,
      };
    }
  }

  // Parsovat L/RP (délka) a A/AP (úhel) - POLÁRNÍ SOUŘADNICE
  const lMatch = input.match(/L(-?\d+\.?\d*)/);
  const rpMatch = input.match(/RP(-?\d+\.?\d*)/);
  const aMatch = input.match(/A(-?\d+\.?\d*)/);
  const apMatch = input.match(/AP(-?\d+\.?\d*)/);

  const length = lMatch
    ? parseFloat(lMatch[1])
    : rpMatch
    ? parseFloat(rpMatch[1])
    : null;
  const angle = apMatch
    ? parseFloat(apMatch[1])
    : aMatch
    ? parseFloat(aMatch[1])
    : null;

  if (length !== null) {
    const finalAngle =
      angle !== null ? angle : directionAngles[direction];
    const rad = (finalAngle * Math.PI) / 180;

    return {
      x: startPoint.x + length * Math.cos(rad),
      y: startPoint.y + length * Math.sin(rad),
    };
  }

  alert(
    "Neplatný vstup! Použij:\n• Délku: 50\n• Souřadnice: X100 Z50\n• Polární: L50 AP45 nebo RP50 AP45"
  );
  return null;
};

// ===== MEASURE INPUT (MÍRA) =====
window.measureInputEnabled = false;

window.toggleMeasureInput = function () {
  const checkbox = document.getElementById("enableMeasureInput");
  window.measureInputEnabled = checkbox ? checkbox.checked : false;
};

window.showMeasureInputDialog = function (shapeType) {
  if (!window.measureInputEnabled) return null;

  let title = "";
  let prompt_text = "";
  let defaultValue = "";

  if (shapeType === "line") {
    title = "Délka úsečky";
    prompt_text = "Zadej délku úsečky (mm):";
    defaultValue = "50";
  } else if (shapeType === "circle") {
    title = "Poloměr kružnice";
    prompt_text = "Zadej poloměr kružnice (mm):";
    defaultValue = "25";
  } else if (shapeType === "rectangle") {
    title = "Rozměry obdélníku";
    prompt_text = "Zadej šířku a výšku (oddělené mezerou):\nPř: 100 50";
    defaultValue = "100 50";
  }

  const result = prompt(prompt_text, defaultValue);

  if (result === null) return null; // User cancelled

  return {
    shapeType: shapeType,
    value: result.trim(),
    title: title
  };
};

window.processMeasureInput = function (measureData) {
  if (!measureData || !measureData.value) return null;

  const value = measureData.value;

  if (measureData.shapeType === "line") {
    const distance = parseFloat(value);
    if (!isNaN(distance) && distance > 0) {
      return { type: "line", distance: distance };
    }
  } else if (measureData.shapeType === "circle") {
    const radius = parseFloat(value);
    if (!isNaN(radius) && radius > 0) {
      return { type: "circle", radius: radius };
    }
  } else if (measureData.shapeType === "rectangle") {
    const parts = value.split(/[\s,]+/).map(p => parseFloat(p));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
      return { type: "rectangle", width: parts[0], height: parts[1] };
    }
  }

  alert("Neplatný vstup!");
  return null;
};

// ✅ Keyboard events nyní spravuje unified keyboard.js
// Controller funkce jsou volány z keyboard.js
