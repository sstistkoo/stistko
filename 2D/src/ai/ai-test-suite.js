/**
 * AI Module - Test Suite
 * Obsahuje testovací funkce a prompty pro validaci AI funkcí
 * @module ai-test-suite
 */

// ===== ES6 EXPORTS =====
export const AI_TEST = {};

// ===== AI TEST PROMPTS =====
window.AI_TEST_PROMPTS = [
  // KOMPLEXNÍ TEST
  {
    level: "KOMPLEXNÍ",
    name: "🎯 KOMPLETNÍ TEST - Všechny hlavní funkce",
    prompt: "bod Z50 X50, kružnice Z100 X100 R40, X200Z100R30, čára Z50 X50 do Z100 X100, kružnice Z150 X150 R50 pak čára od středu úhel 0° délka 100, čára Z300 X50 do Z400 X150",
    expectedShapes: 7,
    expectedType: ["point", "circle", "circle", "line", "circle", "line", "line"],
    complexity: 10,
    description: "Testuje: bod, kružnice, CNC syntax, polární čáru"
  },
  // PRAKTICKÉ
  {
    level: "PRAKTICKÝ",
    name: "🔧 Test tangenciálního radiusu",
    prompt: "čára Z0 X60 do Z40 X60, G2 Z45 X55 CR5, G3 Z50 X50 CR5, čára do Z80 X50",
    expectedShapes: 4,
    expectedType: ["line", "arc", "arc", "line"],
    complexity: 5
  },
  // KATEGORIE
  {
    level: "KATEGORIE",
    name: "📍 Test bodů",
    prompt: "bod Z50 X50, bod Z100 X100, bod Z150 X150",
    expectedShapes: 3,
    expectedType: "point",
    complexity: 2
  },
  {
    level: "KATEGORIE",
    name: "⭕ Test kružnic",
    prompt: "kružnice Z100 X100 R30, kružnice Z200 X100 R40, X300Z100R50",
    expectedShapes: 3,
    expectedType: "circle",
    complexity: 3
  },
  {
    level: "KATEGORIE",
    name: "📏 Test čar",
    prompt: "čára Z0 X0 do Z100 X100, čára Z100 X100 do Z200 X200",
    expectedShapes: 2,
    expectedType: "line",
    complexity: 2
  },
  {
    level: "KATEGORIE",
    name: "🎯 Test polárních čar",
    prompt: "kružnice Z100 X100 R50, pak čára od středu úhel 0° délka 100",
    expectedShapes: 2,
    expectedType: ["circle", "line"],
    complexity: 5
  }
];

// ===== TEST RESULTS STORAGE =====
window.aiTestResults = window.aiTestResults || [];
window.aiTestBatchMode = false;

// ===== RUN SINGLE TEST =====
/**
 * Spustí jednotlivý AI test
 * @param {number} testIndex - Index testu v poli AI_TEST_PROMPTS
 */
window.runAITest = async function(testIndex = 0) {
  const container = document.getElementById("aiChatHistory");

  if (testIndex >= window.AI_TEST_PROMPTS.length) {
    if (window.showTestSummary) window.showTestSummary();
    return;
  }

  const test = window.AI_TEST_PROMPTS[testIndex];
  const promptInput = document.getElementById("aiPrompt");

  if (!promptInput || !container) {
    console.error("❌ AI panel nenalezen!");
    return;
  }

  // Zobraz test zprávu
  const testDiv = document.createElement("div");
  testDiv.className = "chat-msg model";
  testDiv.style.color = "#60a5fa";
  testDiv.style.fontWeight = "bold";
  testDiv.textContent = `🧪 TEST ${testIndex + 1}/${window.AI_TEST_PROMPTS.length}: ${test.name}`;
  container.appendChild(testDiv);
  container.scrollTop = container.scrollHeight;

  promptInput.value = test.prompt;
  await new Promise(resolve => setTimeout(resolve, 500));

  const shapesBefore = (window.shapes || []).length;
  const pointsBefore = (window.points || []).length;

  // Spusť AI
  const success = window.callGemini ? await window.callGemini().then(() => true).catch(() => false) : true;
  window.processingAI = false;

  // Vyčisti loading
  const loadingDivs = container.querySelectorAll('.loading-dots');
  loadingDivs.forEach(div => {
    const parent = div.closest('div[style*="text-align: center"]');
    if (parent && container.contains(parent)) container.removeChild(parent);
  });

  // Ověř výsledky
  const shapesAfter = (window.shapes || []).length;
  const pointsAfter = (window.points || []).length;
  const newShapesCount = (shapesAfter - shapesBefore) + (pointsAfter - pointsBefore);

  let validationErrors = [];
  let hasErrors = false;

  if (newShapesCount < test.expectedShapes) {
    validationErrors.push(`Očekávaný počet: ${test.expectedShapes}, získáno: ${newShapesCount}`);
    hasErrors = true;
  }

  // Ulož výsledky
  window.aiTestResults.push({
    testIndex: testIndex,
    testName: test.name,
    prompt: test.prompt,
    expectedShapes: test.expectedShapes,
    actualShapes: newShapesCount,
    hasErrors: hasErrors,
    errors: validationErrors,
    timestamp: new Date().toISOString()
  });

  // Zobraz výsledek
  const resultDiv = document.createElement("div");
  resultDiv.className = "chat-msg model";
  resultDiv.style.color = !hasErrors ? "#10b981" : "#ef4444";
  resultDiv.style.fontSize = "12px";
  resultDiv.textContent = `📊 Výsledek: ${newShapesCount} tvarů ${!hasErrors ? '✅' : '❌'}`;
  container.appendChild(resultDiv);
  container.scrollTop = container.scrollHeight;

  // Batch nebo single mode
  if (window.aiTestBatchMode) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (testIndex + 1 >= window.AI_TEST_PROMPTS.length) {
      window.aiTestBatchMode = false;
      window.processingAI = false;
      window.showTestSummary();
    } else {
      window.runAITest(testIndex + 1);
    }
  } else {
    window.processingAI = false;
  }
};

// ===== RUN COMPLEX TEST =====
/**
 * Spustí komplexní test (první v poli)
 */
window.runComplexTest = function() {
  const modal = document.getElementById("aiTestModal");
  if (modal) modal.style.display = "none";

  window.resetTestResults();
  window.aiTestBatchMode = false;

  if (window.toggleAiPanel) window.toggleAiPanel(true);

  const chatContainer = document.getElementById("aiChatHistory");
  if (chatContainer) chatContainer.innerHTML = "";

  setTimeout(() => { if (window.runAITest) window.runAITest(0); }, 300);
};

// ===== RUN SINGLE TEST =====
/**
 * Spustí jednotlivý test podle indexu
 * @param {number} testIndex - Index testu
 */
window.runSingleTest = function(testIndex) {
  const modal = document.getElementById("aiTestModal");
  if (modal) modal.style.display = "none";

  window.resetTestResults();
  window.aiTestBatchMode = false;

  if (window.toggleAiPanel) window.toggleAiPanel(true);

  const chatContainer = document.getElementById("aiChatHistory");
  if (chatContainer) chatContainer.innerHTML = "";

  setTimeout(() => { if (window.runAITest) window.runAITest(testIndex); }, 300);
};

// ===== RUN ALL TESTS =====
/**
 * Spustí všechny testy v batch mode
 */
window.runAllTests = function() {
  if (!confirm("⚠️ Spuštění všech testů znamená 20+ API requestů!\n\nPokračovat?")) return;

  const modal = document.getElementById("aiTestModal");
  if (modal) modal.style.display = "none";

  window.resetTestResults();
  window.aiTestBatchMode = true;

  if (window.toggleAiPanel) window.toggleAiPanel(true);

  const chatContainer = document.getElementById("aiChatHistory");
  if (chatContainer) chatContainer.innerHTML = "";

  setTimeout(() => { if (window.runAITest) window.runAITest(0); }, 300);
};

// ===== RESET TEST RESULTS =====
/**
 * Resetuje výsledky testů
 */
window.resetTestResults = function() {
  window.aiTestResults = [];
  console.log("🔄 Výsledky testů resetovány");
};

// ===== SHOW TEST SUMMARY =====
/**
 * Zobrazí souhrn testů
 */
window.showTestSummary = function() {
  if (!window.aiTestResults || window.aiTestResults.length === 0) {
    alert("Žádné výsledky testů k dispozici.");
    return;
  }

  const container = document.getElementById("aiChatHistory");
  if (!container) return;

  const total = window.aiTestResults.length;
  const passed = window.aiTestResults.filter(r => !r.hasErrors).length;
  const successRate = ((passed / total) * 100).toFixed(1);

  let summaryText = `\n\n📊 SOUHRN TESTŮ\n`;
  summaryText += `${'='.repeat(50)}\n`;
  summaryText += `Celkem testů: ${total}\n`;
  summaryText += `✅ Úspěšné: ${passed} (${successRate}%)\n`;
  summaryText += `❌ Neúspěšné: ${total - passed}\n`;

  const summaryDiv = document.createElement("div");
  summaryDiv.className = "chat-msg model";
  summaryDiv.style.color = passed === total ? "#10b981" : "#ef4444";
  summaryDiv.style.fontSize = "12px";
  summaryDiv.style.whiteSpace = "pre-wrap";
  summaryDiv.textContent = summaryText;

  container.appendChild(summaryDiv);
  container.scrollTop = container.scrollHeight;

  alert(`✅ Testy dokončeny!\n\nÚspěšnost: ${successRate}%\n(${passed}/${total})`);
};

// ===== SHOW TEST PANEL =====
/**
 * Zobrazí panel s testy
 */
window.showAITestPanel = function() {
  const modal = document.getElementById("aiTestModal");
  if (!modal) return;

  const grouped = {};
  window.AI_TEST_PROMPTS.forEach((t, i) => {
    if (!grouped[t.level]) grouped[t.level] = [];
    grouped[t.level].push({ ...t, index: i + 1, actualIndex: i });
  });

  let html = `
    <div style="margin-bottom: 15px; padding: 12px; background: #0a2a1a; border-radius: 6px;">
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <button onclick="window.runComplexTest()" style="padding: 8px 16px; background: #10b981; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">
          🎯 KOMPLEXNÍ TEST
        </button>
        <button onclick="window.resetTestResults(); alert('✅ Resetováno');" style="padding: 8px 16px; background: #dc2626; border: none; border-radius: 6px; color: white; cursor: pointer;">
          🔄 RESET
        </button>
      </div>
    </div>
  `;

  Object.keys(grouped).forEach(level => {
    html += `<h3 style="color: #6ab0ff; margin: 12px 0 8px 0; font-size: 13px;">${level}</h3>`;
    html += `<div style="display: grid; gap: 6px;">`;

    grouped[level].forEach(t => {
      html += `
        <button onclick="window.runSingleTest(${t.actualIndex})" style="padding: 10px; background: #1a1a1a; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; cursor: pointer; text-align: left;">
          <div style="font-weight: bold; color: #6ab0ff">${t.index}. ${t.name}</div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">Tvary: ${t.expectedShapes}</div>
        </button>
      `;
    });

    html += `</div>`;
  });

  document.getElementById("aiTestContent").innerHTML = html;
  modal.style.display = "flex";
};

// ===== CLOSE TEST MODAL =====
/**
 * Zavře testovací modal
 */
window.closeAITestModal = function() {
  const modal = document.getElementById("aiTestModal");
  if (modal) modal.style.display = "none";
};

// ===== EXPORT TEST RESULTS =====
/**
 * Exportuje výsledky testů do JSON
 */
window.exportTestResults = function() {
  if (!window.aiTestResults || window.aiTestResults.length === 0) {
    alert("Žádné výsledky testů k exportu.");
    return;
  }

  const data = {
    timestamp: new Date().toISOString(),
    totalTests: window.aiTestResults.length,
    passedTests: window.aiTestResults.filter(r => !r.hasErrors).length,
    results: window.aiTestResults
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-test-results-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`✅ Exportováno do ${a.download}`);
};

// ===== CNC INPUT VALIDATION =====
/**
 * Validuje CNC příkaz
 * @param {string} text - CNC příkaz
 * @returns {string|null} Chybová zpráva nebo null
 */
window.validateCNCCommand = function(text) {
  if (!text || text.trim() === '') return 'Prázdný příkaz';
  const clean = text.replace(/\s+/g, '').toUpperCase();

  if (clean.match(/^G[0-3]/) && !/[XZ]/.test(clean)) {
    return '❌ Chybí souřadnice: Přidej X nebo Z';
  }

  return null;
};

/**
 * Formátuje CNC příkaz
 * @param {string} text - CNC příkaz
 * @returns {string} Formátovaný příkaz
 */
window.formatCNCCommand = function(text) {
  if (!text) return text;
  return text.replace(/([GXZRDALC])/g, ' $1').replace(/^\s+/, '').replace(/\s+/g, ' ');
};

console.log("✅ [AI-TEST-SUITE] Modul načten");
