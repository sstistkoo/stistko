/**
 * GitHub Integration Service
 * Handles GitHub search, deploy, and integrations
 */

import { Modal } from '../../../ui/components/Modal.js';
import { eventBus } from '../../../core/events.js';
import { createElement } from '../../../utils/dom.js';

export class GitHubService {
  /**
   * Search GitHub for code snippets
   */
  static async githubSearch() {
    const modal = new Modal({
      title: '🔍 GitHub Search',
      content: `
        <div style="padding: 20px;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #1a1a1a;">
              GitHub Token (volitelné):
            </label>
            <input
              type="password"
              id="githubToken"
              placeholder="ghp_..."
              value="${localStorage.getItem('github_token') || ''}"
              style="width: 100%; padding: 10px; border: 2px solid #ccc; border-radius: 6px; font-size: 13px; background: #ffffff; color: #1a1a1a; box-sizing: border-box;"
            />
            <small style="color: #666; font-size: 12px; display: block; margin-top: 4px;">Token se uloží do prohlížeče. <a href="https://github.com/settings/tokens" target="_blank" style="color: #0066cc;">Vytvořit token</a></small>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #1a1a1a;">
              Vyhledat kód na GitHubu:
            </label>
            <input
              type="text"
              id="githubQuery"
              placeholder="např. 'navbar responsive css'"
              style="width: 100%; padding: 12px; border: 2px solid #ccc; border-radius: 6px; font-size: 14px; background: #ffffff; color: #1a1a1a; box-sizing: border-box;"
            />
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #1a1a1a;">
              Jazyk (volitelné):
            </label>
            <select
              id="githubLanguage"
              style="width: 100%; padding: 12px; border: 2px solid #ccc; border-radius: 6px; font-size: 14px; background: #ffffff; color: #1a1a1a; box-sizing: border-box;"
            >
              <option value="">Všechny jazyky</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>
          <button
            id="githubSearchBtn"
            style="width: 100%; padding: 14px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 15px; margin-bottom: 20px; transition: background 0.2s;"
            onmouseover="this.style.background='#0052a3'"
            onmouseout="this.style.background='#0066cc'"
          >
            🔍 Hledat na GitHubu
          </button>
          <div id="githubResults" style="margin-top: 20px; max-height: 400px; overflow-y: auto; color: #1a1a1a;"></div>
        </div>
      `,
      width: '700px'
    });

    modal.open();

    const tokenInput = document.getElementById('githubToken');
    const queryInput = document.getElementById('githubQuery');
    const languageSelect = document.getElementById('githubLanguage');
    const resultsDiv = document.getElementById('githubResults');

    let currentPage = 1;
    let totalCount = 0;

    const performSearch = async (page = 1) => {
      currentPage = page;
      const query = queryInput?.value?.trim();
      if (!query) {
        eventBus.emit('toast:show', {
          message: 'Zadejte hledaný výraz',
          type: 'warning'
        });
        return;
      }

      // Ulož token do localStorage
      const token = tokenInput?.value?.trim();
      if (token) {
        localStorage.setItem('github_token', token);
      }

      if (!resultsDiv) return;

      // Clear and show loading
      resultsDiv.textContent = '';
      const loading = document.createElement('p');
      loading.textContent = '🔍 Hledám...';
      loading.style.cssText = 'text-align: center; padding: 20px; color: #1a1a1a; font-size: 14px;';
      resultsDiv.appendChild(loading);

      try {
        const language = languageSelect?.value || '';
        const searchQuery = language ? `${query}+language:${language}` : query;

        console.log('🔍 GitHub Search:', { query, language, searchQuery, page, token: !!token });

        // Pokus o API volání s tokenem
        if (token) {
          const headers = {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28'
          };

          const response = await fetch(
            `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10&page=${page}`,
            { headers }
          );

          if (response.ok) {
            const data = await response.json();
            totalCount = data.total_count;
            console.log('✅ GitHub API response:', { totalCount, items: data.items?.length });
            resultsDiv.textContent = '';

            if (data.items && data.items.length > 0) {
              // Info header s počtem výsledků a odkazem na GitHub
              const githubSearchUrl = `https://github.com/search?q=${encodeURIComponent(query)}${language ? `+language:${language}` : ''}&type=code`;

              const infoHeader = document.createElement('div');
              infoHeader.style.cssText = 'padding: 12px; background: #e6f2ff; border-radius: 6px; margin-bottom: 12px;';

              const statsDiv = document.createElement('div');
              statsDiv.textContent = `📊 Nalezeno ${totalCount.toLocaleString('cs-CZ')} výsledků | Stránka ${page}`;
              statsDiv.style.cssText = 'color: #0066cc; font-weight: 600; font-size: 14px; text-align: center; margin-bottom: 8px;';

              const linkDiv = document.createElement('div');
              linkDiv.style.cssText = 'text-align: center;';

              const githubLink = document.createElement('a');
              githubLink.href = githubSearchUrl;
              githubLink.target = '_blank';
              githubLink.rel = 'noopener noreferrer';
              githubLink.textContent = '🔗 Otevřít na GitHubu';
              githubLink.style.cssText = 'color: #0066cc; text-decoration: none; font-size: 13px; font-weight: 500;';

              linkDiv.appendChild(githubLink);
              infoHeader.appendChild(statsDiv);
              infoHeader.appendChild(linkDiv);
              resultsDiv.appendChild(infoHeader);

              data.items.forEach(item => {
                const repoName = item.repository.full_name;
                const fileName = item.name;
                const fileUrl = item.html_url;

                const card = document.createElement('div');
                card.style.cssText = 'padding: 14px; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px; background: #f8f9fa;';

                const fileNameEl = document.createElement('div');
                fileNameEl.textContent = fileName;
                fileNameEl.style.cssText = 'font-weight: 600; margin-bottom: 6px; color: #0066cc; font-size: 15px;';

                const repoNameEl = document.createElement('div');
                repoNameEl.textContent = `📦 ${repoName}`;
                repoNameEl.style.cssText = 'font-size: 13px; color: #666; margin-bottom: 8px;';

                const link = document.createElement('a');
                link.href = fileUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = '🔗 Zobrazit na GitHubu →';
                link.style.cssText = 'color: #0066cc; text-decoration: none; font-size: 13px; font-weight: 500;';

                card.appendChild(fileNameEl);
                card.appendChild(repoNameEl);
                card.appendChild(link);
                resultsDiv.appendChild(card);
              });

              // Pagination
              const maxPages = Math.min(Math.ceil(totalCount / 10), 100); // GitHub limit 100 pages
              if (maxPages > 1) {
                const paginationDiv = document.createElement('div');
                paginationDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 16px; padding: 12px; flex-wrap: wrap;';

                // Previous button
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '←';
                prevBtn.disabled = page === 1;
                prevBtn.style.cssText = `padding: 8px 12px; background: ${page === 1 ? '#e0e0e0' : '#0066cc'}; color: ${page === 1 ? '#999' : 'white'}; border: none; border-radius: 6px; cursor: ${page === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600; font-size: 14px;`;
                prevBtn.onclick = () => {
                  if (page > 1) performSearch(page - 1);
                };
                paginationDiv.appendChild(prevBtn);

                // Calculate page range to show
                let startPage = Math.max(1, page - 2);
                let endPage = Math.min(maxPages, page + 2);

                // Adjust if near start or end
                if (page <= 3) {
                  endPage = Math.min(5, maxPages);
                } else if (page >= maxPages - 2) {
                  startPage = Math.max(1, maxPages - 4);
                }

                // First page + ellipsis
                if (startPage > 1) {
                  const firstBtn = document.createElement('button');
                  firstBtn.textContent = '1';
                  firstBtn.style.cssText = 'padding: 8px 12px; background: white; color: #0066cc; border: 2px solid #0066cc; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;';
                  firstBtn.onclick = () => performSearch(1);
                  paginationDiv.appendChild(firstBtn);

                  if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.cssText = 'padding: 8px 4px; color: #666; font-weight: 600;';
                    paginationDiv.appendChild(ellipsis);
                  }
                }

                // Page numbers
                for (let i = startPage; i <= endPage; i++) {
                  const pageBtn = document.createElement('button');
                  pageBtn.textContent = i;
                  const isActive = i === page;
                  pageBtn.style.cssText = `padding: 8px 12px; background: ${isActive ? '#0066cc' : 'white'}; color: ${isActive ? 'white' : '#0066cc'}; border: 2px solid #0066cc; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;`;
                  pageBtn.onclick = () => {
                    if (!isActive) performSearch(i);
                  };
                  paginationDiv.appendChild(pageBtn);
                }

                // Ellipsis + last page
                if (endPage < maxPages) {
                  if (endPage < maxPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.cssText = 'padding: 8px 4px; color: #666; font-weight: 600;';
                    paginationDiv.appendChild(ellipsis);
                  }

                  const lastBtn = document.createElement('button');
                  lastBtn.textContent = maxPages;
                  lastBtn.style.cssText = 'padding: 8px 12px; background: white; color: #0066cc; border: 2px solid #0066cc; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;';
                  lastBtn.onclick = () => performSearch(maxPages);
                  paginationDiv.appendChild(lastBtn);
                }

                // Next button
                const nextBtn = document.createElement('button');
                nextBtn.textContent = '→';
                nextBtn.disabled = page >= maxPages;
                nextBtn.style.cssText = `padding: 8px 12px; background: ${page >= maxPages ? '#e0e0e0' : '#0066cc'}; color: ${page >= maxPages ? '#999' : 'white'}; border: none; border-radius: 6px; cursor: ${page >= maxPages ? 'not-allowed' : 'pointer'}; font-weight: 600; font-size: 14px;`;
                nextBtn.onclick = () => {
                  if (page < maxPages) performSearch(page + 1);
                };
                paginationDiv.appendChild(nextBtn);

                resultsDiv.appendChild(paginationDiv);
              }

              return;
            } else {
              // No results from API - show info
              const noResults = document.createElement('div');
              noResults.style.cssText = 'padding: 16px; background: #fff8e1; border: 2px solid #ffc107; border-radius: 8px; text-align: center;';

              const noResultsTitle = document.createElement('div');
              noResultsTitle.textContent = '🔍 Žádné výsledky pro tento dotaz';
              noResultsTitle.style.cssText = 'font-weight: 600; margin-bottom: 8px; color: #333; font-size: 15px;';

              const noResultsText = document.createElement('div');
              noResultsText.textContent = `Hledaný výraz: "${query}"${language ? ` (jazyk: ${language})` : ''}`;
              noResultsText.style.cssText = 'color: #666; font-size: 14px; margin-bottom: 12px;';

              const searchWebBtn = document.createElement('a');
              const githubSearchUrl = `https://github.com/search?q=${encodeURIComponent(query)}${language ? `+language:${language}` : ''}&type=code`;
              searchWebBtn.href = githubSearchUrl;
              searchWebBtn.target = '_blank';
              searchWebBtn.rel = 'noopener noreferrer';
              searchWebBtn.textContent = '🚀 Zkusit hledat na GitHubu';
              searchWebBtn.style.cssText = 'display: inline-block; padding: 10px 16px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;';

              noResults.appendChild(noResultsTitle);
              noResults.appendChild(noResultsText);
              noResults.appendChild(searchWebBtn);
              resultsDiv.appendChild(noResults);
              return;
            }
          } else {
            console.warn('❌ GitHub API error:', response.status, response.statusText);
          }
        }

        // Fallback: Web search bez tokenu
        const githubSearchUrl = `https://github.com/search?q=${encodeURIComponent(query)}${language ? `+language:${language}` : ''}&type=code`;
        resultsDiv.textContent = '';

        const infoCard = document.createElement('div');
        infoCard.style.cssText = 'padding: 16px; border: 2px solid #0066cc; border-radius: 8px; background: #e6f2ff; margin-bottom: 16px;';

        const infoTitle = document.createElement('div');
        infoTitle.textContent = '🔍 Vyhledávání na GitHubu';
        infoTitle.style.cssText = 'font-weight: 600; margin-bottom: 8px; color: #0066cc; font-size: 15px;';

        const infoText = document.createElement('div');
        infoText.textContent = `Hledaný výraz: "${query}"${language ? ` (jazyk: ${language})` : ''}`;
        infoText.style.cssText = 'margin-bottom: 12px; color: #333; font-size: 14px;';

        const githubLink = document.createElement('a');
        githubLink.href = githubSearchUrl;
        githubLink.target = '_blank';
        githubLink.rel = 'noopener noreferrer';
        githubLink.textContent = '🚀 Otevřít vyhledávání na GitHubu →';
        githubLink.style.cssText = 'display: inline-block; padding: 10px 16px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;';

        infoCard.appendChild(infoTitle);
        infoCard.appendChild(infoText);
        infoCard.appendChild(githubLink);
        resultsDiv.appendChild(infoCard);

        if (!token) {
          const tipCard = document.createElement('div');
          tipCard.style.cssText = 'padding: 12px; border: 1px solid #ffc107; border-radius: 6px; background: #fff8e1; margin-top: 12px;';

          const tipText = document.createElement('div');
          tipText.innerHTML = '💡 <strong>Tip:</strong> Pro vyhledávání přímo v aplikaci zadejte GitHub Token výše. Token získáte na <a href="https://github.com/settings/tokens" target="_blank" style="color: #0066cc;">github.com/settings/tokens</a> (potřebná oprávnění: žádná nebo "public_repo").';
          tipText.style.cssText = 'color: #666; font-size: 13px; line-height: 1.6;';

          tipCard.appendChild(tipText);
          resultsDiv.appendChild(tipCard);
        }

      } catch (error) {
        console.error('GitHub search error:', error);
        resultsDiv.textContent = '';
        const errorMsg = document.createElement('p');
        errorMsg.textContent = '❌ Chyba při vyhledávání';
        errorMsg.style.cssText = 'text-align: center; padding: 20px; color: #dc3545; font-size: 14px;';
        resultsDiv.appendChild(errorMsg);
      }
    };

    // Enter key search
    queryInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Bind button click
    const searchBtn = document.getElementById('githubSearchBtn');
    searchBtn?.addEventListener('click', performSearch);
  }

  /**
   * Deploy to GitHub Pages
   */
  static async deployToGitHub() {
    eventBus.emit('toast:show', {
      message: 'GitHub Pages deploy bude implementován',
      type: 'info'
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
