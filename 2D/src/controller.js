/**
 * CONTROLLER.JS - 🎮 Ovladač pro rychlé kreslení úseček a CNC příkazy (ES6 hybridní)
 * Plná funkcionalita ze originálního AI_2D_full.html
 * @module controller
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const CONTROLLER = {}; // Bude aktivováno po plné migraci

// ===== GLOBÁLNÍ STÁTY =====
window.controllerMode = "G90"; // G90 = absolutní, G91 = přírůstkové
window.controllerInputBuffer = ""; // Aktuální vstup do controlleru
window.pendingDirection = null; // Čekající směr z directionModal
window.displayDecimals = 2; // Počet desetinných míst

// ===== INICIALIZACE INPUT EVENT LISTENERU =====
// Přidá event listenery pro přímé psaní do inputu (podpora mobilního i desktopového)
document.addEventListener("DOMContentLoaded", function() {
  // Funkce pro nastavení event listenerů na input
  function setupControllerInput(input) {
    if (!input) return;

    // Synchronizace při přímém psaní
    input.addEventListener("input", function(e) {
      window.controllerInputBuffer = e.target.value;
      // Synchronizovat i druhý input
      window.updateControllerInputDisplay();
    });

    // Enter pro potvrzení
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.confirmControllerInput();
      } else if (e.key === "Escape") {
        e.preventDefault();
        window.closeControllerModal();
      }
    });
  }

  // Nastavit oba inputy
  setupControllerInput(document.getElementById("controllerInput"));
  setupControllerInput(document.getElementById("controllerInputDesktop"));
});

// ===== MODAL FUNKCE =====

window.showControllerModal = function () {
  const modal = document.getElementById("controllerModal");
  if (modal) {
    modal.style.display = "flex";

    // Debug při otevření
    setTimeout(window.debugControllerCSS, 100);

    // Na PC: Obnovit uloženou pozici NEBO nastavit výchozí
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      const modalWindow = modal.querySelector('.controller-window');
      if (modalWindow) {
        // Zkontrolovat jestli existuje uložená pozice
        let hasValidPosition = false;
        try {
          const saved = localStorage.getItem('controllerModal_pos');
          if (saved) {
            const pos = JSON.parse(saved);
            if (pos && pos.left && pos.top) {
              const left = parseInt(pos.left, 10);
              const top = parseInt(pos.top, 10);
              // Validovat pozici
              if (left > -400 && left < window.innerWidth - 50 &&
                  top >= 0 && top < window.innerHeight - 50) {
                // Obnovit pozici
                modal.style.alignItems = 'flex-start';
                modal.style.justifyContent = 'flex-start';
                modalWindow.style.position = 'fixed';
                modalWindow.style.left = pos.left;
                modalWindow.style.top = pos.top;
                modalWindow.style.right = 'auto';
                modalWindow.style.bottom = 'auto';
                modalWindow.style.margin = '0';
                modalWindow.style.transform = 'none';
                hasValidPosition = true;
              }
            }
          }
        } catch(e) {}

        // Pokud není validní pozice, nechat CSS výchozí (centrováno dole)
        if (!hasValidPosition) {
          // Reset na výchozí CSS pozicování
          modalWindow.style.position = '';
          modalWindow.style.left = '';
          modalWindow.style.top = '';
          modalWindow.style.right = '';
          modalWindow.style.bottom = '';
          modalWindow.style.margin = '';
          modalWindow.style.transform = '';
          modal.style.alignItems = '';
          modal.style.justifyContent = '';
        }
      }
    }
  }
  updateControllerLastPoint();

  // Focus na správný input po otevření - POUZE na PC!
  // Na mobilu NECHCEME focus, aby se neotevírala systémová klávesnice
  setTimeout(() => {
    const isMobile = window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
      // Pouze na PC - focus na input
      const input = document.getElementById("controllerInputDesktop");
      if (input) input.focus();
    }
    // Na mobilu - žádný focus, používáme virtuální klávesnici v ovladači
  }, 100);
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
  if (modal) {
    modal.classList.remove("d-none");
    modal.style.display = "flex";
  }
};

window.closeControllerHelp = function () {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) {
    modal.classList.add("d-none");
    modal.style.display = "none";
  }
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

// Pomocná funkce pro nalezení posledního bodu
// Preferuje vybraný snap point z pick point mode
window.getLastPoint = function () {
  // Preferuj vybraný snap point (pokud existuje)
  if (window.selectedSnapPoint) {
    return {
      x: window.selectedSnapPoint.x,
      y: window.selectedSnapPoint.y
    };
  }

  let lastPoint = null;

  if (window.shapes && window.shapes.length > 0) {
    // Projít shapes od konce a najít první použitelný bod
    for (let i = window.shapes.length - 1; i >= 0 && !lastPoint; i--) {
      const shape = window.shapes[i];
      if (shape.type === "point") {
        lastPoint = { x: shape.x, y: shape.y };
      } else if (shape.type === "line") {
        lastPoint = { x: shape.x2, y: shape.y2 };
      } else if (shape.type === "circle") {
        lastPoint = { x: shape.cx, y: shape.cy };
      } else if (shape.type === "arc") {
        const endAngle = shape.endAngle || shape.angle2 || 0;
        lastPoint = {
          x: shape.cx + shape.r * Math.cos(endAngle),
          y: shape.cy + shape.r * Math.sin(endAngle)
        };
      }
    }
  }

  // Záloha: zkusit window.points
  if (!lastPoint && window.points && window.points.length > 0) {
    const p = window.points[window.points.length - 1];
    lastPoint = { x: p.x, y: p.y };
  }

  return lastPoint;
};

window.updateControllerLastPoint = function () {
  // Preferujeme vybraný snap point, jinak použijeme getLastPoint()
  let lastPoint = window.selectedSnapPoint || null;
  let pointLabel = lastPoint ? lastPoint.label : "Poslední bod";

  // Pokud nemáme vybraný snap point, použijeme automatickou detekci
  if (!lastPoint) {
    lastPoint = window.getLastPoint();
    pointLabel = "Poslední bod";
  }

  // Aktualizovat nový element - popis typu bodu
  const lastPointLabel = document.getElementById("controllerLastPointLabel");
  const lastPointValue = document.getElementById("controllerLastPointValue");
  const modeLabel = document.getElementById("controllerModeLabel");

  // Aktualizovat label typu bodu
  if (lastPointLabel) {
    lastPointLabel.textContent = `📍 ${pointLabel}:`;
  }

  if (lastPointValue) {
    if (lastPoint) {
      const displayY = window.xMeasureMode === "diameter" ? lastPoint.y * 2 : lastPoint.y;
      lastPointValue.textContent = `X${displayY.toFixed(window.displayDecimals || 2)} Z${lastPoint.x.toFixed(window.displayDecimals || 2)}`;
    } else {
      lastPointValue.textContent = "X0 Z0";
    }
  }

  if (modeLabel) {
    modeLabel.textContent = window.controllerMode || "G90";
  }

  // Zpětná kompatibilita - starý element
  const inlineDisplay = document.getElementById("controllerLastPointInline");
  if (inlineDisplay) {
    if (lastPoint) {
      const displayY = window.xMeasureMode === "diameter" ? lastPoint.y * 2 : lastPoint.y;
      inlineDisplay.textContent = `Z${lastPoint.x.toFixed(window.displayDecimals || 2)} X${displayY.toFixed(window.displayDecimals || 2)}`;
    } else {
      inlineDisplay.textContent = "—";
    }
  }
};

// ===== PICK POINT MODE =====
window.pickPointMode = false;
window.pickPointCallback = null;

/**
 * Aktivuje režim výběru bodu z mapy
 * Umožňuje vybrat: bod, průsečík, konec úsečky, střed kružnice
 * NEVYTVÁŘÍ nové body - pouze vybírá existující
 */
window.startPickPointMode = function () {
  window.pickPointMode = true;
  window.highlightedSnapPoint = null; // Reset pro nový výběr

  // Zavřít controller modal dočasně
  window.closeControllerModal();

  // Změnit kurzor
  const canvas = document.getElementById("canvas");
  if (canvas) {
    canvas.style.cursor = "crosshair";
  }

  // Zobrazit instrukce
  window.showPickPointToast();

  // Okamžitě překreslit pro zobrazení instrukcí
  if (window.draw) window.draw();

  // Nastavit callback pro kliknutí
  window.pickPointCallback = function (point) {
    if (point) {
      // NEUVYTVÁŘET nový bod - pouze uložit vybraný snap point
      // Uložíme do window.selectedSnapPoint pro další použití
      window.selectedSnapPoint = {
        x: point.x,
        y: point.y,
        type: point.type || "point",
        label: point.label || "Bod"
      };

      // Překreslit (pro zvýraznění vybraného bodu)
      if (typeof window.drawAll === "function") {
        window.drawAll();
      }

      // Aktualizovat poslední bod s popisným labelem
      window.updateControllerLastPoint();

      // Zobrazit potvrzení s popisem typu bodu
      if (typeof window.showToast === "function") {
        const displayY = point.y * (window.xMeasureMode === "diameter" ? 2 : 1);
        window.showToast(`✅ ${point.label}: X${displayY.toFixed(2)} Z${point.x.toFixed(2)}`);
      }
    }

    // Ukončit režim
    window.endPickPointMode();

    // Znovu otevřít controller
    setTimeout(() => window.showControllerModal(), 100);
  };
};

/**
 * Ukončí režim výběru bodu
 */
window.endPickPointMode = function () {
  window.pickPointMode = false;
  window.pickPointCallback = null;
  window.highlightedSnapPoint = null; // Reset vizuálního highlightu

  const canvas = document.getElementById("myCanvas");
  if (canvas) {
    canvas.style.cursor = "default";
  }

  // Skrýt instrukce
  window.hidePickPointToast();

  // Překreslit pro odstranění highlightu
  if (typeof window.draw === "function") {
    window.draw();
  }
};

/**
 * Zobrazí toast s instrukcemi pro výběr bodu
 */
window.showPickPointToast = function () {
  let toast = document.getElementById("pickPointToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "pickPointToast";
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #2a3a4a, #1a2a3a);
      color: #4ade80;
      padding: 12px 24px;
      border-radius: 8px;
      border: 1px solid #4ade80;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    🎯 <strong>Vyber bod na mapě</strong><br>
    <span style="font-size: 12px; color: #888;">Klikni na: bod, průsečík, konec úsečky, střed kružnice</span><br>
    <button onclick="window.endPickPointMode(); window.showControllerModal();" style="margin-top: 8px; padding: 4px 12px; background: #444; border: 1px solid #666; border-radius: 4px; color: #ccc; cursor: pointer;">Zrušit</button>
  `;
  toast.style.display = "block";
};

/**
 * Skryje toast pro výběr bodu
 */
window.hidePickPointToast = function () {
  const toast = document.getElementById("pickPointToast");
  if (toast) {
    toast.style.display = "none";
  }
};

/**
 * Najde nejbližší bod k danému místu kliknutí
 * Hledá: body, průsečíky, konce úseček, středy kružnic
 * @param {number} mouseX - X souřadnice v SCREEN pixelech
 * @param {number} mouseY - Y souřadnice v SCREEN pixelech
 * @param {number} threshold - Dosah v SCREEN pixelech (výchozí 50)
 */
window.findNearestSnapPoint = function (mouseX, mouseY, threshold = 50) {
  const candidates = [];

  // Použijeme správné proměnné pro viewport
  const canvas = document.getElementById("canvas");
  if (!canvas) return null;

  const zoom = window.zoom || 2;
  const panX = window.panX || canvas.width / 2;
  const panY = window.panY || canvas.height / 2;

  // Použít STEJNOU konverzi jako screenToWorld v drawing.js!
  // screenToWorld: x = (sx - panX) / zoom, y = (panY - sy) / zoom
  const worldX = (mouseX - panX) / zoom;
  const worldY = (panY - mouseY) / zoom;

  console.log('[findNearestSnapPoint] Mouse:', mouseX, mouseY);
  console.log('[findNearestSnapPoint] World:', worldX, worldY);
  console.log('[findNearestSnapPoint] Zoom:', zoom, 'PanX:', panX, 'PanY:', panY);

  // 1. Explicitní body
  if (window.points && window.points.length > 0) {
    for (const p of window.points) {
      candidates.push({ x: p.x, y: p.y, type: "point", label: p.label || "Bod" });
    }
  }

  // 2. Body z shapes (point type)
  if (window.shapes && window.shapes.length > 0) {
    for (const shape of window.shapes) {
      if (shape.type === "point") {
        candidates.push({ x: shape.x, y: shape.y, type: "point", label: shape.label || "Bod" });
      } else if (shape.type === "line") {
        // Počáteční a koncový bod úsečky
        candidates.push({ x: shape.x1, y: shape.y1, type: "line-start", label: "Začátek úsečky" });
        candidates.push({ x: shape.x2, y: shape.y2, type: "line-end", label: "Konec úsečky" });
      } else if (shape.type === "circle") {
        // Střed kružnice
        candidates.push({ x: shape.cx, y: shape.cy, type: "circle-center", label: "Střed kružnice" });
        // Kardinální body na kružnici
        candidates.push({ x: shape.cx + shape.r, y: shape.cy, type: "circle-quad", label: "Kružnice E" });
        candidates.push({ x: shape.cx - shape.r, y: shape.cy, type: "circle-quad", label: "Kružnice W" });
        candidates.push({ x: shape.cx, y: shape.cy + shape.r, type: "circle-quad", label: "Kružnice N" });
        candidates.push({ x: shape.cx, y: shape.cy - shape.r, type: "circle-quad", label: "Kružnice S" });
      } else if (shape.type === "arc") {
        // Střed oblouku
        candidates.push({ x: shape.cx, y: shape.cy, type: "arc-center", label: "Střed oblouku" });
        // Počáteční a koncový bod oblouku
        const startAngle = shape.startAngle || shape.angle1 || 0;
        const endAngle = shape.endAngle || shape.angle2 || 0;
        candidates.push({
          x: shape.cx + shape.r * Math.cos(startAngle),
          y: shape.cy + shape.r * Math.sin(startAngle),
          type: "arc-start",
          label: "Začátek oblouku"
        });
        candidates.push({
          x: shape.cx + shape.r * Math.cos(endAngle),
          y: shape.cy + shape.r * Math.sin(endAngle),
          type: "arc-end",
          label: "Konec oblouku"
        });
      }
    }
  }

  // 3. Průsečíky (pokud existují)
  if (window.intersections && window.intersections.length > 0) {
    for (const inter of window.intersections) {
      candidates.push({ x: inter.x, y: inter.y, type: "intersection", label: "Průsečík" });
    }
  }

  console.log('[findNearestSnapPoint] Candidates:', candidates.length);

  // Najít nejbližší bod - porovnáváme v SCREEN souřadnicích!
  // Převedeme kandidáty na screen souřadnice a porovnáme s pozicí myši
  let nearest = null;
  let minDist = threshold; // threshold je v SCREEN pixelech

  for (const c of candidates) {
    // Převod world -> screen: screenX = c.x * zoom + panX, screenY = panY - c.y * zoom
    const candidateScreenX = c.x * zoom + panX;
    const candidateScreenY = panY - c.y * zoom;

    // Vzdálenost v SCREEN pixelech
    const dist = Math.sqrt((candidateScreenX - mouseX) ** 2 + (candidateScreenY - mouseY) ** 2);
    console.log('[findNearestSnapPoint] Candidate:', c.x, c.y, 'screenPos:', candidateScreenX.toFixed(0), candidateScreenY.toFixed(0), 'dist:', dist.toFixed(1), 'threshold:', threshold);
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }

  return nearest;
};

// Helper: získat aktivní input (mobilní nebo desktopový)
function getActiveControllerInput() {
  // Mobilní input má přednost pokud je viditelný
  const mobileInput = document.getElementById("controllerInput");
  const desktopInput = document.getElementById("controllerInputDesktop");

  // Zkontrolovat který je viditelný
  if (mobileInput && mobileInput.offsetParent !== null) {
    return mobileInput;
  }
  if (desktopInput && desktopInput.offsetParent !== null) {
    return desktopInput;
  }
  // Fallback
  return mobileInput || desktopInput;
}

window.updateControllerInputDisplay = function () {
  // Aktualizovat oba inputy
  const mobileInput = document.getElementById("controllerInput");
  const desktopInput = document.getElementById("controllerInputDesktop");

  if (mobileInput) {
    mobileInput.value = window.controllerInputBuffer;
  }
  if (desktopInput) {
    desktopInput.value = window.controllerInputBuffer;
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

  // Zapamatovat počet tvarů před vytvořením
  const shapeCountBefore = window.shapes ? window.shapes.length : 0;

  // Zkusit zpracovat jako G-kód příkaz
  const parsed = window.parseGCode(input, window.controllerMode);

  if (parsed) {
    // Reset - vyčistit selectedSnapPoint, protože teď máme nový poslední bod
    window.controllerInputBuffer = "";
    window.pendingDirection = null;
    window.selectedSnapPoint = null; // Reset po úspěšném příkazu
    window.updateControllerInputDisplay();
    window.updateControllerLastPoint();

    // Zavřít modal a vycentrovat na nový objekt
    window.closeControllerModal();
    window.centerOnLastCreatedObject(shapeCountBefore);
  } else {
    // Pokud není G-kód a máme pendingDirection, použít směrový režim
    if (window.pendingDirection) {
      window.executeDirectionDraw(
        window.pendingDirection,
        input
      );
      window.controllerInputBuffer = "";
      window.pendingDirection = null;
      window.selectedSnapPoint = null; // Reset po úspěšném příkazu
      window.updateControllerInputDisplay();

      // Zavřít modal a vycentrovat
      window.closeControllerModal();
      window.centerOnLastCreatedObject(shapeCountBefore);
    } else {
      alert(
        "Neplatný příkaz! Použij G-kód (G0, G1, G2, G3) nebo klikni na šipku a zadej parametry."
      );
    }
  }
};

// ===== CENTER ON CREATED OBJECT =====

window.centerOnPoint = function (x, y, animate = true, setZoom = true) {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  // Nastavit zoom tak, aby bylo vidět ~500mm šířky (pokud je zoom příliš velký)
  if (setZoom) {
    const targetVisibleWidth = 500; // mm
    const desiredZoom = canvas.width / targetVisibleWidth;
    // Zoom by měl být mezi 0.5 a 10
    const clampedZoom = Math.max(0.5, Math.min(10, desiredZoom));
    // Pouze zmenšit zoom pokud je moc velký, nezměnšovat pokud uživatel oddálil
    if (window.zoom > clampedZoom) {
      window.zoom = clampedZoom;
    }
  }

  // Výpočet nové pozice panování pro vycentrování na bod
  const targetPanX = canvas.width / 2 - x * (window.zoom || 2);
  const targetPanY = canvas.height / 2 + y * (window.zoom || 2);

  if (animate && window.panX !== undefined) {
    // Animované posunutí
    const startPanX = window.panX;
    const startPanY = window.panY;
    const duration = 300; // ms
    const startTime = performance.now();

    function animatePan(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing funkce (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);

      window.panX = startPanX + (targetPanX - startPanX) * eased;
      window.panY = startPanY + (targetPanY - startPanY) * eased;

      if (window.draw) window.draw();

      if (progress < 1) {
        requestAnimationFrame(animatePan);
      }
    }

    requestAnimationFrame(animatePan);
  } else {
    // Okamžité posunutí
    if (window.panX !== undefined) window.panX = targetPanX;
    if (window.panY !== undefined) window.panY = targetPanY;
    if (window.draw) window.draw();
  }
};

window.centerOnLastCreatedObject = function (shapeCountBefore) {
  if (!window.shapes || window.shapes.length === 0) return;

  // Najít nově vytvořené tvary
  const newShapes = window.shapes.slice(shapeCountBefore);

  if (newShapes.length === 0) {
    // Pokud nebyl vytvořen nový tvar, zkontrolovat body
    if (window.points && window.points.length > 0) {
      const lastPoint = window.points[window.points.length - 1];
      window.centerOnPoint(lastPoint.x, lastPoint.y);
      window.showSuccessToast("✓ Bod vytvořen");
    }
    return;
  }

  // Vypočítat střed všech nových tvarů
  let sumX = 0, sumY = 0, count = 0;
  let objectType = "";

  newShapes.forEach(shape => {
    if (shape.type === "point") {
      // Pro bod
      sumX += shape.x;
      sumY += shape.y;
      count++;
      objectType = "Bod";
    } else if (shape.type === "line") {
      // Pro čáru - střed čáry nebo koncový bod
      sumX += shape.x2;
      sumY += shape.y2;
      count++;
      objectType = "Čára";
    } else if (shape.type === "circle") {
      sumX += shape.cx;
      sumY += shape.cy;
      count++;
      objectType = "Kružnice";
    } else if (shape.type === "arc") {
      sumX += shape.cx;
      sumY += shape.cy;
      count++;
      objectType = "Oblouk";
    }
  });

  if (count > 0) {
    const centerX = sumX / count;
    const centerY = sumY / count;
    window.centerOnPoint(centerX, centerY);

    // Zobrazit úspěšnou zprávu
    const message = count === 1 ? `✓ ${objectType} vytvořena` : `✓ Vytvořeno ${count} objektů`;
    window.showSuccessToast(message);
  }
};

// ===== SUCCESS TOAST =====

window.showSuccessToast = function (message) {
  // Odstranit existující toast
  const existingToast = document.getElementById("successToast");
  if (existingToast) existingToast.remove();

  // Vytvořit nový toast
  const toast = document.createElement("div");
  toast.id = "successToast";
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
    z-index: 10200;
    animation: toastSlideUp 0.3s ease-out;
  `;
  toast.textContent = message;

  // Přidat animaci do stylu dokumentu (jednou)
  if (!document.getElementById("toastAnimStyle")) {
    const style = document.createElement("style");
    style.id = "toastAnimStyle";
    style.textContent = `
      @keyframes toastSlideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes toastFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Automaticky zmizí po 2 sekundách
  setTimeout(() => {
    toast.style.animation = "toastFadeOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
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

  // Najít poslední bod - použít sdílenou funkci
  let lastPoint = window.getLastPoint() || { x: 0, y: 0 };

  console.log("[parseGCode] lastPoint:", lastPoint);

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
      // Pokud není G-kód, zkusit implicitně:
      // - Souřadnice: X50 Z100 -> G1
      // - Polární: L54 AP0, AP45 L80 -> G1
      // - Poloměr: R50 nebo D100 -> G2 (kružnice)

      // Kontrola zda je to jen poloměr (R nebo D) bez souřadnic - pak to je kružnice
      const isCircleOnly = cmd.match(/^(R|D|CR)\d+\.?\d*$/i);
      if (isCircleOnly) {
        // Je to kružnice - použij G2
        return window.parseGCode("G2 " + cmd, mode);
      }

      if (cmd.match(/[XZLARPC]/i)) {
        // Rekurzivně zavolat s G1
        return window.parseGCode("G1" + cmd, mode);
      }
      continue;
    }

    const gCode = parseInt(gMatch[1]);

    // Parse parametrů - pořadí je důležité! Delší patterny první.
    const xMatch = cmd.match(/X(-?\d+\.?\d*)/);
    const zMatch = cmd.match(/Z(-?\d+\.?\d*)/);
    const crMatch = cmd.match(/CR(-?\d+\.?\d*)/); // CR první (před R)
    const rMatch = cmd.match(/(?<![C])R(-?\d+\.?\d*)/); // R ale ne CR
    const dMatch = cmd.match(/D(-?\d+\.?\d*)/);
    const lMatch = cmd.match(/L(-?\d+\.?\d*)/);
    const rpMatch = cmd.match(/RP(-?\d+\.?\d*)/); // RP první (před R)
    const apMatch = cmd.match(/AP(-?\d+\.?\d*)/); // AP první (před A)
    const aMatch = cmd.match(/(?<![R])A(?!P)(-?\d+\.?\d*)/); // A ale ne AP ani RA
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

      console.log("[G1] length:", length, "angle:", angle, "from cmd:", cmd);

      if (length !== null && angle !== null) {
        const rad = (angle * Math.PI) / 180;
        x = lastPoint.x + length * Math.cos(rad);
        y = lastPoint.y + length * Math.sin(rad);
        console.log("[G1 Polar] new point:", x, y);
      } else if (length !== null || angle !== null) {
        // Pokud je zadaná jen délka nebo jen úhel - chyba
        alert("❌ Pro polární souřadnice zadej oba parametry!\n\nPříklad: L54 AP0 nebo AP45 L80");
        return false;
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
        console.log('[R50 DEBUG] Creating circle:', {
          cx: lastPoint.x,
          cy: lastPoint.y,
          r: r,
          color: window.defaultDrawColor || "#4a9eff",
          lineStyle: window.defaultDrawLineStyle || "solid"
        });

        window.shapes.push({
          type: "circle",
          cx: lastPoint.x,
          cy: lastPoint.y,
          r: r,
          color: window.defaultDrawColor || "#4a9eff",
          lineStyle: window.defaultDrawLineStyle || "solid"
        });

        console.log('[R50 DEBUG] Shapes array length:', window.shapes.length);
        console.log('[R50 DEBUG] Last shape:', window.shapes[window.shapes.length - 1]);

        commandExecuted = true;

        if (window.updateSnapPoints) {
          window.updateSnapPoints();
          console.log('[R50 DEBUG] Snap points updated');
        }

        if (window.draw) {
          window.draw();
          console.log('[R50 DEBUG] Draw called');
        }
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

// ===== G90/G91 MODE TOGGLE =====

// Aktivní popup kontext ('controller' nebo 'qi')
window.activePopupContext = null;

// Toggle mode pro Controller (aktualizuje oba toggle buttony - mobilní i desktopový)
window.toggleControllerMode = function () {
  const btn = document.getElementById("btnControllerModeToggle");
  const btnDesktop = document.getElementById("btnControllerModeToggleDesktop");
  const modeLabel = document.getElementById("controllerModeLabel");

  if (window.controllerMode === "G90") {
    window.controllerMode = "G91";
  } else {
    window.controllerMode = "G90";
  }

  // Aktualizovat oba buttony
  [btn, btnDesktop].forEach(b => {
    if (b) {
      b.textContent = window.controllerMode;
      if (window.controllerMode === "G90") {
        b.classList.remove("g91");
        b.classList.add("g90");
      } else {
        b.classList.remove("g90");
        b.classList.add("g91");
      }
    }
  });

  // Aktualizovat mode label
  if (modeLabel) {
    modeLabel.textContent = window.controllerMode;
  }
};

// Toggle mode pro QuickInput
window.qiMode = "G90";

window.toggleQiMode = function () {
  const btn = document.getElementById("btnQiModeToggle");
  if (!btn) return;

  if (window.qiMode === "G90") {
    window.qiMode = "G91";
    btn.textContent = "G91";
    btn.classList.remove("g90");
    btn.classList.add("g91");
  } else {
    window.qiMode = "G90";
    btn.textContent = "G90";
    btn.classList.remove("g91");
    btn.classList.add("g90");
  }
};

// ===== G-CODE POPUP =====

window.showGCodePopup = function (context) {
  window.activePopupContext = context;
  const overlay = document.getElementById("gCodePopupOverlay");
  const popup = document.getElementById("gCodePopup");
  if (overlay) overlay.classList.add("active");
  if (popup) popup.classList.add("active");
};

window.closeGCodePopup = function () {
  const overlay = document.getElementById("gCodePopupOverlay");
  const popup = document.getElementById("gCodePopup");
  if (overlay) overlay.classList.remove("active");
  if (popup) popup.classList.remove("active");
  window.activePopupContext = null;
};

// ===== PARAM POPUP =====

window.showParamPopup = function (context) {
  window.activePopupContext = context;
  const overlay = document.getElementById("paramPopupOverlay");
  const popup = document.getElementById("paramPopup");
  if (overlay) overlay.classList.add("active");
  if (popup) popup.classList.add("active");
};

window.closeParamPopup = function () {
  const overlay = document.getElementById("paramPopupOverlay");
  const popup = document.getElementById("paramPopup");
  if (overlay) overlay.classList.remove("active");
  if (popup) popup.classList.remove("active");
  window.activePopupContext = null;
};

// ===== INSERT FROM POPUP =====

window.insertPopupToken = function (token) {
  const context = window.activePopupContext;

  if (context === "controller") {
    window.insertControllerToken(token);
  } else if (context === "qi") {
    window.insertToken(token);
  }

  // Zavřít oba popupy
  window.closeGCodePopup();
  window.closeParamPopup();
};

// ===== CLEAR FUNCTIONS =====

window.clearQuickInput = function () {
  const display = document.getElementById("quickInputDisplay");
  if (display) display.value = "";
};

// ===== CALCULATOR FUNCTIONS =====

window.calculatorExpression = "0"; // Celý výraz (např. "25+15×2")
window.calculatorResult = null;

window.showCalculator = function() {
  const modal = document.getElementById("calculatorModal");
  if (modal) {
    modal.classList.remove("d-none");
    modal.style.display = "flex";
  }
  window.calculatorExpression = "0";
  window.calculatorResult = null;
  window.updateCalcDisplay();
};

window.closeCalculator = function() {
  const modal = document.getElementById("calculatorModal");
  if (modal) {
    modal.classList.add("d-none");
    modal.style.display = "none";
  }
};

window.updateCalcDisplay = function() {
  const display = document.getElementById("calcDisplay");
  if (display) {
    // Zobrazit celý výraz
    display.textContent = window.calculatorExpression;
  }
};

window.calcInsert = function(char) {
  const operators = ['+', '-', '*', '/'];

  if (operators.includes(char)) {
    // Operátor - přidat k výrazu
    if (window.calculatorExpression === "0") {
      window.calculatorExpression = "0" + char;
    } else {
      // Nahradit × a ÷ za * a /
      const displayOp = char === '*' ? '×' : char === '/' ? '÷' : char;
      window.calculatorExpression += displayOp;
    }
  } else {
    // Číslice nebo tečka
    if (window.calculatorExpression === "0" && char !== ".") {
      window.calculatorExpression = char;
    } else {
      window.calculatorExpression += char;
    }
  }

  window.updateCalcDisplay();
};

window.calcClear = function() {
  window.calculatorExpression = "0";
  window.calculatorResult = null;
  window.updateCalcDisplay();
};

window.calcBackspace = function() {
  if (window.calculatorExpression.length > 1) {
    window.calculatorExpression = window.calculatorExpression.slice(0, -1);
  } else {
    window.calculatorExpression = "0";
  }
  window.updateCalcDisplay();
};

window.calcInsertToController = function() {
  // Vypočítat výsledek
  try {
    // Nahradit × a ÷ za * a / pro eval
    let expr = window.calculatorExpression.replace(/×/g, '*').replace(/÷/g, '/');
    let result = eval(expr);

    // Zaokrouhlit na 6 desetinných míst
    result = Math.round(result * 1000000) / 1000000;

    // Vložit VÝSLEDEK do controlleru
    window.insertControllerToken(result.toString());

    // Zavřít kalkulačku a otevřít controller
    window.closeCalculator();
    window.showControllerModal();
  } catch (e) {
    alert("❌ Chyba ve výpočtu: " + e.message);
  }};

// ===== AI KEYBOARD FUNKCE =====
window.aiKeyboardBuffer = "";

window.openAIKeyboard = function() {
  const modal = document.getElementById("aiKeyboardModal");
  if (modal) {
    modal.style.display = "flex";
    window.aiKeyboardBuffer = "";
    window.updateAIKeyboardDisplay();
    // Focus na input
    setTimeout(() => {
      const input = document.getElementById("aiKeyboardInput");
      if (input) input.focus();
    }, 100);
  }
};

window.closeAIKeyboard = function() {
  const modal = document.getElementById("aiKeyboardModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.insertAIToken = function(text) {
  window.aiKeyboardBuffer += text;
  window.updateAIKeyboardDisplay();
};

window.backspaceAIToken = function() {
  if (window.aiKeyboardBuffer.length > 0) {
    window.aiKeyboardBuffer = window.aiKeyboardBuffer.slice(0, -1);
    window.updateAIKeyboardDisplay();
  }
};

window.clearAIKeyboardInput = function() {
  window.aiKeyboardBuffer = "";
  window.updateAIKeyboardDisplay();
};

window.updateAIKeyboardDisplay = function() {
  const input = document.getElementById("aiKeyboardInput");
  if (input) {
    input.value = window.aiKeyboardBuffer;
  }
};

window.sendAIKeyboardMessage = function() {
  if (!window.aiKeyboardBuffer.trim()) {
    if (typeof window.showToast === "function") {
      window.showToast("⚠️ Napiš nějakou zprávu", 2000);
    }
    return;
  }

  // Vložit text do AI promptu
  const aiPrompt = document.getElementById("aiPrompt");
  if (aiPrompt) {
    aiPrompt.value = window.aiKeyboardBuffer;
  }

  // Zavřít klávesnici
  window.closeAIKeyboard();

  // Odeslat do AI
  if (typeof window.callGemini === "function") {
    window.callGemini();
  }
};

// Event listener pro AI keyboard input
document.addEventListener("DOMContentLoaded", function() {
  const aiKbInput = document.getElementById("aiKeyboardInput");
  if (aiKbInput) {
    aiKbInput.addEventListener("input", function(e) {
      window.aiKeyboardBuffer = e.target.value;
    });

    aiKbInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.sendAIKeyboardMessage();
      } else if (e.key === "Escape") {
        e.preventDefault();
        window.closeAIKeyboard();
      }
    });
  }
});

// ✅ Keyboard events nyní spravuje unified keyboard.js
// Controller funkce jsou volány z keyboard.js