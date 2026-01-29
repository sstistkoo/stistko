/**
 * TestingService.js
 * Service pro testování AI modelů
 */

import { toast } from '../../../ui/components/Toast.js';
import { ICONS } from '../constants/Messages.js';

export class TestingService {
  constructor(panel) {
    this.panel = panel;
    this.aiTester = panel.aiTester;
    console.log('[TestingService] Initialized');
  }

  /**
   * Initialize testing handlers
   */
  attachHandlers() {
    // Start all tests button
    const startAllBtn = this.panel.modal.element.querySelector('#startAllTestsBtn');
    if (startAllBtn) {
      startAllBtn.addEventListener('click', () => this.runAllTests());
    }

    // Stop tests button
    const stopBtn = this.panel.modal.element.querySelector('#stopTestsBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.aiTester.stop();
        toast.show('Testování zastaveno', 'info');
      });
    }

    // Export results button
    const exportBtn = this.panel.modal.element.querySelector('#exportResultsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportTestResults());
    }

    // Provider test buttons
    const providerBtns = this.panel.modal.element.querySelectorAll('.provider-test-btn');
    providerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        this.runProviderTest(provider);
      });
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    const progressDiv = this.panel.modal.element.querySelector('#testingProgress');
    const progressFill = this.panel.modal.element.querySelector('#testProgressFill');
    const progressText = this.panel.modal.element.querySelector('#testProgressText');
    const progressStatus = this.panel.modal.element.querySelector('#testProgressStatus');
    const statsDiv = this.panel.modal.element.querySelector('#testingStats');
    const resultsDiv = this.panel.modal.element.querySelector('#testingResults');
    const startBtn = this.panel.modal.element.querySelector('#startAllTestsBtn');
    const stopBtn = this.panel.modal.element.querySelector('#stopTestsBtn');
    const exportBtn = this.panel.modal.element.querySelector('#exportResultsBtn');

    // Show progress, hide buttons
    progressDiv.style.display = 'block';
    statsDiv.style.display = 'none';
    resultsDiv.style.display = 'none';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    exportBtn.style.display = 'none';

    try {
      await this.aiTester.testAllModels((progress) => {
        // Update progress bar
        progressFill.style.width = `${progress.progress}%`;
        progressText.textContent = `${progress.current} / ${progress.total} (${progress.progress}%)`;
        progressStatus.textContent = `Testování: ${progress.provider} - ${progress.model}`;
      });

      // Show results
      const stats = this.aiTester.getStats();
      this.displayTestStats(stats);
      this.displayTestResults(this.aiTester.results);

      statsDiv.style.display = 'block';
      resultsDiv.style.display = 'block';
      exportBtn.style.display = 'inline-flex';

      toast.show(`✅ Test dokončen: ${stats.success}/${stats.total} úspěšných`, 'success');
    } catch (error) {
      toast.show(`❌ Chyba při testování: ${error.message}`, 'error');
    } finally {
      stopBtn.style.display = 'none';
      startBtn.style.display = 'inline-flex';
    }
  }

  /**
   * Run tests for specific provider
   */
  async runProviderTest(providerId) {
    const progressDiv = this.panel.modal.element.querySelector('#testingProgress');
    const progressFill = this.panel.modal.element.querySelector('#testProgressFill');
    const progressText = this.panel.modal.element.querySelector('#testProgressText');
    const progressStatus = this.panel.modal.element.querySelector('#testProgressStatus');
    const statsDiv = this.panel.modal.element.querySelector('#testingStats');
    const resultsDiv = this.panel.modal.element.querySelector('#testingResults');

    progressDiv.style.display = 'block';
    progressStatus.textContent = `Testování providera: ${providerId}`;

    try {
      const results = await this.aiTester.testProvider(providerId, (progress) => {
        const percent = Math.round((progress.current / progress.total) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${progress.current} / ${progress.total} (${percent}%)`;
        progressStatus.textContent = `Testování: ${providerId} - ${progress.model}`;
      });

      // Display results
      this.displayTestResults(results);
      resultsDiv.style.display = 'block';

      const successCount = results.filter(r => r.status === 'success').length;
      toast.show(`✅ ${providerId}: ${successCount}/${results.length} úspěšných`, 'success');
    } catch (error) {
      toast.show(`❌ Chyba při testování ${providerId}: ${error.message}`, 'error');
    }
  }

  /**
   * Display test statistics
   */
  displayTestStats(stats) {
    if (!stats) return;

    this.panel.modal.element.querySelector('#statTotal').textContent = stats.total;
    this.panel.modal.element.querySelector('#statSuccess').textContent = stats.success;
    this.panel.modal.element.querySelector('#statError').textContent = stats.error;
    this.panel.modal.element.querySelector('#statNoKey').textContent = stats.noKey;
    this.panel.modal.element.querySelector('#statAvgTime').textContent = `${stats.avgResponseTime}ms`;
  }

  /**
   * Display test results table
   */
  displayTestResults(results) {
    const tbody = this.panel.modal.element.querySelector('#resultsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    results.forEach(result => {
      const row = document.createElement('tr');
      row.className = `result-row result-${result.status}`;

      const statusIcon = {
        'success': '✅',
        'error': '❌',
        'no-key': ICONS.WARNING,
        'pending': '⏳'
      }[result.status] || '❓';

      const statusText = {
        'success': 'Úspěch',
        'error': 'Chyba',
        'no-key': 'Bez klíče',
        'pending': 'Čeká'
      }[result.status] || result.status;

      row.innerHTML = `
        <td>${result.provider}</td>
        <td>${result.model}</td>
        <td><span class="status-badge status-${result.status}">${statusIcon} ${statusText}</span></td>
        <td>${result.responseTime}ms</td>
        <td class="error-cell">${result.error || '-'}</td>
      `;

      tbody.appendChild(row);
    });
  }

  /**
   * Export test results to JSON file
   */
  exportTestResults() {
    const data = this.aiTester.exportResults();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-test-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.show('📥 Výsledky exportovány', 'success');
  }

  /**
   * Get HTML for testing tab
   */
  getTestingTabHTML() {
    return `
      <!-- Testing Tab -->
      <div class="ai-tab-content" data-content="testing">
        <div class="ai-testing">
          <h3>🧪 Test AI Modelů</h3>

          <div class="testing-header">
            <p style="margin-bottom: 16px; color: var(--text-secondary);">
              Automaticky otestuj všechny dostupné AI modely a zjisti, které fungují správně.
            </p>

            <div class="testing-controls">
              <button class="btn-primary" id="startAllTestsBtn">
                <span class="icon">▶️</span>
                <span>Spustit všechny testy</span>
              </button>
              <button class="btn-secondary" id="exportResultsBtn" style="display: none;">
                <span class="icon">💾</span>
                <span>Export výsledků</span>
              </button>
              <button class="btn-secondary" id="stopTestsBtn" style="display: none;">
                <span class="icon">⏹️</span>
                <span>Zastavit</span>
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="testing-progress" id="testingProgress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="testProgressFill"></div>
            </div>
            <div class="progress-text" id="testProgressText">0 / 0 (0%)</div>
            <div class="progress-status" id="testProgressStatus">Inicializace...</div>
          </div>

          <!-- Statistics -->
          <div class="testing-stats" id="testingStats" style="display: none;">
            <h4>📊 Statistiky</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value" id="statTotal">0</div>
                <div class="stat-label">Celkem modelů</div>
              </div>
              <div class="stat-item success">
                <div class="stat-value" id="statSuccess">0</div>
                <div class="stat-label">✅ Úspěch</div>
              </div>
              <div class="stat-item error">
                <div class="stat-value" id="statError">0</div>
                <div class="stat-label">❌ Chyba</div>
              </div>
              <div class="stat-item warning">
                <div class="stat-value" id="statNoKey">0</div>
                <div class="stat-label">⚠️ Bez klíče</div>
              </div>
              <div class="stat-item info">
                <div class="stat-value" id="statAvgTime">0ms</div>
                <div class="stat-label">⚡ Průměrná doba</div>
              </div>
            </div>
          </div>

          <!-- Provider Tests -->
          <div class="testing-providers" id="testingProviders">
            <h4>Test podle providera</h4>
            <div class="provider-test-grid">
              <button class="provider-test-btn" data-provider="gemini">
                <span class="icon">💎</span>
                <span>Google Gemini</span>
              </button>
              <button class="provider-test-btn" data-provider="groq">
                <span class="icon">⚡</span>
                <span>Groq</span>
              </button>
              <button class="provider-test-btn" data-provider="openrouter">
                <span class="icon">🌐</span>
                <span>OpenRouter</span>
              </button>
              <button class="provider-test-btn" data-provider="mistral">
                <span class="icon">🌊</span>
                <span>Mistral AI</span>
              </button>
              <button class="provider-test-btn" data-provider="cohere">
                <span class="icon">🧠</span>
                <span>Cohere</span>
              </button>
              <button class="provider-test-btn" data-provider="huggingface">
                <span class="icon">🤗</span>
                <span>HuggingFace</span>
              </button>
            </div>
          </div>

          <!-- Results Table -->
          <div class="testing-results" id="testingResults" style="display: none;">
            <h4>📋 Výsledky testů</h4>
            <div class="results-table-container">
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Doba odezvy</th>
                    <th>Chyba</th>
                  </tr>
                </thead>
                <tbody id="resultsTableBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
