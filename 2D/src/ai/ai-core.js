/**
 * AI Module - Hlavní jádro
 * Obsahuje hlavní funkce pro volání AI, model management a routing
 * @module ai-core
 */

// ===== ES6 EXPORTS =====
export const AI_CORE = {};

// ===== TIMESTAMPS MANAGEMENT =====
window.REQUESTS_WINDOW_MS = 60000; // 1 minuta

// Inicializuj request timestamps
window.requestTimestamps = (() => {
  try {
    const stored = localStorage.getItem("ai_request_timestamps");
    if (stored) {
      const timestamps = JSON.parse(stored);
      const now = Date.now();
      return timestamps.filter(ts => now - ts < 60000);
    }
  } catch (e) {}
  return [];
})();

/**
 * Uloží timestamps do localStorage
 */
window.saveRequestTimestamps = function() {
  try {
    localStorage.setItem("ai_request_timestamps", JSON.stringify(window.requestTimestamps));
  } catch (e) {
    console.warn("⚠️ Nelze uložit timestamps:", e);
  }
};

// ===== MODEL MANAGEMENT =====

/**
 * Získá aktuální limit na základě vybraného modelu
 * @returns {number} RPM limit
 */
window.getCurrentModelLimit = function() {
  const modelSelect = document.getElementById("aiModelSelect");
  const selectedModel = modelSelect?.value;
  if (!selectedModel) return 15;
  const limit = window.MODEL_LIMITS?.[selectedModel];
  return limit ? (limit.rpm || limit.rate || 15) : 15;
};

/**
 * Aktualizuj modely podle vybraného providera
 */
window.updateModelsForProvider = function() {
  const providerSelect = document.getElementById("aiProviderSelect");
  const modelSelect = document.getElementById("aiModelSelect");

  if (!providerSelect || !modelSelect) return;

  const provider = providerSelect.value;

  // V Auto módu
  if (window.aiModelMode === 'auto') {
    if (window.loadAutoModeModels) {
      window.loadAutoModeModels(provider);
    }
    return;
  }

  // V Manual módu
  if (window.loadManualModeModels) {
    window.loadManualModeModels(provider);
    return;
  }

  // Fallback na statické modely
  window.loadStaticModels(provider, modelSelect, null);

  if (window.updateImageUploadVisibility) window.updateImageUploadVisibility();
  if (window.updateApiUsageUI) window.updateApiUsageUI();
};

/**
 * Zobraz/skryj upload obrázků podle modelu
 */
window.updateImageUploadVisibility = function() {
  const providerSelect = document.getElementById("aiProviderSelect");
  const modelSelect = document.getElementById("aiModelSelect");
  const imageUploadContainer = document.getElementById("imageUploadContainer");

  if (!providerSelect || !modelSelect || !imageUploadContainer) return;

  const provider = providerSelect.value;
  const model = modelSelect.value;

  if (provider === "groq" && window.GROQ_VISION_MODELS?.includes(model)) {
    imageUploadContainer.style.display = "block";
  } else {
    imageUploadContainer.style.display = "none";
  }
};

/**
 * Načte statické modely pro providera (fallback)
 */
window.loadStaticModels = function(provider, modelSelect, enabledModels) {
  modelSelect.innerHTML = "";

  const models = {
    gemini: [
      { value: "gemini-2.5-flash-lite", label: "⚡ Gemini 2.5 Flash-Lite 🆓" },
      { value: "gemini-2.5-flash", label: "⚡ Gemini 2.5 Flash 🆓" },
      { value: "gemini-2.0-flash-exp", label: "⚡ Gemini 2.0 Flash 🆓" }
    ],
    groq: [
      { value: "llama-3.3-70b-versatile", label: "💬 Llama 3.3 70B" },
      { value: "llama-3.1-8b-instant", label: "⚡ Llama 3.1 8B" },
      { value: "mixtral-8x7b-32768", label: "🔥 Mixtral 8x7B" }
    ],
    openrouter: [
      { value: "google/gemini-2.0-flash-exp:free", label: "⚡ Gemini 2.0 :free" },
      { value: "meta-llama/llama-3.3-70b-instruct:free", label: "🦙 Llama 3.3 :free" }
    ],
    mistral: [
      { value: "codestral-latest", label: "💻 Codestral" },
      { value: "mistral-small-latest", label: "⚡ Mistral Small" }
    ]
  };

  const providerModels = models[provider] || [];
  let firstEnabled = null;

  providerModels.forEach(model => {
    if (!enabledModels || enabledModels.has(model.value)) {
      const option = document.createElement("option");
      option.value = model.value;
      option.textContent = model.label;
      modelSelect.appendChild(option);
      if (!firstEnabled) firstEnabled = option;
    }
  });

  if (firstEnabled) firstEnabled.selected = true;
};

// ===== MAIN AI CALL =====

/**
 * Hlavní vstupní bod pro volání AI.
 * Zpracuje uživatelský prompt a předá ho správnému provideru.
 * @async
 * @returns {Promise<void>}
 */
window.callGemini = async function() {
  console.log("🔵 [DEBUG] callGemini() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  if (!promptInput) return;

  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert("Zadej prosím příkaz pro AI!");
    return;
  }

  // Zobraz Cancel button
  const btnCancel = document.getElementById("btnCancel");
  const btnGenerate = document.getElementById("btnGenerate");
  if (btnCancel) btnCancel.style.display = "inline-block";
  if (btnGenerate) btnGenerate.style.display = "none";

  if (window.processingAI) {
    console.warn("⚠️ [DEBUG] processingAI = true, ABORT!");
    alert("AI zpracovává předchozí příkaz. Čekej prosím.");
    return;
  }

  console.log("🟢 [DEBUG] Volám callGeminiDirect()...");
  window.callGeminiDirect();
};

/**
 * Router pro AI volání - směruje request na správného providera.
 * @async
 * @returns {Promise<void>}
 */
window.callGeminiDirect = async function() {
  console.log("🟡 [DEBUG] callGeminiDirect() SPUŠTĚNO", new Date().toISOString());

  const providerSelect = document.getElementById("aiProviderSelect");
  const provider = providerSelect?.value || "gemini";

  if (provider === "groq") {
    return window.callGroqDirect();
  } else if (provider === "openrouter") {
    return window.callOpenRouterDirect();
  } else if (provider === "mistral") {
    return window.callMistralDirect();
  } else {
    return window.callGeminiDirectOriginal();
  }
};

/**
 * Volání Google Gemini API.
 * @async
 * @returns {Promise<void>}
 */
window.callGeminiDirectOriginal = async function() {
  console.log("🟡 [DEBUG] callGeminiDirectOriginal() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  const container = document.getElementById("aiChatHistory");
  if (!promptInput || !container) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  window.processingAI = true;
  promptInput.disabled = true;

  // User message
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user";
  userMsgDiv.style.marginBottom = "10px";
  userMsgDiv.innerHTML = `<strong>Ty:</strong> ${window.escapeHtml(prompt)}`;
  container.appendChild(userMsgDiv);
  container.scrollTop = container.scrollHeight;

  // Loading
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "text-align: center; color: #666; padding: 12px; font-size: 12px;";
  loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div> Čekám na odpověď...';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const apiKey = window.getCurrentApiKey ? window.getCurrentApiKey() : localStorage.getItem("gemini_api_key");
    if (!apiKey) {
      throw new Error("Nemáte API klíč. Otevřete ⚙️ Nastavení.");
    }

    // Build system prompt
    const systemPrompt = window.buildCADSystemPrompt ? window.buildCADSystemPrompt() : window.getDefaultSystemPrompt();
    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";
    const fullPrompt = `${systemPrompt}\n\nAktuální kreslení:\n${contextInfo}\n\nUživatel: ${prompt}`;

    // Get model
    const selectedModel = window.getCurrentModel?.() || "gemini-2.0-flash";
    if (!selectedModel) {
      throw new Error("Není vybrán žádný model. Vyber model v nastavení AI.");
    }

    console.log("📡 [DEBUG] Spouštím API volání pro model:", selectedModel);

    const response = await window.retryWithBackoff(async () => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      );
      if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${resp.status}`);
      }
      return await resp.json();
    }, 1);

    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    let aiResponseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!aiResponseText) throw new Error("AI nevrátila text");

    window.lastRawAI = aiResponseText;

    // Check AI type
    const aiType = document.getElementById('aiTypeSelect')?.value || 'cnc';

    if (aiType === 'chat') {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>AI:</strong> ${window.escapeHtml(aiResponseText)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      window.processingAI = false;
      promptInput.disabled = false;
      promptInput.value = "";
      document.getElementById('btnCancel')?.style.setProperty('display', 'none');
      document.getElementById('btnGenerate')?.style.setProperty('display', 'inline-block');

      if (window.apiUsageStats) {
        window.apiUsageStats.totalCalls = (window.apiUsageStats.totalCalls || 0) + 1;
        window.apiUsageStats.dailyCalls = (window.apiUsageStats.dailyCalls || 0) + 1;
        if (window.saveApiStats) window.saveApiStats();
      }
      return;
    }

    // CNC/2D mode - parse JSON
    const result = window.parseAIReply(aiResponseText);
    if (!result) throw new Error("Nevalidní JSON odpověď");

    const replyText = result.response_text || "Hotovo.";
    const newShapes = result.shapes || [];

    window.lastAIResponse = {
      rawResponse: aiResponseText,
      parsedResult: result,
      replyText: replyText,
      shapes: newShapes,
      timestamp: new Date().toISOString()
    };

    // Add shapes
    if (Array.isArray(newShapes) && newShapes.length > 0) {
      newShapes.forEach((s) => {
        try {
          if (s.type === "line" && typeof s.x1 === "number" && typeof s.y1 === "number" &&
              typeof s.x2 === "number" && typeof s.y2 === "number") {
            window.shapes.push({ type: "line", x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
          } else if (s.type === "circle" && typeof s.cx === "number" && typeof s.cy === "number" &&
                     typeof s.r === "number" && s.r > 0) {
            window.shapes.push({ type: "circle", cx: s.cx, cy: s.cy, r: s.r });
          } else if (s.type === "arc" && typeof s.cx === "number" && typeof s.cy === "number" &&
                     typeof s.r === "number" && s.r > 0) {
            window.shapes.push({
              type: "arc", cx: s.cx, cy: s.cy, r: s.r,
              startAngle: s.startAngle, endAngle: s.endAngle,
              counterclockwise: s.counterclockwise || false
            });
          } else if (s.type === "point" && typeof s.x === "number" && typeof s.y === "number") {
            window.points.push({ x: s.x, y: s.y });
          }
        } catch (e) {
          console.warn('⚠️ Chyba při přidávání tvaru:', e);
        }
      });

      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      window.recordAISuccess(prompt, newShapes);
    }

    // Chat message
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    msgDiv.innerHTML = newShapes.length > 0
      ? `<span class="shape-tag">✏️ +${newShapes.length} tvarů</span><br>${window.escapeHtml(replyText)}`
      : window.escapeHtml(replyText);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";
    if (window.clearImage) window.clearImage();

    // Stats
    if (window.apiUsageStats) {
      window.apiUsageStats.totalCalls = (window.apiUsageStats.totalCalls || 0) + 1;
      window.apiUsageStats.dailyCalls = (window.apiUsageStats.dailyCalls || 0) + 1;
      if (window.saveApiStats) window.saveApiStats();
      if (window.updateApiUsageUI) window.updateApiUsageUI();
    }

  } catch (err) {
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-msg model";
    errorDiv.style.color = "#ff6b6b";
    errorDiv.style.whiteSpace = "pre-wrap";

    let errorMsg = "❌ " + (err.message || "Neznámá chyba");
    if (err.message.includes("quota") || err.message.includes("Quota exceeded")) {
      errorMsg = "⏳ KVÓTA PŘEKROČENA\n\n💡 Čekej 1-2 minuty nebo přidej vlastní API klíč (⚙️ Nastavení)";
    } else if (err.message.includes("API klíč")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení a vlož API klíč.";
    }

    errorDiv.textContent = errorMsg;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  } finally {
    window.processingAI = false;
    promptInput.disabled = false;
    document.getElementById("btnCancel")?.style.setProperty('display', 'none');
    document.getElementById("btnGenerate")?.style.setProperty('display', 'inline-block');
  }
};

// ===== PROCESS AI RESPONSE =====

/**
 * Zpracuje AI odpověď
 * @param {string} aiResponseText - Surová AI odpověď
 * @param {string} originalPrompt - Původní prompt
 */
window.processAIResponse = async function(aiResponseText, originalPrompt) {
  const container = document.getElementById("aiChatHistory");
  const promptInput = document.getElementById("aiPrompt");
  const aiType = document.getElementById('aiTypeSelect')?.value || 'cnc';

  if (!container) return;

  try {
    window.processingAI = true;
    if (promptInput) promptInput.disabled = true;

    // User message
    const userMsgDiv = document.createElement("div");
    userMsgDiv.className = "chat-msg user";
    userMsgDiv.style.marginBottom = "10px";
    userMsgDiv.innerHTML = `<strong>Ty:</strong> ${window.escapeHtml(originalPrompt)}`;
    container.appendChild(userMsgDiv);

    window.lastRawAI = aiResponseText;

    // Chat mode
    if (aiType === 'chat') {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>AI:</strong> ${window.escapeHtml(aiResponseText)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;
      if (promptInput) {
        promptInput.value = '';
        promptInput.disabled = false;
      }
      window.processingAI = false;
      return;
    }

    // CNC/2D mode
    const result = window.parseAIReply(aiResponseText);
    if (!result) throw new Error('Nepodařilo se parsovat AI odpověď');

    const replyText = result.response_text || "Hotovo.";
    const newShapes = result.shapes || [];

    window.lastAIResponse = {
      rawResponse: aiResponseText,
      parsedResult: result,
      replyText: replyText,
      shapes: newShapes,
      timestamp: new Date().toISOString()
    };

    // Add shapes
    if (Array.isArray(newShapes) && newShapes.length > 0) {
      newShapes.forEach((s) => {
        try {
          if (s.type === "line") {
            window.shapes.push({ type: "line", x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
          } else if (s.type === "circle" && s.r > 0) {
            window.shapes.push({ type: "circle", cx: s.cx, cy: s.cy, r: s.r });
          } else if (s.type === "arc" && s.r > 0) {
            window.shapes.push({
              type: "arc", cx: s.cx, cy: s.cy, r: s.r,
              startAngle: s.startAngle, endAngle: s.endAngle,
              counterclockwise: s.counterclockwise || false
            });
          } else if (s.type === "point") {
            window.points.push({ x: s.x, y: s.y });
          }
        } catch (e) {}
      });

      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      window.recordAISuccess(originalPrompt, newShapes);
    }

    // Chat message
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    msgDiv.innerHTML = newShapes.length > 0
      ? `<span class="shape-tag">✏️ +${newShapes.length} tvarů</span><br>${window.escapeHtml(replyText)}`
      : window.escapeHtml(replyText);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    if (promptInput) promptInput.value = '';

    if (window.apiUsageStats) {
      window.apiUsageStats.totalCalls = (window.apiUsageStats.totalCalls || 0) + 1;
      window.apiUsageStats.dailyCalls = (window.apiUsageStats.dailyCalls || 0) + 1;
      if (window.saveApiStats) window.saveApiStats();
    }

  } catch (err) {
    console.error('❌ processAIResponse error:', err);
    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-msg model";
    errorDiv.style.color = "#ff6b6b";
    errorDiv.textContent = "❌ " + err.message;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  } finally {
    window.processingAI = false;
    if (promptInput) promptInput.disabled = false;
    document.getElementById("btnCancel")?.style.setProperty('display', 'none');
    document.getElementById("btnGenerate")?.style.setProperty('display', 'inline-block');
  }
};

// ===== DEFAULT SYSTEM PROMPT =====

/**
 * Vrátí výchozí system prompt pro AI
 * @returns {string} System prompt
 */
window.getDefaultSystemPrompt = function() {
  const xMeasureMode = window.xMeasureMode || "radius";
  const modeExplanation = xMeasureMode === "diameter"
    ? "X-AXIS MODE: DIAMETER - User shows values as diameter from center axis."
    : "X-AXIS MODE: RADIUS - User shows values as radius distance from center axis.";

  return `CAD Assistant for CNC Lathe/Mill operations (Czech language).

COORDINATE SYSTEM:
Z-axis (horizontal/→) = JSON 'x' property
X-axis (vertical/↑) = JSON 'y' property
Origin: (0,0) center

${modeExplanation}

RESPONSE FORMAT (strict JSON only):
{"response_text":"Brief Czech confirmation <50 chars","shapes":[...]}

SHAPE TYPES:
Line: {"type":"line","x1":z1,"y1":x1,"x2":z2,"y2":x2}
Circle: {"type":"circle","cx":z,"cy":x,"r":radius}
Arc: {"type":"arc","cx":z,"cy":x,"r":radius,"startAngle":deg,"endAngle":deg,"counterclockwise":bool}
Point: {"type":"point","x":z,"y":x}`;
};

// ===== EVENT LISTENERS =====
document.addEventListener("DOMContentLoaded", function() {
  const btnSendAi = document.getElementById("btnSendAi");
  if (btnSendAi) {
    btnSendAi.addEventListener("click", function() {
      if (window.callGemini) window.callGemini();
    });
  }

  const btnClearChat = document.getElementById("btnClearChat");
  if (btnClearChat) {
    btnClearChat.addEventListener("click", function() {
      if (window.clearAIChat) window.clearAIChat();
    });
  }
});

console.log("✅ [AI-CORE] Modul načten");
