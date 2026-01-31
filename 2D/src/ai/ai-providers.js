/**
 * AI Module - Hlavní API providery
 * Obsahuje funkce pro volání různých AI providerů (Groq, OpenRouter, Mistral)
 * @module ai-providers
 */

// ===== ES6 EXPORTS =====
export const AI_PROVIDERS = {};

// ===== GROQ API CALL =====

/**
 * Volání Groq API (LPU inference).
 * Podporuje LLaMA, Mixtral a další modely.
 * @async
 * @returns {Promise<void>}
 */
window.callGroqDirect = async function() {
  console.log("⚡ [DEBUG] callGroqDirect() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  const container = document.getElementById("aiChatHistory");
  if (!promptInput || !container) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  console.log("🔒 [DEBUG] Nastavuji processingAI = true");
  window.processingAI = true;
  promptInput.disabled = true;

  // Zobraz user zprávu hned
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user";
  userMsgDiv.style.marginBottom = "10px";
  userMsgDiv.innerHTML = `<strong>Ty:</strong> ${window.escapeHtml(prompt)}`;
  container.appendChild(userMsgDiv);
  container.scrollTop = container.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "text-align: center; color: #666; padding: 12px; font-size: 12px;";
  loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div> Čekám na Groq...';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const apiKey = window.getCurrentGroqApiKey ? window.getCurrentGroqApiKey() : null;
    if (!apiKey) {
      throw new Error("Nemáte Groq API klíč. Otevřete ⚙️ Nastavení → Groq.");
    }

    // Build system prompt
    const modeIndicator = window.mode ? `Current mode: ${window.mode}` : "";
    const xMeasureMode = window.xMeasureMode || "radius";
    const learningContext = window.getAIMemoryContext ? window.getAIMemoryContext() : "";

    const modeExplanation = xMeasureMode === "diameter"
      ? `X-AXIS MODE: DIAMETER (⌀) - User shows values as diameter from center axis.`
      : `X-AXIS MODE: RADIUS (R) - User shows values as radius distance from center axis.`;

    const systemPrompt = `CAD Assistant for CNC Lathe/Mill operations (Czech language).
COORDINATE SYSTEM: Z-axis (horizontal) = JSON 'x', X-axis (vertical) = JSON 'y'
${modeIndicator}
${modeExplanation}
RESPONSE FORMAT (strict JSON only):
{"response_text":"Brief Czech confirmation <50 chars","shapes":[...]}
SHAPE TYPES:
Line: {"type":"line","x1":z1,"y1":x1,"x2":z2,"y2":x2}
Circle: {"type":"circle","cx":z,"cy":x,"r":radius}
Point: {"type":"point","x":z,"y":x}
${learningContext}`;

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";
    const fullPrompt = `${systemPrompt}\n\nAktuální kreslení:\n${contextInfo}\n\nUživatel: ${prompt}`;

    // Determine AI type
    const aiType = document.getElementById('aiTypeSelect')?.value || 'cnc';

    // Get selected model
    const modelSelect = document.getElementById("aiModelSelect");
    const selectedModel = modelSelect?.value;
    if (!selectedModel) {
      throw new Error("Není vybrán žádný model. Vyber model v nastavení.");
    }

    // Prepare messages
    let messages = [];
    const isVisionModel = window.GROQ_VISION_MODELS && window.GROQ_VISION_MODELS.includes(selectedModel);
    const hasImage = window.currentImageBase64 && window.currentImageMimeType;

    if (isVisionModel && hasImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${window.currentImageMimeType};base64,${window.currentImageBase64}`
            }
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: fullPrompt });
    }

    // Call Groq API
    console.log("🌐 [DEBUG] Groq API fetch()...", new Date().toISOString());
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    // Parse response
    let aiResponseText = data.choices?.[0]?.message?.content || "";
    if (!aiResponseText && data.choices?.[0]?.message?.reasoning) {
      aiResponseText = data.choices?.[0]?.message?.reasoning;
    }
    if (!aiResponseText) throw new Error("Groq nevrátila text");

    window.lastRawAI = aiResponseText;

    // If Chat mode
    if (aiType === 'chat') {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>Groq:</strong> ${window.escapeHtml(aiResponseText)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      window.processingAI = false;
      promptInput.disabled = false;
      document.getElementById('btnCancel')?.style.setProperty('display', 'none');
      document.getElementById('btnGenerate')?.style.setProperty('display', 'inline-block');
      if (window.updateApiUsageUI) window.updateApiUsageUI();
      return;
    }

    // CNC/2D mode - parse JSON
    let aiReply = window.parseAIReply(aiResponseText);
    if (!aiReply) throw new Error("AI nevrátila JSON. Raw: " + aiResponseText.substring(0, 200));

    const replyText = aiReply.response_text || "OK";
    const newShapes = aiReply.shapes || [];

    // Add shapes to canvas
    if (newShapes.length > 0 && window.shapes) {
      newShapes.forEach(shape => window.shapes.push(shape));
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      if (window.recordAISuccess) window.recordAISuccess(prompt, newShapes);
    }

    // Add to chat
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    msgDiv.innerHTML = newShapes.length > 0
      ? `<span class="shape-tag">⚡ +${newShapes.length} tvarů (Groq)</span><br>${window.escapeHtml(replyText)}`
      : `<strong>Groq:</strong> ${window.escapeHtml(replyText)}`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";
    if (window.clearImage) window.clearImage();

    // Update stats
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
    let errorMsg = "❌ Groq chyba: " + (err.message || "Neznámá chyba");
    if (err.message.includes("API klíč") || err.message.includes("Unauthorized")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení → Groq a vlož API klíč.";
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

// ===== OPENROUTER API CALL =====

/**
 * Volání OpenRouter API.
 * Umožňuje přístup k mnoha modelům (GPT-4, Claude, LLaMA, atd.)
 * @async
 * @returns {Promise<void>}
 */
window.callOpenRouterDirect = async function() {
  console.log("🌐 [DEBUG] callOpenRouterDirect() SPUŠTĚNO", new Date().toISOString());
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
    const apiKey = window.getCurrentOpenRouterApiKey ? window.getCurrentOpenRouterApiKey() : null;
    if (!apiKey) {
      throw new Error("Žádný OpenRouter API klíč. Otevři ⚙️ Nastavení → OpenRouter a vlož API klíč.");
    }

    const aiType = document.getElementById('aiTypeSelect')?.value || '2d';
    let systemPrompt = "";
    if (aiType === 'cnc') {
      systemPrompt = window.getCNCSystemPrompt ? window.getCNCSystemPrompt() : "";
    } else if (aiType === '2d') {
      systemPrompt = window.get2DSystemPrompt ? window.get2DSystemPrompt() : "";
    }

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";
    const fullPrompt = `${systemPrompt}\n\nAktuální kreslení:\n${contextInfo}\n\nUživatel: ${prompt}`;

    const modelSelect = document.getElementById("aiModelSelect");
    const selectedModel = modelSelect?.value || "google/gemini-2.0-flash-exp:free";

    console.log("🌐 [DEBUG] OpenRouter API fetch()...", new Date().toISOString());
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    let aiResponseText = data.choices?.[0]?.message?.content || "";
    if (!aiResponseText) throw new Error("OpenRouter nevrátila text");

    window.lastRawAI = aiResponseText;

    if (aiType === 'chat') {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>OpenRouter:</strong> ${window.escapeHtml(aiResponseText)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      window.processingAI = false;
      promptInput.disabled = false;
      document.getElementById('btnCancel')?.style.setProperty('display', 'none');
      document.getElementById('btnGenerate')?.style.setProperty('display', 'inline-block');
      if (window.updateApiUsageUI) window.updateApiUsageUI();
      return;
    }

    let aiReply = window.parseAIReply(aiResponseText);
    if (!aiReply) throw new Error("AI nevrátila JSON. Raw: " + aiResponseText.substring(0, 200));

    const replyText = aiReply.response_text || "OK";
    const newShapes = aiReply.shapes || [];

    if (newShapes.length > 0 && window.shapes) {
      newShapes.forEach(shape => window.shapes.push(shape));
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      if (window.recordAISuccess) window.recordAISuccess(prompt, newShapes);
    }

    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    msgDiv.innerHTML = newShapes.length > 0
      ? `<span class="shape-tag">🌐 +${newShapes.length} tvarů (OpenRouter)</span><br>${window.escapeHtml(replyText)}`
      : `<strong>OpenRouter:</strong> ${window.escapeHtml(replyText)}`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";

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
    let errorMsg = "❌ OpenRouter chyba: " + (err.message || "Neznámá chyba");
    if (err.message.includes("API klíč") || err.message.includes("Unauthorized")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení → OpenRouter a vlož API klíč.";
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

// ===== MISTRAL API CALL =====

/**
 * Volání Mistral AI API.
 * Podporuje Mistral modely (Small, Medium, Large, Codestral).
 * @async
 * @returns {Promise<void>}
 */
window.callMistralDirect = async function() {
  console.log("🔥 [DEBUG] callMistralDirect() SPUŠTĚNO", new Date().toISOString());
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
    const apiKey = window.getCurrentMistralApiKey ? window.getCurrentMistralApiKey() : null;
    if (!apiKey) {
      throw new Error("Žádný Mistral API klíč. Otevři ⚙️ Nastavení → Mistral a vlož API klíč.");
    }

    const aiType = document.getElementById('aiTypeSelect')?.value || '2d';
    let systemPrompt = "";
    if (aiType === 'cnc') {
      systemPrompt = window.getCNCSystemPrompt ? window.getCNCSystemPrompt() : "";
    } else if (aiType === '2d') {
      systemPrompt = window.get2DSystemPrompt ? window.get2DSystemPrompt() : "";
    }

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";
    const fullPrompt = `${systemPrompt}\n\nAktuální kreslení:\n${contextInfo}\n\nUživatel: ${prompt}`;

    const modelSelect = document.getElementById("aiModelSelect");
    const selectedModel = modelSelect?.value || "codestral-latest";

    console.log("🌐 [DEBUG] Mistral API fetch()...", new Date().toISOString());
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    let aiResponseText = data.choices?.[0]?.message?.content || "";
    if (!aiResponseText) throw new Error("Mistral nevrátila text");

    window.lastRawAI = aiResponseText;

    if (aiType === 'chat') {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>Mistral:</strong> ${window.escapeHtml(aiResponseText)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      window.processingAI = false;
      promptInput.disabled = false;
      document.getElementById('btnCancel')?.style.setProperty('display', 'none');
      document.getElementById('btnGenerate')?.style.setProperty('display', 'inline-block');
      if (window.updateApiUsageUI) window.updateApiUsageUI();
      return;
    }

    let aiReply = window.parseAIReply(aiResponseText);
    if (!aiReply) throw new Error("AI nevrátila JSON. Raw: " + aiResponseText.substring(0, 200));

    const replyText = aiReply.response_text || "OK";
    const newShapes = aiReply.shapes || [];

    if (newShapes.length > 0 && window.shapes) {
      newShapes.forEach(shape => window.shapes.push(shape));
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      if (window.recordAISuccess) window.recordAISuccess(prompt, newShapes);
    }

    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    msgDiv.innerHTML = newShapes.length > 0
      ? `<span class="shape-tag">🔥 +${newShapes.length} tvarů (Mistral)</span><br>${window.escapeHtml(replyText)}`
      : `<strong>Mistral:</strong> ${window.escapeHtml(replyText)}`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";

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
    let errorMsg = "❌ Mistral chyba: " + (err.message || "Neznámá chyba");
    if (err.message.includes("API klíč") || err.message.includes("Unauthorized")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení → Mistral a vlož API klíč.";
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

// ===== API KEY GETTERS =====

/**
 * Získá aktuální Groq API klíč
 * @returns {string|null} API klíč
 */
window.getCurrentGroqApiKey = function() {
  return localStorage.getItem("groq_api_key") || null;
};

/**
 * Získá aktuální OpenRouter API klíč
 * @returns {string|null} API klíč
 */
window.getCurrentOpenRouterApiKey = function() {
  return localStorage.getItem("openrouter_api_key") || null;
};

/**
 * Získá aktuální Mistral API klíč
 * @returns {string|null} API klíč
 */
window.getCurrentMistralApiKey = function() {
  return localStorage.getItem("mistral_api_key") || null;
};

/**
 * Získá jméno aktuálního Groq API klíče
 * @returns {string} Jméno klíče
 */
window.getCurrentGroqApiKeyName = function() {
  return localStorage.getItem("groq_api_key") ? "Groq klíč ✓" : "Žádný klíč";
};

console.log("✅ [AI-PROVIDERS] Modul načten");
