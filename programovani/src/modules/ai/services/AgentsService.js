/**
 * Agents Service
 * Handles AI agents management, orchestration, and team collaboration
 */

import { state } from '../../../core/state.js';
import { eventBus } from '../../../core/events.js';
import { Modal } from '../../../ui/components/Modal.js';
import { toast } from '../../../ui/components/Toast.js';

export class AgentsService {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
    this.currentAgentEngine = 'javascript';
    this.agentTasks = new Map();
    this.currentTeamSuggestion = null;
  }

  /**
   * Attach agents handlers
   */
  attachAgentsHandlers() {
    this.loadAgentsGrid();
    this.checkCrewAIConnection();

    // Engine selector
    const engineRadios = this.aiPanel.modal.element.querySelectorAll('input[name="agentEngine"]');
    engineRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentAgentEngine = e.target.value;
        this.loadAgentsGrid();
        if (window.showNotification) {
          window.showNotification(`Přepnuto na ${e.target.value === 'javascript' ? 'JavaScript' : 'CrewAI'} agenty`, 'info');
        }
      });
    });

    // Orchestrated task button
    const orchestratedBtn = this.aiPanel.modal.element.querySelector('#orchestratedTaskBtn');
    if (orchestratedBtn) {
      orchestratedBtn.addEventListener('click', () => this.startOrchestratedTask());
    }

    // Collaborative task button
    const collaborativeBtn = this.aiPanel.modal.element.querySelector('#collaborativeTaskBtn');
    if (collaborativeBtn) {
      collaborativeBtn.addEventListener('click', () => this.startCollaborativeTask());
    }

    // Clear agents button
    const clearAgentsBtn = this.aiPanel.modal.element.querySelector('#clearAgentsBtn');
    if (clearAgentsBtn) {
      clearAgentsBtn.addEventListener('click', () => this.clearAgentsHistory());
    }

    // Send to agent button
    const sendToAgentBtn = this.aiPanel.modal.element.querySelector('#sendToAgentBtn');
    const agentChatInput = this.aiPanel.modal.element.querySelector('#agentChatInput');

    if (sendToAgentBtn && agentChatInput) {
      sendToAgentBtn.addEventListener('click', () => {
        const message = agentChatInput.value.trim();
        if (message) {
          this.sendToActiveAgents(message);
          agentChatInput.value = '';
        }
      });

      agentChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const message = agentChatInput.value.trim();
          if (message) {
            this.sendToActiveAgents(message);
            agentChatInput.value = '';
          }
        }
      });
    }
  }

  /**
   * Check CrewAI connection
   */
  async checkCrewAIConnection() {
    const statusEl = this.aiPanel.modal.element.querySelector('#crewaiStatus');
    if (!statusEl) return;

    try {
      const response = await fetch('http://localhost:5555/status');
      if (response.ok) {
        statusEl.textContent = '●';
        statusEl.style.color = '#4ade80';
        statusEl.title = 'CrewAI server je online';
      }
    } catch {
      statusEl.textContent = '○';
      statusEl.style.color = '#94a3b8';
      statusEl.title = 'CrewAI server není spuštěný';
    }
  }

  /**
   * Load agents grid
   */
  loadAgentsGrid() {
    const agentsGrid = this.aiPanel.modal.element.querySelector('#agentsGrid');
    if (!agentsGrid) return;

    if (this.currentAgentEngine === 'crewai') {
      this.loadCrewAIAgents(agentsGrid);
    } else {
      this.loadJavaScriptAgents(agentsGrid);
    }
  }

  /**
   * Load JavaScript agents
   */
  loadJavaScriptAgents(agentsGrid) {
    if (!window.AIAgents || !window.AIAgents.initialized) {
      setTimeout(() => this.loadAgentsGrid(), 100);
      return;
    }

    const agents = window.AIAgents.getAgents();

    agentsGrid.innerHTML = agents.map(agent => `
      <div class="agent-card ${agent.active ? 'active' : ''}" data-agent-id="${agent.id}">
        <div class="agent-icon">${agent.icon}</div>
        <div class="agent-info">
          <h4 class="agent-name">${agent.name}</h4>
          <p class="agent-role">${agent.role}</p>
          <div class="agent-capabilities">
            ${agent.capabilities.slice(0, 3).map(cap =>
              `<span class="capability-tag">${cap}</span>`
            ).join('')}
          </div>
        </div>
        <div class="agent-actions">
          <button class="btn-agent-toggle" data-agent-id="${agent.id}">
            ${agent.active ? '✅ Aktivní' : '⚪ Aktivovat'}
          </button>
          <button class="btn-agent-chat" data-agent-id="${agent.id}" style="${agent.active ? '' : 'display:none;'}">
            💬 Chat
          </button>
          <button class="btn-agent-prompt" data-agent-id="${agent.id}" title="Předvyplnit prompt">
            ✨ Prompt
          </button>
        </div>
      </div>
    `).join('');

    // Attach handlers
    this.attachAgentCardHandlers(agentsGrid);
  }

  /**
   * Load CrewAI agents
   */
  async loadCrewAIAgents(agentsGrid) {
    if (!window.CrewAI || !window.CrewAI.isAvailable) {
      agentsGrid.innerHTML = `
        <div class="crewai-warning">
          <h4>🤖 CrewAI Python agenti</h4>
          <p style="margin: 10px 0;">Server není spuštěný, ale můžeš ho snadno spustit:</p>
          <div style="background: #2a2a2a; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0; font-weight: bold; color: #4EC9B0;">📦 Nejjednodušší způsob:</p>
            <p style="margin: 5px 0;">Dvojklik na soubor:</p>
            <code style="display: block; background: #1e1e1e; padding: 8px; border-radius: 4px; margin: 5px 0;">start-crewai.bat</code>
          </div>
          <button onclick="window.open('http://localhost:5555', '_blank')" style="margin-top: 10px; padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
            🌐 Otevřít CrewAI UI
          </button>
        </div>
      `;
      return;
    }

    const agents = window.CrewAI.agents;
    agentsGrid.innerHTML = agents.map(agent => `
      <div class="agent-card crewai-agent" data-agent-id="${agent.id}">
        <div class="agent-icon">🐍</div>
        <div class="agent-info">
          <h4 class="agent-name">${agent.name}</h4>
          <p class="agent-role">${agent.role}</p>
          <div class="agent-goal">${agent.goal}</div>
        </div>
        <div class="agent-actions">
          <button class="btn-agent-use" data-agent-id="${agent.id}">
            🚀 Použít
          </button>
        </div>
      </div>
    `).join('');

    // Attach handlers for CrewAI
    const useBtns = agentsGrid.querySelectorAll('.btn-agent-use');
    useBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const agentId = btn.dataset.agentId;
        this.useCrewAIAgent(agentId);
      });
    });
  }

  /**
   * Attach agent card handlers
   */
  attachAgentCardHandlers(agentsGrid) {
    const toggleBtns = agentsGrid.querySelectorAll('.btn-agent-toggle');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const agentId = btn.dataset.agentId;
        this.toggleAgent(agentId);
      });
    });

    const chatBtns = agentsGrid.querySelectorAll('.btn-agent-chat');
    chatBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const agentId = btn.dataset.agentId;
        this.openAgentChat(agentId);
      });
    });

    const promptBtns = agentsGrid.querySelectorAll('.btn-agent-prompt');
    promptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const agentId = btn.dataset.agentId;
        this.prefillPromptForAgent(agentId);
      });
    });
  }

  /**
   * Toggle agent
   */
  toggleAgent(agentId) {
    const agent = window.AIAgents.getAgent(agentId);
    if (!agent) {
      toast.error('Agent nenalezen', 2000);
      return;
    }

    const success = window.AIAgents.toggleAgent(agentId);
    if (!success) {
      toast.error(`Chyba při přepínání agenta ${agent.name}`, 2000);
      return;
    }

    this.loadAgentsGrid();
    this.updateActiveAgentsList();

    const updatedAgent = window.AIAgents.getAgent(agentId);
    toast.success(
      updatedAgent.active ? `✅ Agent ${agent.name} aktivován` : `🔴 Agent ${agent.name} deaktivován`,
      2000
    );
  }

  /**
   * Update active agents list
   */
  updateActiveAgentsList() {
    const section = this.aiPanel.modal.element.querySelector('#activeAgentsSection');
    const list = this.aiPanel.modal.element.querySelector('#activeAgentsList');

    if (!section || !list) return;

    const activeAgents = window.AIAgents.getActiveAgents();

    if (activeAgents.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = activeAgents.map(agent => `
      <div class="active-agent-item">
        <span class="agent-icon-small">${agent.icon}</span>
        <span class="agent-name-small">${agent.name}</span>
        <span class="agent-role-small">${agent.role}</span>
      </div>
    `).join('');
  }

  /**
   * Open agent chat
   */
  openAgentChat(agentId) {
    const agent = window.AIAgents.getAgent(agentId);
    if (!agent) return;

    toast.info(`💬 Chat s ${agent.name} připraven v hlavním chatu`, 2000);

    // Switch to chat tab
    const chatTab = this.aiPanel.modal.element.querySelector('[data-tab="chat"]');
    if (chatTab) chatTab.click();

    // Prefill input
    const chatInput = this.aiPanel.modal.element.querySelector('#aiChatInput');
    if (chatInput) {
      chatInput.value = `@${agent.id} `;
      chatInput.focus();
    }
  }

  /**
   * Prefill prompt for agent
   */
  prefillPromptForAgent(agentId) {
    const agent = window.AIAgents.getAgent(agentId);
    if (!agent) return;

    const examples = {
      'frontend-dev': 'Vytvoř moderní landing page s responzivním designem',
      'backend-dev': 'Navrhni REST API pro správu uživatelů',
      'fullstack-dev': 'Vytvoř kompletní CRUD aplikaci',
      'ui-designer': 'Navrhni barevné schéma a layout pro e-shop',
      'code-reviewer': 'Zkontroluj tento kód a navrhni vylepšení',
      'tester': 'Vytvoř testy pro tuto funkcionalitu',
      'documenter': 'Napiš dokumentaci k tomuto API'
    };

    const chatInput = this.aiPanel.modal.element.querySelector('#aiChatInput');
    if (chatInput) {
      chatInput.value = examples[agentId] || `Úkol pro ${agent.name}: `;
      chatInput.focus();

      // Switch to chat tab
      const chatTab = this.aiPanel.modal.element.querySelector('[data-tab="chat"]');
      if (chatTab) chatTab.click();
    }
  }

  /**
   * Send to active agents
   */
  async sendToActiveAgents(message) {
    const activeAgents = window.AIAgents.getActiveAgents();

    if (activeAgents.length === 0) {
      toast.warning('⚠️ Nejsou aktivní žádní agenti', 2000);
      return;
    }

    toast.info(`📤 Posílám úkol ${activeAgents.length} agentům...`, 2000);

    // Use collaborative session
    try {
      const agentIds = activeAgents.map(a => a.id);
      await window.AIAgents.sendToMultipleAgents(agentIds, message, {
        onProgress: (status) => {
          console.log('Progress:', status);
        }
      });

      toast.success('✅ Agenti dokončili úkol', 3000);
    } catch (error) {
      console.error('Error sending to agents:', error);
      toast.error('❌ Chyba při komunikaci s agenty', 3000);
    }
  }

  /**
   * Use CrewAI agent
   */
  async useCrewAIAgent(agentId) {
    toast.info(`🐍 Používám CrewAI agenta: ${agentId}`, 2000);
    // TODO: Implement CrewAI agent usage
  }

  /**
   * Clear agents history
   */
  clearAgentsHistory() {
    if (!window.AIAgents) return;

    window.AIAgents.deactivateAllAgents();
    this.loadAgentsGrid();
    this.updateActiveAgentsList();
    toast.success('🧹 Všichni agenti deaktivováni', 2000);
  }

  /**
   * Open orchestrator prompt builder
   */
  openOrchestratorPromptBuilder() {
    const modal = new Modal({
      title: '🎯 Orchestrátor - Builder týmu',
      content: this.createOrchestratorBuilderContent(),
      width: '800px',
      buttons: [
        {
          text: '❌ Zavřít',
          variant: 'secondary',
          onClick: () => modal.close()
        }
      ]
    });

    modal.open();
    this.attachOrchestratorBuilderHandlers(modal);
  }

  /**
   * Create orchestrator builder content
   */
  createOrchestratorBuilderContent() {
    return `
      <div class="orchestrator-builder">
        <p class="builder-description">
          Popiš projekt a AI navrhne optimální tým agentů s rozdělením úkolů.
        </p>

        <div class="builder-input-section">
          <label for="projectDescription">📝 Popis projektu:</label>
          <textarea
            id="projectDescription"
            placeholder="Např: Moderní landing page pro kavárnu s rezervačním systémem..."
            rows="4"
          ></textarea>
        </div>

        <div class="builder-complexity">
          <label>Složitost:</label>
          <div class="complexity-options">
            <label>
              <input type="radio" name="complexity" value="1" checked>
              <span>Jednoduchá (1 soubor)</span>
            </label>
            <label>
              <input type="radio" name="complexity" value="2">
              <span>Střední (HTML/CSS/JS)</span>
            </label>
            <label>
              <input type="radio" name="complexity" value="3">
              <span>Složitá (více souborů)</span>
            </label>
          </div>
        </div>

        <button id="analyzeProjectBtn" class="btn-primary">
          🔍 Analyzovat a navrhnout tým
        </button>

        <div id="teamPreview" style="display: none; margin-top: 20px;">
          <!-- Team preview will be inserted here -->
        </div>

        <button id="activateTeamBtn" class="btn-success" style="display: none; margin-top: 15px;">
          🚀 Aktivovat tým a začít
        </button>
      </div>
    `;
  }

  /**
   * Attach orchestrator builder handlers
   */
  attachOrchestratorBuilderHandlers(modal) {
    const analyzeBtn = modal.element.querySelector('#analyzeProjectBtn');
    const activateBtn = modal.element.querySelector('#activateTeamBtn');
    const descInput = modal.element.querySelector('#projectDescription');

    if (analyzeBtn && descInput) {
      analyzeBtn.addEventListener('click', async () => {
        const description = descInput.value.trim();
        if (!description) {
          toast.warning('⚠️ Zadej popis projektu', 2000);
          return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = '🔄 Analyzuji...';

        try {
          const complexity = parseInt(modal.element.querySelector('input[name="complexity"]:checked').value);
          const teamSuggestion = await this.analyzeProjectAndSuggestTeam(description, complexity);

          this.displayTeamPreview(teamSuggestion);
          this.currentTeamSuggestion = teamSuggestion;

        } catch (error) {
          toast.show('❌ Chyba při analýze: ' + error.message, 'error');
        } finally {
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = '🔍 Analyzovat a navrhnout tým';
        }
      });
    }

    if (activateBtn) {
      activateBtn.addEventListener('click', async () => {
        if (this.currentTeamSuggestion) {
          activateBtn.disabled = true;
          activateBtn.textContent = '🔄 Spouštím agenty...';

          modal.close();
          eventBus.emit('panel:show', { name: 'ai' });

          try {
            const description = descInput.value.trim();
            await this.activateOrchestratedTeam(this.currentTeamSuggestion, description, true);
          } catch (error) {
            toast.error('❌ Chyba při aktivaci týmu: ' + error.message, 4000);
            activateBtn.disabled = false;
            activateBtn.textContent = '🚀 Aktivovat tým a začít';
          }
        }
      });
    }
  }

  /**
   * Analyze project and suggest team
   */
  async analyzeProjectAndSuggestTeam(description, complexity) {
    // Simple AI-based team suggestion (can be enhanced with real AI call)
    const agents = [];

    // Always include orchestrator for complex projects
    if (complexity > 1) {
      agents.push({ id: 'orchestrator', task: 'Koordinovat práci týmu a integrovat výsledky' });
    }

    // Frontend dev for UI
    agents.push({ id: 'frontend-dev', task: 'Vytvořit HTML struktur a responzivní design' });

    // UI designer for styling
    if (description.toLowerCase().includes('design') || complexity > 1) {
      agents.push({ id: 'ui-designer', task: 'Navrhnout barevné schéma a styly' });
    }

    // Tester
    if (complexity > 1) {
      agents.push({ id: 'tester', task: 'Otestovat funkcionalitu a responzivitu' });
    }

    return {
      projectType: 'website',
      complexity,
      agents,
      workflow: 'sequential'
    };
  }

  /**
   * Display team preview
   */
  displayTeamPreview(teamSuggestion) {
    const previewEl = this.aiPanel.modal.element.querySelector('#teamPreview');
    const activateBtn = this.aiPanel.modal.element.querySelector('#activateTeamBtn');

    if (!previewEl) return;

    previewEl.innerHTML = `
      <h4>🤖 Navržený tým (${teamSuggestion.agents.length} agentů):</h4>
      <div class="team-agents-list">
        ${teamSuggestion.agents.map(a => {
          const agent = window.AIAgents.getAgent(a.id);
          return `
            <div class="team-agent-item">
              <span class="agent-icon-small">${agent?.icon || '🤖'}</span>
              <div class="agent-details">
                <strong>${agent?.name || a.id}</strong>
                <p>${a.task}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <p><strong>Workflow:</strong> ${teamSuggestion.workflow === 'sequential' ? '🔄 Sekvenční (po sobě)' : '⚡ Paralelní (současně)'}</p>
    `;

    previewEl.style.display = 'block';
    if (activateBtn) activateBtn.style.display = 'block';
  }

  /**
   * Activate orchestrated team
   */
  async activateOrchestratedTeam(teamSuggestion, projectDescription, forceNew = false) {
    if (!window.AIAgents) {
      toast.error('❌ AI Agents System není k dispozici', 3000);
      return;
    }

    // Activate agents
    const agentIds = teamSuggestion.agents.map(a => a.id).filter(id => window.AIAgents.getAgent(id));
    if (agentIds.length === 0) {
      toast.error('❌ Žádný validní agent k aktivaci', 3000);
      return;
    }

    const results = window.AIAgents.activateAgents(agentIds);
    const successCount = results.filter(r => r.success).length;

    if (successCount === 0) {
      toast.error('❌ Nepodařilo se aktivovat žádného agenta', 3000);
      return;
    }

    this.loadAgentsGrid();
    this.updateActiveAgentsList();

    // Clear editor for new project
    if (forceNew) {
      state.set('editor.code', '');
      state.set('editor.content', '');
      this.aiPanel.chatHistory = [];
    }

    // Send orchestration prompt
    const orchestratorPrompt = `🎯 ORCHESTRATOR AKTIVOVÁN - NOVÝ PROJEKT

Projekt: ${projectDescription}
Složitost: ${teamSuggestion.complexity}

Aktivovaný tým agentů (${teamSuggestion.agents.length}):
${teamSuggestion.agents.map((a, i) => `${i + 1}. ${a.id} - ${a.task}`).join('\n')}

Vytvoř kompletní funkční projekt podle specifikace.`;

    this.aiPanel.addChatMessage('system', orchestratorPrompt);
    toast.success(`✅ Aktivováno ${successCount} agentů - začínáme!`, 2000);
  }

  /**
   * Start orchestrated task
   */
  startOrchestratedTask() {
    const activeAgents = window.AIAgents?.getActiveAgents() || [];
    if (activeAgents.length === 0) {
      toast.warning('⚠️ Nejdříve aktivuj nějaké agenty', 2000);
      return;
    }

    this.openOrchestratorPromptBuilder();
  }

  /**
   * Start collaborative task
   */
  startCollaborativeTask() {
    const activeAgents = window.AIAgents?.getActiveAgents() || [];
    if (activeAgents.length === 0) {
      toast.warning('⚠️ Nejdříve aktivuj nějaké agenty', 2000);
      return;
    }

    toast.info(`🤝 Kolaborativní režim s ${activeAgents.length} agenty`, 2000);
    // Switch to chat
    const chatTab = this.aiPanel.modal.element.querySelector('[data-tab="chat"]');
    if (chatTab) chatTab.click();
  }
}
