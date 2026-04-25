export function createPromptLibraryApi(deps) {
  const {
    state,
    t,
    getUiLang,
    DEFAULT_PROMPT,
    FINAL_PROMPT,
    PROMPT_LIBRARY_BASE,
    enforceSpecialistaFormat,
    showToast
  } = deps;

  const PROMPT_LIBRARY_CUSTOM_KEY = 'strong_prompt_library_custom';
  const PROMPT_LIBRARY_IMPORTED_KEY = 'strong_prompt_library_imported';

  function clonePromptLibraryBase() {
    return JSON.parse(JSON.stringify(PROMPT_LIBRARY_BASE || {}));
  }

  function getStoredCustomPromptLibrary() {
    try {
      const raw = localStorage.getItem(PROMPT_LIBRARY_CUSTOM_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((p) => p && typeof p.name === 'string' && typeof p.desc === 'string' && typeof p.text === 'string');
    } catch {
      return [];
    }
  }

  function saveStoredCustomPromptLibrary(customEntries) {
    localStorage.setItem(PROMPT_LIBRARY_CUSTOM_KEY, JSON.stringify(customEntries || []));
  }

  function getStoredImportedPromptLibrary() {
    try {
      const raw = localStorage.getItem(PROMPT_LIBRARY_IMPORTED_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed;
    } catch {
      return {};
    }
  }

  function saveStoredImportedPromptLibrary(data) {
    localStorage.setItem(PROMPT_LIBRARY_IMPORTED_KEY, JSON.stringify(data || {}));
  }

  function rebuildPromptLibrary(currentSavedPrompt = '') {
    state.PROMPT_LIBRARY = clonePromptLibraryBase();
    const importedByCategory = getStoredImportedPromptLibrary();
    for (const [category, prompts] of Object.entries(importedByCategory)) {
      if (!Array.isArray(prompts)) continue;
      if (!state.PROMPT_LIBRARY[category]) state.PROMPT_LIBRARY[category] = [];
      for (const item of prompts) {
        if (!item || typeof item.text !== 'string') continue;
        if (!state.PROMPT_LIBRARY[category].some((p) => p.text === item.text)) {
          state.PROMPT_LIBRARY[category].push({
            name: String(item.name || 'Importovaný'),
            desc: String(item.desc || 'Import ze souboru'),
            text: item.text
          });
        }
      }
    }
    const customSaved = localStorage.getItem('strong_custom_prompt');
    const importedCustom = getStoredCustomPromptLibrary();
    const customEntries = [];

    if (customSaved && customSaved.trim()) {
      customEntries.push({
        name: 'Moje vlastní',
        desc: 'Uložený vlastní prompt',
        text: customSaved
      });
    }

    for (const item of importedCustom) {
      if (item.text !== customSaved) customEntries.push(item);
    }

    customEntries.push(FINAL_PROMPT);

    if (currentSavedPrompt && !customEntries.some((p) => p.text === currentSavedPrompt)) {
      customEntries.unshift({
        name: 'Aktuální',
        desc: 'Aktuálně aktivní prompt',
        text: currentSavedPrompt
      });
    }

    state.PROMPT_LIBRARY.custom = customEntries;
  }

  function getSystemPromptForCurrentTask(context = 'batch') {
    let prompt = DEFAULT_PROMPT;
    if (context === 'topic') {
      prompt += `

DODATEK PRO JEDNO TÉMA:
- Pokud je požadováno jen jedno pole, vrať pouze hodnotu pro dané pole.
- U pole SPECIALISTA vrať detailní souvislý odstavec 3-5 vět bez odrážek.`;
    }
    return enforceSpecialistaFormat(prompt);
  }

  function isPromptAutoModeEnabled() {
    const saved = localStorage.getItem('strong_prompt_auto');
    return saved !== 'off';
  }

  function setMainPrompt(promptText, mode = 'custom') {
    const text = String(promptText || '').trim();
    state.isProgrammaticPromptSet = true;
    localStorage.setItem('strong_prompt', String(promptText || '').trim());
    localStorage.setItem('strong_prompt_mode', mode);
    const mainEditor = document.getElementById('promptEditor');
    if (mainEditor) {
      mainEditor.value = text;
      mainEditor.dispatchEvent(new Event('input'));
    }
    state.isProgrammaticPromptSet = false;
    updatePromptStatusIndicator();
  }

  function applySystemPromptForCurrentTask() {
    const context = state.topicPromptState ? 'topic' : 'batch';
    const systemPrompt = getSystemPromptForCurrentTask(context);
    setMainPrompt(systemPrompt, 'system');
    const editor = document.getElementById('promptLibraryEditor');
    if (editor) editor.value = systemPrompt;
    showToast(t('toast.systemPrompt.set', { mode: context === 'topic' ? (getUiLang() === 'en' ? 'topic' : 'téma') : (getUiLang() === 'en' ? 'batch' : 'dávka') }));
  }

  function togglePromptModeQuick() {
    const mode = localStorage.getItem('strong_prompt_mode') || 'custom';
    const customSaved = localStorage.getItem('strong_custom_prompt') || '';
    if (mode === 'custom') {
      setMainPrompt(getSystemPromptForCurrentTask('batch'), 'system');
      showToast(t('toast.prompt.switchedSystem'));
      return;
    }
    if (customSaved.trim()) {
      setMainPrompt(customSaved, 'custom');
      showToast(t('toast.prompt.switchedCustom'));
      return;
    }
    showToast(t('toast.prompt.customNotSaved'));
  }

  function updatePromptAutoButton() {
    const btn = document.getElementById('btnPromptAuto');
    if (!btn) return;
    const on = isPromptAutoModeEnabled();
    btn.textContent = `⚡ Auto prompt: ${on ? 'ON' : 'OFF'}`;
    btn.style.borderColor = on ? 'var(--grn)' : 'var(--brd)';
    btn.style.color = on ? 'var(--grn)' : 'var(--txt2)';
  }

  function togglePromptAutoMode() {
    const on = isPromptAutoModeEnabled();
    localStorage.setItem('strong_prompt_auto', on ? 'off' : 'on');
    updatePromptAutoButton();
    showToast(t('toast.autoPrompt.toggled', { state: on ? (getUiLang() === 'en' ? 'off' : 'vypnut') : (getUiLang() === 'en' ? 'on' : 'zapnut') }));
  }

  function showPromptLibraryModal() {
    const modal = document.getElementById('promptLibraryModal');
    const tabs = document.getElementById('promptTabs');
    const editor = document.getElementById('promptLibraryEditor');
    const savedPrompt = localStorage.getItem('strong_prompt') || DEFAULT_PROMPT;
    rebuildPromptLibrary(savedPrompt);
    state.selectedPromptCategory = 'default';
    state.selectedPromptIndex = 0;
    const getPromptTabLabel = (cat) => {
      const map = { default: 'prompt.tab.default', detailed: 'prompt.tab.detailed', concise: 'prompt.tab.concise', literal: 'prompt.tab.literal', test: 'prompt.tab.test', custom: 'prompt.tab.custom' };
      return t(map[cat] || cat);
    };
    tabs.innerHTML = Object.keys(state.PROMPT_LIBRARY).map((cat) => `<div class="prompt-tab ${cat === 'default' ? 'active' : ''}" data-category="${cat}">${getPromptTabLabel(cat)}</div>`).join('');
    tabs.querySelectorAll('.prompt-tab').forEach((tab) => {
      tab.onclick = () => {
        tabs.querySelectorAll('.prompt-tab').forEach((x) => x.classList.remove('active'));
        tab.classList.add('active');
        state.selectedPromptCategory = tab.dataset.category;
        state.selectedPromptIndex = 0;
        renderPromptList();
        renderPromptPreview();
      };
    });
    if (editor) editor.value = savedPrompt;
    matchPromptToPreset(savedPrompt);
    renderPromptList();
    renderPromptPreview();
    modal.classList.add('show');
    modal.onclick = (e) => { if (e.target === modal) closePromptLibraryModal(); };
  }

  function matchPromptToPreset(promptText) {
    let foundMatch = false;
    for (const [category, prompts] of Object.entries(state.PROMPT_LIBRARY)) {
      for (let i = 0; i < prompts.length; i++) {
        if (prompts[i].text === promptText) {
          state.selectedPromptCategory = category;
          state.selectedPromptIndex = i;
          foundMatch = true;
          break;
        }
      }
      if (foundMatch) break;
    }
    if (!foundMatch) {
      state.selectedPromptCategory = 'custom';
      state.selectedPromptIndex = 0;
      rebuildPromptLibrary(promptText);
    }
  }

  function closePromptLibraryModal() {
    document.getElementById('promptLibraryModal').classList.remove('show');
  }

  function renderPromptList() {
    const list = document.getElementById('promptList');
    const prompts = state.PROMPT_LIBRARY[state.selectedPromptCategory] || [];
    if (prompts.length === 0) {
      list.innerHTML = '<div style="color:var(--txt3);font-size:11px;padding:10px">Žádné prompty v této kategorii</div>';
      return;
    }
    list.innerHTML = prompts.map((p, idx) => `
    <div class="prompt-item ${idx === state.selectedPromptIndex ? 'selected' : ''}" data-index="${idx}" onclick="selectPrompt(${idx})">
      <div class="prompt-item-name">${p.name}</div>
      <div class="prompt-item-desc">${p.desc}</div>
    </div>
  `).join('');
  }

  function renderPromptPreview() {
    const preview = document.getElementById('promptPreview');
    const editor = document.getElementById('promptLibraryEditor');
    const prompts = state.PROMPT_LIBRARY[state.selectedPromptCategory] || [];
    const prompt = prompts[state.selectedPromptIndex];
    if (prompt) {
      preview.textContent = prompt.text;
      if (editor) editor.value = prompt.text;
    } else {
      preview.textContent = 'Vyberte prompt z knihovny...';
    }
  }

  function selectPrompt(index) {
    state.selectedPromptIndex = index;
    const prompts = state.PROMPT_LIBRARY[state.selectedPromptCategory] || [];
    const prompt = prompts[index];
    if (prompt) document.getElementById('promptLibraryEditor').value = prompt.text;
    renderPromptList();
    renderPromptPreview();
  }

  function applySelectedPrompt() {
    const editor = document.getElementById('promptLibraryEditor');
    const promptText = editor ? editor.value.trim() : '';
    if (!promptText) {
      showToast(t('toast.prompt.empty'));
      return;
    }
    setMainPrompt(promptText, 'custom');
    if (state.selectedPromptCategory === 'custom') {
      localStorage.setItem('strong_custom_prompt', promptText);
      const imported = getStoredCustomPromptLibrary().filter((item) => item.text !== promptText);
      saveStoredCustomPromptLibrary(imported);
      rebuildPromptLibrary(promptText);
    }
    closePromptLibraryModal();
    showToast(t('toast.prompt.savedApplied'));
  }

  function exportPromptLibraryToTxt() {
    rebuildPromptLibrary(localStorage.getItem('strong_prompt') || '');
    const lines = ['# Strong Prompt Library Export v1', `# Generated: ${new Date().toISOString()}`];
    for (const [category, prompts] of Object.entries(state.PROMPT_LIBRARY)) {
      lines.push(`## CATEGORY: ${category}`);
      for (const prompt of prompts || []) {
        lines.push(`### PROMPT: ${prompt.name || 'Bez názvu'}`);
        lines.push(`DESC: ${prompt.desc || ''}`);
        lines.push('---BEGIN---');
        lines.push(String(prompt.text || ''));
        lines.push('---END---');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strong_prompty_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(t('toast.prompt.exported'));
  }

  function importPromptLibraryFromFile(input) {
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const regex = /## CATEGORY:\s*([^\n]+)\n### PROMPT:\s*([^\n]+)\nDESC:\s*([^\n]*)\n---BEGIN---\n([\s\S]*?)\n---END---/g;
        const importedCustom = [];
        const importedByCategory = getStoredImportedPromptLibrary();
        let totalImported = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const category = (match[1] || '').trim().toLowerCase();
          const name = (match[2] || '').trim() || 'Importovaný';
          const desc = (match[3] || '').trim() || 'Import ze souboru';
          const body = (match[4] || '').trim();
          if (!body) continue;
          totalImported += 1;
          if (category === 'custom') {
            importedCustom.push({ name, desc, text: body });
            continue;
          }
          if (!importedByCategory[category]) importedByCategory[category] = [];
          if (!importedByCategory[category].some((p) => p.text === body)) importedByCategory[category].push({ name, desc, text: body });
        }
        const existingCustom = getStoredCustomPromptLibrary();
        const merged = [...existingCustom];
        for (const item of importedCustom) {
          if (!merged.some((e) => e.text === item.text)) merged.push(item);
        }
        saveStoredCustomPromptLibrary(merged);
        saveStoredImportedPromptLibrary(importedByCategory);
        rebuildPromptLibrary(localStorage.getItem('strong_prompt') || '');
        renderPromptList();
        renderPromptPreview();
        showToast(t('toast.prompts.loaded.count', { count: totalImported }));
      } catch (err) {
        showToast(t('toast.prompt.importFailed'));
        console.error(err);
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function updatePromptStatusIndicator() {
    const modeDot = document.getElementById('promptMode');
    const nameEl = document.getElementById('promptName');
    if (!modeDot || !nameEl) return;
    const currentPrompt = localStorage.getItem('strong_prompt') || '';
    const mode = localStorage.getItem('strong_prompt_mode') || 'custom';
    let matched = false;
    let matchedName = '';
    if (currentPrompt === DEFAULT_PROMPT) {
      matched = true;
      matchedName = 'Originální';
    }
    if (!matched) {
      for (const [category, prompts] of Object.entries(state.PROMPT_LIBRARY)) {
        for (const p of prompts) {
          if (p.text === currentPrompt && category !== 'custom') {
            matched = true;
            matchedName = p.name;
            break;
          }
        }
        if (matched) break;
      }
    }
    if (mode === 'system' || matched) {
      modeDot.style.background = 'var(--grn)';
      modeDot.style.boxShadow = '0 0 6px var(--grn)';
      nameEl.textContent = mode === 'system' ? 'Systémový (auto)' : matchedName;
      nameEl.style.color = 'var(--grn)';
    } else {
      modeDot.style.background = 'var(--red)';
      modeDot.style.boxShadow = 'none';
      nameEl.textContent = currentPrompt ? 'Vlastní (upravený)' : 'Žádný';
      nameEl.style.color = 'var(--red)';
    }
    if (!isPromptAutoModeEnabled()) nameEl.textContent += ' · auto OFF';
  }

  function initializePromptLibrary() {
    rebuildPromptLibrary(localStorage.getItem('strong_prompt') || DEFAULT_PROMPT);
  }

  return {
    initializePromptLibrary,
    getStoredCustomPromptLibrary,
    saveStoredCustomPromptLibrary,
    getStoredImportedPromptLibrary,
    saveStoredImportedPromptLibrary,
    rebuildPromptLibrary,
    getSystemPromptForCurrentTask,
    isPromptAutoModeEnabled,
    setMainPrompt,
    applySystemPromptForCurrentTask,
    togglePromptModeQuick,
    updatePromptAutoButton,
    togglePromptAutoMode,
    showPromptLibraryModal,
    matchPromptToPreset,
    closePromptLibraryModal,
    renderPromptList,
    renderPromptPreview,
    selectPrompt,
    applySelectedPrompt,
    exportPromptLibraryToTxt,
    importPromptLibraryFromFile,
    updatePromptStatusIndicator
  };
}
