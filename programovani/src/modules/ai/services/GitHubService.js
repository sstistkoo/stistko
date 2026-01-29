/**
 * GitHub Service
 * Handles all GitHub-related functionality including search, repository management, and code loading
 */

import { eventBus } from '../../../core/events.js';
import { state } from '../../../core/state.js';
import { SafeOps } from '../../../core/safeOps.js';
import { Modal } from '../../../ui/components/Modal.js';

export class GitHubService {
  constructor(aiPanel) {
    this.panel = aiPanel; // Reference to AIPanel for shared functionality
  }

  /**
   * Handle GitHub action routing
   */
  handleGitHubAction(action) {
    const actions = {
      'repos': () => this.showRepoManager(),
      'search-repos': () => this.showGitHubSearchDialog(),
      'clone': () => this.cloneRepo(),
      'create-gist': () => this.showCreateGistModal(),
      'issues': () => this.showIssuesModal(),
      'pull-requests': () => this.showPullRequestsModal(),
      'deploy': () => this.showDeployModal()
    };

    const actionFn = actions[action];
    if (actionFn) {
      actionFn();
    }
  }

  /**
   * Show Issues modal
   */
  showIssuesModal() {
    const token = this.getStoredToken();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; max-height: 85vh; overflow: hidden; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">📋 GitHub Issues</h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 25px; overflow-y: auto; max-height: calc(85vh - 80px);">
          ${!token ? `
            <div style="text-align: center; padding: 20px;">
              <p style="color: #8b949e; margin-bottom: 16px;">Pro zobrazení Issues potřebujete GitHub token.</p>
              <button id="setupTokenBtn" style="padding: 12px 24px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔑 Nastavit Token
              </button>
            </div>
          ` : `
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">📋 Co jsou Issues:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
                <li>Sledování bugů, úkolů a vylepšení</li>
                <li>Možnost přiřadit štítky a milníky</li>
                <li>Propojení s Pull Requesty</li>
              </ul>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">Repozitář (owner/repo):</label>
              <input type="text" id="issuesRepoInput" placeholder="např. facebook/react" style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
              <button id="loadIssuesBtn" style="flex: 1; padding: 12px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                📋 Načíst Issues
              </button>
              <button id="createIssueBtn" style="flex: 1; padding: 12px; background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                ➕ Vytvořit Issue
              </button>
            </div>
            <div id="issuesList" style="display: none;"></div>
            <div id="createIssueForm" style="display: none;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #ccc;">Název:</label>
                <input type="text" id="issueTitleInput" placeholder="Název issue" style="width: 100%; padding: 10px; border: 1px solid #333; border-radius: 6px; background: #0d0d0d; color: #fff;">
              </div>
              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #ccc;">Popis:</label>
                <textarea id="issueBodyInput" placeholder="Popis issue..." rows="4" style="width: 100%; padding: 10px; border: 1px solid #333; border-radius: 6px; background: #0d0d0d; color: #fff; resize: vertical;"></textarea>
              </div>
              <button id="submitIssueBtn" style="width: 100%; padding: 12px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                ✅ Odeslat Issue
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Setup token button
    const setupTokenBtn = modal.querySelector('#setupTokenBtn');
    if (setupTokenBtn) {
      setupTokenBtn.addEventListener('click', () => {
        modal.remove();
        this.initiateGitHubOAuth();
      });
    }

    // Load issues
    const loadBtn = modal.querySelector('#loadIssuesBtn');
    const createBtn = modal.querySelector('#createIssueBtn');
    const issuesList = modal.querySelector('#issuesList');
    const createForm = modal.querySelector('#createIssueForm');

    if (loadBtn) {
      loadBtn.addEventListener('click', async () => {
        const repo = modal.querySelector('#issuesRepoInput').value.trim();
        if (!repo) {
          eventBus.emit('toast:show', { message: 'Zadejte repozitář', type: 'warning' });
          return;
        }

        loadBtn.textContent = '⏳ Načítání...';
        loadBtn.disabled = true;

        try {
          const issues = await this.fetchIssues(repo);
          issuesList.style.display = 'block';
          createForm.style.display = 'none';

          if (issues.length === 0) {
            issuesList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Žádné otevřené issues.</p>';
          } else {
            issuesList.innerHTML = issues.map(issue => `
              <div style="padding: 12px; background: #242424; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <a href="${issue.html_url}" target="_blank" style="color: #58a6ff; text-decoration: none; font-weight: 600;">#${issue.number} ${issue.title}</a>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #888;">
                      ${issue.user.login} • ${new Date(issue.created_at).toLocaleDateString('cs-CZ')}
                      ${issue.labels.map(l => `<span style="background: #${l.color}20; color: #${l.color}; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 4px;">${l.name}</span>`).join('')}
                    </p>
                  </div>
                </div>
              </div>
            `).join('');
          }
        } catch (error) {
          issuesList.innerHTML = `<p style="color: #ff6b6b; text-align: center;">❌ ${error.message}</p>`;
          issuesList.style.display = 'block';
        }

        loadBtn.textContent = '📋 Načíst Issues';
        loadBtn.disabled = false;
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        issuesList.style.display = 'none';
        createForm.style.display = 'block';
      });
    }

    const submitBtn = modal.querySelector('#submitIssueBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const repo = modal.querySelector('#issuesRepoInput').value.trim();
        const title = modal.querySelector('#issueTitleInput').value.trim();
        const body = modal.querySelector('#issueBodyInput').value.trim();

        if (!repo || !title) {
          eventBus.emit('toast:show', { message: 'Vyplňte repozitář a název', type: 'warning' });
          return;
        }

        submitBtn.textContent = '⏳ Odesílání...';
        submitBtn.disabled = true;

        try {
          await this.createIssue(repo, title, body);
          eventBus.emit('toast:show', { message: '✅ Issue vytvořeno!', type: 'success' });
          modal.remove();
        } catch (error) {
          eventBus.emit('toast:show', { message: '❌ ' + error.message, type: 'error' });
        }

        submitBtn.textContent = '✅ Odeslat Issue';
        submitBtn.disabled = false;
      });
    }
  }

  /**
   * Fetch issues from GitHub
   */
  async fetchIssues(repo) {
    const token = this.getStoredToken();
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open`, { headers });
    if (!response.ok) throw new Error('Nepodařilo se načíst issues: ' + response.statusText);
    return await response.json();
  }

  /**
   * Create a new issue
   */
  async createIssue(repo, title, body) {
    const token = this.getStoredToken();
    if (!token) throw new Error('Potřebujete GitHub token');

    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    });

    if (!response.ok) throw new Error('Nepodařilo se vytvořit issue: ' + response.statusText);
    return await response.json();
  }

  /**
   * Show Pull Requests modal
   */
  showPullRequestsModal() {
    const token = this.getStoredToken();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; max-height: 85vh; overflow: hidden; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">🔀 Pull Requests</h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 25px; overflow-y: auto; max-height: calc(85vh - 80px);">
          ${!token ? `
            <div style="text-align: center; padding: 20px;">
              <p style="color: #8b949e; margin-bottom: 16px;">Pro zobrazení Pull Requests potřebujete GitHub token.</p>
              <button id="setupTokenBtn" style="padding: 12px 24px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔑 Nastavit Token
              </button>
            </div>
          ` : `
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">🔀 Co jsou Pull Requests:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
                <li>Návrhy na změny kódu v repozitáři</li>
                <li>Umožňují code review a diskuzi</li>
                <li>Po schválení se sloučí do hlavní větve</li>
              </ul>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">Repozitář (owner/repo):</label>
              <input type="text" id="prRepoInput" placeholder="např. facebook/react" style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
            </div>
            <button id="loadPRsBtn" style="width: 100%; padding: 12px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              🔀 Načíst Pull Requests
            </button>
            <div id="prList" style="display: none;"></div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const setupTokenBtn = modal.querySelector('#setupTokenBtn');
    if (setupTokenBtn) {
      setupTokenBtn.addEventListener('click', () => {
        modal.remove();
        this.initiateGitHubOAuth();
      });
    }

    const loadBtn = modal.querySelector('#loadPRsBtn');
    const prList = modal.querySelector('#prList');

    if (loadBtn) {
      loadBtn.addEventListener('click', async () => {
        const repo = modal.querySelector('#prRepoInput').value.trim();
        if (!repo) {
          eventBus.emit('toast:show', { message: 'Zadejte repozitář', type: 'warning' });
          return;
        }

        loadBtn.textContent = '⏳ Načítání...';
        loadBtn.disabled = true;

        try {
          const prs = await this.fetchPullRequests(repo);
          prList.style.display = 'block';

          if (prs.length === 0) {
            prList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Žádné otevřené Pull Requests.</p>';
          } else {
            prList.innerHTML = prs.map(pr => `
              <div style="padding: 12px; background: #242424; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="color: ${pr.draft ? '#8b949e' : '#238636'}; font-size: 18px;">${pr.draft ? '📝' : '🔀'}</span>
                  <div>
                    <a href="${pr.html_url}" target="_blank" style="color: #58a6ff; text-decoration: none; font-weight: 600;">#${pr.number} ${pr.title}</a>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #888;">
                      ${pr.user.login} • ${pr.head.ref} → ${pr.base.ref}
                      ${pr.draft ? '<span style="background: #30363d; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Draft</span>' : ''}
                    </p>
                  </div>
                </div>
              </div>
            `).join('');
          }
        } catch (error) {
          prList.innerHTML = `<p style="color: #ff6b6b; text-align: center;">❌ ${error.message}</p>`;
          prList.style.display = 'block';
        }

        loadBtn.textContent = '🔀 Načíst Pull Requests';
        loadBtn.disabled = false;
      });
    }
  }

  /**
   * Fetch pull requests from GitHub
   */
  async fetchPullRequests(repo) {
    const token = this.getStoredToken();
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open`, { headers });
    if (!response.ok) throw new Error('Nepodařilo se načíst PRs: ' + response.statusText);
    return await response.json();
  }

  /**
   * Show Create Gist modal
   */
  showCreateGistModal() {
    const token = this.getStoredToken();
    const code = state.get('editor.code') || '';
    const activeFile = state.get('files.active');
    const tabs = state.get('files.tabs') || [];
    const currentTab = tabs.find(t => t.id === activeFile);
    const fileName = currentTab?.name || 'index.html';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 550px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">📝 Vytvořit Gist</h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 25px;">
          ${!token ? `
            <div style="text-align: center; padding: 20px;">
              <p style="color: #8b949e; margin-bottom: 16px;">Pro vytvoření Gist potřebujete GitHub token.</p>
              <button id="setupTokenBtn" style="padding: 12px 24px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔑 Nastavit Token
              </button>
            </div>
          ` : `
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">📋 Co je Gist:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
                <li>Rychlé sdílení kódu nebo úryvků</li>
                <li>Veřejný = viditelný pro všechny, Privátní = pouze s odkazem</li>
                <li>Podpora verzování a komentářů</li>
              </ul>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">Název souboru:</label>
              <input type="text" id="gistFileName" value="${fileName}" style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">Popis:</label>
              <input type="text" id="gistDescription" placeholder="Volitelný popis..." style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: flex; align-items: center; gap: 10px; color: #c9d1d9; cursor: pointer; padding: 10px; background: #161b22; border-radius: 6px;">
                <input type="checkbox" id="gistPublic" style="width: 18px; height: 18px; accent-color: #238636;">
                <div>
                  <span style="font-weight: 600;">Veřejný Gist</span>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #8b949e;">Bude viditelný ve vyhledávání</p>
                </div>
              </label>
            </div>
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; margin-bottom: 20px; max-height: 120px; overflow-y: auto;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #8b949e;">Náhled kódu (${code.length} znaků):</p>
              <pre style="margin: 0; font-size: 12px; color: #c9d1d9; white-space: pre-wrap; word-break: break-all;">${code.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${code.length > 300 ? '...' : ''}</pre>
            </div>
            <button id="createGistBtn" style="width: 100%; padding: 14px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ✅ Vytvořit Gist
            </button>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const setupTokenBtn = modal.querySelector('#setupTokenBtn');
    if (setupTokenBtn) {
      setupTokenBtn.addEventListener('click', () => {
        modal.remove();
        this.initiateGitHubOAuth();
      });
    }

    const createBtn = modal.querySelector('#createGistBtn');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        const gistFileName = modal.querySelector('#gistFileName').value.trim() || 'code.txt';
        const description = modal.querySelector('#gistDescription').value.trim();
        const isPublic = modal.querySelector('#gistPublic').checked;

        createBtn.textContent = '⏳ Vytvářím...';
        createBtn.disabled = true;

        try {
          const gist = await this.createGistAPI(gistFileName, code, description, isPublic);
          eventBus.emit('toast:show', { message: '✅ Gist vytvořen!', type: 'success' });

          // Otevřít v novém okně
          window.open(gist.html_url, '_blank');
          modal.remove();
        } catch (error) {
          eventBus.emit('toast:show', { message: '❌ ' + error.message, type: 'error' });
          createBtn.textContent = '📝 Vytvořit Gist';
          createBtn.disabled = false;
        }
      });
    }
  }

  /**
   * Create Gist via API
   */
  async createGistAPI(fileName, content, description, isPublic) {
    const token = this.getStoredToken();
    if (!token) throw new Error('Potřebujete GitHub token');

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: description || 'Created with HTML Studio',
        public: isPublic,
        files: {
          [fileName]: { content }
        }
      })
    });

    if (!response.ok) throw new Error('Nepodařilo se vytvořit Gist: ' + response.statusText);
    return await response.json();
  }

  /**
   * Show Deploy to GitHub Pages modal
   */
  showDeployModal() {
    const token = this.getStoredToken();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 550px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">🚀 Deploy na GitHub Pages</h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 25px;">
          ${!token ? `
            <div style="text-align: center; padding: 20px;">
              <p style="color: #8b949e; margin-bottom: 16px;">Pro deploy potřebujete GitHub token s právy na repozitáře.</p>
              <button id="setupTokenBtn" style="padding: 12px 24px; background: #0066cc; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔑 Nastavit Token
              </button>
            </div>
          ` : `
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">📋 Jak funguje deploy:</h4>
              <ol style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.6;">
                <li>Vytvoří se nový repozitář (nebo použije existující)</li>
                <li>Váš kód se pushne do větve <code style="background: #0d1117; padding: 2px 6px; border-radius: 4px;">gh-pages</code></li>
                <li>GitHub Pages automaticky zpřístupní web</li>
              </ol>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #ccc;">Název repozitáře:</label>
              <input type="text" id="deployRepoName" placeholder="muj-projekt" style="width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px; background: #0d0d0d; color: #fff;">
              <p style="font-size: 11px; color: #888; margin-top: 6px;">
                Výsledná URL: <code style="color: #58a6ff;">https://USERNAME.github.io/NÁZEV/</code>
              </p>
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: flex; align-items: center; gap: 8px; color: #ccc; cursor: pointer;">
                <input type="checkbox" id="deployPrivate" style="width: 18px; height: 18px;">
                <span>Privátní repozitář <span style="color: #888; font-size: 12px;">(vyžaduje GitHub Pro)</span></span>
              </label>
            </div>
            <button id="deployBtn" style="width: 100%; padding: 14px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px;">
              🚀 Nasadit na GitHub Pages
            </button>
            <div id="deployStatus" style="margin-top: 16px; display: none;"></div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const setupTokenBtn = modal.querySelector('#setupTokenBtn');
    if (setupTokenBtn) {
      setupTokenBtn.addEventListener('click', () => {
        modal.remove();
        this.initiateGitHubOAuth();
      });
    }

    const deployBtn = modal.querySelector('#deployBtn');
    if (deployBtn) {
      deployBtn.addEventListener('click', async () => {
        const repoName = modal.querySelector('#deployRepoName').value.trim();
        const isPrivate = modal.querySelector('#deployPrivate').checked;
        const statusDiv = modal.querySelector('#deployStatus');

        if (!repoName) {
          eventBus.emit('toast:show', { message: 'Zadejte název repozitáře', type: 'warning' });
          return;
        }

        deployBtn.textContent = '⏳ Nasazuji...';
        deployBtn.disabled = true;
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<p style="color: #58a6ff;">🔄 Vytvářím repozitář...</p>';

        try {
          // Get all open files
          const tabs = state.get('files.tabs') || [];
          const files = tabs.map(tab => ({
            name: tab.name,
            content: tab.content || ''
          }));

          // If no files, use current editor content
          if (files.length === 0) {
            const code = state.get('editor.code') || '';
            files.push({ name: 'index.html', content: code });
          }

          const result = await this.deployToGitHubPages(repoName, files, isPrivate);

          statusDiv.innerHTML = `
            <div style="background: #0d1117; border: 1px solid #238636; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="color: #3fb950; font-weight: 600; margin: 0 0 12px;">✅ Úspěšně nasazeno!</p>
              <p style="margin: 0 0 8px; color: #8b949e; font-size: 13px;">Váš web bude za chvíli dostupný na:</p>
              <a href="${result.url}" target="_blank" style="color: #58a6ff; font-weight: 600; word-break: break-all;">${result.url}</a>
            </div>
          `;

          eventBus.emit('toast:show', { message: '🚀 Nasazeno na GitHub Pages!', type: 'success' });
        } catch (error) {
          statusDiv.innerHTML = `<p style="color: #ff6b6b;">❌ ${error.message}</p>`;
          eventBus.emit('toast:show', { message: '❌ ' + error.message, type: 'error' });
          deployBtn.textContent = '🚀 Nasadit na GitHub Pages';
          deployBtn.disabled = false;
        }
      });
    }
  }

  /**
   * Deploy files to GitHub Pages
   */
  async deployToGitHubPages(repoName, files, isPrivate = false) {
    const token = this.getStoredToken();
    if (!token) throw new Error('Potřebujete GitHub token');

    // 1. Get current user
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!userResponse.ok) throw new Error('Nepodařilo se získat uživatele');
    const user = await userResponse.json();

    // 2. Try to create repo (or use existing)
    try {
      await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          private: isPrivate,
          auto_init: true
        })
      });
    } catch (e) {
      // Repo might already exist, continue
    }

    // Wait a bit for repo to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Create/update files in gh-pages branch
    for (const file of files) {
      const content = btoa(unescape(encodeURIComponent(file.content)));

      // Check if file exists
      let sha = null;
      try {
        const existingFile = await fetch(`https://api.github.com/repos/${user.login}/${repoName}/contents/${file.name}?ref=gh-pages`, {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (existingFile.ok) {
          const data = await existingFile.json();
          sha = data.sha;
        }
      } catch (e) {}

      // Create/update file
      await fetch(`https://api.github.com/repos/${user.login}/${repoName}/contents/${file.name}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update ${file.name}`,
          content: content,
          branch: 'gh-pages',
          ...(sha && { sha })
        })
      });
    }

    // 4. Enable GitHub Pages
    try {
      await fetch(`https://api.github.com/repos/${user.login}/${repoName}/pages`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: { branch: 'gh-pages', path: '/' }
        })
      });
    } catch (e) {
      // Pages might already be enabled
    }

    return {
      url: `https://${user.login}.github.io/${repoName}/`,
      repo: `https://github.com/${user.login}/${repoName}`
    };
  }

  /**
   * Show GitHub search dialog for repositories and code
   */
  showGitHubSearchDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 850px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">🔍 Hledat na GitHub</h3>
          <button class="modal-close" id="githubSearchClose" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 0; overflow-y: auto;">
          <div style="background: #161b22; border-bottom: 1px solid #30363d; padding: 16px 25px;">
            <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">🔍 Co můžete hledat:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
              <li><strong>Repozitáře</strong> - celé projekty dle klíčových slov</li>
              <li><strong>Kód</strong> - konkrétní úryvky kódu ve veřejných repo</li>
            </ul>
          </div>

          <!-- Rozbalovací formulář -->
          <div id="searchFormSection" style="border-bottom: 1px solid #30363d;">
            <button id="toggleSearchForm" style="width: 100%; padding: 15px 25px; background: transparent; border: none; color: #c9d1d9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 14px; transition: background 0.2s;">
              <span>⚙️ Nastavení vyhledávání</span>
              <span id="toggleIcon" style="font-size: 18px; transition: transform 0.3s;">▼</span>
            </button>

            <div id="searchFormContent" style="padding: 0 25px 25px 25px;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #c9d1d9;">GitHub Token (volitelné pro více výsledků)</label>
                <input type="password" id="githubToken" placeholder="ghp_..." value="${localStorage.getItem('github_token') || ''}" style="width: 100%; padding: 10px; border: 1px solid #30363d; border-radius: 6px; font-size: 13px; background: #0d1117; color: #c9d1d9;">
                <p style="font-size: 11px; color: #8b949e; margin-top: 4px;">
                  Token se uloží do prohlížeče. <a href="https://github.com/settings/tokens" target="_blank" style="color: #58a6ff;">Vytvořit token</a>
                </p>
              </div>
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #c9d1d9;">Co hledáte?</label>
                <input type="text" id="githubSearchQuery" placeholder="Např. landing page, portfolio, navbar..." style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; font-size: 14px; background: #0d1117; color: #c9d1d9;">
              </div>
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #c9d1d9;">Jazyk (volitelné)</label>
                <select id="githubLanguage" style="width: 100%; padding: 10px; border: 1px solid #30363d; border-radius: 6px; font-size: 13px; background: #0d1117; color: #c9d1d9;">
                  <option value="">Všechny jazyky</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="php">PHP</option>
                  <option value="ruby">Ruby</option>
                </select>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <button id="searchRepos" style="padding: 14px; background: #238636; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; transition: all 0.2s;">
                  📦 Hledat repozitáře
                </button>
                <button id="searchCode" style="padding: 14px; background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; transition: all 0.2s;">
                  📄 Hledat kód
                </button>
              </div>
            </div>
          </div>

          <!-- Výsledky a loading -->
          <div style="padding: 25px;">
            <div id="githubSearchResults" style="display: none;">
              <div id="githubResultsHeader" style="margin-bottom: 12px;"></div>
              <div id="githubResultsList" style="display: grid; gap: 10px; max-height: 450px; overflow-y: auto;"></div>
              <div id="githubPagination" style="margin-top: 16px;"></div>
            </div>
            <div id="githubSearchLoading" style="display: none; text-align: center; padding: 40px;">
              <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #30363d; border-top-color: #238636; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <p style="margin-top: 15px; color: #8b949e;">Hledání na GitHub...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let currentPage = 1;
    let totalCount = 0;
    let formCollapsed = false;

    const closeModal = () => modal.remove();
    modal.querySelector('#githubSearchClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Toggle formuláře
    const toggleBtn = modal.querySelector('#toggleSearchForm');
    const toggleIcon = modal.querySelector('#toggleIcon');
    const formContent = modal.querySelector('#searchFormContent');

    toggleBtn.addEventListener('click', () => {
      formCollapsed = !formCollapsed;
      if (formCollapsed) {
        formContent.style.display = 'none';
        toggleIcon.textContent = '▶';
        toggleIcon.style.transform = 'rotate(0deg)';
      } else {
        formContent.style.display = 'block';
        toggleIcon.textContent = '▼';
        toggleIcon.style.transform = 'rotate(0deg)';
      }
    });

    let lastSearchType = 'repositories'; // Výchozí hledání repozitářů

    const performSearch = async (searchType, page = 1) => {
      currentPage = page;
      const query = modal.querySelector('#githubSearchQuery').value.trim();
      const language = modal.querySelector('#githubLanguage').value;
      const token = modal.querySelector('#githubToken').value.trim();

      lastSearchType = searchType; // Ulož pro použití ve výsledcích

      if (!query) {
        eventBus.emit('toast:show', {
          message: 'Zadejte hledaný výraz',
          type: 'warning'
        });
        return;
      }

      // Po zahájení hledání sbal formulář
      if (!formCollapsed && page === 1) {
        formCollapsed = true;
        formContent.style.display = 'none';
        toggleIcon.textContent = '▶';
      }

      // Ulož token
      if (token) {
        localStorage.setItem('github_token', token);
      }

      const loadingDiv = modal.querySelector('#githubSearchLoading');
      const resultsDiv = modal.querySelector('#githubSearchResults');
      const resultsList = modal.querySelector('#githubResultsList');
      const resultsHeader = modal.querySelector('#githubResultsHeader');
      const paginationDiv = modal.querySelector('#githubPagination');

      loadingDiv.style.display = 'block';
      resultsDiv.style.display = 'none';
      resultsList.innerHTML = '';
      resultsHeader.innerHTML = '';
      paginationDiv.innerHTML = '';

      try {
        let results;

        if (searchType === 'repositories') {
          results = await this.searchGitHubRepos(query, language, page, token);
        } else {
          results = await this.searchGitHubCode(query, language, page, token);
        }

        loadingDiv.style.display = 'none';
        resultsDiv.style.display = 'block';

        if (results.items.length === 0) {
          resultsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenalezeny žádné výsledky</p>';
          return;
        }

        totalCount = results.total_count;

        // Header s počtem výsledků
        const githubSearchUrl = `https://github.com/search?q=${encodeURIComponent(query)}${language ? `+language:${language}` : ''}&type=${searchType === 'repositories' ? 'repositories' : 'code'}`;
        resultsHeader.innerHTML = `
          <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; margin-bottom: 6px; color: var(--accent);">
              📊 Nalezeno ${totalCount.toLocaleString('cs-CZ')} výsledků | Stránka ${page}
            </div>
            <a href="${githubSearchUrl}" target="_blank" style="color: var(--accent); text-decoration: none; font-size: 13px;">
              🔗 Otevřít na GitHubu
            </a>
          </div>
        `;

        results.items.forEach(result => {
          const resultCard = document.createElement('div');
          resultCard.style.cssText = 'padding: 15px; background: #242424; border: 1px solid #333; border-radius: 8px; transition: all 0.2s;';

          if (lastSearchType === 'repositories') {
            resultCard.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                    <h5 style="margin: 0; color: #0066cc; font-size: 14px;">${result.name}</h5>
                    <a href="${result.html_url}" target="_blank" style="color: #888888; text-decoration: none; font-size: 11px;">🔗</a>
                  </div>
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #cccccc;">${result.description || 'Bez popisu'}</p>
                  <div style="display: flex; gap: 15px; font-size: 11px; color: #888888;">
                    <span>⭐ ${result.stargazers_count}</span>
                    <span>🍴 ${result.forks_count}</span>
                  </div>
                </div>
                <button class="load-github-repo" data-fullname="${result.full_name}" data-name="${result.name}" style="padding: 8px 16px; background: #0066cc; color: #ffffff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">
                  📥 Načíst
                </button>
              </div>
            `;
          } else {
            resultCard.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                    <h5 style="margin: 0; color: #0066cc; font-size: 14px;">${result.name}</h5>
                    <a href="${result.html_url}" target="_blank" style="color: #888888; text-decoration: none; font-size: 11px;">🔗</a>
                  </div>
                  <p style="margin: 0 0 6px 0; font-size: 11px; color: #cccccc;">📦 ${result.repository.full_name}</p>
                  <p style="margin: 0; font-size: 11px; color: #888888;">📄 ${result.path}</p>
                </div>
                <button class="load-github-file" data-url="${result.html_url}" data-name="${result.name}" style="padding: 8px 16px; background: #0066cc; color: #ffffff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">
                  📥 Načíst
                </button>
              </div>
            `;
          }

          // Event listeners pro načtení
          const loadBtn = resultCard.querySelector('.load-github-repo, .load-github-file');
          loadBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = '⏳ Načítání...';

            try {
              closeModal();
              this.panel.showLoadingOverlay('📥 Načítám z GitHub...');

              if (lastSearchType === 'repositories') {
                const fullName = btn.dataset.fullname;
                await this.loadGitHubRepo(fullName, btn.dataset.name);
              } else {
                await this.loadGitHubCode(result.html_url, result.name, true);
              }

              this.panel.hideLoadingOverlay();
              eventBus.emit('toast:show', {
                message: '✅ Kód načten z GitHub',
                type: 'success'
              });
            } catch (error) {
              this.panel.hideLoadingOverlay();
              eventBus.emit('toast:show', {
                message: '❌ ' + error.message,
                type: 'error'
              });
              btn.disabled = false;
              btn.textContent = '📥 Načíst';
            }
          });

          resultsList.appendChild(resultCard);
        });

        // Pagination
        const maxPages = Math.min(Math.ceil(totalCount / 10), 100);
        if (maxPages > 1) {
          const paginationHTML = this.createPaginationHTML(page, maxPages);
          paginationDiv.innerHTML = paginationHTML;

          // Bind pagination clicks
          paginationDiv.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
              const newPage = parseInt(btn.dataset.page);
              performSearch(lastSearchType, newPage);
            });
          });
        }

      } catch (error) {
        loadingDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        resultsList.innerHTML = `<p style="text-align: center; color: #ff6b6b; padding: 20px;">❌ ${error.message}</p>`;
      }
    };

    // Tlačítko pro hledání repozitářů
    modal.querySelector('#searchRepos').addEventListener('click', () => performSearch('repositories', 1));

    // Tlačítko pro hledání kódu
    modal.querySelector('#searchCode').addEventListener('click', () => performSearch('code', 1));

    // Enter pro hledání repozitářů (výchozí)
    modal.querySelector('#githubSearchQuery').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch('repositories', 1);
    });
  }

  /**
   * Create pagination HTML
   */
  createPaginationHTML(page, maxPages) {
    let html = '<div style="display: flex; justify-content: center; align-items: center; gap: 6px; flex-wrap: wrap;">';

    // Previous
    html += `<button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} style="padding: 8px 12px; background: ${page === 1 ? '#333' : '#0066cc'}; color: #ffffff; border: none; border-radius: 6px; cursor: ${page === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;">←</button>`;

    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(maxPages, page + 2);

    if (page <= 3) endPage = Math.min(5, maxPages);
    else if (page >= maxPages - 2) startPage = Math.max(1, maxPages - 4);

    // First + ellipsis
    if (startPage > 1) {
      html += `<button data-page="1" style="padding: 8px 12px; background: #242424; color: #ffffff; border: 1px solid #333; border-radius: 6px; cursor: pointer; font-weight: 600;">1</button>`;
      if (startPage > 2) html += '<span style="padding: 8px 4px; color: #888888;">...</span>';
    }

    // Pages
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === page;
      html += `<button data-page="${i}" style="padding: 8px 12px; background: ${isActive ? '#0066cc' : '#242424'}; color: #ffffff; border: 1px solid ${isActive ? '#0066cc' : '#333'}; border-radius: 6px; cursor: pointer; font-weight: 600;">${i}</button>`;
    }

    // Ellipsis + last
    if (endPage < maxPages) {
      if (endPage < maxPages - 1) html += '<span style="padding: 8px 4px; color: #888888;">...</span>';
      html += `<button data-page="${maxPages}" style="padding: 8px 12px; background: #242424; color: #ffffff; border: 1px solid #333; border-radius: 6px; cursor: pointer; font-weight: 600;">${maxPages}</button>`;
    }

    // Next
    html += `<button data-page="${page + 1}" ${page >= maxPages ? 'disabled' : ''} style="padding: 8px 12px; background: ${page >= maxPages ? '#333' : '#0066cc'}; color: #ffffff; border: none; border-radius: 6px; cursor: ${page >= maxPages ? 'not-allowed' : 'pointer'}; font-weight: 600;">→</button>`;

    html += '</div>';
    return html;
  }

  /**
   * Search GitHub code
   */
  async searchGitHubCode(query, language, page = 1, token = null) {
    const searchQuery = language ? `${query}+language:${language}` : query;
    const headers = { 'Accept': 'application/vnd.github+json' };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-GitHub-Api-Version'] = '2022-11-28';
    }

    const response = await fetch(
      `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10&page=${page}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('GitHub API chyba: ' + response.statusText);
    }

    return await response.json();
  }

  /**
   * Search GitHub repositories
   */
  async searchGitHubRepos(query, language, page = 1, token = null) {
    const searchQuery = language ? `${query}+language:${language}` : query;
    const headers = { 'Accept': 'application/vnd.github+json' };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-GitHub-Api-Version'] = '2022-11-28';
    }

    const response = await fetch(
      `https://api.github.com/search/repositories?q=${searchQuery}&sort=stars&per_page=10&page=${page}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('GitHub API chyba: ' + response.statusText);
    }

    return await response.json();
  }

  /**
   * Load GitHub repository
   */
  async loadGitHubRepo(fullName, repoName) {
    try {
      this.panel.showLoadingOverlay('📥 Načítám repozitář...');

      const token = localStorage.getItem('github_token');
      const headers = { 'Accept': 'application/vnd.github+json' };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-GitHub-Api-Version'] = '2022-11-28';
      }

      // Get repository contents (try main branch first)
      let branch = 'main';
      let response = await fetch(`https://api.github.com/repos/${fullName}/contents?ref=main`, { headers });

      if (!response.ok) {
        // Try master branch
        branch = 'master';
        response = await fetch(`https://api.github.com/repos/${fullName}/contents?ref=master`, { headers });
      }

      if (!response.ok) {
        this.panel.hideLoadingOverlay();
        throw new Error('Nepodařilo se načíst obsah repozitáře');
      }

      const rootFiles = await response.json();

      // Load all files from root directory
      const allFiles = [];

      for (const file of rootFiles) {
        if (file.type === 'file' && !file.name.startsWith('.')) {
          if (this.isTextFile(file.name)) {
            try {
              const contentResponse = await fetch(file.download_url);
              if (contentResponse.ok) {
                const content = await contentResponse.text();
                allFiles.push({
                  name: file.name,
                  content: content,
                  path: file.path
                });
              }
            } catch (err) {
              console.warn(`⚠️ Nepodařilo se načíst soubor ${file.name}:`, err);
            }
          }
        }
      }

      this.panel.hideLoadingOverlay();

      if (allFiles.length === 0) {
        throw new Error('V repozitáři nejsou žádné načitatelné soubory');
      }

      console.log(`📦 Načteno ${allFiles.length} souborů z ${repoName}`);

      // Check if there are existing files
      const existingTabs = state.get('files.tabs') || [];
      const hasExistingFiles = existingTabs.length > 0;

      if (hasExistingFiles) {
        this.showRepoLoadOptions(repoName, allFiles);
      } else {
        // Empty project - load directly
        eventBus.emit('github:project:loaded', {
          name: repoName,
          files: allFiles
        });

        eventBus.emit('toast:show', {
          message: `✅ Načten repozitář ${repoName} (${allFiles.length} souborů)`,
          type: 'success',
          duration: 3000
        });
      }

    } catch (error) {
      this.panel.hideLoadingOverlay();
      throw new Error('Nepodařilo se načíst repozitář: ' + error.message);
    }
  }

  /**
   * Show repo load options modal
   */
  showRepoLoadOptions(repoName, allFiles) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; background: #1a1a1a; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #333;">
          <h3 style="margin: 0; color: #ffffff; font-size: 18px;">📥 Načíst repozitář ${repoName}</h3>
        </div>
        <div class="modal-body" style="padding: 25px;">
          <p style="margin-bottom: 20px; color: #cccccc; line-height: 1.6;">
            Načteno <strong>${allFiles.length} souborů</strong>. Už máte otevřené soubory. Co chcete udělat?
          </p>
          <div style="display: grid; gap: 12px;">
            <button id="replaceAllFiles" style="padding: 14px; background: #0066cc; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
              🔄 Nahradit všechny soubory
            </button>
            <button id="addToExisting" style="padding: 14px; background: #242424; color: #ffffff; border: 2px solid #333; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
              ➕ Přidat k existujícím
            </button>
            <button id="cancelRepoLoad" style="padding: 14px; background: transparent; color: #888888; border: 1px solid #333; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
              ❌ Zrušit
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    modal.querySelector('#replaceAllFiles').addEventListener('click', async () => {
      const success = await SafeOps.safeBatch(async () => {
        eventBus.emit('github:project:loaded', {
          name: repoName,
          files: allFiles
        });
      }, 'Replace all GitHub files');

      if (success) {
        eventBus.emit('toast:show', {
          message: `✅ Nahrazeno ${allFiles.length} souborů z ${repoName}`,
          type: 'success',
          duration: 3000
        });
      } else {
        eventBus.emit('toast:show', {
          message: `❌ Chyba při nahrávání souborů`,
          type: 'error',
          duration: 3000
        });
      }
      closeModal();
    });

    modal.querySelector('#addToExisting').addEventListener('click', async () => {
      const success = await SafeOps.safeTransaction(async () => {
        const existingTabs = state.get('files.tabs') || [];
        let nextId = state.get('files.nextId') || 1;

        const newTabs = [];
        allFiles.forEach(file => {
          newTabs.push({
            id: nextId++,
            name: file.name,
            content: file.content,
            modified: false,
            type: this.getFileType(file.name),
            path: file.path
          });
        });

        const allTabs = [...existingTabs, ...newTabs];
        state.set('files.tabs', allTabs);
        state.set('files.nextId', nextId);

        if (newTabs.length > 0) {
          state.set('files.active', newTabs[0].id);
          eventBus.emit('editor:setCode', {
            code: newTabs[0].content,
            skipStateUpdate: false,
            force: true
          });
        }
      }, 'Add GitHub files to existing');

      if (success) {
        eventBus.emit('sidebar:show');
        eventBus.emit('files:changed');

        eventBus.emit('toast:show', {
          message: `✅ Přidáno ${allFiles.length} souborů z ${repoName}`,
          type: 'success',
          duration: 3000
        });
      } else {
        eventBus.emit('toast:show', {
          message: `❌ Chyba při přidávání souborů`,
          type: 'error',
          duration: 3000
        });
      }
      closeModal();
    });

    modal.querySelector('#cancelRepoLoad').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  /**
   * Load GitHub code file
   */
  async loadGitHubCode(url, name, isSingleFile) {
    if (isSingleFile) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
      if (!match) {
        throw new Error('Neplatná URL GitHub souboru');
      }

      const [, owner, repo, branch, path] = match;
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error('Nepodařilo se načíst soubor z GitHub');
      }

      const code = await response.text();
      await this.handleGitHubCodeLoad(code, name);
    }
  }

  /**
   * Handle GitHub code load with options
   */
  async handleGitHubCodeLoad(code, fileName) {
    const currentCode = state.get('editor.code') || '';
    const hasCode = currentCode.trim().length > 0;

    if (hasCode) {
      const modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; background: #1a1a1a; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
          <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #333;">
            <h3 style="margin: 0; color: #ffffff; font-size: 18px;">📥 Načíst kód z GitHub</h3>
          </div>
          <div class="modal-body" style="padding: 25px;">
            <p style="margin-bottom: 20px; color: #cccccc; line-height: 1.6;">
              V editoru už máte kód. Co chcete udělat?
            </p>
            <div style="display: grid; gap: 12px;">
              <button id="replaceCode" style="padding: 14px; background: #0066cc; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                🔄 Nahradit aktuální kód
              </button>
              <button id="createNewFile" style="padding: 14px; background: #242424; color: #ffffff; border: 2px solid #333; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                ➕ Vytvořit nový soubor
              </button>
              <button id="cancelLoad" style="padding: 14px; background: transparent; color: #888888; border: 1px solid #333; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                ❌ Zrušit
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      return new Promise((resolve) => {
        const closeModal = () => {
          modal.remove();
          resolve();
        };

        modal.querySelector('#replaceCode').addEventListener('click', () => {
          const activeFileId = state.get('files.active');
          if (activeFileId) {
            const tabs = state.get('files.tabs') || [];
            const updatedTabs = tabs.map(f =>
              f.id === activeFileId ? { ...f, content: code, modified: false } : f
            );
            state.set('files.tabs', [...updatedTabs]);
          }

          eventBus.emit('editor:replaceAll', { code, force: true });

          eventBus.emit('toast:show', {
            message: `✅ Kód byl nahrazen z ${fileName}`,
            type: 'success',
            duration: 2000
          });
          closeModal();
        });

        modal.querySelector('#createNewFile').addEventListener('click', () => {
          eventBus.emit('file:create', { name: fileName, content: code });
          eventBus.emit('toast:show', {
            message: `✅ Vytvořen nový soubor: ${fileName}`,
            type: 'success'
          });
          closeModal();
        });

        modal.querySelector('#cancelLoad').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal();
        });
      });
    } else {
      const activeFileId = state.get('files.active');
      if (activeFileId) {
        const tabs = state.get('files.tabs') || [];
        const updatedTabs = tabs.map(f =>
          f.id === activeFileId ? { ...f, content: code, modified: false } : f
        );
        state.set('files.tabs', [...updatedTabs]);
      }

      eventBus.emit('editor:replaceAll', { code, force: true });

      eventBus.emit('toast:show', {
        message: `✅ Načten kód z ${fileName}`,
        type: 'success',
        duration: 2000
      });
    }
  }

  /**
   * Clone repository - show modal
   */
  cloneRepo() {
    const token = this.getStoredToken();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 550px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">📥 Klonovat repozitář</h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 25px;">
          <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">📋 Co dělá klonování:</h4>
            <ol style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
              <li>Načte obsah repozitáře z GitHubu</li>
              <li>Zobrazí strukturu souborů</li>
              <li>Umožní importovat soubory do editoru</li>
            </ol>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">URL nebo owner/repo:</label>
            <input type="text" id="cloneRepoUrl" placeholder="např. https://github.com/user/repo nebo user/repo"
              style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
            <p style="font-size: 11px; color: #8b949e; margin-top: 6px;">
              Příklady: <code style="color: #58a6ff;">facebook/react</code> nebo <code style="color: #58a6ff;">https://github.com/vuejs/vue</code>
            </p>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">Větev (volitelné):</label>
            <input type="text" id="cloneBranch" placeholder="main"
              style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
          </div>
          <button id="cloneRepoBtn" style="width: 100%; padding: 14px; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            📥 Klonovat repozitář
          </button>
          <div id="cloneStatus" style="margin-top: 16px; display: none;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const cloneBtn = modal.querySelector('#cloneRepoBtn');
    const statusDiv = modal.querySelector('#cloneStatus');

    cloneBtn.addEventListener('click', async () => {
      let repoUrl = modal.querySelector('#cloneRepoUrl').value.trim();
      const branch = modal.querySelector('#cloneBranch').value.trim() || 'main';

      if (!repoUrl) {
        eventBus.emit('toast:show', { message: 'Zadejte URL repozitáře', type: 'warning' });
        return;
      }

      // Parse repo URL
      let owner, repo;
      if (repoUrl.includes('github.com')) {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
          owner = match[1];
          repo = match[2].replace('.git', '');
        }
      } else if (repoUrl.includes('/')) {
        [owner, repo] = repoUrl.split('/');
      }

      if (!owner || !repo) {
        eventBus.emit('toast:show', { message: 'Neplatný formát repozitáře', type: 'error' });
        return;
      }

      cloneBtn.innerHTML = '⏳ Klonuji...';
      cloneBtn.disabled = true;
      statusDiv.style.display = 'block';
      statusDiv.innerHTML = '<p style="color: #58a6ff;">🔄 Načítám strukturu repozitáře...</p>';

      try {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Get repo tree
        const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
        if (!treeResponse.ok) throw new Error('Nepodařilo se načíst repozitář');

        const treeData = await treeResponse.json();
        const files = treeData.tree.filter(item => item.type === 'blob' &&
          (item.path.endsWith('.html') || item.path.endsWith('.css') || item.path.endsWith('.js') || item.path.endsWith('.json')));

        if (files.length === 0) {
          statusDiv.innerHTML = '<p style="color: #f0883e;">⚠️ Žádné HTML/CSS/JS soubory nenalezeny</p>';
          cloneBtn.innerHTML = '📥 Klonovat repozitář';
          cloneBtn.disabled = false;
          return;
        }

        statusDiv.innerHTML = `
          <div style="background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 16px;">
            <p style="color: #3fb950; font-weight: 600; margin: 0 0 12px;">✅ Nalezeno ${files.length} souborů</p>
            <div style="max-height: 200px; overflow-y: auto;">
              ${files.slice(0, 20).map(f => `
                <label style="display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; color: #c9d1d9; font-size: 13px;">
                  <input type="checkbox" class="clone-file-checkbox" data-path="${f.path}" data-sha="${f.sha}" checked>
                  ${f.path}
                </label>
              `).join('')}
              ${files.length > 20 ? '<p style="color: #8b949e; font-size: 12px; margin: 8px 0 0;">...a dalších ${files.length - 20} souborů</p>' : ''}
            </div>
            <button id="importFilesBtn" style="width: 100%; margin-top: 12px; padding: 12px; background: #238636; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              📂 Importovat vybrané soubory
            </button>
          </div>
        `;

        modal.querySelector('#importFilesBtn')?.addEventListener('click', async () => {
          const selectedFiles = Array.from(modal.querySelectorAll('.clone-file-checkbox:checked'));
          if (selectedFiles.length === 0) {
            eventBus.emit('toast:show', { message: 'Vyberte soubory k importu', type: 'warning' });
            return;
          }

          for (const checkbox of selectedFiles) {
            const path = checkbox.dataset.path;
            const sha = checkbox.dataset.sha;
            try {
              const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`, { headers });
              const blobData = await blobResponse.json();
              const content = atob(blobData.content);

              eventBus.emit('file:create', { name: path, content });
            } catch (e) {
              console.error('Failed to load file:', path, e);
            }
          }

          eventBus.emit('toast:show', { message: `✅ Importováno ${selectedFiles.length} souborů`, type: 'success' });
          modal.remove();
        });

      } catch (error) {
        statusDiv.innerHTML = `<p style="color: #f85149;">❌ ${error.message}</p>`;
        cloneBtn.innerHTML = '📥 Klonovat repozitář';
        cloneBtn.disabled = false;
      }
    });
  }

  /**
   * Create Gist
   */
  createGist() {
    const code = state.get('editor.content') || '';
    const description = prompt('Popis Gistu:');

    if (description !== null) {
      eventBus.emit('github:createGist', {
        code,
        description,
        filename: 'index.html'
      });
      eventBus.emit('toast:show', {
        message: 'Gist byl vytvořen',
        type: 'success'
      });
    }
  }

  /**
   * Get stored GitHub token
   */
  getStoredToken() {
    return localStorage.getItem('github_token') || '';
  }

  /**
   * Save GitHub token
   */
  async saveGitHubToken(modal) {
    const tokenInput = modal.element.querySelector('#githubToken');
    if (!tokenInput) return;

    const token = tokenInput.value.trim();

    if (!token) {
      eventBus.emit('toast:show', {
        message: 'Zadejte GitHub token',
        type: 'error'
      });
      return;
    }

    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      eventBus.emit('toast:show', {
        message: 'Neplatný formát tokenu. Token by měl začínat ghp_ nebo github_pat_',
        type: 'warning'
      });
    }

    localStorage.setItem('github_token', token);
    await this.checkGitHubConnection(modal);

    eventBus.emit('toast:show', {
      message: 'GitHub token byl uložen',
      type: 'success'
    });
  }

  /**
   * Check GitHub connection status and fetch username
   */
  async checkGitHubConnection(modal) {
    const token = this.getStoredToken();
    const statusElement = modal?.element?.querySelector('#githubConnected');

    if (statusElement) {
      if (token) {
        // Zkus načíst username z API
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('github_username', userData.login);
            statusElement.innerHTML = `
              <span style="display: inline-flex; align-items: center; gap: 6px; color: #10b981;">
                ✅ Připojeno jako
                <img src="${userData.avatar_url}" style="width: 16px; height: 16px; border-radius: 50%;" />
                <strong>@${userData.login}</strong>
              </span>
            `;
          } else {
            statusElement.textContent = '❌ Neplatný token';
            statusElement.style.color = '#ef4444';
          }
        } catch (error) {
          // Fallback - zobraz jen "Připojeno"
          const savedUsername = localStorage.getItem('github_username');
          if (savedUsername) {
            statusElement.innerHTML = `<span style="color: #10b981;">✅ Připojeno jako <strong>@${savedUsername}</strong></span>`;
          } else {
            statusElement.textContent = '✅ Připojeno';
            statusElement.style.color = '#10b981';
          }
        }
      } else {
        statusElement.textContent = '❌ Nepřipojeno';
        statusElement.style.color = '#ef4444';
      }
    }
  }

  /**
   * GitHub Device Flow OAuth
   * Používá Device Authorization Grant - funguje bez backendu
   * Uživatel dostane kód, jde na github.com/login/device a zadá ho
   */

  // GitHub OAuth App Client ID (veřejné, bezpečné sdílet)
  // Pro vlastní app: https://github.com/settings/applications/new
  GITHUB_CLIENT_ID = 'Ov23liUGAmK0plc9FgLL'; // Výchozí demo client ID

  /**
   * Initiate GitHub Device Flow OAuth
   */
  async initiateGitHubOAuth() {
    // Zobraz modal s možností volby
    const choice = await this.showAuthMethodModal();

    if (choice === 'device-flow') {
      await this.startDeviceFlow();
    } else if (choice === 'token') {
      await this.authenticateWithToken();
    }
  }

  /**
   * Zobrazí modal pro výběr metody autentizace
   */
  showAuthMethodModal() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay github-login-modal';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px;">
          <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #333;">
            <h2 style="display: flex; align-items: center; gap: 12px; margin: 0; font-size: 20px;">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px;">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Přihlásit se na GitHub
            </h2>
            <button class="modal-close" aria-label="Zavřít" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); padding: 4px; line-height: 1;">×</button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            <p style="margin: 0 0 20px; color: #8b949e; font-size: 14px; line-height: 1.6;">
              Vyberte způsob přihlášení k vašemu GitHub účtu:
            </p>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <!-- Device Flow - doporučeno -->
              <button id="deviceFlowBtn" style="
                display: flex; align-items: flex-start; gap: 16px; padding: 16px 20px;
                background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
                border: none; border-radius: 12px; cursor: pointer; text-align: left;
                transition: transform 0.2s, box-shadow 0.2s;
              ">
                <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 10px; flex-shrink: 0;">
                  <svg viewBox="0 0 24 24" fill="white" style="width: 24px; height: 24px;">
                    <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 2c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 3a1 1 0 00-1 1v5a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L13 11.586V7a1 1 0 00-1-1z"/>
                  </svg>
                </div>
                <div>
                  <div style="color: white; font-weight: 700; font-size: 16px; margin-bottom: 4px;">
                    🔐 Device Flow OAuth
                    <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">Doporučeno</span>
                  </div>
                  <div style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.4;">
                    Otevře GitHub v prohlížeči kde zadáte kód.<br>
                    Bezpečné, žádné kopírování tokenů.
                  </div>
                </div>
              </button>

              <!-- Token metoda -->
              <button id="tokenBtn" style="
                display: flex; align-items: flex-start; gap: 16px; padding: 16px 20px;
                background: #21262d; border: 1px solid #30363d; border-radius: 12px;
                cursor: pointer; text-align: left; transition: border-color 0.2s;
              ">
                <div style="background: #30363d; padding: 10px; border-radius: 10px; flex-shrink: 0;">
                  <svg viewBox="0 0 24 24" fill="#8b949e" style="width: 24px; height: 24px;">
                    <path d="M15 7h1a2 2 0 012 2v9a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2h1m4-4h-4a1 1 0 00-1 1v2a1 1 0 001 1h4a1 1 0 001-1V4a1 1 0 00-1-1z"/>
                  </svg>
                </div>
                <div>
                  <div style="color: #c9d1d9; font-weight: 600; font-size: 15px; margin-bottom: 4px;">
                    🔑 Personal Access Token
                  </div>
                  <div style="color: #8b949e; font-size: 13px; line-height: 1.4;">
                    Zadejte token ručně.<br>
                    Vyžaduje vytvoření tokenu na GitHubu.
                  </div>
                </div>
              </button>
            </div>

            <button id="cancelBtn" style="
              width: 100%; margin-top: 16px; padding: 12px;
              background: transparent; border: 1px solid #30363d; border-radius: 8px;
              color: #8b949e; cursor: pointer; font-size: 14px;
            ">Zrušit</button>
          </div>
        </div>
      `;

      const closeModal = (result = null) => {
        modal.remove();
        resolve(result);
      };

      modal.querySelector('#deviceFlowBtn').addEventListener('click', () => closeModal('device-flow'));
      modal.querySelector('#tokenBtn').addEventListener('click', () => closeModal('token'));
      modal.querySelector('#cancelBtn').addEventListener('click', () => closeModal(null));
      modal.querySelector('.modal-close').addEventListener('click', () => closeModal(null));
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(null); });

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    });
  }

  /**
   * Start GitHub Device Flow
   */
  async startDeviceFlow() {
    const loadingModal = this.showDeviceFlowModal('loading');

    try {
      // Krok 1: Požádej o device code
      // Poznámka: GitHub CORS blokuje přímé volání, použijeme proxy nebo popup
      const deviceCodeResponse = await this.requestDeviceCode();

      // Krok 2: Zobraz kód uživateli
      loadingModal.remove();
      const authModal = this.showDeviceFlowModal('code', deviceCodeResponse);

      // Krok 3: Otevři GitHub v novém okně
      window.open(deviceCodeResponse.verification_uri, '_blank', 'width=600,height=700');

      // Krok 4: Polluj pro token
      const token = await this.pollForToken(deviceCodeResponse, authModal);

      if (token) {
        // Ověř token a získej username
        const userData = await this.verifyToken(token);

        localStorage.setItem('github_token', token);
        localStorage.setItem('github_username', userData.login);

        authModal.remove();

        eventBus.emit('toast:show', {
          message: `✅ Přihlášen jako @${userData.login}`,
          type: 'success',
          duration: 3000
        });

        if (this.panel.modal) {
          this.checkGitHubConnection(this.panel.modal);
          const tokenInput = this.panel.modal.element?.querySelector('#githubToken');
          if (tokenInput) tokenInput.value = token;
        }
      }
    } catch (error) {
      loadingModal?.remove?.();
      console.error('Device Flow error:', error);

      // Fallback na token metodu
      eventBus.emit('toast:show', {
        message: '⚠️ Device Flow není dostupný, použijte token',
        type: 'warning',
        duration: 3000
      });

      await this.authenticateWithToken();
    }
  }

  /**
   * Request device code from GitHub
   */
  async requestDeviceCode() {
    // GitHub vyžaduje specifické hlavičky
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.GITHUB_CLIENT_ID,
        scope: 'repo gist delete_repo read:user'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get device code');
    }

    return response.json();
  }

  /**
   * Poll GitHub for access token
   */
  async pollForToken(deviceCode, modal) {
    const interval = deviceCode.interval || 5;
    const expiresIn = deviceCode.expires_in || 900;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        // Zkontroluj jestli nevypršel čas
        if (Date.now() - startTime > expiresIn * 1000) {
          reject(new Error('Authorization expired'));
          return;
        }

        // Zkontroluj jestli modal ještě existuje
        if (!document.body.contains(modal)) {
          resolve(null);
          return;
        }

        try {
          const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: this.GITHUB_CLIENT_ID,
              device_code: deviceCode.device_code,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
          });

          const data = await response.json();

          if (data.access_token) {
            resolve(data.access_token);
            return;
          }

          if (data.error === 'authorization_pending') {
            // Uživatel ještě neautorizoval, čekej
            setTimeout(poll, interval * 1000);
          } else if (data.error === 'slow_down') {
            // Zpomal polling
            setTimeout(poll, (interval + 5) * 1000);
          } else if (data.error === 'expired_token') {
            reject(new Error('Authorization expired'));
          } else if (data.error === 'access_denied') {
            reject(new Error('User denied access'));
          } else {
            setTimeout(poll, interval * 1000);
          }
        } catch (error) {
          // CORS error - fallback
          reject(error);
        }
      };

      setTimeout(poll, interval * 1000);
    });
  }

  /**
   * Verify token and get user info
   */
  async verifyToken(token) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    return response.json();
  }

  /**
   * Show Device Flow modal
   */
  showDeviceFlowModal(state, data = {}) {
    const existingModal = document.querySelector('.github-device-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay github-device-modal';

    if (state === 'loading') {
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
          <h3 style="margin: 0 0 10px; color: #c9d1d9;">Připravuji přihlášení...</h3>
          <p style="color: #8b949e; margin: 0;">Čekejte prosím</p>
        </div>
      `;
    } else if (state === 'code') {
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px;">
          <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #333;">
            <h2 style="display: flex; align-items: center; gap: 10px; margin: 0;">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 28px; height: 28px;">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Zadejte kód na GitHubu
            </h2>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary);">×</button>
          </div>
          <div class="modal-body" style="padding: 30px; text-align: center;">
            <p style="color: #8b949e; margin: 0 0 20px; font-size: 15px;">
              Otevřelo se okno GitHubu. Zadejte tento kód:
            </p>

            <div style="
              background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
              border: 2px solid #238636;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 24px;
            ">
              <div style="
                font-family: 'SF Mono', Monaco, 'Courier New', monospace;
                font-size: 36px;
                font-weight: 700;
                letter-spacing: 8px;
                color: #58a6ff;
                text-shadow: 0 0 20px rgba(88, 166, 255, 0.3);
              ">${data.user_code || 'XXXX-XXXX'}</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <a href="${data.verification_uri || 'https://github.com/login/device'}"
                 target="_blank"
                 style="
                   display: flex; align-items: center; justify-content: center; gap: 8px;
                   padding: 14px 24px; background: #238636; color: white;
                   border-radius: 8px; font-weight: 600; text-decoration: none;
                   font-size: 15px;
                 ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
                Otevřít github.com/login/device
              </a>

              <button onclick="navigator.clipboard.writeText('${data.user_code || ''}'); this.textContent='✓ Zkopírováno!'" style="
                padding: 12px; background: #21262d; border: 1px solid #30363d;
                border-radius: 8px; color: #8b949e; cursor: pointer; font-size: 14px;
              ">📋 Kopírovat kód</button>
            </div>

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #30363d;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #8b949e; font-size: 13px;">
                <div class="loading-spinner" style="
                  width: 16px; height: 16px; border: 2px solid #30363d;
                  border-top-color: #58a6ff; border-radius: 50%;
                  animation: spin 1s linear infinite;
                "></div>
                Čekám na autorizaci...
              </div>
            </div>
          </div>
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      `;
    }

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    return modal;
  }

  /**
   * Authenticate with Personal Access Token
   */
  async authenticateWithToken() {
    const result = await this.showTokenInputModal();
    if (!result || !result.token) return;

    eventBus.emit('toast:show', {
      message: '🔄 Ověřuji token...',
      type: 'info'
    });

    try {
      const userData = await this.verifyToken(result.token);

      localStorage.setItem('github_token', result.token);
      localStorage.setItem('github_username', userData.login);

      eventBus.emit('toast:show', {
        message: `✅ Přihlášen jako @${userData.login}`,
        type: 'success',
        duration: 3000
      });

      if (this.panel.modal) {
        this.checkGitHubConnection(this.panel.modal);
        const tokenInput = this.panel.modal.element?.querySelector('#githubToken');
        if (tokenInput) tokenInput.value = result.token;
      }
    } catch (error) {
      eventBus.emit('toast:show', {
        message: `❌ Neplatný token: ${error.message}`,
        type: 'error',
        duration: 4000
      });
    }
  }

  /**
   * Show token input modal
   */
  showTokenInputModal() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay github-login-modal';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
          <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #333;">
            <h2 style="display: flex; align-items: center; gap: 10px; margin: 0;">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 28px; height: 28px;">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Personal Access Token
            </h2>
            <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary);">×</button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            <div style="background: #161b22; padding: 16px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #30363d;">
              <p style="margin: 0 0 12px; color: #8b949e; font-size: 14px;">
                🔐 Vytvořte Personal Access Token s oprávněními:
              </p>
              <code style="display: block; background: #0d1117; padding: 8px 12px; border-radius: 6px; color: #58a6ff; font-size: 12px;">
                repo, gist, delete_repo, read:user
              </code>
              <a href="https://github.com/settings/tokens/new?scopes=repo,gist,delete_repo,read:user&description=HTML%20Studio"
                 target="_blank"
                 style="display: inline-flex; align-items: center; gap: 6px; color: #58a6ff; font-size: 13px; margin-top: 12px; text-decoration: none;">
                📝 Vytvořit token →
              </a>
            </div>
            <form id="tokenForm">
              <input type="password" id="tokenInput" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" required
                style="width: 100%; padding: 14px; background: #0d1117; border: 2px solid #30363d; border-radius: 8px; color: #c9d1d9; font-family: monospace; font-size: 14px; margin-bottom: 16px;"
              />
              <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button type="button" id="cancelBtn" style="padding: 12px 20px; background: #21262d; border: 1px solid #30363d; border-radius: 8px; color: #8b949e; cursor: pointer;">Zrušit</button>
                <button type="submit" style="padding: 12px 24px; background: #238636; border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Přihlásit</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const closeModal = (result = null) => {
        modal.remove();
        resolve(result);
      };

      modal.querySelector('.modal-close').addEventListener('click', () => closeModal());
      modal.querySelector('#cancelBtn').addEventListener('click', () => closeModal());
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

      modal.querySelector('#tokenForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const token = modal.querySelector('#tokenInput').value.trim();
        if (token) closeModal({ token });
      });

      document.body.appendChild(modal);
      setTimeout(() => {
        modal.classList.add('show');
        modal.querySelector('#tokenInput').focus();
      }, 10);
    });
  }

  /**
   * Show repository manager - full implementation
   */
  async showRepoManager() {
    const token = this.getStoredToken();

    if (!token) {
      eventBus.emit('toast:show', {
        message: 'Nejprve nastavte GitHub token',
        type: 'error'
      });
      return;
    }

    // Vytvoř modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay github-repo-manager open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">
            📦 GitHub Repository Manager
          </h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 20px; overflow-y: auto; flex: 1;">
          <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">📦 Co je Repository Manager:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
              <li>Správa všech vašich GitHub repozitářů</li>
              <li>Vytvoření nového repozitáře</li>
              <li>Načtení souborů z repozitáře do editoru</li>
            </ul>
          </div>
          <div class="repo-toolbar" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <button id="createRepoBtn" style="padding: 10px 16px; background: #238636; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px;">
              ➕ Nový repozitář
            </button>
            <button id="refreshReposBtn" style="padding: 10px 16px; background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px;">
              🔄 Obnovit
            </button>
            <input type="text" id="repoSearchInput" placeholder="🔍 Hledat repozitář..." style="flex: 1; min-width: 200px; padding: 10px 14px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 14px;" />
          </div>
          <div id="repoList" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: center; padding: 40px; color: #8b949e;">
              <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
              Načítám repozitáře...
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const repoList = modal.querySelector('#repoList');
    const searchInput = modal.querySelector('#repoSearchInput');
    const createBtn = modal.querySelector('#createRepoBtn');
    const refreshBtn = modal.querySelector('#refreshReposBtn');

    // Načti repozitáře
    const loadRepos = async () => {
      repoList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #8b949e;">
          <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
          Načítám repozitáře...
        </div>
      `;

      try {
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!response.ok) throw new Error('Nepodařilo se načíst repozitáře');

        const repos = await response.json();

        if (repos.length === 0) {
          repoList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #8b949e;">
              <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
              <p>Zatím nemáte žádné repozitáře</p>
              <p style="font-size: 13px;">Vytvořte svůj první repozitář kliknutím na "Nový repozitář"</p>
            </div>
          `;
          return;
        }

        this.renderRepoList(repoList, repos, modal);
      } catch (error) {
        repoList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #f85149;">
            <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
            Chyba: ${error.message}
          </div>
        `;
      }
    };

    // Vyhledávání
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const items = repoList.querySelectorAll('.repo-item');
      items.forEach(item => {
        const name = item.dataset.name?.toLowerCase() || '';
        const desc = item.dataset.desc?.toLowerCase() || '';
        item.style.display = (name.includes(query) || desc.includes(query)) ? 'flex' : 'none';
      });
    });

    // Vytvořit repozitář
    createBtn.addEventListener('click', async () => {
      const name = prompt('Název nového repozitáře:');
      if (!name) return;

      const description = prompt('Popis (volitelné):') || '';
      const isPrivate = confirm('Vytvořit jako privátní repozitář?');

      try {
        eventBus.emit('toast:show', { message: '⏳ Vytvářím repozitář...', type: 'info' });

        const response = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            description,
            private: isPrivate,
            auto_init: true
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Nepodařilo se vytvořit repozitář');
        }

        eventBus.emit('toast:show', { message: `✅ Repozitář "${name}" vytvořen!`, type: 'success' });
        loadRepos();
      } catch (error) {
        eventBus.emit('toast:show', { message: `❌ ${error.message}`, type: 'error' });
      }
    });

    // Obnovit
    refreshBtn.addEventListener('click', loadRepos);

    // Načti repozitáře
    loadRepos();
  }

  /**
   * Render repository list
   */
  renderRepoList(container, repos, modal) {
    container.innerHTML = repos.map(repo => `
      <div class="repo-item" data-name="${repo.name}" data-desc="${repo.description || ''}" style="
        display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        background: #161b22; border: 1px solid #30363d; border-radius: 8px;
        cursor: pointer; transition: all 0.2s;
      " onmouseover="this.style.borderColor='#58a6ff'" onmouseout="this.style.borderColor='#30363d'">
        <div style="font-size: 24px;">${repo.private ? '🔒' : '📁'}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: #58a6ff; margin-bottom: 4px;">${repo.name}</div>
          <div style="font-size: 13px; color: #8b949e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${repo.description || 'Bez popisu'}
          </div>
          <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 12px; color: #8b949e;">
            ${repo.language ? `<span>💻 ${repo.language}</span>` : ''}
            <span>⭐ ${repo.stargazers_count}</span>
            <span>🍴 ${repo.forks_count}</span>
            <span>📅 ${new Date(repo.updated_at).toLocaleDateString('cs-CZ')}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="repo-open-btn" data-url="${repo.html_url}" style="padding: 8px 12px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; cursor: pointer; font-size: 12px;">
            🔗 GitHub
          </button>
          <button class="repo-load-btn" data-name="${repo.full_name}" style="padding: 8px 12px; background: #238636; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 12px;">
            📥 Načíst
          </button>
          <button class="repo-delete-btn" data-name="${repo.full_name}" data-repo="${repo.name}" style="padding: 8px 12px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; color: #f85149; cursor: pointer; font-size: 12px;">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // Event handlers pro tlačítka
    container.querySelectorAll('.repo-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(btn.dataset.url, '_blank');
      });
    });

    container.querySelectorAll('.repo-load-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        modal.remove();
        await this.loadGitHubRepo(btn.dataset.name, btn.dataset.name.split('/')[1]);
      });
    });

    container.querySelectorAll('.repo-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.deleteRepository(btn.dataset.name, btn.dataset.repo, modal);
      });
    });
  }

  /**
   * Delete repository
   */
  async deleteRepository(fullName, repoName, modal) {
    const confirmation = prompt(
      `⚠️ POZOR: Tato akce je nevratná!\n\nPro smazání repozitáře "${repoName}" napište jeho název:`
    );

    if (confirmation !== repoName) {
      eventBus.emit('toast:show', { message: 'Smazání zrušeno - název nesouhlasí', type: 'warning' });
      return;
    }

    try {
      eventBus.emit('toast:show', { message: '⏳ Mažu repozitář...', type: 'info' });

      const response = await fetch(`https://api.github.com/repos/${fullName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getStoredToken()}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Nepodařilo se smazat repozitář');
      }

      eventBus.emit('toast:show', { message: `✅ Repozitář "${repoName}" smazán`, type: 'success' });

      // Znovu načti seznam
      modal.querySelector('#refreshReposBtn')?.click();
    } catch (error) {
      eventBus.emit('toast:show', { message: `❌ ${error.message}`, type: 'error' });
    }
  }

  /**
   * Utility: Get file type from name
   */
  getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const types = {
      html: 'html', htm: 'html',
      css: 'css',
      js: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      json: 'json',
      md: 'markdown',
      py: 'python',
      java: 'java',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      c: 'c', cpp: 'cpp', h: 'c'
    };
    return types[ext] || 'text';
  }

  /**
   * Utility: Check if file is text file
   */
  isTextFile(fileName) {
    const textExtensions = [
      '.html', '.htm', '.css', '.js', '.json', '.txt', '.md',
      '.xml', '.svg', '.py', '.java', '.c', '.cpp', '.h',
      '.php', '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx',
      '.vue', '.yml', '.yaml', '.toml', '.ini', '.cfg'
    ];
    return textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  // ============= Repository Manager Methods =============

  /**
   * Create repository manager content HTML
   */
  createRepoManagerContent() {
    const undoHistory = this.getUndoHistory();
    const redoHistory = this.getRedoHistory();

    return `
      <div class="repo-manager">
        <div class="repo-toolbar">
          <button class="repo-btn" id="createRepoBtn">
            <span class="icon">➕</span>
            <span>Vytvořit repozitář</span>
          </button>
          <button class="repo-btn" id="refreshReposBtn">
            <span class="icon">🔄</span>
            <span>Obnovit</span>
          </button>
          <div class="repo-history-btns">
            <button class="repo-btn" id="undoRepoActionBtn" ${undoHistory.length === 0 ? 'disabled' : ''}>
              <span class="icon">↩️</span>
              <span>Zpět (${undoHistory.length}/5)</span>
            </button>
            <button class="repo-btn" id="redoRepoActionBtn" ${redoHistory.length === 0 ? 'disabled' : ''}>
              <span class="icon">↪️</span>
              <span>Vpřed (${redoHistory.length})</span>
            </button>
          </div>
        </div>
        <div class="repo-search">
          <input type="text" id="repoSearchInput" placeholder="🔍 Hledat repozitář..." class="repo-search-input" />
        </div>
        <div class="repo-list" id="repoList">
          <div class="repo-loading">Načítám repozitáře...</div>
        </div>
      </div>
    `;
  }

  /**
   * Attach repository manager event handlers
   */
  attachRepoManagerHandlers(repoModal) {
    const createBtn = repoModal.element.querySelector('#createRepoBtn');
    const refreshBtn = repoModal.element.querySelector('#refreshReposBtn');
    const undoBtn = repoModal.element.querySelector('#undoRepoActionBtn');
    const redoBtn = repoModal.element.querySelector('#redoRepoActionBtn');
    const searchInput = repoModal.element.querySelector('#repoSearchInput');

    if (createBtn) createBtn.addEventListener('click', () => this.createRepository(repoModal));
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadRepositories(repoModal));
    if (undoBtn) undoBtn.addEventListener('click', () => this.undoLastRepoAction(repoModal));
    if (redoBtn) redoBtn.addEventListener('click', () => this.redoRepoAction(repoModal));
    if (searchInput) searchInput.addEventListener('input', (e) => this.filterRepositories(e.target.value, repoModal));
  }

  /**
   * Load repositories list
   */
  async loadRepositories(repoModal) {
    const repoList = repoModal.element.querySelector('#repoList');
    if (!repoList) return;

    repoList.innerHTML = '<div class="repo-loading">Načítám repozitáře...</div>';

    try {
      const username = localStorage.getItem('github_username') || 'user';
      const repos = this.getMockRepositories(username);

      if (repos.length === 0) {
        repoList.innerHTML = '<div class="repo-empty">Žádné repozitáře</div>';
        return;
      }

      repoList.innerHTML = repos.map(repo => this.createRepoItem(repo)).join('');

      // Attach delete handlers
      repoList.querySelectorAll('.repo-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteRepository(btn.dataset.repo, repoModal);
        });
      });

      // Attach repo click handlers
      repoList.querySelectorAll('.repo-item').forEach(item => {
        item.addEventListener('click', () => this.openRepository(item.dataset.repo));
      });
    } catch (error) {
      repoList.innerHTML = '<div class="repo-error">Chyba při načítání repozitářů</div>';
      console.error(error);
    }
  }

  /**
   * Get mock repositories (or from localStorage)
   */
  getMockRepositories(_username) {
    const stored = localStorage.getItem('github_repos');
    if (stored) return JSON.parse(stored);

    const mockRepos = [
      { name: 'my-website', description: 'Personal portfolio', stars: 5, private: false },
      { name: 'html-editor', description: 'Web-based HTML editor', stars: 12, private: false },
      { name: 'secret-project', description: 'Private repository', stars: 0, private: true }
    ];
    localStorage.setItem('github_repos', JSON.stringify(mockRepos));
    return mockRepos;
  }

  /**
   * Create repository item HTML
   */
  createRepoItem(repo) {
    const privateLabel = repo.private ? '<span class="repo-badge private">🔒 Private</span>' : '';
    return `
      <div class="repo-item" data-repo="${repo.name}">
        <div class="repo-icon">📁</div>
        <div class="repo-info">
          <div class="repo-name">${repo.name}</div>
          <div class="repo-description">${repo.description || 'Bez popisu'}</div>
          <div class="repo-meta">${privateLabel}<span class="repo-stars">⭐ ${repo.stars}</span></div>
        </div>
        <button class="repo-delete-btn" data-repo="${repo.name}">🗑️</button>
      </div>
    `;
  }

  /**
   * Create a new repository
   */
  async createRepository(repoModal) {
    const name = prompt('Název repozitáře:');
    if (!name) return;

    const description = prompt('Popis (volitelné):') || '';
    const isPrivate = confirm('Vytvořit jako privátní repozitář?');

    const repos = this.getMockRepositories();
    const newRepo = { name, description, stars: 0, private: isPrivate };

    this.storeUndoAction('create', newRepo);
    repos.unshift(newRepo);
    localStorage.setItem('github_repos', JSON.stringify(repos));

    eventBus.emit('toast:show', { message: `Repozitář "${name}" vytvořen`, type: 'success' });
    await this.loadRepositories(repoModal);
    this.updateHistoryButtons(repoModal);
  }

  /**
   * Delete a repository
   */
  async deleteRepository(repoName, repoModal) {
    const repos = this.getMockRepositories();
    const repoIndex = repos.findIndex(r => r.name === repoName);
    if (repoIndex === -1) return;

    const lastChars = repoName.slice(-2);
    const confirmation = prompt(
      `Pro potvrzení smazání doplňte poslední 2 znaky názvu repozitáře:\n\n` +
      `Repozitář: ${repoName}\nZadejte: **`
    );

    if (confirmation !== lastChars) {
      eventBus.emit('toast:show', { message: 'Smazání zrušeno - špatné potvrzení', type: 'warning' });
      return;
    }

    const deletedRepo = repos[repoIndex];
    this.storeUndoAction('delete', deletedRepo);
    repos.splice(repoIndex, 1);
    localStorage.setItem('github_repos', JSON.stringify(repos));

    eventBus.emit('toast:show', { message: `Repozitář "${repoName}" byl smazán`, type: 'success' });
    await this.loadRepositories(repoModal);
    this.updateHistoryButtons(repoModal);
  }

  /**
   * Get undo history
   */
  getUndoHistory() {
    const history = localStorage.getItem('github_undo_history');
    return history ? JSON.parse(history) : [];
  }

  /**
   * Get redo history
   */
  getRedoHistory() {
    const history = localStorage.getItem('github_redo_history');
    return history ? JSON.parse(history) : [];
  }

  /**
   * Store undo action
   */
  storeUndoAction(action, data) {
    const history = this.getUndoHistory();
    history.push({ action, data, timestamp: Date.now() });
    if (history.length > 5) history.shift();
    localStorage.setItem('github_undo_history', JSON.stringify(history));
    localStorage.removeItem('github_redo_history');
  }

  /**
   * Undo last repository action
   */
  async undoLastRepoAction(repoModal) {
    const undoHistory = this.getUndoHistory();
    if (undoHistory.length === 0) return;

    const lastAction = undoHistory.pop();
    const { action, data } = lastAction;
    const repos = this.getMockRepositories();

    const redoHistory = this.getRedoHistory();
    redoHistory.push(lastAction);
    localStorage.setItem('github_redo_history', JSON.stringify(redoHistory));

    if (action === 'create') {
      const index = repos.findIndex(r => r.name === data.name);
      if (index !== -1) repos.splice(index, 1);
    } else if (action === 'delete') {
      repos.unshift(data);
    }

    localStorage.setItem('github_repos', JSON.stringify(repos));
    localStorage.setItem('github_undo_history', JSON.stringify(undoHistory));

    eventBus.emit('toast:show', { message: `Akce vrácena zpět (${undoHistory.length} zbývá)`, type: 'success' });
    await this.loadRepositories(repoModal);
    this.updateHistoryButtons(repoModal);
  }

  /**
   * Redo repository action
   */
  async redoRepoAction(repoModal) {
    const redoHistory = this.getRedoHistory();
    if (redoHistory.length === 0) return;

    const lastAction = redoHistory.pop();
    const { action, data } = lastAction;
    const repos = this.getMockRepositories();

    const undoHistory = this.getUndoHistory();
    undoHistory.push(lastAction);
    localStorage.setItem('github_undo_history', JSON.stringify(undoHistory));

    if (action === 'create') {
      repos.unshift(data);
    } else if (action === 'delete') {
      const index = repos.findIndex(r => r.name === data.name);
      if (index !== -1) repos.splice(index, 1);
    }

    localStorage.setItem('github_repos', JSON.stringify(repos));
    localStorage.setItem('github_redo_history', JSON.stringify(redoHistory));

    eventBus.emit('toast:show', { message: `Akce obnovena (${redoHistory.length} zbývá vpřed)`, type: 'success' });
    await this.loadRepositories(repoModal);
    this.updateHistoryButtons(repoModal);
  }

  /**
   * Update history buttons state
   */
  updateHistoryButtons(repoModal) {
    const undoHistory = this.getUndoHistory();
    const redoHistory = this.getRedoHistory();

    const undoBtn = repoModal.element.querySelector('#undoRepoActionBtn');
    const redoBtn = repoModal.element.querySelector('#redoRepoActionBtn');

    if (undoBtn) {
      undoBtn.disabled = undoHistory.length === 0;
      undoBtn.querySelector('span:last-child').textContent = `Zpět (${undoHistory.length}/5)`;
    }
    if (redoBtn) {
      redoBtn.disabled = redoHistory.length === 0;
      redoBtn.querySelector('span:last-child').textContent = `Vpřed (${redoHistory.length})`;
    }
  }

  /**
   * Filter repositories by search query
   */
  filterRepositories(query, repoModal) {
    const repoItems = repoModal.element.querySelectorAll('.repo-item');
    const lowerQuery = query.toLowerCase();

    repoItems.forEach(item => {
      const repoName = item.dataset.repo.toLowerCase();
      const description = item.querySelector('.repo-description')?.textContent.toLowerCase() || '';
      item.style.display = (repoName.includes(lowerQuery) || description.includes(lowerQuery)) ? 'flex' : 'none';
    });
  }

  /**
   * Open repository
   */
  openRepository(repoName) {
    eventBus.emit('toast:show', { message: `Otevírám repozitář ${repoName}...`, type: 'info' });
  }
}
