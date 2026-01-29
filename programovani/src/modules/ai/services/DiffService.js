/**
 * DiffService.js
 * Service pro vizuální diff zobrazení změn jako VS Code Copilot
 * Zobrazuje barevné diff: zelená = přidáno, červená = odebráno
 */

export class DiffService {
  constructor() {
    console.log('[DiffService] Initialized - Copilot-style diff');
  }

  /**
   * Generuje vizuální diff mezi dvěma kódy
   * @param {string} oldCode - Původní kód
   * @param {string} newCode - Nový kód
   * @returns {Object} Diff result s HTML a metadaty
   */
  generateDiff(oldCode, newCode) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    // Použijeme LCS (Longest Common Subsequence) algoritmus
    const diff = this.computeLCS(oldLines, newLines);

    return {
      html: this.renderDiffHTML(diff),
      changes: diff,
      stats: this.computeStats(diff),
      hasChanges: diff.some(d => d.type !== 'unchanged')
    };
  }

  /**
   * Compute diff using LCS algorithm
   */
  computeLCS(oldLines, newLines) {
    const result = [];

    // Build LCS matrix
    const m = oldLines.length;
    const n = newLines.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find diff
    let i = m;
    let j = n;
    const changes = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        changes.unshift({
          type: 'unchanged',
          content: oldLines[i - 1],
          oldLineNum: i,
          newLineNum: j
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        changes.unshift({
          type: 'added',
          content: newLines[j - 1],
          oldLineNum: null,
          newLineNum: j
        });
        j--;
      } else if (i > 0) {
        changes.unshift({
          type: 'removed',
          content: oldLines[i - 1],
          oldLineNum: i,
          newLineNum: null
        });
        i--;
      }
    }

    return changes;
  }

  /**
   * Render diff as HTML with Copilot-style colors
   */
  renderDiffHTML(changes) {
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    let html = '<div class="diff-container copilot-style">';

    // Group consecutive changes
    const groups = this.groupChanges(changes);

    for (const group of groups) {
      if (group.type === 'unchanged') {
        // Collapsed unchanged lines (show max 3 lines context)
        if (group.lines.length > 6) {
          // Show first 3
          for (let i = 0; i < 3; i++) {
            html += this.renderDiffLine(group.lines[i]);
          }
          // Collapse middle
          const hidden = group.lines.length - 6;
          html += `
            <div class="diff-collapsed" data-lines="${hidden}">
              <span class="collapse-icon">⋯</span>
              <span>${hidden} nezměněných řádků</span>
            </div>
          `;
          // Show last 3
          for (let i = group.lines.length - 3; i < group.lines.length; i++) {
            html += this.renderDiffLine(group.lines[i]);
          }
        } else {
          for (const line of group.lines) {
            html += this.renderDiffLine(line);
          }
        }
      } else {
        // Changed group - show removed then added
        html += '<div class="diff-change-group">';

        // Removed lines (red)
        for (const line of group.lines.filter(l => l.type === 'removed')) {
          html += this.renderDiffLine(line);
        }

        // Added lines (green)
        for (const line of group.lines.filter(l => l.type === 'added')) {
          html += this.renderDiffLine(line);
        }

        html += '</div>';
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Render single diff line
   */
  renderDiffLine(line) {
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const lineNum = line.type === 'removed' ? line.oldLineNum : line.newLineNum;
    const prefix = line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' ';
    const className = `diff-line diff-${line.type}`;

    return `
      <div class="${className}">
        <span class="diff-line-num">${lineNum || ''}</span>
        <span class="diff-prefix">${prefix}</span>
        <span class="diff-content">${escapeHtml(line.content)}</span>
      </div>
    `;
  }

  /**
   * Group consecutive same-type changes
   */
  groupChanges(changes) {
    const groups = [];
    let currentGroup = null;

    for (const change of changes) {
      const groupType = change.type === 'unchanged' ? 'unchanged' : 'changed';

      if (!currentGroup || currentGroup.type !== groupType) {
        currentGroup = { type: groupType, lines: [] };
        groups.push(currentGroup);
      }

      currentGroup.lines.push(change);
    }

    return groups;
  }

  /**
   * Compute statistics about changes
   */
  computeStats(changes) {
    const added = changes.filter(c => c.type === 'added').length;
    const removed = changes.filter(c => c.type === 'removed').length;
    const unchanged = changes.filter(c => c.type === 'unchanged').length;

    return {
      added,
      removed,
      unchanged,
      total: changes.length,
      summary: `+${added} -${removed}`
    };
  }

  /**
   * Generate inline diff preview for editor overlay
   * @param {Array} searchReplaceEdits - Array of SEARCH/REPLACE edits
   * @param {string} currentCode - Current editor code
   * @returns {Array} Array of change previews
   */
  generateInlinePreviews(searchReplaceEdits, currentCode) {
    const previews = [];

    for (let i = 0; i < searchReplaceEdits.length; i++) {
      const edit = searchReplaceEdits[i];
      const index = currentCode.indexOf(edit.searchCode);

      if (index === -1) continue;

      // Find line number
      const linesBefore = currentCode.substring(0, index).split('\n');
      const startLine = linesBefore.length;
      const endLine = startLine + edit.searchCode.split('\n').length - 1;

      // Generate mini-diff for this change
      const diff = this.generateDiff(edit.searchCode, edit.replaceCode);

      previews.push({
        id: `change-${i}`,
        startLine,
        endLine,
        searchCode: edit.searchCode,
        replaceCode: edit.replaceCode,
        diff,
        applied: false
      });
    }

    return previews;
  }

  /**
   * Create accept/reject UI for a single change (Copilot-style)
   */
  createChangeActionUI(preview, onAccept, onReject) {
    return `
      <div class="diff-change-actions copilot-style" data-change-id="${preview.id}">
        <div class="change-header">
          <span class="change-location">Řádky ${preview.startLine}-${preview.endLine}</span>
          <span class="change-stats">${preview.diff.stats.summary}</span>
        </div>
        <div class="diff-preview">${preview.diff.html}</div>
        <div class="change-buttons">
          <button class="btn-accept" data-action="accept" title="Přijmout změnu (⌘+Enter)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Accept</span>
          </button>
          <button class="btn-reject" data-action="reject" title="Odmítnout změnu (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Discard</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create batch action UI for multiple changes
   */
  createBatchActionUI(previews) {
    const totalAdded = previews.reduce((sum, p) => sum + p.diff.stats.added, 0);
    const totalRemoved = previews.reduce((sum, p) => sum + p.diff.stats.removed, 0);

    return `
      <div class="diff-batch-actions copilot-style">
        <div class="batch-header">
          <span class="batch-count">${previews.length} změn</span>
          <span class="batch-stats">+${totalAdded} -${totalRemoved}</span>
        </div>
        <div class="batch-buttons">
          <button class="btn-accept-all" data-action="accept-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Accept All</span>
          </button>
          <button class="btn-reject-all" data-action="reject-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Discard All</span>
          </button>
        </div>
        <div class="batch-changes-list" id="batchChangesList">
          <!-- Individual changes will be inserted here -->
        </div>
      </div>
    `;
  }
}
