/**
 * AISettingsModal.js
 * Pokročilý modal pro nastavení AI - výběr providera, modelů, API klíčů
 * Inspirováno test-ai-module.html
 */

import { Modal } from '../../../ui/components/Modal.js';
import { eventBus } from '../../../core/events.js';
import toast from '../../../ui/components/Toast.js';

export class AISettingsModal {
  constructor() {
    this.modal = null;
    this.selectedProvider = localStorage.getItem('ai_provider') || 'groq';
    this.providerEmojis = {
      gemini: '💎',
      groq: '⚡',
      openrouter: '🌐',
      mistral: '🔥',
      cohere: '🧬',
      huggingface: '🤗'
    };
    this.providerNames = {
      gemini: 'Google Gemini',
      groq: 'Groq',
      openrouter: 'OpenRouter',
      mistral: 'Mistral AI',
      cohere: 'Cohere',
      huggingface: 'HuggingFace'
    };
    this.providerUrls = {
      gemini: 'https://aistudio.google.com/app/apikey',
      groq: 'https://console.groq.com/keys',
      openrouter: 'https://openrouter.ai/keys',
      mistral: 'https://console.mistral.ai/api-keys/',
      cohere: 'https://dashboard.cohere.com/api-keys',
      huggingface: 'https://huggingface.co/settings/tokens'
    };
  }

  show() {
    if (!this.modal) {
      this.createModal();
    }
    this.modal.open();
    this.selectedProvider = window.AI?.config?.defaultProvider || 'gemini';
    this.updateUI();
    this.updateLimitsGrid();
  }

  hide() {
    if (this.modal) {
      this.modal.close();
    }
  }

  createModal() {
    const content = this.createContent();

    this.modal = new Modal({
      title: '⚙️ AI Nastavení',
      content,
      className: 'ai-settings-modal',
      size: 'large',
      onClose: () => this.hide()
    });

    this.modal.create();
    this.attachEventHandlers();
  }

  createContent() {
    return `
      <div class="ai-settings-panel">
        <!-- Provider Tabs -->
        <div class="settings-section">
          <h3 class="settings-title">🤖 Vyberte AI providera</h3>
          <div class="provider-tabs" id="providerTabs">
            ${this.createProviderTabs()}
          </div>
        </div>

        <!-- Model Selection -->
        <div class="settings-section">
          <div class="model-section">
            <div class="model-select-wrapper">
              <label for="settingsModelSelect">Model:</label>
              <select id="settingsModelSelect" class="settings-select">
                <option value="">Načítám modely...</option>
              </select>
            </div>
            <div class="model-info" id="modelInfo">
              <div class="model-rpm">
                <span class="rpm-value" id="rpmValue">--</span>
                <span class="rpm-label">RPM</span>
              </div>
              <div class="model-quality">
                <span id="qualityValue">--</span>% kvalita
              </div>
            </div>
          </div>
        </div>

        <!-- Rate Limit Info -->
        <div class="settings-section collapsible open">
          <div class="collapsible-header" id="limitsToggle">
            <h3 class="settings-title">⏱️ Rate Limity & RPD</h3>
            <span class="collapse-arrow">▼</span>
          </div>
          <div class="collapsible-content" id="limitsContent">
            <p class="info-text">RPM = Requests Per Minute | RPD = Requests Per Day<br>
            💡 Klikněte na tlačítko u každého providera pro kontrolu aktuálních limitů</p>
            <div class="limits-grid" id="limitsGrid">
              <!-- Dynamicky naplněno -->
            </div>
          </div>
        </div>

        <!-- API Keys Section -->
        <div class="settings-section collapsible">
          <div class="collapsible-header" id="keysToggle">
            <h3 class="settings-title">🔑 API Klíče</h3>
            <span class="collapse-arrow">▼</span>
          </div>
          <div class="collapsible-content" id="keysContent">
            <div class="keys-grid" id="keysGrid">
              ${this.createKeysGrid()}
            </div>
            <p class="keys-legend-text">✅ Vlastní klíč nastaven &nbsp;|&nbsp; ⚠️ Používá se demo klíč &nbsp;|&nbsp; ❌ Žádný klíč</p>
            <div class="keys-info" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 12px; color: var(--text-muted);">
              <strong>💡 Multiple API Keys:</strong> Můžete přidat více klíčů pro jeden provider pomocí:
              <code style="display: block; margin-top: 8px; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                AI.keys.add('provider', 'api-key-123', 'Klíč 1')<br>
                AI.keys.add('provider', 'api-key-456', 'Klíč 2')
              </code>
              <div style="margin-top: 8px;">
                ✅ <strong>Vlastní klíče mají vždy přednost</strong> před demo klíči<br>
                ✅ Při rate limitu se <strong>nejdřív rotuje klíč</strong>, pak až model<br>
                ✅ Kontrola: <code>AI.keys.list('provider')</code> | Rotace: <code>AI.keys.rotate('provider')</code>
              </div>
            </div>
            <div class="keys-actions">
              <button class="btn-secondary" id="saveKeysBtn">💾 Uložit klíče</button>
              <button class="btn-secondary" id="testKeysBtn">🧪 Test klíčů</button>
              <button class="btn-secondary" id="testAllKeysBtn">🧪 Test všech providerů</button>
              <button class="btn-link" id="getKeysHelpBtn">❓ Jak získat klíče</button>
            </div>
          </div>
        </div>

        <!-- Discover New Models -->
        <div class="settings-section collapsible">
          <div class="collapsible-header" id="discoverToggle">
            <h3 class="settings-title">🔍 Objevit nové modely</h3>
            <span class="collapse-arrow">▼</span>
          </div>
          <div class="collapsible-content" id="discoverContent">
            <p class="discover-info">Zkontrolujte dostupnost nových modelů u vybraného providera:</p>
            <div class="discover-actions">
              <button class="btn-primary" id="fetchModelsBtn">
                <span class="btn-icon">🔄</span>
                Načíst modely z API
              </button>
              <button class="btn-secondary" id="compareModelsBtn">
                <span class="btn-icon">⚖️</span>
                Porovnat modely
              </button>
            </div>
            <div class="discover-results" id="discoverResults" style="display: none;">
              <div class="discover-results-header">
                <span id="discoverResultsTitle">Výsledky</span>
                <button class="btn-small" id="closeDiscoverResults">✕</button>
              </div>
              <div class="discover-results-content" id="discoverResultsContent"></div>
            </div>
          </div>
        </div>

        <!-- Rate Limit Stats -->
        <div class="settings-section collapsible">
          <div class="collapsible-header" id="statsToggle">
            <h3 class="settings-title">📊 Statistiky použití</h3>
            <span class="collapse-arrow">▼</span>
          </div>
          <div class="collapsible-content" id="statsContent">
            <div class="stats-summary" id="statsSummary">
              <div class="stats-row">
                <span class="stats-label">📞 Celkem volání:</span>
                <span class="stats-value" id="totalCalls">0</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">📅 Dnes:</span>
                <span class="stats-value" id="todayCalls">0</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">📥 Tokeny vstup:</span>
                <span class="stats-value" id="totalTokensIn">0</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">📤 Tokeny výstup:</span>
                <span class="stats-value" id="totalTokensOut">0</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">⏱️ Zbývá RPM:</span>
                <span class="stats-value" id="remainingRpm">--</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">📅 Zbývá RPD:</span>
                <span class="stats-value" id="remainingRpd">--</span>
              </div>
            </div>
            <div class="stats-by-provider" id="statsByProvider">
              <!-- Dynamicky naplněno -->
            </div>
            <button class="btn-small btn-danger" id="resetStatsBtn">🗑️ Reset statistik</button>
          </div>
        </div>

        <!-- Footer -->
        <div class="settings-footer">
          <button class="btn-secondary" id="settingsCancelBtn">Zrušit</button>
          <button class="btn-primary" id="settingsSaveBtn">💾 Uložit nastavení</button>
        </div>
      </div>

      <style>
        .ai-settings-panel {
          padding: 0;
          max-height: 70vh;
          overflow-y: auto;
          --text-primary: #1e293b;
          --text-muted: #64748b;
          --input-bg: #f8fafc;
          --border-color: #e2e8f0;
          --bg-secondary: #f1f5f9;
          --bg-hover: #e2e8f0;
        }

        /* Dark theme support */
        body:not(.light-theme) .ai-settings-panel {
          --text-primary: #f1f5f9;
          --text-muted: #94a3b8;
          --input-bg: rgba(15, 23, 42, 0.8);
          --border-color: #475569;
          --bg-secondary: rgba(30, 41, 59, 0.8);
          --bg-hover: rgba(51, 65, 85, 0.8);
        }

        .settings-section {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .settings-section:last-child {
          border-bottom: none;
        }

        .settings-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Provider Tabs */
        .provider-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .provider-tab {
          padding: 10px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }

        .provider-tab:hover {
          background: var(--bg-hover);
          border-color: #94a3b8;
        }

        .provider-tab.active {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-color: transparent;
          color: white;
        }

        .provider-tab .tab-emoji {
          font-size: 16px;
        }

        .provider-tab .key-status {
          font-size: 10px;
          margin-left: 4px;
        }

        .key-status.ok { color: #22c55e; }
        .key-status.demo { color: #f59e0b; }
        .key-status.none { color: #94a3b8; }

        /* Model Section */
        .model-section {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: end;
        }

        .model-select-wrapper {
          flex: 1;
        }

        .model-select-wrapper label {
          display: block;
          font-size: 13px;
          color: var(--text-primary);
          margin-bottom: 6px;
          font-weight: 500;
        }

        .settings-select {
          width: 100%;
          padding: 10px 14px;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .settings-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .model-info {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 10px;
          padding: 10px 16px;
          text-align: center;
          min-width: 100px;
        }

        .model-rpm .rpm-value {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }

        .model-rpm .rpm-label {
          font-size: 11px;
          color: #3b82f6;
          margin-left: 4px;
        }

        .model-quality {
          font-size: 11px;
          color: var(--text-muted, #64748b);
          margin-top: 4px;
        }

        /* Keys Legend Text */
        .keys-legend-text {
          font-size: 12px;
          color: var(--text-muted, #64748b);
          margin: 8px 0 16px 0;
          padding: 0;
        }

        /* Keys Grid */
        .keys-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          margin-bottom: 8px;
        }

        .key-input-group {
          position: relative;
        }

        .key-input-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-primary, #1e293b);
          margin-bottom: 6px;
          font-weight: 500;
        }

        .key-input-group label a {
          color: #3b82f6;
          text-decoration: none;
        }

        .key-input-group label a:hover {
          text-decoration: underline;
        }

        .key-input-group input {
          width: 100%;
          padding: 10px 40px 10px 12px;
          background: var(--input-bg, #f8fafc);
          border: 1px solid var(--border-color, #cbd5e1);
          border-radius: 8px;
          color: var(--text-primary, #1e293b);
          font-size: 13px;
          font-family: monospace;
        }

        .key-input-group input::placeholder {
          color: #64748b;
        }

        .key-input-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .key-input-group .key-indicator {
          position: absolute;
          right: 12px;
          bottom: 10px;
          font-size: 14px;
        }

        .keys-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Collapsible */
        .collapsible .collapsible-header {
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .collapsible .collapse-arrow {
          transition: transform 0.2s;
          color: var(--text-muted);
          font-size: 12px;
        }

        .collapsible.open .collapse-arrow {
          transform: rotate(180deg);
        }

        .collapsible .collapsible-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }

        .collapsible.open .collapsible-content {
          max-height: 1200px;
          padding-top: 16px;
        }

        /* Discover Section */
        .discover-info {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .discover-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .discover-results {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          overflow: hidden;
        }

        .discover-results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--bg-hover);
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
          font-weight: 500;
        }

        .discover-results-content {
          max-height: 300px;
          overflow-y: auto;
          padding: 12px;
        }

        .model-result-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: var(--input-bg);
          border-radius: 8px;
          margin-bottom: 8px;
          border-left: 3px solid #3b82f6;
        }

        .model-result-card.new {
          border-left-color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .model-result-card .model-name {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 13px;
        }

        .model-result-card .model-id {
          font-size: 11px;
          color: var(--text-muted);
          font-family: monospace;
        }

        .model-result-card .badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
        }

        .badge.free {
          background: rgba(34, 197, 94, 0.2);
          color: #16a34a;
        }

        .badge.new-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #2563eb;
        }

        /* Stats Summary - Vertical Layout */
        .stats-summary {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 12px;
        }

        .stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .stats-row:last-child {
          border-bottom: none;
        }

        .stats-label {
          font-size: 13px;
          color: var(--text-muted);
        }

        .stats-value {
          font-size: 14px;
          font-weight: 600;
          color: #3b82f6;
        }

        /* Per-Provider Stats */
        .stats-by-provider {
          margin-top: 12px;
        }

        .stats-by-provider h4 {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .provider-stats-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .provider-stats-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px 12px;
        }

        .provider-stats-item .provider-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .provider-stats-item .provider-details {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .provider-stats-item .provider-details span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .provider-stats-item .provider-details .calls {
          color: #3b82f6;
        }

        .provider-stats-item .provider-details .tokens-in {
          color: #22c55e;
        }

        .provider-stats-item .provider-details .tokens-out {
          color: #f59e0b;
        }

        /* Test Results Modal */
        .test-results-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        }

        .test-results-modal {
          background: var(--bg-primary);
          border-radius: 16px;
          padding: 24px;
          width: 450px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }

        .test-results-modal h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .test-result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }

        .test-result-item .provider-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .test-result-item .status-icon {
          font-size: 18px;
        }

        .test-result-item .provider-name {
          font-weight: 500;
        }

        .test-result-item .result-details {
          font-size: 11px;
          color: var(--text-muted);
        }

        .test-result-item.success {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.1);
        }

        .test-result-item.error {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.1);
        }

        .test-result-item.skipped {
          border-color: rgba(251, 191, 36, 0.3);
          background: rgba(251, 191, 36, 0.1);
        }

        .test-result-item.testing {
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.1);
        }

        .test-summary {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
          text-align: center;
        }

        .test-summary .summary-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 16px;
        }

        .test-summary .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .test-summary .stat-number {
          font-size: 24px;
          font-weight: bold;
        }

        .test-summary .stat-number.success { color: #22c55e; }
        .test-summary .stat-number.error { color: #ef4444; }
        .test-summary .stat-number.skipped { color: #f59e0b; }

        .test-summary .stat-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Buttons */
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: var(--bg-hover);
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn-link {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 13px;
          padding: 10px;
        }

        .btn-link:hover {
          text-decoration: underline;
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .limits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .limit-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 12px;
        }

        .limit-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .limit-card-body {
          font-size: 12px;
          color: var(--text-muted);
        }

        .limit-card-body div {
          margin: 4px 0;
        }

        .openrouter-tier-check {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 16px;
        }

        .info-text {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        #openRouterTierResult {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 12px;
        }

        #openRouterTierResult.free {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.3);
        }

        #openRouterTierResult.paid {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.3);
        }

        /* Footer */
        .settings-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          background: var(--bg-secondary, rgba(30, 41, 59, 0.5));
          border-top: 1px solid var(--border-color, #334155);
        }

        /* Loading spinner */
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 600px) {
          .provider-tabs {
            flex-direction: column;
          }
          .model-section {
            grid-template-columns: 1fr;
          }
          .keys-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }

  createProviderTabs() {
    const providers = ['gemini', 'groq', 'openrouter', 'mistral', 'cohere', 'huggingface'];

    return providers.map(provider => {
      const isActive = provider === this.selectedProvider;
      const keyStatus = this.getKeyStatus(provider);

      return `
        <button class="provider-tab ${isActive ? 'active' : ''}" data-provider="${provider}">
          <span class="tab-emoji">${this.providerEmojis[provider]}</span>
          <span class="tab-name">${this.providerNames[provider]}</span>
          <span class="key-status ${keyStatus.class}" title="${keyStatus.title}">${keyStatus.icon}</span>
        </button>
      `;
    }).join('');
  }

  createKeysGrid() {
    const providers = ['gemini', 'groq', 'openrouter', 'mistral', 'cohere', 'huggingface'];

    return providers.map(provider => {
      const savedKey = this.getSavedKey(provider);
      const keyStatus = this.getKeyStatus(provider);

      return `
        <div class="key-input-group">
          <label>
            <span>${this.providerEmojis[provider]}</span>
            <span>${this.providerNames[provider]}</span>
            <a href="${this.providerUrls[provider]}" target="_blank" title="Získat klíč">🔗</a>
          </label>
          <input type="password"
                 id="key_${provider}"
                 placeholder="API klíč..."
                 value="${savedKey}"
                 data-provider="${provider}">
          <span class="key-indicator ${keyStatus.class}">${keyStatus.icon}</span>
        </div>
      `;
    }).join('');
  }

  getKeyStatus(provider) {
    if (typeof window.AI === 'undefined') {
      return { class: 'none', icon: '❓', title: 'AI modul nenačten' };
    }

    // Kontrola přes isUsingDemoKey nebo přímo config.keys
    const customKey = window.AI.config?.keys?.[provider];
    const hasOwnKey = customKey && customKey.length > 10;
    const hasDemoKey = window.AI.DEMO_KEYS?.[provider];

    if (hasOwnKey) {
      return { class: 'ok', icon: '✅', title: 'Vlastní klíč nastaven' };
    } else if (hasDemoKey) {
      return { class: 'demo', icon: '⚠️', title: 'Používá se demo klíč' };
    } else {
      return { class: 'none', icon: '❌', title: 'Klíč chybí' };
    }
  }

  getSavedKey(provider) {
    if (typeof window.AI !== 'undefined') {
      // Použij getKey nebo přímo config.keys
      const key = window.AI.getKey?.(provider) || window.AI.config?.keys?.[provider];
      // Vrať pouze pokud to není demo klíč
      if (key && !window.AI.isUsingDemoKey?.(provider)) {
        return key;
      }
    }
    return localStorage.getItem(`ai_key_${provider}`) || '';
  }

  attachEventHandlers() {
    const element = this.modal.element;

    // Provider tabs
    element.querySelectorAll('.provider-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectProvider(tab.dataset.provider);
      });
    });

    // Collapsible sections
    ['keys', 'discover', 'stats', 'limits'].forEach(section => {
      const toggle = element.querySelector(`#${section}Toggle`);
      const content = element.querySelector(`#${section}Content`);
      if (toggle && content) {
        toggle.addEventListener('click', () => {
          const parent = toggle.closest('.collapsible');
          parent.classList.toggle('open');
        });
      }
    });

    // Model select change
    element.querySelector('#settingsModelSelect')?.addEventListener('change', (e) => {
      this.updateModelInfo(e.target.value);
    });

    // Save keys
    element.querySelector('#saveKeysBtn')?.addEventListener('click', () => {
      this.saveKeys();
    });

    // Test keys
    element.querySelector('#testKeysBtn')?.addEventListener('click', () => {
      this.testKeys();
    });

    // Test all providers
    element.querySelector('#testAllKeysBtn')?.addEventListener('click', () => {
      this.testAllProviders();
    });

    // Get keys help
    element.querySelector('#getKeysHelpBtn')?.addEventListener('click', () => {
      if (typeof window.AI !== 'undefined' && window.AI.showApiHelp) {
        window.AI.showApiHelp();
      }
    });

    // Fetch models from API
    element.querySelector('#fetchModelsBtn')?.addEventListener('click', () => {
      this.fetchModelsFromAPI();
    });

    // Compare models
    element.querySelector('#compareModelsBtn')?.addEventListener('click', () => {
      this.showModelComparison();
    });

    // Close discover results
    element.querySelector('#closeDiscoverResults')?.addEventListener('click', () => {
      element.querySelector('#discoverResults').style.display = 'none';
    });

    // Reset stats
    element.querySelector('#resetStatsBtn')?.addEventListener('click', () => {
      if (typeof window.AI !== 'undefined') {
        window.AI.stats?.reset();
        window.AI.resetRateLimitTracking?.();
        this.updateStats();
        toast.success('Statistiky resetovány', 2000);
      }
    });

    // Cancel
    element.querySelector('#settingsCancelBtn')?.addEventListener('click', () => {
      this.hide();
    });

    // Save settings
    element.querySelector('#settingsSaveBtn')?.addEventListener('click', () => {
      this.saveSettings();
    });
  }

  selectProvider(provider) {
    this.selectedProvider = provider;

    // Update tabs UI
    this.modal.element.querySelectorAll('.provider-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.provider === provider);
    });

    // Update models
    this.updateModels();
  }

  updateUI() {
    this.updateModels();
    this.updateStats();
  }

  updateModels() {
    const modelSelect = this.modal.element.querySelector('#settingsModelSelect');
    if (!modelSelect) return;

    if (typeof window.AI === 'undefined' || !window.AI.getAllProvidersWithModels) {
      modelSelect.innerHTML = '<option value="">AI modul není načten</option>';
      return;
    }

    const allProviders = window.AI.getAllProvidersWithModels();
    const providerData = allProviders[this.selectedProvider];
    const savedModel = localStorage.getItem(`ai_model_${this.selectedProvider}`);

    if (providerData && Array.isArray(providerData.models)) {
      modelSelect.innerHTML = providerData.models.map(m => {
        const freeLabel = m.free ? '🟢' : '💰';
        const selected = m.value === savedModel ? 'selected' : '';
        return `<option value="${m.value}" ${selected}>${freeLabel} ${m.label} (${m.rpm} RPM)</option>`;
      }).join('');

      // Update model info for first/selected model
      const selectedValue = modelSelect.value;
      this.updateModelInfo(selectedValue);
    } else {
      modelSelect.innerHTML = '<option value="">Žádné modely</option>';
    }
  }

  updateModelInfo(modelValue) {
    if (!modelValue || typeof window.AI === 'undefined') return;

    const allProviders = window.AI.getAllProvidersWithModels();
    const models = allProviders[this.selectedProvider]?.models || [];
    const model = models.find(m => m.value === modelValue);

    if (model) {
      const rpmEl = this.modal.element.querySelector('#rpmValue');
      const qualityEl = this.modal.element.querySelector('#qualityValue');

      if (rpmEl) rpmEl.textContent = model.rpm || '--';
      if (qualityEl) qualityEl.textContent = model.quality || '--';
    }
  }

  updateStats() {
    if (typeof window.AI === 'undefined' || !window.AI.stats) return;

    const stats = window.AI.stats.get();

    const totalEl = this.modal.element.querySelector('#totalCalls');
    const todayEl = this.modal.element.querySelector('#todayCalls');
    const remainingEl = this.modal.element.querySelector('#remainingRpm');
    const remainingRpdEl = this.modal.element.querySelector('#remainingRpd');
    const tokensInEl = this.modal.element.querySelector('#totalTokensIn');
    const tokensOutEl = this.modal.element.querySelector('#totalTokensOut');
    const byProviderEl = this.modal.element.querySelector('#statsByProvider');

    if (totalEl) totalEl.textContent = stats.totalCalls || 0;
    if (todayEl) todayEl.textContent = stats.dailyCalls || 0;
    if (tokensInEl) tokensInEl.textContent = this.formatNumber(stats.totalTokensIn || 0);
    if (tokensOutEl) tokensOutEl.textContent = this.formatNumber(stats.totalTokensOut || 0);

    if (remainingEl && window.AI.rateLimit) {
      const remaining = window.AI.rateLimit.remaining(this.selectedProvider);
      remainingEl.textContent = remaining;
    }

    // Calculate RPD remaining
    if (remainingRpdEl) {
      const dailyCalls = stats.dailyCalls || 0;
      const rpdLimits = {
        gemini: 1500,
        groq: 14400,
        openrouter: 50, // Default to free tier
        mistral: 500,
        cohere: 1000,
        huggingface: 500
      };
      const limit = rpdLimits[this.selectedProvider] || 1000;
      const remaining = Math.max(0, limit - dailyCalls);
      remainingRpdEl.textContent = remaining;
    }

    // Per-provider stats
    if (byProviderEl && stats.byProvider) {
      const providerNames = {
        gemini: '🔷 Gemini',
        groq: '⚡ Groq',
        openrouter: '🌐 OpenRouter',
        mistral: '🌬️ Mistral',
        cohere: '💬 Cohere',
        huggingface: '🤗 HuggingFace'
      };

      const providers = Object.entries(stats.byProvider);
      if (providers.length > 0) {
        byProviderEl.innerHTML = `
          <h4>📊 Podle providera</h4>
          <div class="provider-stats-list">
            ${providers.map(([provider, data]) => `
              <div class="provider-stats-item">
                <span class="provider-name">${providerNames[provider] || provider}</span>
                <div class="provider-details">
                  <span class="calls">📞 ${data.calls || 0}</span>
                  <span class="tokens-in">📥 ${this.formatNumber(data.tokensIn || 0)}</span>
                  <span class="tokens-out">📤 ${this.formatNumber(data.tokensOut || 0)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        byProviderEl.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; text-align: center;">Zatím žádná použití</p>';
      }
    }
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  saveKeys() {
    const inputs = this.modal.element.querySelectorAll('.key-input-group input');
    let savedCount = 0;

    inputs.forEach(input => {
      const provider = input.dataset.provider;
      const value = input.value.trim();

      if (value) {
        // Použij setKey z AI modulu
        if (typeof window.AI !== 'undefined' && window.AI.setKey) {
          window.AI.setKey(provider, value);
        }
        // Vždy ulož i do localStorage jako zálohu
        localStorage.setItem(`ai_key_${provider}`, value);
        savedCount++;
      }
    });

    // Refresh key status indicators
    this.refreshKeyIndicators();

    toast.success(`💾 Uloženo ${savedCount} API klíčů`, 2000);
  }

  async testKeys() {
    const provider = this.selectedProvider;

    // HuggingFace má CORS problém z prohlížeče - nelze testovat
    if (provider === 'huggingface') {
      toast.warning(`⚠️ HuggingFace nelze testovat z prohlížeče (CORS)`, 4000);
      return;
    }

    toast.info(`🧪 Testuji ${this.providerNames[provider]}...`, 2000);

    try {
      if (typeof window.AI === 'undefined') {
        throw new Error('AI modul není načten');
      }

      // Timeout pro test - max 15 sekund
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout - API neodpovídá')), 15000)
      );

      const askPromise = window.AI.ask('Řekni pouze "OK"', {
        provider,
        maxTokens: 10,
        autoFallback: false, // Zakázat fallback při testu
        timeout: 12000
      });

      const response = await Promise.race([askPromise, timeoutPromise]);

      if (response) {
        toast.success(`✅ ${this.providerNames[provider]} funguje!`, 3000);
      } else {
        throw new Error('Prázdná odpověď');
      }
    } catch (error) {
      const msg = error.message || 'Neznámá chyba';
      // Zkrátit dlouhé chybové zprávy
      const shortMsg = msg.length > 50 ? msg.substring(0, 50) + '...' : msg;
      toast.error(`❌ ${this.providerNames[provider]}: ${shortMsg}`, 4000);
    }
  }

  async testAllProviders() {
    const providers = ['gemini', 'groq', 'openrouter', 'mistral', 'cohere'];
    // HuggingFace přeskakujeme - má CORS problémy

    const results = providers.map(p => ({
      provider: p,
      name: this.providerNames[p],
      status: 'testing',
      message: ''
    }));

    // Vytvoř overlay s výsledky
    const overlay = document.createElement('div');
    overlay.className = 'test-results-overlay';
    overlay.innerHTML = `
      <div class="test-results-modal">
        <h3>🧪 Test všech providerů</h3>
        <div id="testResultsList">
          ${results.map(r => this.renderTestResultItem(r)).join('')}
          <div class="test-result-item skipped">
            <div class="provider-info">
              <span class="status-icon">⚠️</span>
              <span class="provider-name">${this.providerNames['huggingface']}</span>
            </div>
            <span class="result-details">Přeskočeno (CORS)</span>
          </div>
        </div>
        <div class="test-summary" id="testSummary" style="display: none;">
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-number success" id="successCount">0</span>
              <span class="stat-label">Úspěšných</span>
            </div>
            <div class="stat">
              <span class="stat-number error" id="errorCount">0</span>
              <span class="stat-label">Selhalo</span>
            </div>
            <div class="stat">
              <span class="stat-number skipped" id="skippedCount">1</span>
              <span class="stat-label">Přeskočeno</span>
            </div>
          </div>
          <button class="btn-primary" id="closeTestResultsBtn">Zavřít</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Event pro zavření
    overlay.querySelector('#closeTestResultsBtn')?.addEventListener('click', () => {
      overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Testuj providery postupně
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const result = results[i];

      try {
        if (typeof window.AI === 'undefined') {
          throw new Error('AI modul není načten');
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 15000)
        );

        const askPromise = window.AI.ask('Řekni pouze "OK"', {
          provider,
          maxTokens: 10,
          autoFallback: false,
          timeout: 12000
        });

        const response = await Promise.race([askPromise, timeoutPromise]);

        if (response) {
          result.status = 'success';
          result.message = 'Funguje ✓';
          successCount++;
        } else {
          throw new Error('Prázdná odpověď');
        }
      } catch (error) {
        result.status = 'error';
        result.message = error.message?.substring(0, 40) || 'Chyba';
        errorCount++;
      }

      // Aktualizuj zobrazení
      const listEl = overlay.querySelector('#testResultsList');
      if (listEl) {
        const items = listEl.querySelectorAll('.test-result-item');
        if (items[i]) {
          items[i].outerHTML = this.renderTestResultItem(result);
        }
      }
    }

    // Zobraz souhrn
    const summaryEl = overlay.querySelector('#testSummary');
    if (summaryEl) {
      summaryEl.style.display = 'block';
      overlay.querySelector('#successCount').textContent = successCount;
      overlay.querySelector('#errorCount').textContent = errorCount;
    }
  }

  renderTestResultItem(result) {
    const icons = {
      testing: '⏳',
      success: '✅',
      error: '❌',
      skipped: '⚠️'
    };
    return `
      <div class="test-result-item ${result.status}">
        <div class="provider-info">
          <span class="status-icon">${icons[result.status]}</span>
          <span class="provider-name">${result.name}</span>
        </div>
        <span class="result-details">${result.message || (result.status === 'testing' ? 'Testuji...' : '')}</span>
      </div>
    `;
  }

  refreshKeyIndicators() {
    const inputs = this.modal.element.querySelectorAll('.key-input-group');
    inputs.forEach(group => {
      const input = group.querySelector('input');
      const indicator = group.querySelector('.key-indicator');
      const provider = input.dataset.provider;

      if (indicator) {
        const status = this.getKeyStatus(provider);
        indicator.className = `key-indicator ${status.class}`;
        indicator.textContent = status.icon;
      }
    });

    // Also update provider tabs
    const tabs = this.modal.element.querySelectorAll('.provider-tab');
    tabs.forEach(tab => {
      const provider = tab.dataset.provider;
      const statusSpan = tab.querySelector('.key-status');
      if (statusSpan) {
        const status = this.getKeyStatus(provider);
        statusSpan.className = `key-status ${status.class}`;
        statusSpan.textContent = status.icon;
        statusSpan.title = status.title;
      }
    });
  }

  async fetchModelsFromAPI() {
    const provider = this.selectedProvider;
    const resultsDiv = this.modal.element.querySelector('#discoverResults');
    const contentDiv = this.modal.element.querySelector('#discoverResultsContent');
    const titleSpan = this.modal.element.querySelector('#discoverResultsTitle');
    const btn = this.modal.element.querySelector('#fetchModelsBtn');

    // Show loading
    btn.innerHTML = '<span class="loading-spinner"></span> Načítám...';
    btn.disabled = true;
    resultsDiv.style.display = 'block';
    contentDiv.innerHTML = '<div style="text-align: center; padding: 20px;">🔄 Načítám modely z API...</div>';
    titleSpan.textContent = `Modely pro ${this.providerNames[provider]}`;

    try {
      let apiModels = [];

      // Fetch models based on provider
      switch (provider) {
        case 'openrouter':
          apiModels = await this.fetchOpenRouterModels();
          break;
        case 'groq':
          apiModels = await this.fetchGroqModels();
          break;
        case 'mistral':
          apiModels = await this.fetchMistralModels();
          break;
        default:
          // For providers without list API, show current models
          if (typeof window.AI !== 'undefined') {
            const allProviders = window.AI.getAllProvidersWithModels();
            apiModels = allProviders[provider]?.models || [];
          }
      }

      // Compare with local models
      this.displayModelResults(apiModels, provider);

    } catch (error) {
      contentDiv.innerHTML = `<div style="color: #f87171; padding: 20px;">❌ Chyba: ${error.message}</div>`;
    } finally {
      btn.innerHTML = '<span class="btn-icon">🔄</span> Načíst modely z API';
      btn.disabled = false;
    }
  }

  async fetchOpenRouterModels() {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Filter and format free models
    return data.data
      .filter(m => m.pricing?.prompt === '0' || m.id.includes(':free'))
      .slice(0, 30) // Limit to first 30
      .map(m => ({
        value: m.id,
        label: m.name || m.id,
        free: true,
        context: m.context_length ? `${Math.round(m.context_length / 1000)}K` : '',
        isFromAPI: true
      }));
  }

  async fetchGroqModels() {
    const key = this.getSavedKey('groq') || window.AI?.DEMO_KEYS?.groq;
    if (!key) throw new Error('Groq API klíč chybí');

    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    return data.data
      .filter(m => m.active !== false)
      .map(m => ({
        value: m.id,
        label: m.id,
        free: true,
        context: m.context_window ? `${Math.round(m.context_window / 1000)}K` : '',
        isFromAPI: true
      }));
  }

  async fetchMistralModels() {
    const key = this.getSavedKey('mistral') || window.AI?.DEMO_KEYS?.mistral;
    if (!key) throw new Error('Mistral API klíč chybí');

    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    return data.data.map(m => ({
      value: m.id,
      label: m.id,
      free: !m.id.includes('large'),
      isFromAPI: true
    }));
  }

  displayModelResults(apiModels, provider) {
    const contentDiv = this.modal.element.querySelector('#discoverResultsContent');

    // Get local models for comparison
    let localModels = [];
    if (typeof window.AI !== 'undefined') {
      const allProviders = window.AI.getAllProvidersWithModels();
      localModels = allProviders[provider]?.models?.map(m => m.value) || [];
    }

    // Categorize models
    const newModels = apiModels.filter(m => !localModels.includes(m.value));
    const existingModels = apiModels.filter(m => localModels.includes(m.value));

    let html = '';

    if (newModels.length > 0) {
      html += `<div style="margin-bottom: 12px; color: #4ade80; font-weight: 500;">🆕 ${newModels.length} nových modelů:</div>`;
      newModels.forEach(m => {
        html += `
          <div class="model-result-card new">
            <div>
              <div class="model-name">${m.label}</div>
              <div class="model-id">${m.value}</div>
            </div>
            <div>
              ${m.free ? '<span class="badge free">FREE</span>' : ''}
              <span class="badge new-badge">NOVÝ</span>
            </div>
          </div>
        `;
      });
    }

    if (existingModels.length > 0) {
      html += `<div style="margin: 16px 0 12px; color: #94a3b8;">✅ ${existingModels.length} známých modelů</div>`;
      existingModels.slice(0, 10).forEach(m => {
        html += `
          <div class="model-result-card">
            <div>
              <div class="model-name">${m.label}</div>
              <div class="model-id">${m.value}</div>
            </div>
            ${m.free ? '<span class="badge free">FREE</span>' : ''}
          </div>
        `;
      });
      if (existingModels.length > 10) {
        html += `<div style="text-align: center; color: #64748b; padding: 8px;">... a ${existingModels.length - 10} dalších</div>`;
      }
    }

    if (apiModels.length === 0) {
      html = '<div style="text-align: center; padding: 20px; color: #94a3b8;">Žádné modely nenalezeny</div>';
    }

    contentDiv.innerHTML = html;
  }

  showModelComparison() {
    toast.info('🔄 Porovnání modelů - připravuje se...', 2000);
    // TODO: Implement model comparison feature
  }

  updateLimitsGrid() {
    const grid = this.modal.element.querySelector('#limitsGrid');
    if (!grid || typeof window.AI === 'undefined') return;

    const providers = ['gemini', 'groq', 'openrouter', 'mistral', 'cohere', 'huggingface'];
    const providerInfo = {
      gemini: { emoji: '🔷', name: 'Gemini', rpm: 15, rpd: 1500 },
      groq: { emoji: '⚡', name: 'Groq', rpm: 30, rpd: 14400 },
      openrouter: { emoji: '🌐', name: 'OpenRouter', rpm: 20, rpd: '50-1000', note: 'Free: 50 | Paid: 1000' },
      mistral: { emoji: '🌬️', name: 'Mistral', rpm: 10, rpd: 500 },
      cohere: { emoji: '💬', name: 'Cohere', rpm: 20, rpd: 1000 },
      huggingface: { emoji: '🤗', name: 'HuggingFace', rpm: 10, rpd: 500 }
    };

    grid.innerHTML = providers.map(provider => {
      const info = providerInfo[provider];
      const keyStatus = this.getKeyStatus(provider);

      return `
        <div class="limit-card">
          <div class="limit-card-header">
            <span>${info.emoji}</span>
            <span>${info.name}</span>
            <span class="key-status ${keyStatus.class}" style="margin-left: auto;">${keyStatus.icon}</span>
          </div>
          <div class="limit-card-body">
            <div><strong>RPM:</strong> ${info.rpm} req/min</div>
            <div><strong>RPD:</strong> ${info.rpd} req/day</div>
            ${info.note ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${info.note}</div>` : ''}
            <button class="btn-small btn-check-limits" data-provider="${provider}" style="margin-top: 8px; width: 100%;">
              🔍 Zkontrolovat limity
            </button>
            <div class="provider-limits-result" id="limits-${provider}" style="display: none; margin-top: 8px;"></div>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners to check buttons
    grid.querySelectorAll('.btn-check-limits').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const provider = e.target.dataset.provider;
        await this.checkProviderLimits(provider, e.target);
      });
    });
  }

  async checkOpenRouterTier() {
    const btn = this.modal.element.querySelector('#checkOpenRouterTierBtn');
    const resultDiv = this.modal.element.querySelector('#openRouterTierResult');

    if (!btn || !resultDiv) return;

    // Show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Kontroluji...';
    resultDiv.style.display = 'none';

    try {
      if (typeof window.AI === 'undefined' || !window.AI.checkOpenRouterTier) {
        throw new Error('AI modul není načten nebo nepodporuje kontrolu OpenRouter tier');
      }

      const tierInfo = await window.AI.checkOpenRouterTier();

      // Display result
      resultDiv.style.display = 'block';
      resultDiv.className = tierInfo.isFreeTier ? 'free' : 'paid';

      const tierIcon = tierInfo.isFreeTier ? '⚠️' : '✅';
      const tierName = tierInfo.isFreeTier ? 'FREE TIER' : 'PAID TIER';
      const tierColor = tierInfo.isFreeTier ? '#f59e0b' : '#22c55e';

      resultDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">${tierIcon}</span>
          <strong style="color: ${tierColor}; font-size: 14px;">${tierName}</strong>
        </div>
        <div style="margin: 4px 0;"><strong>RPM:</strong> ${tierInfo.rpm} requests/minute</div>
        <div style="margin: 4px 0;"><strong>RPD:</strong> ${tierInfo.rpd} requests/day</div>
        ${tierInfo.label ? `<div style="margin: 4px 0;"><strong>Label:</strong> ${tierInfo.label}</div>` : ''}
        ${tierInfo.usageDaily !== undefined ? `<div style="margin: 4px 0;"><strong>Dnes použito:</strong> ${tierInfo.usageDaily} / ${tierInfo.rpd}</div>` : ''}
        ${tierInfo.limitRemaining !== null && tierInfo.limitRemaining !== undefined ? `<div style="margin: 4px 0;"><strong>Zbývá kredit:</strong> $${tierInfo.limitRemaining.toFixed(2)}</div>` : ''}
        ${tierInfo.error ? `<div style="color: #ef4444; margin-top: 8px; font-size: 11px;">${tierInfo.error}</div>` : ''}
        ${tierInfo.isFreeTier ? `
          <div style="margin-top: 12px; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 11px;">
            💡 <strong>TIP:</strong> Dobijte $10+ pro zvýšení limitu na 1000 RPD
          </div>
        ` : ''}
      `;

      toast.success(`✅ OpenRouter: ${tierName}`, 3000);

    } catch (error) {
      resultDiv.style.display = 'block';
      resultDiv.className = '';
      resultDiv.innerHTML = `
        <div style="color: #ef4444;">
          <strong>❌ Chyba při kontrole:</strong><br>
          ${error.message}
        </div>
      `;
      toast.error('❌ Nepodařilo se zkontrolovat OpenRouter tier', 3000);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icon">🔍</span> Zkontrolovat OpenRouter Tier';
    }
  }

  async checkProviderLimits(provider, button) {
    const resultDiv = this.modal.element.querySelector(`#limits-${provider}`);
    if (!button || !resultDiv) return;

    // Show loading
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> Kontroluji...';
    resultDiv.style.display = 'none';

    try {
      if (typeof window.AI === 'undefined' || !window.AI.checkProviderLimits) {
        throw new Error('AI modul není načten');
      }

      const limitInfo = await window.AI.checkProviderLimits(provider);

      // Display result
      resultDiv.style.display = 'block';

      const providerEmojis = {
        gemini: '🔷',
        groq: '⚡',
        openrouter: '🌐',
        mistral: '🌬️',
        cohere: '💬',
        huggingface: '🤗'
      };

      let html = `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 10px; font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 16px;">${providerEmojis[provider]}</span>
            <strong>${limitInfo.providerName || provider}</strong>
          </div>
      `;

      if (limitInfo.isFreeTier !== undefined) {
        // OpenRouter special case
        const tierIcon = limitInfo.isFreeTier ? '⚠️' : '✅';
        const tierName = limitInfo.isFreeTier ? 'FREE TIER' : 'PAID TIER';
        html += `<div style="margin: 3px 0;"><strong>${tierIcon} ${tierName}</strong></div>`;
      }

      html += `
        <div style="margin: 3px 0;"><strong>RPM:</strong> ${limitInfo.rpm || '--'} req/min</div>
        <div style="margin: 3px 0;"><strong>RPD:</strong> ${limitInfo.rpd || '--'} req/day</div>
        ${limitInfo.remaining !== null && limitInfo.remaining !== undefined ? `<div style="margin: 3px 0;"><strong>Zbývá RPM:</strong> ${limitInfo.remaining}</div>` : ''}
        ${limitInfo.usedToday !== null && limitInfo.usedToday !== undefined ? `<div style="margin: 3px 0;"><strong>Dnes použito:</strong> ${limitInfo.usedToday}${limitInfo.rpd ? ` / ${limitInfo.rpd}` : ''}</div>` : ''}
        ${limitInfo.limitRemaining !== null && limitInfo.limitRemaining !== undefined ? `<div style="margin: 3px 0;"><strong>Zbývá kredit:</strong> $${limitInfo.limitRemaining.toFixed(2)}</div>` : ''}
        ${limitInfo.label && provider === 'openrouter' ? `<div style="margin: 3px 0; font-size: 10px; color: #94a3b8;"><strong>Label:</strong> ${limitInfo.label}</div>` : ''}
        ${limitInfo.reset ? `<div style="margin: 3px 0; font-size: 10px; color: #94a3b8;"><strong>Reset:</strong> ${limitInfo.reset}</div>` : ''}
        ${limitInfo.error ? `<div style="color: #ef4444; margin-top: 6px; font-size: 10px;">${limitInfo.error}</div>` : ''}
      </div>
      `;

      resultDiv.innerHTML = html;
      toast.success(`✅ ${limitInfo.providerName} limity načteny`, 2000);

    } catch (error) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 8px; font-size: 11px; color: #ef4444;">
          <strong>❌ Chyba:</strong> ${error.message}
        </div>
      `;
      toast.error(`❌ Chyba při kontrole ${provider}`, 2000);
    } finally {
      button.disabled = false;
      button.innerHTML = '🔍 Zkontrolovat limity';
    }
  }

  saveSettings() {
    // Save provider
    localStorage.setItem('ai_provider', this.selectedProvider);

    // Save selected model
    const modelSelect = this.modal.element.querySelector('#settingsModelSelect');
    if (modelSelect && modelSelect.value) {
      localStorage.setItem(`ai_model_${this.selectedProvider}`, modelSelect.value);
      localStorage.setItem('ai_model', modelSelect.value);
    }

    // Save keys
    this.saveKeys();

    // Emit event for other components
    eventBus.emit('aiSettings:changed', {
      provider: this.selectedProvider,
      model: modelSelect?.value
    });

    toast.success('✅ Nastavení uloženo', 2000);
    this.hide();
  }
}

// Export singleton
let settingsModalInstance = null;
export function getAISettingsModal() {
  if (!settingsModalInstance) {
    settingsModalInstance = new AISettingsModal();
  }
  return settingsModalInstance;
}
