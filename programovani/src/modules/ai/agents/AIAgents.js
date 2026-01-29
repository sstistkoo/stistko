/**
 * AI Agents System for Code Generation
 * Multi-agent system for collaborative programming
 */

class AIAgentsSystem {
  constructor() {
    this.agents = new Map();
    this.conversations = new Map();
    this.activeAgents = [];
    this.initialized = false;
  }

  /**
   * Initialize the AI agents system
   */
  async init() {
    if (this.initialized) return;

    // Register Orchestrator - Main coordinator agent
    this.registerAgent('orchestrator', {
      name: 'Orchestrator',
      role: 'Hlavní koordinátor a rozdělování úkolů',
      icon: '🎯',
      systemPrompt: `Jsi hlavní orchestrator AI agentů. Tvým úkolem je:
- Analyzovat zadání od uživatele
- Rozdělit úkol na konkrétní podúkoly
- Přiřadit každý podúkol správnému agentovi
- Koordinovat spolupráci mezi agenty
- Spojit výsledky do finálního řešení

Dostupní agenti a jejich specializace:
- Architekt: Navrhování struktury, architektury, plánování
- Frontend Developer: HTML, CSS, JavaScript, React, Vue
- Backend Developer: Node.js, Python, API, databáze
- Full-Stack: Kompletní aplikace frontend + backend
- Debugger: Hledání a oprava chyb, troubleshooting
- Code Reviewer: Kontrola kvality, security, best practices
- Documentation Writer: Dokumentace, komentáře, návody
- Test Engineer: Unit testy, E2E testy, TDD

Když dostaneš úkol, odpověz ve formátu JSON:
{
  "analysis": "Stručná analýza úkolu",
  "agents": [
    {
      "agent": "architect",
      "task": "Konkrétní úkol pro architekta",
      "priority": 1
    },
    {
      "agent": "frontend",
      "task": "Konkrétní úkol pro frontend developera",
      "priority": 2
    }
  ],
  "expectedOutcome": "Co očekáváme jako výsledek"
}`,
      capabilities: ['coordination', 'task-distribution', 'planning', 'analysis']
    });

    // Register default agents
    this.registerAgent('architect', {
      name: 'Architekt',
      role: 'Návrh architektury a struktury aplikace',
      icon: '🏗️',
      systemPrompt: `Jsi zkušený softwarový architekt specializovaný na webové aplikace.

## 🎯 Tvoje role
- Navrhovat strukturu aplikací a komponent
- Definovat API a rozhraní mezi moduly
- Optimalizovat výkon a škálovatelnost
- Doporučovat design patterns a best practices

## 📐 Standardy
- **Sémantické HTML5**: header, nav, main, section, article, aside, footer
- **CSS architektura**: BEM, ITCSS, nebo utility-first
- **JS struktura**: Moduly, services, komponenty
- **Přístupnost**: WCAG 2.1, ARIA

## 🛠️ Technologie
- Frontend: HTML5, CSS3, JavaScript ES6+
- Layouty: Flexbox, CSS Grid
- State management: Event-driven, Observer pattern

## 📝 Odpovědi
- Stručné, praktické návrhy v češtině
- Diagramy a schémata (ASCII nebo popis)
- Konkrétní příklady struktury`,
      capabilities: ['architecture', 'design', 'planning', 'optimization']
    });

    this.registerAgent('frontend', {
      name: 'Frontend Developer',
      role: 'HTML, CSS, JavaScript expert',
      icon: '🎨',
      systemPrompt: `Jsi SENIOR frontend developer s expertízou na moderní web development.

## 🎯 Specializace
- **HTML5**: Sémantické značky, accessibility (aria-*), SEO
- **CSS3**: Flexbox, Grid, custom properties, animace
- **JavaScript**: ES6+, DOM, events, async/await

## 🎨 Design principy
- Mobile-first responsive design
- CSS custom properties (--primary, --spacing)
- Smooth animace (transition, @keyframes)
- Hover/focus stavy, keyboard navigation

## ⚡ Best practices
- \`const\`/\`let\` místo \`var\`
- \`addEventListener\` místo inline onclick
- \`querySelector\` místo getElementById
- Template literals pro HTML strings
- Error handling pro všechny operace

## 📝 Formát odpovědi
Pro nový kód: kompletní HTML soubor
Pro úpravy: SEARCH/REPLACE bloky

**VŽDY poskytni KOMPLETNÍ, FUNKČNÍ kód!**`,
      capabilities: ['html', 'css', 'javascript', 'react', 'vue', 'responsive', 'animations']
    });

    this.registerAgent('backend', {
      name: 'Backend Developer',
      role: 'Server-side logika a databáze',
      icon: '⚙️',
      systemPrompt: `Jsi backend developer expert.

## 🎯 Specializace
- **Node.js**: Express, REST APIs, middleware
- **Python**: Flask, Django basics
- **Databáze**: SQL, MongoDB, localStorage
- **Bezpečnost**: Auth, validace, sanitizace

## ⚡ Best practices
- RESTful API design
- Error handling a status kódy
- Input validace
- CORS a security headers

## 📝 Pro HTML Studio
Většinou pracuješ s:
- localStorage/sessionStorage pro persistenci
- fetch API pro HTTP requesty
- JSON data structures

Odpovídej stručně, prakticky, v češtině.`,
      capabilities: ['nodejs', 'python', 'databases', 'apis', 'security']
    });

    this.registerAgent('fullstack', {
      name: 'Full-Stack Developer',
      role: 'Kompletní end-to-end vývoj',
      icon: '🚀',
      systemPrompt: `Jsi EXPERT full-stack developer s 10+ lety zkušeností. Vytváříš PROFESIONÁLNÍ, KOMPLETNÍ webové aplikace.

🎯 **TVOJE SILNÉ STRÁNKY:**
- Frontend: HTML5 (sémantické), CSS3 (Grid, Flexbox, animace), JavaScript ES6+
- Backend: Node.js, Python, REST APIs
- Databáze: SQL, MongoDB
- DevOps: Docker, CI/CD

🎨 **DESIGN STANDARDY:**
- Moderní UI/UX (gradienty, shadows, rounded corners)
- Mobile-first responzivní design
- Smooth animace a hover efekty
- Profesionální barevné schémata

⚠️ **KRITICKÁ PRAVIDLA:**
1. Kód MUSÍ být 100% FUNKČNÍ - žádné placeholdery!
2. Všechny funkce musí být implementované
3. Error handling pro všechny operace
4. Čistý, čitelný kód s komentáři
5. Validace vstupů

📝 **FORMÁT ODPOVĚDI PRO NOVÝ PROJEKT:**
\`\`\`html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Název</title>
  <style>/* Kompletní CSS */</style>
</head>
<body>
  <!-- Kompletní HTML -->
  <script>// Kompletní JavaScript</script>
</body>
</html>
\`\`\`

📝 **FORMÁT PRO ÚPRAVY EXISTUJÍCÍHO KÓDU:**
Použij SEARCH/REPLACE bloky:
\`\`\`SEARCH
[přesně zkopírovaný existující kód]
\`\`\`
\`\`\`REPLACE
[nový kód]
\`\`\``,
      capabilities: ['frontend', 'backend', 'databases', 'devops', 'cloud', 'complete-apps']
    });

    this.registerAgent('debugger', {
      name: 'Debugger',
      role: 'Hledání a oprava chyb',
      icon: '🐛',
      systemPrompt: `Jsi EXPERT na debugging a opravy kódu.

🔍 **TVOJE SCHOPNOSTI:**
- Analýza chybových hlášení (SyntaxError, TypeError, ReferenceError, atd.)
- Detekce logických chyb v kódu
- Performance profiling a optimalizace
- Memory leak detection
- Cross-browser debugging

⚠️ **PRAVIDLA PRO OPRAVY:**
1. VŽDY použij SEARCH/REPLACE formát pro opravy existujícího kódu
2. SEARCH blok musí být PŘESNÁ kopie problematického kódu
3. REPLACE blok obsahuje opravu
4. Opravuj JEN to co je potřeba - nemaž funkční kód

📝 **FORMÁT OPRAVY:**
\`\`\`SEARCH
[přesně zkopírovaný chybný kód - včetně mezer a odsazení]
\`\`\`
\`\`\`REPLACE
[opravený kód]
\`\`\`

💡 **POSTUP:**
1. Identifikuj přesný řádek s chybou
2. Analyzuj příčinu
3. Navrhni minimální opravu
4. Vysvětli co bylo špatně`,
      capabilities: ['debugging', 'error-fixing', 'performance', 'troubleshooting', 'search-replace']
    });

    this.registerAgent('reviewer', {
      name: 'Code Reviewer',
      role: 'Review kódu a quality assurance',
      icon: '👁️',
      systemPrompt: `Jsi code reviewer zaměřený na kvalitu webového kódu.

## 🎯 Co kontroluješ
- **HTML**: Sémantika, přístupnost, validita
- **CSS**: Duplicity, specifičnost, mobile-first
- **JavaScript**: Best practices, security, výkon

## ⚠️ Hledáš
- Security vulnerabilities (XSS, injection)
- Performance issues
- Code smells a duplicity
- Chybějící error handling
- Accessibility problémy

## 📝 Formát review
1. **Kritické** (🔴): Bezpečnost, nefunkční kód
2. **Důležité** (🟡): Best practices, výkon
3. **Návrhy** (🟢): Vylepšení, refactoring

Pro opravy použij SEARCH/REPLACE formát.
Odpovídej stručně, konkrétně, v češtině.`,
      capabilities: ['review', 'security', 'quality', 'refactoring']
    });

    this.registerAgent('documentation', {
      name: 'Documentation Writer',
      role: 'Tvorba dokumentace',
      icon: '📚',
      systemPrompt: `Jsi technical writer pro webové projekty.

## 🎯 Co vytváříš
- README soubory
- Komentáře v kódu (JSDoc)
- Uživatelské návody
- API dokumentace

## 📝 Styl
- Jasný, stručný jazyk
- Příklady použití
- Markdown formátování
- Česky nebo anglicky podle kontextu

Odpovídej prakticky, s příklady.`,
      capabilities: ['documentation', 'tutorials', 'examples', 'guides']
    });

    this.registerAgent('tester', {
      name: 'Test Engineer',
      role: 'Tvorba testů a QA',
      icon: '✅',
      systemPrompt: `Jsi testing engineer pro webové aplikace.

## 🎯 Co testuješ
- **Unit testy**: Jednotlivé funkce
- **Integration**: Spolupráce komponent
- **E2E**: Uživatelské scénáře
- **Validace**: Formuláře, vstupy

## 🛠️ Nástroje
- Console.log pro debugging
- try/catch pro error handling
- Custom test funkce

## 📝 Formát testů
\`\`\`javascript
// Test: popis co testujeme
function testNazevFunkce() {
  const result = funkcePodTest(vstup);
  console.assert(result === očekáváno, 'Chyba: popis');
}
\`\`\`

Odpovídej s konkrétními testy v češtině.`,
      capabilities: ['testing', 'unit-tests', 'e2e', 'tdd', 'qa']
    });

    this.initialized = true;
    console.log('✅ AI Agents System initialized with', this.agents.size, 'agents');
  }

  /**
   * Register a new agent
   */
  registerAgent(id, config) {
    this.agents.set(id, {
      id,
      ...config,
      active: false,
      conversationHistory: []
    });
  }

  /**
   * Get all registered agents
   */
  getAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.agents.get(id);
  }

  /**
   * Activate an agent for the current session
   */
  activateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error(`❌ Agent "${agentId}" not found`);
      return false;
    }

    if (agent.active) {
      console.warn(`⚠️ Agent "${agent.name}" is already active`);
      return true; // Already active is not an error
    }

    agent.active = true;
    if (!this.activeAgents.includes(agentId)) {
      this.activeAgents.push(agentId);
    }

    console.log(`✅ Agent "${agent.name}" (${agent.role}) activated`);
    return true;
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error(`❌ Agent "${agentId}" not found`);
      return false;
    }

    if (!agent.active) {
      console.warn(`⚠️ Agent "${agent.name}" is already inactive`);
      return true; // Already inactive is not an error
    }

    agent.active = false;
    this.activeAgents = this.activeAgents.filter(id => id !== agentId);

    console.log(`🔴 Agent "${agent.name}" deactivated`);
    return true;
  }

  /**
   * Toggle agent active state
   */
  toggleAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error('Agent not found:', agentId);
      return false;
    }

    if (agent.active) {
      return this.deactivateAgent(agentId);
    } else {
      return this.activateAgent(agentId);
    }
  }

  /**
   * Activate multiple agents at once
   */
  activateAgents(agentIds) {
    if (!Array.isArray(agentIds)) {
      console.error('❌ activateAgents expects an array of agent IDs');
      return [];
    }

    const results = [];
    agentIds.forEach(id => {
      const agent = this.agents.get(id);
      const success = this.activateAgent(id);
      results.push({
        id,
        name: agent?.name || 'Unknown',
        success
      });
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`✨ Activated ${successCount}/${agentIds.length} agents`);

    return results;
  }

  /**
   * Deactivate all agents
   */
  deactivateAllAgents() {
    const deactivated = [...this.activeAgents];
    deactivated.forEach(id => this.deactivateAgent(id));
    console.log('🔴 All agents deactivated');
    return deactivated;
  }

  /**
   * Get all active agents
   */
  getActiveAgents() {
    return this.activeAgents.map(id => this.agents.get(id)).filter(Boolean);
  }

  /**
   * Check if agent is active
   */
  isAgentActive(agentId) {
    const agent = this.agents.get(agentId);
    return agent ? agent.active : false;
  }

  /**
   * Get agent count statistics
   */
  getStats() {
    return {
      total: this.agents.size,
      active: this.activeAgents.length,
      inactive: this.agents.size - this.activeAgents.length
    };
  }

  /**
   * Send message to a specific agent
   */
  async sendToAgent(agentId, message, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Add to conversation history
    agent.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Build the full prompt with system context
    const fullPrompt = this.buildPrompt(agent, message, context);

    try {
      // Use the global AI object from ai_module.js
      if (!window.AI) {
        throw new Error('AI module not loaded');
      }

      // Automatically select best model for this agent type
      const modelSelection = window.AI.selectModelForAgent(agentId);

      const response = await window.AI.ask(fullPrompt, {
        provider: modelSelection.provider,
        model: modelSelection.model,
        temperature: 0.7,
        maxTokens: 2000,
        autoFallback: true  // Automatically switch models on rate limit
      });

      // Add to conversation history
      agent.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });

      return {
        agent: agent.name,
        response,
        agentId
      };
    } catch (error) {
      console.error(`Error communicating with agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Send message to multiple agents (collaborative)
   */
  async sendToMultipleAgents(agentIds, message, context = {}) {
    const promises = agentIds.map(id => this.sendToAgent(id, message, context));
    return Promise.all(promises);
  }

  /**
   * Orchestrated session - Orchestrator distributes tasks
   */
  async orchestratedSession(task, context = {}) {
    const results = [];
    const onProgress = context.onProgress || (() => {});

    // Phase 1: Orchestrator analyzes and distributes tasks
    console.log('🎯 Phase 1: Task Distribution by Orchestrator');
    onProgress('📋 Orchestrátor analyzuje úkol...');

    try {
      const orchestratorResponse = await this.sendToAgent(
        'orchestrator',
        `Analyzuj tento úkol a rozděl ho mezi vhodné agenty:\n\n${task}`,
        context
      );

      results.push({
        phase: 'orchestration',
        response: orchestratorResponse
      });

      // Try to parse JSON response from orchestrator
      let plan;
      try {
        // Extract JSON from response (might be wrapped in markdown or text)
        const jsonMatch = orchestratorResponse.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: use all active agents
          const activeAgents = this.getActiveAgents();
          plan = {
            analysis: orchestratorResponse.response,
            agents: activeAgents.map((agent, index) => ({
              agent: agent.id,
              task: task,
              priority: index + 1
            }))
          };
        }
      } catch (parseError) {
        console.warn('Could not parse orchestrator response, using active agents');
        const activeAgents = this.getActiveAgents();
        plan = {
          analysis: orchestratorResponse.response,
          agents: activeAgents.map((agent, index) => ({
            agent: agent.id,
            task: task,
            priority: index + 1
          }))
        };
      }

      // Phase 2: Execute tasks based on orchestrator's plan
      console.log('🔨 Phase 2: Executing Distributed Tasks');

      // Sort by priority
      const sortedTasks = (plan.agents || []).sort((a, b) => a.priority - b.priority);
      onProgress(`🔨 Spouštím ${sortedTasks.length} agentů...`);

      const taskResults = [];
      for (let i = 0; i < sortedTasks.length; i++) {
        const agentTask = sortedTasks[i];
        if (this.agents.has(agentTask.agent) && agentTask.agent !== 'orchestrator') {
          const agentInfo = this.agents.get(agentTask.agent);
          console.log(`  → ${agentTask.agent}: ${agentTask.task}`);
          onProgress(`🤖 ${agentInfo.name} pracuje... (${i + 1}/${sortedTasks.length})`);

          try {
            const result = await this.sendToAgent(
              agentTask.agent,
              agentTask.task,
              context
            );
            taskResults.push(result);

            // Add delay between requests to avoid rate limits
            if (i < sortedTasks.length - 1) {
              const delay = 2000; // 2 seconds between agents
              console.log(`⏳ Čekám ${delay/1000}s před dalším agentem...`);
              onProgress(`⏳ Čekám před dalším agentem... (${i + 1}/${sortedTasks.length} hotovo)`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            console.error(`Error executing task for ${agentTask.agent}:`, error);
            onProgress(`⚠️ Chyba u ${agentInfo.name}, pokračuji...`);
            // Wait even longer after error before continuing
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      results.push({
        phase: 'execution',
        responses: taskResults,
        plan: plan
      });

      // Phase 3: Orchestrator synthesizes results
      console.log('✨ Phase 3: Synthesis by Orchestrator');
      onProgress('✨ Orchestrátor kombinuje výsledky...');

      const allOutputs = taskResults.map(r => `${r.agent}: ${r.response}`).join('\n\n');
      const synthesis = await this.sendToAgent(
        'orchestrator',
        `KRITICKÝ ÚKOL: Zkombinuj výsledky od agentů a vytvoř KOMPLETNÍ FUNKČNÍ KÓD.

Původní úkol: ${task}

Výsledky od agentů:
${allOutputs}

⚠️ DŮLEŽITÉ INSTRUKCE:
1. MUSÍŠ vytvořit KOMPLETNÍ HTML soubor (od <!DOCTYPE html> do </html>)
2. KÓD musí být FUNKČNÍ a připravený ke spuštění
3. Zabal kód do \`\`\`html ... \`\`\`
4. NIKDY neduplikuj proměnné (každá let/const pouze 1x!)
5. Nezahrnuj jen popis - potřebuji SKUTEČNÝ SPUSTITELNÝ KÓD

Odpověz pouze s kódem v code blocku!`,
        context
      );

      results.push({
        phase: 'synthesis',
        response: synthesis
      });

      return results;

    } catch (error) {
      console.error('Error in orchestrated session:', error);
      throw error;
    }
  }

  /**
   * Collaborative session - agents work together
   */
  async collaborativeSession(agentIds, task, context = {}) {
    const results = [];

    // Phase 1: Each agent analyzes the task
    console.log('📋 Phase 1: Task Analysis');
    const analyses = await this.sendToMultipleAgents(
      agentIds,
      `Analyzuj tento úkol z pohledu své role: ${task}`,
      context
    );
    results.push({ phase: 'analysis', responses: analyses });

    // Phase 2: Agents review each other's work
    console.log('🔄 Phase 2: Peer Review');
    const analysisTexts = analyses.map(a => `${a.agent}: ${a.response}`).join('\n\n');
    const reviews = await this.sendToMultipleAgents(
      agentIds,
      `Přečti si analýzy od ostatních agentů a dej feedback:\n\n${analysisTexts}`,
      context
    );
    results.push({ phase: 'review', responses: reviews });

    // Phase 3: Final synthesis
    console.log('✨ Phase 3: Synthesis');
    const allInputs = [...analyses, ...reviews];
    const synthesis = await this.sendToAgent(
      agentIds[0], // Lead agent
      `Na základě všech analýz a feedbacku vytvoř finální řešení pro úkol: ${task}\n\nVstup od agentů:\n${allInputs.map(a => `${a.agent}: ${a.response}`).join('\n\n')}`,
      context
    );
    results.push({ phase: 'synthesis', response: synthesis });

    return results;
  }

  /**
   * Build full prompt with context
   */
  buildPrompt(agent, message, context = {}) {
    let prompt = agent.systemPrompt + '\n\n';

    // Add context if available
    if (context.code) {
      prompt += `Aktuální kód:\n\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    if (context.files) {
      prompt += `Otevřené soubory:\n${context.files.join(', ')}\n\n`;
    }

    if (context.errors) {
      prompt += `Chyby:\n${context.errors.join('\n')}\n\n`;
    }

    // Add conversation history (last 5 messages)
    const recentHistory = agent.conversationHistory.slice(-5);
    if (recentHistory.length > 0) {
      prompt += 'Historie konverzace:\n';
      recentHistory.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Uživatel' : agent.name}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // Add current message
    prompt += `Uživatel: ${message}\n\n${agent.name}:`;

    return prompt;
  }

  /**
   * Clear agent conversation history
   */
  clearHistory(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.conversationHistory = [];
    }
  }

  /**
   * Clear all agents' history
   */
  clearAllHistory() {
    this.agents.forEach(agent => {
      agent.conversationHistory = [];
    });
  }

  /**
   * Export agent configuration
   */
  exportConfig() {
    return {
      agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
        id,
        name: agent.name,
        role: agent.role,
        capabilities: agent.capabilities
      })),
      activeAgents: this.activeAgents
    };
  }
}

// Create global instance
window.AIAgents = new AIAgentsSystem();

// Auto-initialize when AI module is ready
if (window.AI) {
  window.AIAgents.init();
} else {
  // Wait for AI module to load
  const checkAI = setInterval(() => {
    if (window.AI) {
      window.AIAgents.init();
      clearInterval(checkAI);
    }
  }, 100);
}

console.log('✅ AI Agents System loaded');
