/**
 * String Utilities for AI Panel
 * Helper functions for string manipulation, escaping, and formatting
 */

export class StringUtils {
  /**
   * Escape HTML special characters
   */
  static escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Unescape HTML entities
   */
  static unescapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent;
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Add line numbers to code
   */
  static addLineNumbers(code, metadata = null) {
    if (!code) return '';
    const lines = code.split('\n');

    if (!metadata || !metadata.isTruncated) {
      // Normal numbering
      return lines.map((line, i) =>
        `${String(i + 1).padStart(4, ' ')}| ${line}`
      ).join('\n');
    }

    // Truncated code - preserve original line numbers
    const result = [];
    let currentLine = 1;

    if (metadata.beforeStart) {
      const beforeLines = metadata.beforeStart.split('\n');
      beforeLines.forEach((line, i) => {
        result.push(`${String(currentLine++).padStart(4, ' ')}| ${line}`);
      });
    }

    if (metadata.startEllipsis) {
      result.push('  ...| ... (zkráceno - celkem ' + metadata.totalLines + ' řádků)');
    }

    const mainLines = code.split('\n');
    const startLineNum = metadata.startLine || 1;
    mainLines.forEach((line, i) => {
      result.push(`${String(startLineNum + i).padStart(4, ' ')}| ${line}`);
    });

    if (metadata.endEllipsis) {
      result.push('  ...| ... (zbytek zkrácen)');
    }

    if (metadata.afterEnd) {
      const afterLines = metadata.afterEnd.split('\n');
      const endLineNum = metadata.endLine || (startLineNum + mainLines.length);
      afterLines.forEach((line, i) => {
        result.push(`${String(endLineNum + i).padStart(4, ' ')}| ${line}`);
      });
    }

    return result.join('\n');
  }

  /**
   * Truncate code intelligently while preserving context
   */
  static truncateCodeIntelligently(code, maxLength = 3000) {
    if (!code || code.length <= maxLength) return code;

    const lines = code.split('\n');
    const totalLines = lines.length;

    // Keep first and last portions
    const keepLines = Math.floor(maxLength / 100); // ~30 lines for 3000 char limit
    const firstPortion = lines.slice(0, keepLines).join('\n');
    const lastPortion = lines.slice(-keepLines).join('\n');

    const truncated = firstPortion +
      '\n\n... (zkráceno ' + (totalLines - keepLines * 2) + ' řádků) ...\n\n' +
      lastPortion;

    return {
      code: truncated,
      isTruncated: true,
      totalLines: totalLines,
      beforeStart: firstPortion,
      afterEnd: lastPortion,
      startLine: 1,
      endLine: totalLines,
      startEllipsis: true,
      endEllipsis: true
    };
  }

  /**
   * Count tokens (approximate)
   */
  static countTokens(text) {
    if (!text) return 0;
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
