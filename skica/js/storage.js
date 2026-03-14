// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Ukládání / Načítání / CNC export                  ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Save / Load ──
function saveProject() {
  const data = {
    version: 2,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
  };
  localStorage.setItem("skica_project", JSON.stringify(data));
  showToast("Projekt uložen");
}

function loadProject() {
  const raw = localStorage.getItem("skica_project");
  if (!raw) {
    showToast("Žádný uložený projekt");
    return;
  }
  try {
    const data = JSON.parse(raw);
    pushUndo();
    state.objects = data.objects || [];
    state.nextId = data.nextId || 1;
    if (data.gridSize && data.gridSize > 0)
      state.gridSize = data.gridSize;
    state.selected = null;
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    showToast(`Načteno ${state.objects.length} objektů`);
  } catch (e) {
    showToast("Chyba při načítání projektu");
  }
}

function exportProjectFile() {
  const data = {
    version: 2,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "skica_projekt.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Projekt exportován jako soubor");
}

function importProjectFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        pushUndo();
        state.objects = data.objects || [];
        state.nextId = data.nextId || 1;
        if (data.gridSize && data.gridSize > 0)
          state.gridSize = data.gridSize;
        state.selected = null;
        updateObjectList();
        updateProperties();
        calculateAllIntersections();
        showToast(`Importováno ${state.objects.length} objektů`);
      } catch (err) {
        showToast("Chyba při čtení souboru");
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// ── Tlačítka Save/Load ──
document.getElementById("btnSave").addEventListener("click", saveProject);
document.getElementById("btnLoad").addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>📂 Načíst projekt</h3>
      <div class="btn-row" style="flex-direction:column;gap:8px;align-items:stretch">
        <button class="btn-ok" id="loadLocal" style="width:100%">Načíst z paměti prohlížeče</button>
        <button class="btn-ok" id="loadFile" style="width:100%">Importovat ze souboru (.json)</button>
        <button class="btn-ok" id="exportFile" style="width:100%;background:#f9e2af;border-color:#f9e2af">Exportovat do souboru</button>
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()" style="width:100%">Zrušit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#loadLocal").addEventListener("click", () => {
    overlay.remove();
    loadProject();
  });
  overlay.querySelector("#loadFile").addEventListener("click", () => {
    overlay.remove();
    importProjectFile();
  });
  overlay.querySelector("#exportFile").addEventListener("click", () => {
    overlay.remove();
    exportProjectFile();
  });
});

// ── CNC Export ──
document.getElementById("btnExport").addEventListener("click", () => {
  let out = "; === SKICA – CNC Soustružník (X,Z) ===\n";
  out += `; Datum: ${new Date().toLocaleString("cs")}\n`;
  out += `; Počet objektů: ${state.objects.length}\n`;
  out += `; Průsečíků: ${state.intersections.length}\n\n`;

  out += "; --- Objekty ---\n";
  state.objects.forEach((obj) => {
    if (obj.type === "constr") return;
    switch (obj.type) {
      case "point":
        out += `; ${obj.name}\nG00 X${obj.x.toFixed(4)} Z${obj.y.toFixed(4)}\n`;
        break;
      case "line":
        out += `; ${obj.name} (délka: ${Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1).toFixed(4)})\n`;
        out += `G00 X${obj.x1.toFixed(4)} Z${obj.y1.toFixed(4)}\nG01 X${obj.x2.toFixed(4)} Z${obj.y2.toFixed(4)}\n`;
        break;
      case "circle":
        out += `; ${obj.name} (R: ${obj.r.toFixed(4)})\n`;
        // Split full circle into two half-circles for CNC compatibility
        out += `G00 X${(obj.cx + obj.r).toFixed(4)} Z${obj.cy.toFixed(4)}\n`;
        out += `G02 X${(obj.cx - obj.r).toFixed(4)} Z${obj.cy.toFixed(4)} I${(-obj.r).toFixed(4)} K0.0000\n`;
        out += `G02 X${(obj.cx + obj.r).toFixed(4)} Z${obj.cy.toFixed(4)} I${obj.r.toFixed(4)} K0.0000\n`;
        break;
      case "arc":
        out += `; ${obj.name} (R: ${obj.r.toFixed(4)})\n`;
        const sx = obj.cx + obj.r * Math.cos(obj.startAngle),
          sy = obj.cy + obj.r * Math.sin(obj.startAngle);
        const ex = obj.cx + obj.r * Math.cos(obj.endAngle),
          ey = obj.cy + obj.r * Math.sin(obj.endAngle);
        out += `G00 X${sx.toFixed(4)} Z${sy.toFixed(4)}\nG02 X${ex.toFixed(4)} Z${ey.toFixed(4)} R${obj.r.toFixed(4)}\n`;
        break;
      case "rect":
        out += `; ${obj.name} (${Math.abs(obj.x2 - obj.x1).toFixed(2)} × ${Math.abs(obj.y2 - obj.y1).toFixed(2)})\n`;
        out += `G00 X${obj.x1.toFixed(4)} Z${obj.y1.toFixed(4)}\n`;
        out += `G01 X${obj.x2.toFixed(4)} Z${obj.y1.toFixed(4)}\n`;
        out += `G01 X${obj.x2.toFixed(4)} Z${obj.y2.toFixed(4)}\n`;
        out += `G01 X${obj.x1.toFixed(4)} Z${obj.y2.toFixed(4)}\n`;
        out += `G01 X${obj.x1.toFixed(4)} Z${obj.y1.toFixed(4)}\n`;
        break;
    }
    out += "\n";
  });

  if (state.intersections.length > 0) {
    out += "; --- Průsečíky ---\n";
    state.intersections.forEach((pt, i) => {
      out += `; P${i + 1}: X${pt.x.toFixed(4)} Z${pt.y.toFixed(4)}\n`;
    });
  }
  out += "\n; === Konec ===\n";
  document.getElementById("cncOutput").textContent = out;
  navigator.clipboard
    .writeText(out)
    .then(() => showToast("CNC export zkopírován do schránky"))
    .catch(() => showToast("CNC export vygenerován v panelu"));
});

// ╔══════════════════════════════════════════════════════════════╗
// ║  GitHub Auto-Save                                           ║
// ╚══════════════════════════════════════════════════════════════╝

const GH_CONFIG_KEY = "skica_github_config";

function getGitHubConfig() {
  const raw = localStorage.getItem(GH_CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGitHubConfig(config) {
  localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(config));
}

function updateGitHubStatus(status) {
  const dot = document.getElementById("ghStatusDot");
  if (!dot) return;
  dot.className = "gh-status" + (status ? " " + status : "");
}

// ── Debounced auto-save ──
let _ghAutoSaveTimer = null;

function scheduleGitHubAutoSave() {
  const config = getGitHubConfig();
  if (!config || !config.autoSave || !config.token || !config.repo) return;
  if (_ghAutoSaveTimer) clearTimeout(_ghAutoSaveTimer);
  _ghAutoSaveTimer = setTimeout(() => {
    githubSave(true);
  }, 5000);
}

// Hook into pushUndo to trigger auto-save
const _originalPushUndo = pushUndo;
pushUndo = function () {
  _originalPushUndo();
  scheduleGitHubAutoSave();
};

// ── GitHub Save ──
async function githubSave(auto = false) {
  const config = getGitHubConfig();
  if (!config || !config.token || !config.repo || !config.path) {
    if (!auto) showToast("GitHub: Nastavte konfiguraci");
    return;
  }

  const parts = config.repo.split("/");
  if (parts.length !== 2) {
    if (!auto) showToast("GitHub: Neplatný formát repozitáře");
    return;
  }
  const [owner, repo] = parts;

  const projectData = {
    version: 2,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
    savedAt: new Date().toISOString(),
  };

  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(projectData, null, 2))),
  );

  if (!auto) updateGitHubStatus("saving");

  try {
    // Get current SHA if file exists
    let sha = null;
    const getResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${config.path}`,
      { headers: { Authorization: `Bearer ${config.token}` } },
    );
    if (getResp.ok) {
      const data = await getResp.json();
      sha = data.sha;
    }

    // PUT file
    const body = {
      message: `SKICA auto-save ${new Date().toLocaleString("cs")}`,
      content: content,
    };
    if (sha) body.sha = sha;

    const putResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${config.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (putResp.ok) {
      if (!auto) showToast("GitHub: Uloženo ✓");
      updateGitHubStatus("saved");
    } else {
      const err = await putResp.json();
      if (!auto) showToast(`GitHub chyba: ${err.message}`);
      updateGitHubStatus("error");
    }
  } catch (e) {
    if (!auto) showToast(`GitHub chyba: ${e.message}`);
    updateGitHubStatus("error");
  }
}

// ── GitHub Load ──
async function githubLoad() {
  const config = getGitHubConfig();
  if (!config || !config.token || !config.repo || !config.path) {
    showToast("GitHub: Nastavte konfiguraci");
    return;
  }

  const [owner, repo] = config.repo.split("/");

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${config.path}`,
      { headers: { Authorization: `Bearer ${config.token}` } },
    );

    if (!resp.ok) {
      showToast("GitHub: Soubor nenalezen");
      return;
    }

    const data = await resp.json();
    const content = decodeURIComponent(escape(atob(data.content)));
    const project = JSON.parse(content);

    pushUndo();
    state.objects = project.objects || [];
    state.nextId = project.nextId || 1;
    if (project.gridSize > 0) state.gridSize = project.gridSize;
    state.selected = null;
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    showToast(`GitHub: Načteno ${state.objects.length} objektů`);
  } catch (e) {
    showToast(`GitHub chyba: ${e.message}`);
  }
}

// ── GitHub Test Connection ──
async function githubTest(config) {
  try {
    const [owner, repo] = config.repo.split("/");
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: { Authorization: `Bearer ${config.token}` } },
    );
    if (resp.ok) {
      const data = await resp.json();
      showToast(`GitHub OK: ${data.full_name} ✓`);
      return true;
    } else {
      const err = await resp.json();
      showToast(`GitHub: ${err.message}`);
      return false;
    }
  } catch (e) {
    showToast("GitHub: Chyba připojení");
    return false;
  }
}

// ── GitHub Settings Dialog ──
document.getElementById("btnGitHub").addEventListener("click", () => {
  const config = getGitHubConfig() || {
    token: "",
    repo: "",
    path: "skica_projekt.json",
    autoSave: false,
  };

  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>☁️ GitHub Auto-Save</h3>
      <p style="font-size:11px;color:#f38ba8;margin-bottom:8px">⚠️ Token je uložen v prohlížeči (localStorage). Používejte pouze na důvěryhodných zařízeních.</p>
      <label>Personal Access Token</label>
      <input type="password" id="ghToken" value="${config.token}" placeholder="github_pat_...">
      <label>Repozitář (owner/repo)</label>
      <input id="ghRepo" value="${config.repo}" placeholder="user/my-skica-backup">
      <label>Cesta k souboru</label>
      <input id="ghPath" value="${config.path}" placeholder="skica_projekt.json">
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0 4px">
        <input type="checkbox" id="ghAutoSave" ${config.autoSave ? "checked" : ""} style="width:auto;margin:0">
        Automaticky ukládat při změnách (po 5s)
      </label>
      <div class="btn-row" style="flex-wrap:wrap">
        <button class="btn-cancel" id="ghTestBtn">🔍 Test</button>
        <button class="btn-cancel" id="ghSaveNow">💾 Uložit nyní</button>
        <button class="btn-cancel" id="ghLoadNow">📂 Načíst</button>
        <button class="btn-ok" id="ghOk">OK</button>
        <button class="btn-cancel" id="ghCancel">Zrušit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  function readFields() {
    return {
      token: overlay.querySelector("#ghToken").value.trim(),
      repo: overlay.querySelector("#ghRepo").value.trim(),
      path: overlay.querySelector("#ghPath").value.trim() || "skica_projekt.json",
      autoSave: overlay.querySelector("#ghAutoSave").checked,
    };
  }

  overlay.querySelector("#ghTestBtn").addEventListener("click", () => {
    const cfg = readFields();
    if (!cfg.token || !cfg.repo) {
      showToast("Vyplňte token a repozitář");
      return;
    }
    githubTest(cfg);
  });

  overlay.querySelector("#ghSaveNow").addEventListener("click", () => {
    const cfg = readFields();
    saveGitHubConfig(cfg);
    githubSave(false);
  });

  overlay.querySelector("#ghLoadNow").addEventListener("click", () => {
    const cfg = readFields();
    saveGitHubConfig(cfg);
    overlay.remove();
    githubLoad();
  });

  overlay.querySelector("#ghOk").addEventListener("click", () => {
    const cfg = readFields();
    saveGitHubConfig(cfg);
    if (cfg.autoSave && cfg.token && cfg.repo) {
      updateGitHubStatus("saved");
    } else {
      updateGitHubStatus("");
    }
    overlay.remove();
    showToast("GitHub nastavení uloženo");
  });

  overlay.querySelector("#ghCancel").addEventListener("click", () => {
    overlay.remove();
  });
});
