/**
 * UTILS.JS - Utility funkce
 * - API Key management (Gemini + Groq)
 * - localStorage operace
 * - Geometrické kalkulace
 * - Pomocné funkce
 */

// Globální proměnné jsou inicializovány v globals.js
// Zde pouze používáme window.API_STORAGE_KEY atd.

function getStoredKeys() {
  try {
    return JSON.parse(localStorage.getItem(window.API_STORAGE_KEY || "soustruznik_api_keys") || "[]");
  } catch (e) {
    return [];
  }
}

function saveStoredKeys(keys) {
  localStorage.setItem(window.API_STORAGE_KEY || "soustruznik_api_keys", JSON.stringify(keys));
}

// ===== GROQ API KEY MANAGEMENT =====

function getStoredGroqKeys() {
  try {
    return JSON.parse(localStorage.getItem("soustruznik_groq_api_keys") || "[]");
  } catch (e) {
    return [];
  }
}

function saveStoredGroqKeys(keys) {
  localStorage.setItem("soustruznik_groq_api_keys", JSON.stringify(keys));
}

window.getCurrentGroqApiKey = function () {
  const keys = getStoredGroqKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.key;
  }

  // Použij globální Groq API klíč z globals.js
  const EMBEDDED_GROQ_API_KEY = window.EMBEDDED_GROQ_API_KEY;
  if (EMBEDDED_GROQ_API_KEY && EMBEDDED_GROQ_API_KEY.length > 20) {
    return EMBEDDED_GROQ_API_KEY;
  }

  console.warn("⚠️ No Groq API key available");
  return null;
};

window.getCurrentGroqApiKeyName = function () {
  const keys = getStoredGroqKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.name || "Neznámý Groq klíč";
  }

  // Vrátit název embedded Groq klíče
  const EMBEDDED_GROQ_API_KEY = window.EMBEDDED_GROQ_API_KEY;
  if (EMBEDDED_GROQ_API_KEY && EMBEDDED_GROQ_API_KEY.length > 20) {
    return "Demo Groq Key";
  }

  return "Žádný Groq klíč";
};

window.renderGroqKeyList = function () {
  const list = document.getElementById("groqKeyList");
  if (!list) return;

  const keys = getStoredGroqKeys();
  list.innerHTML = "";

  if (keys.length === 0) {
    list.innerHTML = `<div style="padding: 10px; color: #555; font-style: italic; text-align: center;">Žádné Groq klíče</div>`;
    return;
  }

  keys.forEach((k, i) => {
    const div = document.createElement("div");
    div.style.cssText = `
      background: ${k.active ? "#1a4d2e" : "#333"};
      border: 1px solid ${k.active ? "#4caf50" : "#555"};
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 8px;
      font-size: 12px;
    `;

    // Pokud je to demo Groq klíč, zobraz tečky, jinak zobraz prvních 20 znaků
    let displayKey;
    if (window.EMBEDDED_GROQ_API_KEY && k.key === window.EMBEDDED_GROQ_API_KEY) {
      displayKey = "•".repeat(40) + " (Demo Groq klíč)";
    } else {
      displayKey = k.key.substring(0, 20) + "...";
    }

    const statusBadge = k.active ? `<span style="color: #4caf50; font-weight: bold;">✓ AKTIVNÍ</span>` : `<span style="color: #999;">Neaktivní</span>`;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <strong style="color: #fff;">${k.name || `Groq Key ${i + 1}`}</strong>
        ${statusBadge}
      </div>
      <div style="font-family: monospace; color: #aaa; margin-bottom: 5px; word-break: break-all;">
        ${displayKey}
      </div>
      <div style="display: flex; gap: 5px;">
        <button onclick="window.switchGroqApiKey(${i})" style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Použít
        </button>
        <button onclick="window.removeGroqApiKey(${i})" style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Smazat
        </button>
      </div>
    `;
    list.appendChild(div);
  });
};

window.switchGroqApiKey = function (idx) {
  const keys = getStoredGroqKeys();
  keys.forEach((k, i) => {
    k.active = i === idx;
  });
  saveStoredGroqKeys(keys);
  if (window.renderGroqKeyList) window.renderGroqKeyList();
  alert("✅ Groq klíč aktivován!");
};

window.removeGroqApiKey = function (idx) {
  const keys = getStoredGroqKeys();
  keys.splice(idx, 1);
  saveStoredGroqKeys(keys);
  if (window.renderGroqKeyList) window.renderGroqKeyList();
};

window.addGroqApiKey = function () {
  const input = document.getElementById("newGroqKeyValue");
  const nameInput = document.getElementById("newGroqKeyName");
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    alert("Vyplň Groq API klíč prosím!");
    return;
  }

  const name = nameInput?.value.trim() || "Groq Key";
  const keys = getStoredGroqKeys();
  keys.push({
    key: key,
    name: name,
    active: true
  });

  // Deaktivuj ostatní klíče
  keys.forEach((k, i) => {
    k.active = i === keys.length - 1;
  });

  saveStoredGroqKeys(keys);
  input.value = "";
  if (nameInput) nameInput.value = "";
  if (window.renderGroqKeyList) window.renderGroqKeyList();
  alert("✅ Groq klíč přidán a aktivován!");
};

// Provider Tab Switching
window.switchProviderTab = function(provider) {
  const tabGemini = document.getElementById("tabGemini");
  const tabGroq = document.getElementById("tabGroq");
  const tabOpenRouter = document.getElementById("tabOpenRouter");
  const tabMistral = document.getElementById("tabMistral");
  const geminiContent = document.getElementById("geminiTabContent");
  const groqContent = document.getElementById("groqTabContent");
  const openrouterContent = document.getElementById("openrouterTabContent");
  const mistralContent = document.getElementById("mistralTabContent");

  // Reset všechny taby
  [tabGemini, tabGroq, tabOpenRouter, tabMistral].forEach(tab => {
    if (tab) {
      tab.style.background = "#444";
      tab.style.color = "#aaa";
      tab.style.fontWeight = "normal";
    }
  });

  [geminiContent, groqContent, openrouterContent, mistralContent].forEach(content => {
    if (content) content.style.display = "none";
  });

  // Aktivuj vybraný tab
  if (provider === "gemini" && tabGemini && geminiContent) {
    tabGemini.style.background = "#3a7bc8";
    tabGemini.style.color = "white";
    tabGemini.style.fontWeight = "bold";
    geminiContent.style.display = "block";
    if (window.renderKeyList) window.renderKeyList();
  } else if (provider === "groq" && tabGroq && groqContent) {
    tabGroq.style.background = "#3a7bc8";
    tabGroq.style.color = "white";
    tabGroq.style.fontWeight = "bold";
    groqContent.style.display = "block";
    if (window.renderGroqKeyList) window.renderGroqKeyList();
  } else if (provider === "openrouter" && tabOpenRouter && openrouterContent) {
    tabOpenRouter.style.background = "#3a7bc8";
    tabOpenRouter.style.color = "white";
    tabOpenRouter.style.fontWeight = "bold";
    openrouterContent.style.display = "block";
    if (window.renderOpenRouterKeyList) window.renderOpenRouterKeyList();
  } else if (provider === "mistral" && tabMistral && mistralContent) {
    tabMistral.style.background = "#3a7bc8";
    tabMistral.style.color = "white";
    tabMistral.style.fontWeight = "bold";
    mistralContent.style.display = "block";
    if (window.renderMistralKeyList) window.renderMistralKeyList();
  }
};

// ===== GEMINI API KEY MANAGEMENT (original) =====

window.getCurrentApiKey = function () {
  const keys = getStoredKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.key;
  }

  // Použij globální API klíč z globals.js
  const EMBEDDED_API_KEY = window.EMBEDDED_API_KEY;
  if (EMBEDDED_API_KEY && EMBEDDED_API_KEY.length > 20) {
    return EMBEDDED_API_KEY;
  }

  console.warn("⚠️ No API key available");
  return null;
};

window.getCurrentApiKeyName = function () {
  const keys = getStoredKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.name || "Neznámý klíč";
  }

  // Vrátit název embeded klíče
  const EMBEDDED_API_KEY = window.EMBEDDED_API_KEY;
  if (EMBEDDED_API_KEY && EMBEDDED_API_KEY.length > 20) {
    return "Demo Key";
  }

  return "Žádný klíč";
};

window.switchToNextApiKey = function () {
  const keys = getStoredKeys();
  if (keys.length <= 1) {
    return false;
  }

  const activeIdx = keys.findIndex((k) => k.active);
  const nextIdx = (activeIdx + 1) % keys.length;

  keys.forEach((k, i) => {
    k.active = i === nextIdx;
  });

  saveStoredKeys(keys);
  return true;
};

window.renderKeyList = function () {
  const list = document.getElementById("keyList");
  if (!list) return;

  const keys = getStoredKeys();
  list.innerHTML = "";

  if (keys.length === 0) {
    list.innerHTML = `<div style="padding: 10px; color: #555; font-style: italic; text-align: center;">Žádné klíče</div>`;
    return;
  }

  keys.forEach((k, i) => {
    const div = document.createElement("div");
    div.style.cssText = `
      background: ${k.active ? "#1a4d2e" : "#333"};
      border: 1px solid ${k.active ? "#4caf50" : "#555"};
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 8px;
      font-size: 12px;
    `;

    // Pokud je to demo klíč, zobraz tečky, jinak zobraz prvních 20 znaků
    let displayKey;
    if (window.EMBEDDED_API_KEY && k.key === window.EMBEDDED_API_KEY) {
      displayKey = "•".repeat(40) + " (Demo klíč)";
    } else {
      displayKey = k.key.substring(0, 20) + "...";
    }

    const statusBadge = k.active ? `<span style="color: #4caf50; font-weight: bold;">✓ AKTIVNÍ</span>` : `<span style="color: #999;">Neaktivní</span>`;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <strong style="color: #fff;">${k.name || `Key ${i + 1}`}</strong>
        ${statusBadge}
      </div>
      <div style="font-family: monospace; color: #aaa; margin-bottom: 5px; word-break: break-all;">
        ${displayKey}
      </div>
      <div style="display: flex; gap: 5px;">
        <button onclick="window.switchApiKey(${i})" style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Použít
        </button>
        <button onclick="window.removeApiKey(${i})" style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Smazat
        </button>
      </div>
    `;
    list.appendChild(div);
  });
};

window.switchApiKey = function (idx) {
  const keys = getStoredKeys();
  keys.forEach((k, i) => {
    k.active = i === idx;
  });
  saveStoredKeys(keys);
  if (window.renderKeyList) window.renderKeyList();
  if (window.updateKeyIndicator) window.updateKeyIndicator();
  alert("✅ Klíč aktivován!");
};

window.removeApiKey = function (idx) {
  const keys = getStoredKeys();
  keys.splice(idx, 1);
  saveStoredKeys(keys);
  if (window.renderKeyList) window.renderKeyList();
  if (window.updateKeyIndicator) window.updateKeyIndicator();
};

window.updateKeyIndicator = function () {
  const indicator = document.getElementById("keyIndicator");
  if (!indicator) return;

  const key = window.getCurrentApiKey ? window.getCurrentApiKey() : null;
  if (key) {
    indicator.innerHTML = `🔑 ${key.substring(0, 15)}...`;
    indicator.style.color = "#4caf50";
  } else {
    indicator.innerHTML = "⚠️ No API key";
    indicator.style.color = "#ff6b6b";
  }
};

window.addApiKey = function () {
  const input = document.getElementById("newKeyValue");
  const nameInput = document.getElementById("newKeyName");
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    alert("Vyplň API klíč prosím!");
    return;
  }

  const name = nameInput?.value.trim() || "Custom Key";
  const keys = getStoredKeys();
  keys.push({
    key: key,
    name: name,
    active: true
  });

  // Deaktivuj ostatní klíče
  keys.forEach((k, i) => {
    k.active = i === keys.length - 1;
  });

  saveStoredKeys(keys);
  input.value = "";
  if (nameInput) nameInput.value = "";
  if (window.renderKeyList) window.renderKeyList();
  if (window.updateKeyIndicator) window.updateKeyIndicator();
  alert("✅ Klíč přidán a aktivován!");
};

// ===== GEOMETRY FUNCTIONS =====

function lineIntersection(l1, l2) {
  const x1 = l1.x1, y1 = l1.y1, x2 = l1.x2, y2 = l1.y2;
  const x3 = l2.x1, y3 = l2.y1, x4 = l2.x2, y4 = l2.y2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  return null;
}

function intersectLineCircle(line, circle) {
  const x1 = line.x1, y1 = line.y1, x2 = line.x2, y2 = line.y2;
  const cx = circle.cx, cy = circle.cy, r = circle.r;

  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  const intersects = [];
  if (t1 >= 0 && t1 <= 1) {
    intersects.push({ x: x1 + t1 * dx, y: y1 + t1 * dy });
  }
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    intersects.push({ x: x1 + t2 * dx, y: y1 + t2 * dy });
  }
  return intersects;
}

function intersectCircleCircle(c1, c2) {
  const dx = c2.cx - c1.cx;
  const dy = c2.cy - c1.cy;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > c1.r + c2.r || d < Math.abs(c1.r - c2.r) || d < 1e-10) {
    return [];
  }

  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h = Math.sqrt(c1.r * c1.r - a * a);

  const px = c1.cx + (a * dx) / d;
  const py = c1.cy + (a * dy) / d;

  const intersects = [
    { x: px + (h * dy) / d, y: py - (h * dx) / d },
    { x: px - (h * dy) / d, y: py + (h * dx) / d },
  ];

  return intersects;
}

// ===== AI MEMORY SYSTEM =====

window.loadAIMemory = function () {
  try {
    const stored = localStorage.getItem("soustruznik_ai_memory");
    return stored ? JSON.parse(stored) : { commands: [], corrections: [], preferences: {} };
  } catch (e) {
    return { commands: [], corrections: [], preferences: {} };
  }
};

window.saveAIMemory = function (memory) {
  try {
    localStorage.setItem("soustruznik_ai_memory", JSON.stringify(memory));
  } catch (e) {
    console.warn("⚠️ Could not save AI memory");
  }
};

window.recordCommand = function (userPrompt, aiResponse) {
  const memory = window.loadAIMemory ? window.loadAIMemory() : { commands: [], corrections: [], preferences: {} };
  memory.commands.push({
    timestamp: new Date().toISOString(),
    user: userPrompt,
    ai: aiResponse,
  });

  if (memory.commands.length > 100) {
    memory.commands = memory.commands.slice(-100);
  }

  if (window.saveAIMemory) window.saveAIMemory(memory);
};

window.recordCorrection = function (original, corrected) {
  const memory = window.loadAIMemory ? window.loadAIMemory() : { commands: [], corrections: [], preferences: {} };
  memory.corrections.push({
    timestamp: new Date().toISOString(),
    original,
    corrected,
  });

  if (memory.corrections.length > 50) {
    memory.corrections = memory.corrections.slice(-50);
  }

  if (window.saveAIMemory) window.saveAIMemory(memory);
};

window.getAIMemoryContext = function () {
  // Načti paměť z localStorage
  try {
    const stored = localStorage.getItem("ai_memory");
    if (stored) {
      const memory = JSON.parse(stored);
      // Vrať sumarizovanou paměť pro kontext
      return {
        commands: memory.commands || [],
        corrections: memory.corrections || [],
        preferences: memory.preferences || {}
      };
    }
  } catch (e) {
    console.error("Chyba při načítání AI paměti:", e);
  }
  return { commands: [], corrections: [], preferences: {} };
};

// ===== RETRY LOGIC =====

window.retryWithBackoff = async function (fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
};

// ===== CONSTRUCTION FUNCTIONS =====

window.tangentFromPoint = function (px, py, cx, cy, r) {
  const dx = cx - px;
  const dy = cy - py;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < r) return [];

  const angle = Math.asin(r / d);
  const baseAngle = Math.atan2(dy, dx);

  const angle1 = baseAngle + angle;
  const angle2 = baseAngle - angle;

  const t1x = cx - r * Math.sin(angle1);
  const t1y = cy + r * Math.cos(angle1);

  const t2x = cx - r * Math.sin(angle2);
  const t2y = cy + r * Math.cos(angle2);

  return [
    { x: t1x, y: t1y },
    { x: t2x, y: t2y },
  ];
};

window.perpendicular = function (px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return null;

  const t = ((px - x1) * dx + (py - y1) * dy) / (len * len);
  const footX = x1 + t * dx;
  const footY = y1 + t * dy;

  const perpLen = len * 2;
  return {
    x1: px,
    y1: py,
    x2: px + (footX - px) / len * perpLen,
    y2: py + (footY - py) / len * perpLen,
  };
};

window.parallel = function (px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  return {
    x1: px,
    y1: py,
    x2: px + dx,
    y2: py + dy,
  };
};

window.trimLine = function (line, trimPoint, maxDist = 5) {
  // Oříznutí čáry u bodu
  return line;
};

window.getMirrorPoint = function (px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return null;

  const t = ((px - x1) * dx + (py - y1) * dy) / (len * len);
  const footX = x1 + t * dx;
  const footY = y1 + t * dy;

  return {
    x: 2 * footX - px,
    y: 2 * footY - py,
  };
};

// Oříznutí čáry v bodě - vrátí linku oříznutou od bodu k jednomu z konců
window.trimLine = function (line, cutPoint) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Vypočítat parametr t na čáře
  const t =
    ((cutPoint.x - line.x1) * dx + (cutPoint.y - line.y1) * dy) / (len * len);

  // Pokud t < 0.5, máme oříznutí blíže k počátku
  if (t < 0.5) {
    return {
      type: "line",
      x1: cutPoint.x,
      y1: cutPoint.y,
      x2: line.x2,
      y2: line.y2,
    };
  } else {
    return {
      type: "line",
      x1: line.x1,
      y1: line.y1,
      x2: cutPoint.x,
      y2: cutPoint.y,
    };
  }
};

// Rovnoběžka - vytvoří novou čáru rovnoběžnou se stávající v dané vzdálenosti
window.parallel = function (line, distance) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  const offsetX = (-dy / len) * distance;
  const offsetY = (dx / len) * distance;

  return {
    type: "line",
    x1: line.x1 + offsetX,
    y1: line.y1 + offsetY,
    x2: line.x2 + offsetX,
    y2: line.y2 + offsetY,
  };
};

// Export helper functions pro extend mode
window.lineLineIntersect = function (line1, line2) {
  return lineIntersection(line1, line2);
};

window.lineCircleIntersect = function (line, circle) {
  return intersectLineCircle(line, circle);
};

// ===== EXPORT =====
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    lineIntersection,
    intersectLineCircle,
    intersectCircleCircle,
  };
}

// ===== OPENROUTER API KEY MANAGEMENT =====

function getStoredOpenRouterKeys() {
  try {
    return JSON.parse(localStorage.getItem("soustruznik_openrouter_api_keys") || "[]");
  } catch (e) {
    return [];
  }
}

function saveStoredOpenRouterKeys(keys) {
  localStorage.setItem("soustruznik_openrouter_api_keys", JSON.stringify(keys));
}

window.getCurrentOpenRouterApiKey = function () {
  const keys = getStoredOpenRouterKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.key;
  }

  // Použij globální OpenRouter API klíč z globals.js
  const EMBEDDED_OPENROUTER_API_KEY = window.EMBEDDED_OPENROUTER_API_KEY;
  if (EMBEDDED_OPENROUTER_API_KEY && EMBEDDED_OPENROUTER_API_KEY.length > 20) {
    return EMBEDDED_OPENROUTER_API_KEY;
  }

  console.warn("⚠️ No OpenRouter API key available");
  return null;
};

window.getCurrentOpenRouterApiKeyName = function () {
  const keys = getStoredOpenRouterKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.name || "Neznámý OpenRouter klíč";
  }

  // Vrátit název embedded OpenRouter klíče
  const EMBEDDED_OPENROUTER_API_KEY = window.EMBEDDED_OPENROUTER_API_KEY;
  if (EMBEDDED_OPENROUTER_API_KEY && EMBEDDED_OPENROUTER_API_KEY.length > 20) {
    return "Demo OpenRouter Key";
  }

  return "Žádný OpenRouter klíč";
};

window.renderOpenRouterKeyList = function () {
  const list = document.getElementById("openrouterKeyList");
  if (!list) return;

  let keys = getStoredOpenRouterKeys();
  list.innerHTML = "";

  // Pokud není žádný klíč a máme demo klíč, přidej ho automaticky
  if (keys.length === 0 && window.EMBEDDED_OPENROUTER_API_KEY) {
    keys = [{
      key: window.EMBEDDED_OPENROUTER_API_KEY,
      name: "Demo OpenRouter Key",
      active: true
    }];
    saveStoredOpenRouterKeys(keys);
  }

  if (keys.length === 0) {
    list.innerHTML = `<div style="padding: 10px; color: #555; font-style: italic; text-align: center;">Žádné OpenRouter klíče</div>`;
    return;
  }

  keys.forEach((k, i) => {
    const div = document.createElement("div");
    div.style.cssText = `
      background: ${k.active ? "#1a4d2e" : "#333"};
      border: 1px solid ${k.active ? "#4caf50" : "#555"};
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 8px;
      font-size: 12px;
    `;

    // Pokud je to demo OpenRouter klíč, zobraz tečky, jinak zobraz prvních 20 znaků
    let displayKey;
    if (window.EMBEDDED_OPENROUTER_API_KEY && k.key === window.EMBEDDED_OPENROUTER_API_KEY) {
      displayKey = "•".repeat(40) + " (Demo OpenRouter klíč)";
    } else {
      displayKey = k.key.substring(0, 20) + "...";
    }

    const statusBadge = k.active ? `<span style="color: #4caf50; font-weight: bold;">✓ AKTIVNÍ</span>` : `<span style="color: #999;">Neaktivní</span>`;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <strong style="color: #fff;">${k.name || `OpenRouter Key ${i + 1}`}</strong>
        ${statusBadge}
      </div>
      <div style="font-family: monospace; color: #aaa; margin-bottom: 5px; word-break: break-all;">
        ${displayKey}
      </div>
      <div style="display: flex; gap: 5px;">
        <button onclick="window.switchOpenRouterApiKey(${i})" style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Použít
        </button>
        <button onclick="window.removeOpenRouterApiKey(${i})" style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Smazat
        </button>
      </div>
    `;
    list.appendChild(div);
  });
};

window.switchOpenRouterApiKey = function (idx) {
  const keys = getStoredOpenRouterKeys();
  keys.forEach((k, i) => {
    k.active = i === idx;
  });
  saveStoredOpenRouterKeys(keys);
  if (window.renderOpenRouterKeyList) window.renderOpenRouterKeyList();
  alert("✅ OpenRouter klíč aktivován!");
};

window.removeOpenRouterApiKey = function (idx) {
  const keys = getStoredOpenRouterKeys();
  keys.splice(idx, 1);
  saveStoredOpenRouterKeys(keys);
  if (window.renderOpenRouterKeyList) window.renderOpenRouterKeyList();
};

window.addOpenRouterApiKey = function () {
  const input = document.getElementById("newOpenRouterKeyValue");
  const nameInput = document.getElementById("newOpenRouterKeyName");
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    alert("Vyplň OpenRouter API klíč prosím!");
    return;
  }

  const name = nameInput?.value.trim() || "OpenRouter Key";
  const keys = getStoredOpenRouterKeys();
  keys.push({
    key: key,
    name: name,
    active: true
  });

  // Deaktivuj ostatní klíče
  keys.forEach((k, i) => {
    k.active = i === keys.length - 1;
  });

  saveStoredOpenRouterKeys(keys);
  input.value = "";
  if (nameInput) nameInput.value = "";
  if (window.renderOpenRouterKeyList) window.renderOpenRouterKeyList();
  alert("✅ OpenRouter klíč přidán a aktivován!");
};

// ===== MISTRAL API KEY MANAGEMENT =====

function getStoredMistralKeys() {
  try {
    return JSON.parse(localStorage.getItem("soustruznik_mistral_api_keys") || "[]");
  } catch (e) {
    return [];
  }
}

function saveStoredMistralKeys(keys) {
  localStorage.setItem("soustruznik_mistral_api_keys", JSON.stringify(keys));
}

window.getCurrentMistralApiKey = function () {
  const keys = getStoredMistralKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.key;
  }

  // Použij globální Mistral API klíč z globals.js
  const EMBEDDED_MISTRAL_API_KEY = window.EMBEDDED_MISTRAL_API_KEY;
  if (EMBEDDED_MISTRAL_API_KEY && EMBEDDED_MISTRAL_API_KEY.length > 10) {
    return EMBEDDED_MISTRAL_API_KEY;
  }

  console.warn("⚠️ No Mistral API key available");
  return null;
};

window.getCurrentMistralApiKeyName = function () {
  const keys = getStoredMistralKeys();
  const active = keys.find((k) => k.active);

  if (active) {
    return active.name || "Neznámý Mistral klíč";
  }

  // Vrátit název embedded Mistral klíče
  const EMBEDDED_MISTRAL_API_KEY = window.EMBEDDED_MISTRAL_API_KEY;
  if (EMBEDDED_MISTRAL_API_KEY && EMBEDDED_MISTRAL_API_KEY.length > 10) {
    return "Demo Mistral Key";
  }

  return "Žádný Mistral klíč";
};

window.renderMistralKeyList = function () {
  const list = document.getElementById("mistralKeyList");
  if (!list) return;

  let keys = getStoredMistralKeys();
  list.innerHTML = "";

  // Pokud není žádný klíč a máme demo klíč, přidej ho automaticky
  if (keys.length === 0 && window.EMBEDDED_MISTRAL_API_KEY) {
    keys = [{
      key: window.EMBEDDED_MISTRAL_API_KEY,
      name: "Demo Mistral Key",
      active: true
    }];
    saveStoredMistralKeys(keys);
  }

  if (keys.length === 0) {
    list.innerHTML = `<div style="padding: 10px; color: #555; font-style: italic; text-align: center;">Žádné Mistral klíče</div>`;
    return;
  }

  keys.forEach((k, i) => {
    const div = document.createElement("div");
    div.style.cssText = `
      background: ${k.active ? "#1a4d2e" : "#333"};
      border: 1px solid ${k.active ? "#4caf50" : "#555"};
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 8px;
      font-size: 12px;
    `;

    // Pokud je to demo Mistral klíč, zobraz tečky, jinak zobraz prvních 20 znaků
    let displayKey;
    if (window.EMBEDDED_MISTRAL_API_KEY && k.key === window.EMBEDDED_MISTRAL_API_KEY) {
      displayKey = "•".repeat(32) + " (Demo Mistral klíč)";
    } else {
      displayKey = k.key.substring(0, 16) + "...";
    }

    const statusBadge = k.active ? `<span style="color: #4caf50; font-weight: bold;">✓ AKTIVNÍ</span>` : `<span style="color: #999;">Neaktivní</span>`;

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <strong style="color: #fff;">${k.name || `Mistral Key ${i + 1}`}</strong>
        ${statusBadge}
      </div>
      <div style="font-family: monospace; color: #aaa; margin-bottom: 5px; word-break: break-all;">
        ${displayKey}
      </div>
      <div style="display: flex; gap: 5px;">
        <button onclick="window.switchMistralApiKey(${i})" style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Použít
        </button>
        <button onclick="window.removeMistralApiKey(${i})" style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Smazat
        </button>
      </div>
    `;
    list.appendChild(div);
  });
};

window.switchMistralApiKey = function (idx) {
  const keys = getStoredMistralKeys();
  keys.forEach((k, i) => {
    k.active = i === idx;
  });
  saveStoredMistralKeys(keys);
  if (window.renderMistralKeyList) window.renderMistralKeyList();
  alert("✅ Mistral klíč aktivován!");
};

window.removeMistralApiKey = function (idx) {
  const keys = getStoredMistralKeys();
  keys.splice(idx, 1);
  saveStoredMistralKeys(keys);
  if (window.renderMistralKeyList) window.renderMistralKeyList();
};

window.addMistralApiKey = function () {
  const input = document.getElementById("newMistralKeyValue");
  const nameInput = document.getElementById("newMistralKeyName");
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    alert("Vyplň Mistral API klíč prosím!");
    return;
  }

  const name = nameInput?.value.trim() || "Mistral Key";
  const keys = getStoredMistralKeys();
  keys.push({
    key: key,
    name: name,
    active: true
  });

  // Deaktivuj ostatní klíče
  keys.forEach((k, i) => {
    k.active = i === keys.length - 1;
  });

  saveStoredMistralKeys(keys);
  input.value = "";
  if (nameInput) nameInput.value = "";
  if (window.renderMistralKeyList) window.renderMistralKeyList();
  alert("✅ Mistral klíč přidán a aktivován!");
};

// ===== RETRY LOGIC =====

