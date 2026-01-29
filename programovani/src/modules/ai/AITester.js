/**
 * AI Model Tester
 * Testuje všechny dostupné AI modely a providery
 */

export class AITester {
  constructor() {
    this.results = [];
    this.isRunning = false;
    this.shouldStop = false;
    this.testPrompt = "Ahoj! Odpověz jen 'OK' pokud funguje.";
    this.timeout = 30000; // 30s na model
  }

  /**
   * Zastaví běžící test
   */
  stop() {
    this.shouldStop = true;
  }

  /**
   * Spusť test všech modelů
   */
  async testAllModels(onProgress = null) {
    if (this.isRunning) {
      throw new Error('Test již běží');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.results = [];

    try {
      const allProviders = window.AI.getAllProvidersWithModels();
      const totalModels = Object.values(allProviders).reduce((sum, p) => sum + p.models.length, 0);
      let tested = 0;

      for (const [providerId, providerData] of Object.entries(allProviders)) {
        if (this.shouldStop) {
          console.log('⏹️ Test ukončen uživatelem');
          break;
        }
        for (const model of providerData.models) {
          if (this.shouldStop) {
            console.log('⏹️ Test ukončen uživatelem');
            break;
          }

          tested++;

          if (onProgress) {
            onProgress({
              current: tested,
              total: totalModels,
              provider: providerId,
              model: model.value,
              progress: Math.round((tested / totalModels) * 100)
            });
          }

          const result = await this.testModel(providerId, model.value);
          this.results.push(result);

          // Malá pauza mezi testy (aby nedošlo k rate limiting)
          await this.sleep(1000);
        }
      }

      return this.results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test jednoho modelu
   */
  async testModel(provider, model) {
    const startTime = Date.now();
    const result = {
      provider,
      model,
      status: 'pending',
      responseTime: 0,
      error: null,
      response: null,
      timestamp: new Date().toISOString()
    };

    try {
      // Kontrola API klíče
      if (!window.AI.config.keys[provider] && !window.AI.DEMO_KEYS[provider]) {
        result.status = 'no-key';
        result.error = 'API klíč není nastaven';
        return result;
      }

      // Test požadavku s timeoutem - bez retry na rate limit
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.timeout)
      );

      // Temporarily disable retries for testing
      const originalMaxRetries = window.AI.config.maxRetries;
      window.AI.config.maxRetries = 1; // Pouze 1 pokus, žádné čekání

      const requestPromise = window.AI.ask(this.testPrompt, {
        provider,
        model,
        temperature: 0,
        maxTokens: 50
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);

      // Restore original maxRetries
      window.AI.config.maxRetries = originalMaxRetries;

      result.status = 'success';
      result.response = response?.substring(0, 100); // Prvních 100 znaků
      result.responseTime = Date.now() - startTime;

    } catch (error) {
      // Restore original maxRetries in case of error
      if (window.AI.config.maxRetries === 1) {
        window.AI.config.maxRetries = 3;
      }

      result.status = 'error';

      // Označit rate limit jako specifickou chybu
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        result.error = 'Rate limit (přeskočeno)';
      } else if (error.message === 'Timeout') {
        result.error = 'Timeout (30s)';
      } else {
        result.error = error.message;
      }

      result.responseTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Test konkrétního providera
   */
  async testProvider(providerId, onProgress = null) {
    const allProviders = window.AI.getAllProvidersWithModels();
    const providerData = allProviders[providerId];

    if (!providerData) {
      throw new Error(`Provider ${providerId} nenalezen`);
    }

    const results = [];
    for (let i = 0; i < providerData.models.length; i++) {
      const model = providerData.models[i];

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: providerData.models.length,
          model: model.value
        });
      }

      const result = await this.testModel(providerId, model.value);
      results.push(result);
      await this.sleep(1000);
    }

    return results;
  }

  /**
   * Získej statistiky testů
   */
  getStats() {
    if (this.results.length === 0) {
      return null;
    }

    const stats = {
      total: this.results.length,
      success: 0,
      error: 0,
      noKey: 0,
      avgResponseTime: 0,
      providers: {}
    };

    let totalResponseTime = 0;

    this.results.forEach(result => {
      // Celkové statistiky
      if (result.status === 'success') stats.success++;
      else if (result.status === 'error') stats.error++;
      else if (result.status === 'no-key') stats.noKey++;

      if (result.status === 'success') {
        totalResponseTime += result.responseTime;
      }

      // Statistiky podle providera
      if (!stats.providers[result.provider]) {
        stats.providers[result.provider] = {
          total: 0,
          success: 0,
          error: 0,
          noKey: 0,
          avgResponseTime: 0
        };
      }

      const providerStats = stats.providers[result.provider];
      providerStats.total++;
      if (result.status === 'success') providerStats.success++;
      else if (result.status === 'error') providerStats.error++;
      else if (result.status === 'no-key') providerStats.noKey++;
    });

    // Průměrná doba odezvy
    const successCount = stats.success;
    stats.avgResponseTime = successCount > 0 ? Math.round(totalResponseTime / successCount) : 0;

    // Průměrná doba podle providera
    Object.keys(stats.providers).forEach(provider => {
      const providerResults = this.results.filter(r => r.provider === provider && r.status === 'success');
      const providerTime = providerResults.reduce((sum, r) => sum + r.responseTime, 0);
      stats.providers[provider].avgResponseTime = providerResults.length > 0
        ? Math.round(providerTime / providerResults.length)
        : 0;
    });

    return stats;
  }

  /**
   * Export výsledků do JSON
   */
  exportResults() {
    return {
      timestamp: new Date().toISOString(),
      testPrompt: this.testPrompt,
      results: this.results,
      stats: this.getStats()
    };
  }

  /**
   * Export výsledků do CSV
   */
  exportToCSV() {
    const lines = ['Provider,Model,Status,Response Time (ms),Error'];

    this.results.forEach(r => {
      lines.push(`${r.provider},${r.model},${r.status},${r.responseTime},"${r.error || ''}"`);
    });

    return lines.join('\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Zastaví běžící test
   */
  stop() {
    this.isRunning = false;
  }
}
