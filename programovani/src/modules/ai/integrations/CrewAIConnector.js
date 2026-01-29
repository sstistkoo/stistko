/**
 * CrewAI Python Connector
 * Bridges JavaScript AI Agents with Python CrewAI system
 */

class CrewAIConnector {
  constructor() {
    this.baseUrl = 'http://localhost:5005';
    this.isAvailable = false;
    this.isStarting = false;
    this.startAttempts = 0;
    this.maxStartAttempts = 3;
    this.checkConnection();
  }

  /**
   * Check if CrewAI API server is running
   */
  async checkConnection(silent = false) {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.isAvailable = true;
        this.isStarting = false;
        this.startAttempts = 0;
        if (!silent) {
          console.log('✅ CrewAI API connected on localhost:5005');
        }
        return true;
      }
    } catch (error) {
      this.isAvailable = false;
      if (!silent && !this.isStarting) {
        console.info('ℹ️ CrewAI API není aktivní - spustí se automaticky při použití');
      }
      return false;
    }
  }

  /**
   * Automaticky spustí CrewAI server
   */
  async startServer() {
    if (this.isStarting) {
      console.log('⏳ Server se již spouští...');
      return this.waitForServer();
    }

    if (this.startAttempts >= this.maxStartAttempts) {
      throw new Error('❌ Nepodařilo se spustit CrewAI server po 3 pokusech');
    }

    this.isStarting = true;
    this.startAttempts++;

    console.log('🚀 Spouštím CrewAI server...');

    try {
      // Spustí server pomocí Fetch API volání speciálního endpointu
      // (vyžaduje backend support nebo externí launcher)

      // Pro teď: zobrazíme uživateli instrukce
      const shouldStart = confirm(
        '🤖 CrewAI server není spuštěný.\n\n' +
        'Chcete ho spustit automaticky?\n\n' +
        '(Otevře se nový PowerShell terminál)'
      );

      if (!shouldStart) {
        this.isStarting = false;
        throw new Error('Uživatel zrušil spuštění serveru');
      }

      // Spustíme server pomocí powershell
      // Note: Toto funguje pouze v Electron nebo s backend supportem
      // Pro webovou aplikaci zobrazíme jen návod

      if (window.require) {
        // Electron environment
        const { spawn } = window.require('child_process');
        const path = window.require('path');

        const serverPath = path.join(process.cwd(), 'python', 'crewai_api.py');
        const pythonProcess = spawn('python', [serverPath], {
          detached: true,
          stdio: 'ignore'
        });

        pythonProcess.unref();
        console.log('✅ Server spuštěn v pozadí');
      } else {
        // Web environment - ukážeme instrukce
        this.showServerStartInstructions();
      }

      // Čekáme až server nastartuje
      return await this.waitForServer();

    } catch (error) {
      this.isStarting = false;
      throw error;
    }
  }

  /**
   * Zobrazí instrukce pro spuštění serveru
   */
  showServerStartInstructions() {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg-primary, #1e1e1e);
      border: 2px solid var(--accent-color, #007acc);
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;

    instructions.innerHTML = `
      <h3 style="margin-top: 0; color: var(--accent-color, #007acc);">
        🚀 Spuštění CrewAI serveru
      </h3>
      <p style="margin: 15px 0;">
        <strong>Otevři nový terminál a spusť:</strong>
      </p>
      <pre style="background: #2a2a2a; padding: 10px; border-radius: 4px; overflow-x: auto;">cd python
python crewai_api.py</pre>
      <p style="margin: 15px 0; font-size: 0.9em; color: #999;">
        nebo z kořenové složky projektu:
      </p>
      <pre style="background: #2a2a2a; padding: 10px; border-radius: 4px; overflow-x: auto;">python python/crewai_api.py</pre>
      <button id="closeServerInstructions" style="
        background: var(--accent-color, #007acc);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 15px;
        width: 100%;
      ">
        Rozumím, spustím to ručně
      </button>
    `;

    document.body.appendChild(instructions);

    document.getElementById('closeServerInstructions').addEventListener('click', () => {
      instructions.remove();
      this.isStarting = false;
    });
  }

  /**
   * Čeká na spuštění serveru (max 30 sekund)
   */
  async waitForServer(maxWaitTime = 30000, checkInterval = 1000) {
    const startTime = Date.now();

    console.log('⏳ Čekám na spuštění serveru...');

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const isConnected = await this.checkConnection(true);
      if (isConnected) {
        console.log('✅ Server připraven!');
        this.isStarting = false;
        return true;
      }

      // Zobrazíme progress každé 3 sekundy
      if ((Date.now() - startTime) % 3000 < checkInterval) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ Čekám ${elapsed}s...`);
      }
    }

    this.isStarting = false;
    throw new Error('⏱️ Timeout: Server se nespustil do 30 sekund');
  }

  /**
   * Get available CrewAI agents
   */
  async getAgents() {
    if (!this.isAvailable) {
      await this.checkConnection(true);

      // Pokud stále není dostupný, zkusíme spustit
      if (!this.isAvailable) {
        await this.startServer();
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/agents`);
      const data = await response.json();
      return data.agents;
    } catch (error) {
      console.error('Error fetching CrewAI agents:', error);
      return [];
    }
  }

  /**
   * Run full CrewAI team on a task
   */
  async runCrew(prompt, selectedAgents = ['architect', 'coder', 'tester', 'documenter']) {
    // Automaticky spustí server pokud není dostupný
    if (!this.isAvailable) {
      console.log('🔄 CrewAI server není dostupný, zkouším spustit...');
      await this.startServer();

      // Po spuštění znovu zkontroluj
      if (!this.isAvailable) {
        throw new Error('❌ CrewAI server není dostupný. Spusť ručně: python python/crewai_api.py');
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/crewai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          agents: selectedAgents
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'CrewAI execution failed');
      }

      return {
        success: true,
        result: data.result,
        agentsUsed: data.agents_used
      };
    } catch (error) {
      console.error('Error running CrewAI:', error);
      throw error;
    }
  }

  /**
   * Run single agent task
   */
  async runSingleAgent(agentId, task) {
    if (!this.isAvailable) {
      throw new Error('CrewAI API not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/agent/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId,
          task: task
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Agent execution failed');
      }

      return {
        success: true,
        result: data.result,
        agent: data.agent
      };
    } catch (error) {
      console.error('Error running single agent:', error);
      throw error;
    }
  }

  /**
   * Map JavaScript agent IDs to CrewAI agent IDs
   */
  mapToCrewAIAgents(jsAgentIds) {
    const mapping = {
      'architect': 'architect',
      'frontend': 'coder',
      'tester': 'tester',
      'documentation': 'documenter'
    };

    return jsAgentIds
      .map(id => mapping[id])
      .filter(id => id !== undefined);
  }
}

// Create global instance
window.CrewAI = new CrewAIConnector();

// Auto-check connection on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.CrewAI.checkConnection();
  });
} else {
  window.CrewAI.checkConnection();
}

console.log('✅ CrewAI Connector loaded');
