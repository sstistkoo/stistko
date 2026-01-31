/**
 * AI Module - Utility funkce
 * Obsahuje pomocné funkce pro AI operace
 * @module ai-utils
 */

// ===== ES6 EXPORTS =====
export const AI_UTILS = {};

// ===== ESCAPE HTML =====
/**
 * Escapuje HTML entity pro bezpečné zobrazení v DOM
 * @param {string} text - Vstupní text
 * @returns {string} Escapovaný text
 */
window.escapeHtml = function(text) {
  if (!text) return '';
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

// ===== RETRY WITH BACKOFF =====
/**
 * Opakuje API volání s exponenciálním backoffem při rate limit chybách
 * @param {Function} apiCall - Async funkce k volání
 * @param {number} maxRetries - Maximální počet pokusů (default: 3)
 * @returns {Promise<any>} Výsledek API volání
 */
window.retryWithBackoff = async function(apiCall, maxRetries = 3) {
  console.log("🔄 [DEBUG] retryWithBackoff START - maxRetries:", maxRetries);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`🔁 [DEBUG] Pokus ${attempt + 1}/${maxRetries}`, new Date().toISOString());

    try {
      const result = await apiCall();
      console.log("✅ [DEBUG] API call ÚSPĚCH!");
      return result;
    } catch (err) {
      const isRateLimit =
        err.message?.includes("429") ||
        err.message?.includes("quota") ||
        err.message?.includes("Quota exceeded") ||
        err.message?.includes("RESOURCE_EXHAUSTED");

      if (isRateLimit && attempt < maxRetries - 1) {
        // Zkus najít přesný čas z Google error message: "Please retry in 53.955s"
        const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
        let delayMs;

        if (retryMatch) {
          // Google řekl přesně jak dlouho čekat
          delayMs = Math.ceil(parseFloat(retryMatch[1]) * 1000);
          console.log(`⏳ Kvóta vyčerpána, čekám ${Math.ceil(delayMs/1000)}s (dle Google API)...`);
        } else {
          // Exponenciální backoff: 2s, 4s, 8s, 16s
          delayMs = Math.pow(2, attempt + 1) * 1000;
          console.log(`⏳ Kvóta vyčerpána, čekám ${delayMs/1000}s před dalším pokusem...`);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Pokud to není rate limit nebo už jsme vyčerpali pokusy, vyhoď error
      if (attempt === maxRetries - 1 || !isRateLimit) {
        console.error("❌ API Error:", err.message);
        throw err;
      }

      throw err;
    }
  }
};

// ===== JSON PARSING HELPER =====
/**
 * Parsuje AI odpověď (JSON s tvary)
 * Robustní parser s opravou neúplných JSON
 * @param {string} aiResponseText - Surová odpověď z AI
 * @returns {object|null} Naparsovaný objekt nebo null
 */
window.parseAIReply = function(aiResponseText) {
  try {
    // Aggressive JSON cleaning
    let cleanedJson = aiResponseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "");

    const firstBrace = cleanedJson.indexOf("{");
    const lastBrace = cleanedJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
    }

    // Fix incomplete JSON
    const openBraces = (cleanedJson.match(/\{/g) || []).length;
    const closeBraces = (cleanedJson.match(/\}/g) || []).length;
    const openBrackets = (cleanedJson.match(/\[/g) || []).length;
    const closeBrackets = (cleanedJson.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
      cleanedJson += "]".repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
      cleanedJson += "}".repeat(openBraces - closeBraces);
    }

    // Fix missing x2
    cleanedJson = cleanedJson.replace(
      /\{"type":"line","x1":([^,]+),"y1":([^,]+),"y2":([^}]+)\}/g,
      '{"type":"line","x1":$1,"y1":$2,"x2":$1,"y2":$3}'
    );

    // Shorten long numbers
    cleanedJson = cleanedJson.replace(/(\d+\.\d{6})\d{4,}/g, "$1");
    cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, "$1");

    console.log("🔍 [DEBUG] parseAIReply cleanedJson:", cleanedJson.substring(0, 200));
    const result = JSON.parse(cleanedJson);
    console.log("✅ [DEBUG] parseAIReply parsed úspěšně!");

    return result;
  } catch (e) {
    console.error("❌ [DEBUG] parseAIReply failed:", e.message);
    return null;
  }
};

// ===== BUILD DRAWING CONTEXT =====
/**
 * Sestaví kontext aktuálního kreslení pro AI
 * @returns {string} Textový popis aktuálního stavu kreslení
 */
window.buildDrawingContext = function() {
  const shapes = window.shapes || [];
  const points = window.points || [];
  const selectedItems = window.selectedItems || [];
  let context = "";

  // Zobraz vybrané objekty
  if (selectedItems.length > 0) {
    context += `⭐ VYBRANÉ OBJEKTY (${selectedItems.length}):\n`;
    selectedItems.forEach((item) => {
      if (item.category === "point") {
        context += `  ✓ Bod [${item.x?.toFixed(1) || "?"}, ${item.y?.toFixed(1) || "?"}] (Label: ${item.label || "?"})\n`;
      } else if (item.category === "shape" && item.type) {
        if (item.type === "circle") {
          context += `  ✓ Kružnice: střed [${item.cx?.toFixed(1) || "?"}, ${item.cy?.toFixed(1) || "?"}], r=${item.r?.toFixed(1) || "?"} (Label: ${item.label || "?"})\n`;
        } else if (item.type === "line") {
          context += `  ✓ Čára: [${item.x1?.toFixed(1) || "?"}, ${item.y1?.toFixed(1) || "?"}] → [${item.x2?.toFixed(1) || "?"}, ${item.y2?.toFixed(1) || "?"}] (Label: ${item.label || "?"})\n`;
        } else {
          context += `  ✓ ${item.type}: (Label: ${item.label || "?"})\n`;
        }
      }
    });
    context += "\n";
  }

  if (points.length > 0) {
    context += `🔹 BODY (${points.length}):\n`;
    points.forEach((p, i) => {
      context += `  ${i + 1}. [${p.x.toFixed(1)}, ${p.y.toFixed(1)}]\n`;
    });
  }

  if (shapes.length > 0) {
    context += `\n📐 OBJEKTY (${shapes.length}):\n`;
    shapes.forEach((s, i) => {
      if (s.type === "line") {
        const len = Math.sqrt(((s.x2 || 0) - (s.x1 || 0)) ** 2 + ((s.y2 || 0) - (s.y1 || 0)) ** 2).toFixed(1);
        context += `  ${i + 1}. Čára: [${(s.x1 || 0).toFixed(1)},${(s.y1 || 0).toFixed(1)}] → [${(s.x2 || 0).toFixed(1)},${(s.y2 || 0).toFixed(1)}] (délka: ${len})\n`;
      } else if (s.type === "circle") {
        context += `  ${i + 1}. Kružnice: střed [${(s.cx || 0).toFixed(1)},${(s.cy || 0).toFixed(1)}], r=${(s.r || 0).toFixed(1)}\n`;
      } else if (s.type === "arc") {
        context += `  ${i + 1}. Oblouk: [${(s.x1 || 0).toFixed(1)},${(s.y1 || 0).toFixed(1)}] → [${(s.x2 || 0).toFixed(1)},${(s.y2 || 0).toFixed(1)}], úhel=${((s.angle || 0)).toFixed(1)}°\n`;
      }
    });
  }

  return context || "Prázdné kreslení - zatím nic";
};

// ===== AI MEMORY =====
const AI_MEMORY_KEY = "soustruznik_ai_memory";

/**
 * Získá kontext z AI paměti (úspěšné vzory, poslední příkazy)
 * @returns {string} Kontextové informace z paměti
 */
window.getAIMemoryContext = function() {
  try {
    const memory = JSON.parse(localStorage.getItem(AI_MEMORY_KEY) || "{}");
    const commands = memory.commands || [];
    const patterns = memory.successfulPatterns || [];

    const context = [];
    if (commands.length > 0) {
      context.push(`📌 Naposledy používané příkazy: ${commands.slice(-3).map(c => c.text).join(", ")}`);
    }
    if (patterns.length > 0) {
      context.push(`✅ Úspěšné vzory: ${patterns.slice(-2).map(p => p.input).join(", ")}`);
    }

    return context.join("\n");
  } catch (e) {
    return "";
  }
};

/**
 * Zaznamená úspěšný AI příkaz do paměti
 * @param {string} prompt - Uživatelský příkaz
 * @param {array} shapes - Vytvořené tvary
 */
window.recordAISuccess = function(prompt, shapes) {
  try {
    const memory = JSON.parse(localStorage.getItem(AI_MEMORY_KEY) || "{}");

    if (!memory.successfulPatterns) memory.successfulPatterns = [];
    memory.successfulPatterns.push({
      input: prompt.toLowerCase().substring(0, 50),
      shapeCount: shapes.length,
      timestamp: new Date().toISOString(),
    });

    if (memory.successfulPatterns.length > 50) {
      memory.successfulPatterns = memory.successfulPatterns.slice(-50);
    }

    localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
    console.warn("⚠️ Nelze uložit AI memory:", e);
  }
};

/**
 * Uloží AI paměť do localStorage
 * @param {object} memory - Objekt s AI pamětí
 */
window.saveAIMemory = function(memory) {
  try {
    localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
    console.warn("⚠️ Nelze uložit AI memory:", e);
  }
};

// ===== CHAT MANAGEMENT =====
/**
 * Vymaže chat historii
 */
window.clearChat = function() {
  const chatWindow = document.getElementById("chatWindow");
  const chatHistory = document.getElementById("aiChatHistory");

  if (chatWindow) {
    chatWindow.innerHTML = "";
  }
  if (chatHistory) {
    chatHistory.innerHTML = "";
  }

  window.chatHistory = [];

  try {
    localStorage.removeItem("ai_chat_history");
  } catch (e) {}
};

/**
 * Načte AI paměť a historii chatu
 */
window.loadAIMemory = function() {
  const chatWindow = document.getElementById("chatWindow");
  if (!chatWindow) return;

  try {
    const stored = localStorage.getItem("ai_chat_history");
    if (stored) {
      window.chatHistory = JSON.parse(stored);
      chatWindow.innerHTML = "";

      window.chatHistory.forEach((entry) => {
        const userMsg = document.createElement("div");
        userMsg.className = "message user-message";
        userMsg.innerHTML = `<strong>Ty:</strong> ${window.escapeHtml(entry.user)}`;
        chatWindow.appendChild(userMsg);

        const aiMsg = document.createElement("div");
        aiMsg.className = "message ai-message";
        aiMsg.innerHTML = `<strong>AI:</strong> ${window.escapeHtml(entry.ai)}`;
        chatWindow.appendChild(aiMsg);
      });

      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  } catch (e) {
    console.warn("⚠️ Nelze načíst chat historii:", e);
  }
};

/**
 * Uloží chat historii do localStorage
 */
window.saveChatHistory = function() {
  try {
    localStorage.setItem("ai_chat_history", JSON.stringify(window.chatHistory || []));
  } catch (e) {
    console.warn("⚠️ Nelze uložit chat historii:", e);
  }
};

// ===== SELECTION UI =====
/**
 * Aktualizuje UI s informacemi o vybraných objektech
 */
window.updateSelectionUI = function() {
  const selectedCount = window.selectedItems ? window.selectedItems.length : 0;
  const infoEl = document.getElementById("selectionInfo");

  if (infoEl) {
    if (selectedCount > 0) {
      let infoText = `📌 Vybráno: ${selectedCount} objektů`;

      // Přidej vzdálenost pokud jsou vybrané 2 body
      if (selectedCount === 2) {
        const item1 = window.selectedItems[0];
        const item2 = window.selectedItems[1];

        if (item1.category === "point" && item2.category === "point") {
          const dist = Math.sqrt((item1.x - item2.x) ** 2 + (item1.y - item2.y) ** 2);
          infoText += ` | 📏 Vzdálenost AB: ${dist.toFixed(2)} mm`;
        }
      }

      // Přidej informaci o střídavých typech
      if (selectedCount >= 2) {
        const hasPoints = window.selectedItems.some(i => i.category === "point");
        const hasShapes = window.selectedItems.some(i => i.category === "shape");

        if (hasPoints && hasShapes) {
          infoText += " | ⚙️ (bod+tvar)";
        }
      }

      infoEl.textContent = infoText;
      infoEl.style.display = "block";
    } else {
      infoEl.style.display = "none";
    }
  }
};

// ===== API KEY HELPERS =====
/**
 * Získá aktuální API klíč pro vybraného providera
 * @returns {string|null} API klíč
 */
window.getCurrentApiKey = function() {
  const providerSelect = document.getElementById("aiProviderSelect");
  const provider = providerSelect?.value || "gemini";

  switch (provider) {
    case "gemini":
      return localStorage.getItem("gemini_api_key") || null;
    case "groq":
      return window.getCurrentGroqApiKey?.() || localStorage.getItem("groq_api_key") || null;
    case "openrouter":
      return window.getCurrentOpenRouterApiKey?.() || localStorage.getItem("openrouter_api_key") || null;
    case "mistral":
      return window.getCurrentMistralApiKey?.() || localStorage.getItem("mistral_api_key") || null;
    default:
      return null;
  }
};

/**
 * Získá aktuální model pro vybraného providera
 * @returns {string|null} Název modelu
 */
window.getCurrentModel = function() {
  const modelSelect = document.getElementById("aiModelSelect");
  return modelSelect?.value || null;
};

console.log("✅ [AI-UTILS] Modul načten");
