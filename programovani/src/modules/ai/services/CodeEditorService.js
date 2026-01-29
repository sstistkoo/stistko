/**
 * CodeEditorService.js
 * Service pro editaci kódu - SEARCH/REPLACE, EDIT:LINES, validace, fuzzy matching
 */

import { eventBus } from '../../../core/events.js';
import { state } from '../../../core/state.js';
import { SafeOps } from '../../../core/safeOps.js';

export class CodeEditorService {
  constructor(panel) {
    this.panel = panel;
    console.log('[CodeEditorService] Initialized');
  }

  /**
   * Auto-fix common AI mistakes in SEARCH/REPLACE blocks
   * Opravuje běžné chyby které AI dělá
   */
  autoFixAIResponse(response) {
    let fixed = response;
    let fixCount = 0;

    // Fix 1: AI používá "```search" místo "```SEARCH"
    if (/```\s*search\s*\n/i.test(fixed) && !/```\s*SEARCH\s*\n/.test(fixed)) {
      fixed = fixed.replace(/```\s*search\s*\n/gi, '```SEARCH\n');
      fixed = fixed.replace(/```\s*replace\s*\n/gi, '```REPLACE\n');
      fixCount++;
      console.log('[CodeEditor] Auto-fix: normalized SEARCH/REPLACE case');
    }

    // Fix 2: AI zapomněl uzavřít ``` na konci (zkusíme doplnit)
    const searchCount = (fixed.match(/```\s*SEARCH/gi) || []).length;
    const replaceCount = (fixed.match(/```\s*REPLACE/gi) || []).length;
    const backtickCount = (fixed.match(/```/g) || []).length;

    if (backtickCount % 2 !== 0 && searchCount > 0) {
      // Přidáme chybějící ```
      fixed = fixed + '\n```';
      fixCount++;
      console.log('[CodeEditor] Auto-fix: added missing closing ```');
    }

    // Fix 3: AI použil "// ..." místo skutečného kódu (odstraníme tyto řádky)
    const badPatterns = [
      /^\s*\/\/\s*\.\.\.\s*$/gm,        // "// ..."
      /^\s*\/\/\s*rest\s*of\s*/gmi,     // "// rest of..."
      /^\s*\/\/\s*zbytek\s*/gmi,        // "// zbytek..."
      /^\s*\/\*\s*\.\.\.\s*\*\/\s*$/gm, // "/* ... */"
    ];

    for (const pattern of badPatterns) {
      if (pattern.test(fixed)) {
        fixed = fixed.replace(pattern, '');
        fixCount++;
        console.log('[CodeEditor] Auto-fix: removed placeholder comment');
      }
    }

    // Fix 4: AI přidal čísla řádků do SEARCH bloku (odstraníme je)
    // Detekce: více řádků začíná "číslo|" nebo "číslo:"
    const lineNumberPattern = /^(\s*\d+[\|:]\s*)/gm;
    const matches = fixed.match(lineNumberPattern);
    if (matches && matches.length > 3) {
      fixed = fixed.replace(lineNumberPattern, '');
      fixCount++;
      console.log('[CodeEditor] Auto-fix: removed line numbers from code');
    }

    // Fix 5: AI dal mezi SEARCH a REPLACE text (např. "Nahraď tímto:")
    // Najdi a odstraň text mezi ``` a ```REPLACE
    fixed = fixed.replace(/```(\s*)([^`]+?)(\s*)```\s*REPLACE/gi, (match, ws1, text, ws2) => {
      // Pokud je text jen whitespace nebo krátká poznámka, odstraň
      if (text.trim().length < 50 && !text.includes('\n')) {
        fixCount++;
        console.log('[CodeEditor] Auto-fix: removed text between blocks');
        return '```\n```REPLACE';
      }
      return match;
    });

    if (fixCount > 0) {
      console.log(`[CodeEditor] Auto-fixed ${fixCount} AI mistakes in response`);
    }

    return fixed;
  }

  /**
   * Parse VS Code style SEARCH/REPLACE blocks
   * Podporuje více formátů:
   * - ```SEARCH ... ``` ```REPLACE ... ```
   * - ```search ... ``` ```replace ... ```
   * - <<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE
   */
  parseSearchReplaceInstructions(response) {
    const instructions = [];

    // Pre-process: Auto-fix common AI mistakes
    let cleanedResponse = this.autoFixAIResponse(response);

    // Debug: log raw response structure
    console.log('[CodeEditor] Parsing response for SEARCH/REPLACE blocks...');
    console.log('[CodeEditor] Response contains "SEARCH":', cleanedResponse.includes('SEARCH'));
    console.log('[CodeEditor] Response contains "```SEARCH":', cleanedResponse.includes('```SEARCH'));
    console.log('[CodeEditor] Response contains "``` SEARCH":', cleanedResponse.includes('``` SEARCH'));

    // Multiple patterns for flexibility
    const patterns = [
      // Pattern 1: Standard - ```SEARCH ... ``` ```REPLACE ... ``` (hned za sebou)
      /```\s*SEARCH\s*\n([\s\S]*?)\n```\s*```\s*REPLACE\s*\n([\s\S]*?)\n```/gi,

      // Pattern 2: S mezerou nebo textem mezi bloky
      /```\s*SEARCH\s*\n([\s\S]*?)\n```[\s\S]{0,50}?```\s*REPLACE\s*\n([\s\S]*?)\n```/gi,

      // Pattern 3: Markdown conflict style (<<<<<<< SEARCH)
      /<<<<<<+\s*SEARCH\s*\n([\s\S]*?)\n=======+\s*\n([\s\S]*?)\n>>>>>>>+\s*REPLACE/gi,

      // Pattern 4: Case insensitive
      /```\s*search\s*\n([\s\S]*?)\n```\s*```\s*replace\s*\n([\s\S]*?)\n```/gi,

      // Pattern 5: Bez nového řádku na konci
      /```\s*SEARCH\s*\n([\s\S]*?)```\s*```\s*REPLACE\s*\n([\s\S]*?)```/gi
    ];

    // Try each pattern
    for (const pattern of patterns) {
      let match;
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;

      while ((match = pattern.exec(cleanedResponse)) !== null) {
        const searchCode = match[1].trim();
        const replaceCode = match[2].trim();

        console.log('[CodeEditor] Found SEARCH/REPLACE candidate:');
        console.log('  SEARCH (first 100 chars):', searchCode.substring(0, 100).replace(/\n/g, '↵'));
        console.log('  REPLACE (first 100 chars):', replaceCode.substring(0, 100).replace(/\n/g, '↵'));

        // Validate - kontrola na placeholdery
        const invalidPatterns = [
          '...existing code...',
          '...rest of code...',
          '...zbytek kódu...',
          'ZKRÁCENO',
          'ZKRACENO',
          '// ...',
          '/* ... */',
          '<!-- ... -->',
          'Lines omitted',
          'řádky vynechány'
        ];

        const hasPlaceholder = invalidPatterns.some(p =>
          searchCode.toLowerCase().includes(p.toLowerCase())
        );

        // Krátký obsah je OK pokud není placeholder (např. emoji změna)
        // Odmítnout pouze pokud je prázdný nebo obsahuje pouze whitespace
        const isEmpty = !searchCode.trim();

        if (isEmpty || hasPlaceholder) {
          console.warn('[CodeEditor] ⚠️ Skipping invalid block (empty/placeholder)');
          continue;
        }

        // Zkontroluj jestli už nemáme stejný search blok
        const alreadyExists = instructions.some(i => i.searchCode === searchCode);
        if (alreadyExists) {
          console.log('[CodeEditor] Skipping duplicate SEARCH block');
          continue;
        }

        console.log('[CodeEditor] ✓ Valid SEARCH/REPLACE block accepted');
        instructions.push({
          searchCode,
          replaceCode,
          type: 'search-replace'
        });
      }
    }

    console.log(`[CodeEditor] Parsed ${instructions.length} valid SEARCH/REPLACE instructions`);

    // Diagnostika: detekuj neúplné bloky
    if (instructions.length === 0 && (response.includes('```SEARCH') || response.includes('```search'))) {
      // Spočítej počet SEARCH a REPLACE bloků
      const searchBlocks = (response.match(/```\s*SEARCH/gi) || []).length;
      const replaceBlocks = (response.match(/```\s*REPLACE/gi) || []).length;
      const closingBackticks = (response.match(/```/g) || []).length;

      console.warn('[CodeEditor] 🔍 Diagnostika neúspěšného parsování:');
      console.warn(`  - SEARCH bloků: ${searchBlocks}`);
      console.warn(`  - REPLACE bloků: ${replaceBlocks}`);
      console.warn(`  - Uzavírajících \`\`\`: ${closingBackticks}`);

      // Detekuj neuzavřený blok
      if (closingBackticks % 2 !== 0) {
        console.error('[CodeEditor] ❌ AI vrátila NEÚPLNOU odpověď - chybí uzavírající ```');
        instructions.parseError = 'incomplete_response';
        instructions.parseErrorDetail = 'AI odpověď je neúplná (chybí uzavírající ```)';
      } else if (searchBlocks !== replaceBlocks) {
        console.error(`[CodeEditor] ❌ Nesouhlasí počet bloků: ${searchBlocks} SEARCH vs ${replaceBlocks} REPLACE`);
        instructions.parseError = 'mismatched_blocks';
        instructions.parseErrorDetail = `Nesouhlasí počet bloků: ${searchBlocks} SEARCH vs ${replaceBlocks} REPLACE`;
      } else {
        // Bloky jsou, ale regex je nechytil - pravděpodobně špatný formát
        console.error('[CodeEditor] ❌ Bloky existují ale mají neplatný formát');
        instructions.parseError = 'invalid_format';
        instructions.parseErrorDetail = 'SEARCH/REPLACE bloky mají neplatný formát (zkontroluj strukturu)';
      }
    }

    return instructions;
  }

  /**
   * Parse legacy EDIT:LINES format
   */
  parseEditInstructions(response) {
    const instructions = [];

    // Multiple patterns
    const patterns = [
      // Pattern 1: EDIT:LINES 10-15
      /EDIT:LINES\s+(\d+)-(\d+)\s*\n```(?:javascript|js|html|css|python|java|cpp|c)?\n([\s\S]*?)\n```/gi,
      // Pattern 2: Edit lines 10-15:
      /Edit\s+lines?\s+(\d+)-(\d+):\s*\n```(?:javascript|js|html|css|python|java|cpp|c)?\n([\s\S]*?)\n```/gi,
      // Pattern 3: Replace lines 10-15 with:
      /Replace\s+lines?\s+(\d+)-(\d+)\s+with:\s*\n```(?:javascript|js|html|css|python|java|cpp|c)?\n([\s\S]*?)\n```/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const startLine = parseInt(match[1], 10) - 1; // Convert to 0-based
        const endLine = parseInt(match[2], 10) - 1;
        const newCode = match[3].trim();

        instructions.push({
          startLine,
          endLine,
          newCode,
          type: 'line-edit'
        });
      }
    });

    return instructions;
  }

  /**
   * Apply line-based edits (EDIT:LINES)
   * Uses fuzzy matching and aggressive normalization
   */
  applyLineEdits(edits) {
    const currentCode = SafeOps.safe(
      () => state.get('editor.code') || '',
      'Chyba při získávání kódu z editoru'
    );

    if (!currentCode) {
      return { success: false, message: '❌ Editor je prázdný' };
    }

    // Save original code for potential rollback
    const originalCode = currentCode;

    let successCount = 0;
    let failCount = 0;
    const details = [];

    // Sort edits by line number descending to avoid line number shifts
    const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);

    for (const edit of sortedEdits) {
      // Re-read code after each change
      const code = state.get('editor.code') || '';
      const lines = code.split('\n');

      // Extract old code from specified lines
      const oldCode = lines.slice(edit.startLine, edit.endLine + 1).join('\n');

      // Aggressive normalization (remove ALL whitespace for comparison)
      const oldNormalized = oldCode.replace(/\s+/g, '');
      const newNormalized = edit.newCode.replace(/\s+/g, '');

      // If exactly matches, replace directly
      if (oldNormalized === newNormalized) {
        details.push(`⏭️ Řádky ${edit.startLine + 1}-${edit.endLine + 1}: Již je stejné, přeskočeno`);
        continue;
      }

      // Check if old code exists at specified position
      const actualOldCode = lines.slice(edit.startLine, edit.endLine + 1).join('\n');
      const actualOldNormalized = actualOldCode.replace(/\s+/g, '');

      // If matches closely, replace
      if (actualOldNormalized === oldNormalized) {
        lines.splice(edit.startLine, edit.endLine - edit.startLine + 1, ...edit.newCode.split('\n'));
        const newCode = lines.join('\n');
        eventBus.emit('editor:setCode', { code: newCode });
        successCount++;
        details.push(`✅ Řádky ${edit.startLine + 1}-${edit.endLine + 1}: Změněno`);
        continue;
      }

      // Fuzzy search - try to find similar code nearby
      console.log(`[CodeEditor] Line edit mismatch, trying fuzzy search...`);

      // Search in wider range (±100 lines)
      const searchStart = Math.max(0, edit.startLine - 100);
      const searchEnd = Math.min(lines.length - 1, edit.endLine + 100);
      const searchRange = lines.slice(searchStart, searchEnd + 1);

      let bestMatch = null;
      let bestSimilarity = 0;
      const SIMILARITY_THRESHOLD = 0.70; // Lowered threshold

      // Try to find best match in search range
      for (let i = 0; i < searchRange.length; i++) {
        const rangeSize = edit.endLine - edit.startLine + 1;
        const offsetCode = searchRange.slice(i, i + rangeSize).join('\n');
        const offsetNormalized = offsetCode.replace(/\s+/g, '');

        const similarity = this.calculateSimilarity(offsetNormalized, oldNormalized);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            startLine: searchStart + i,
            endLine: searchStart + i + rangeSize - 1,
            code: offsetCode
          };
        }
      }

      if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLD) {
        // Found good match - apply edit
        const currentLines = (state.get('editor.code') || '').split('\n');
        currentLines.splice(bestMatch.startLine, bestMatch.endLine - bestMatch.startLine + 1, ...edit.newCode.split('\n'));
        const newCode = currentLines.join('\n');
        eventBus.emit('editor:setCode', { code: newCode });
        successCount++;
        details.push(`✅ Řádky ${bestMatch.startLine + 1}-${bestMatch.endLine + 1}: Změněno (fuzzy match, ${Math.round(bestSimilarity * 100)}% shoda)`);
      } else {
        failCount++;
        details.push(`❌ Řádky ${edit.startLine + 1}-${edit.endLine + 1}: Kód nenalezen (nejlepší shoda: ${Math.round(bestSimilarity * 100)}%)`);
      }
    }

    // State is updated automatically by editor:setCode event

    const message = successCount > 0
      ? `✅ Aplikováno ${successCount}/${edits.length} změn\n\n${details.join('\n')}`
      : `❌ Nepodařilo se aplikovat žádnou změnu (${failCount}/${edits.length})\n\n${details.join('\n')}`;

    return {
      success: successCount > 0,
      message
    };
  }

  /**
   * Apply SEARCH/REPLACE edits
   * 3-phase approach: validation, conflict detection, application
   */
  applySearchReplaceEdits(edits) {
    const currentCode = SafeOps.safe(
      () => state.get('editor.code') || '',
      'Chyba při získávání kódu z editoru'
    );

    if (!currentCode) {
      return { success: false, message: '❌ Editor je prázdný' };
    }

    // Save original code for potential rollback
    const originalCode = currentCode;

    // ===== PHASE 1: BATCH VALIDATION =====
    console.log('[CodeEditor] Phase 1: Validating all edits...');
    const validatedEdits = [];
    const validationErrors = [];

    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i];
      let searchCode = edit.searchCode;
      let replaceCode = edit.replaceCode;

      // Remove line numbers if present (e.g. "50| code" -> "code")
      searchCode = this.removeLineNumbers(searchCode);
      replaceCode = this.removeLineNumbers(replaceCode);

      // Try exact match first
      let index = currentCode.indexOf(searchCode);

      if (index !== -1) {
        // Count occurrences
        const occurrences = this.countOccurrences(currentCode, searchCode);

        if (occurrences > 1) {
          console.warn(`[CodeEditor] Edit #${i + 1}: ❌ AMBIGUOUS - Code appears ${occurrences} times`);
          validationErrors.push({
            index: i + 1,
            reason: `Kód se vyskytuje ${occurrences}x - nejednoznačné`,
            suggestion: null
          });
          continue;
        }

        console.log(`[CodeEditor] Edit #${i + 1}: ✅ EXACT match found at index ${index}`);
        validatedEdits.push({
          ...edit,
          searchCode,
          replaceCode,
          index,
          exact: true
        });
        continue;
      }

      // Debug: Show why exact match failed
      console.warn(`[CodeEditor] Edit #${i + 1}: Exact match FAILED`);
      console.warn(`[CodeEditor] Looking for (first 100 chars):`, searchCode.substring(0, 100).replace(/\n/g, '↵').replace(/\t/g, '→'));
      console.warn(`[CodeEditor] In code containing (first 200 chars):`, currentCode.substring(0, 200).replace(/\n/g, '↵').replace(/\t/g, '→'));

      // Try semi-strict search (normalize leading whitespace only)
      console.log(`[CodeEditor] Edit #${i + 1}: 🔍 Trying semi-strict search (tolerant to leading whitespace)...`);
      const semiStrictResult = this.semiStrictSearch(currentCode, searchCode);

      if (semiStrictResult.found) {
        validatedEdits.push({
          ...edit,
          searchCode,
          replaceCode,
          index: semiStrictResult.index,
          matchedLength: semiStrictResult.matchedLength, // Use actual matched length!
          exact: 'semi'
        });
        console.log(`[CodeEditor] Edit #${i + 1}: ✅ Found via SEMI-STRICT search at index ${semiStrictResult.index}`);
        continue;
      }

      // Try fuzzy search as last resort
      console.warn(`[CodeEditor] Edit #${i + 1}: ⚠️ Semi-strict failed, trying full fuzzy...`);
      console.warn(`[CodeEditor] This may lead to incorrect edits! AI should use EXACT code.`);
      const fuzzyResult = this.fuzzySearchCode(currentCode, searchCode);

      if (fuzzyResult.found) {
        validatedEdits.push({
          ...edit,
          searchCode,
          replaceCode,
          index: fuzzyResult.index,
          matchedLength: fuzzyResult.matchedLength, // Use actual matched length!
          exact: false
        });
        console.warn(`[CodeEditor] Edit #${i + 1}: ⚠️ Found via FUZZY search at index ${fuzzyResult.index} - may be wrong location!`);
        continue;
      }

      // Not found - try to suggest similar code
      console.error(`[CodeEditor] Edit #${i + 1}: ❌ NOT FOUND - No match via exact, semi-strict, or fuzzy search`);
      const similarCode = this.findSimilarCode(currentCode, searchCode);
      validationErrors.push({
        index: i + 1,
        reason: 'Kód nenalezen',
        suggestion: similarCode
      });
    }

    // ===== PHASE 2: CONFLICT DETECTION =====
    const conflicts = this.detectEditConflicts(validatedEdits);

    if (conflicts.length > 0) {
      let message = `⚠️ Detekováno ${conflicts.length} konfliktů (překrývající se změny):\n\n`;
      conflicts.forEach(conflict => {
        message += `❌ Edit #${conflict.edit1} a #${conflict.edit2} se překrývají\n`;
      });
      return { success: false, message };
    }

    // Show validation errors if any
    if (validationErrors.length > 0) {
      this.showValidationErrors(validationErrors);

      if (validatedEdits.length === 0) {
        return { success: false, message: `❌ Žádná změna nebyla aplikována (${validationErrors.length} chyb)` };
      }
    }

    // ===== PHASE 3: APPLY EDITS =====
    console.log('[CodeEditor] Phase 3: Applying validated edits...');

    // Sort by index descending to avoid position shifts
    validatedEdits.sort((a, b) => b.index - a.index);

    let code = currentCode;
    const appliedEdits = [];

    for (const edit of validatedEdits) {
      // Use matchedLength for semi-strict/fuzzy, or searchCode.length for exact match
      const lengthToReplace = edit.matchedLength || edit.searchCode.length;

      const before = code.substring(0, edit.index);
      const after = code.substring(edit.index + lengthToReplace);
      code = before + edit.replaceCode + after;

      // Calculate line:column for logging
      const lines = before.split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      appliedEdits.push({
        position: `${line}:${column}`,
        exact: edit.exact
      });

      const matchType = edit.exact === true ? 'exact' : edit.exact === 'semi' ? 'semi-strict' : 'fuzzy';
      console.log(`[CodeEditor] Applied edit at ${line}:${column} (${matchType}, replaced ${lengthToReplace} chars)`);
    }

    // ===== PHASE 4: VALIDATE RESULT =====
    const syntaxError = this.validateCodeSyntax(code);
    if (syntaxError) {
      console.error('[CodeEditor] ❌ Výsledný kód má syntaktickou chybu:', syntaxError);
      console.error('[CodeEditor] Změny NEBUDOU aplikovány - kód by byl nefunkční');

      // Show error to user via chat message (more visible than toast)
      if (this.panel && this.panel.addChatMessage) {
        this.panel.addChatMessage('system',
          `❌ **AI oprava by vytvořila nevalidní kód!**\n\n` +
          `🔴 Chyba: \`${syntaxError}\`\n\n` +
          `Změny nebyly aplikovány. Zkus:\n` +
          `- "Oprav chybu jinak - bez mazání kódu"\n` +
          `- "Ukaž mi problematický řádek a navrhni opravu"`
        );
      }

      // Also show toast
      if (window.toast) {
        window.toast.error(
          `❌ AI oprava by rozbila kód\n\nChyba: ${syntaxError}\n\n💡 Změny nebyly aplikovány`,
          6000
        );
      }

      return {
        success: false,
        message: `❌ Změny by vytvořily nevalidní kód: ${syntaxError}`,
        syntaxError: syntaxError
      };
    }

    // Update editor
    eventBus.emit('editor:setCode', { code });

    // Trigger re-validation to update error indicator
    setTimeout(() => {
      eventBus.emit('action:validate');
    }, 100);

    // Track changed files (VS Code style)
    const activeFile = state.get('files.tabs')?.find(t => t.id === state.get('files.active'));
    const fileName = activeFile?.name || 'index.html';

    // Count added/removed lines from validated edits
    let totalAdded = 0;
    let totalRemoved = 0;
    validatedEdits.forEach(edit => {
      totalAdded += (edit.replaceCode?.split('\n').length || 0);
      totalRemoved += (edit.searchCode?.split('\n').length || 0);
    });

    if (this.panel.changedFilesService) {
      this.panel.changedFilesService.recordChange(fileName, totalAdded, totalRemoved, originalCode);
    }

    // Generate success message
    let message = `✅ Aplikováno ${appliedEdits.length}/${edits.length} změn:\n\n`;

    let hasFuzzy = false;
    let hasSemi = false;
    appliedEdits.forEach((edit, i) => {
      let prefix = '✅';
      let suffix = '';

      if (edit.exact === 'semi') {
        prefix = '✓';
        suffix = ' (normalized indent)';
        hasSemi = true;
      } else if (!edit.exact) {
        prefix = '⚠️';
        suffix = ' (fuzzy)';
        hasFuzzy = true;
      }

      message += `${prefix} Edit #${i + 1} at line:col ${edit.position}${suffix}\n`;
    });

    if (hasSemi) {
      message += `\nℹ️ Některé změny normalizovaly odsazení (AI použil jiný počet mezer).\n`;
    }

    if (hasFuzzy) {
      message += `\n⚠️ VAROVÁNÍ: Některé změny použily FUZZY matching!\n`;
      message += `Zkontroluj výsledek - AI nepoužil PŘESNÝ kód z editoru.\n`;
      message += `💡 Tip: Požádej AI aby použil přesnější SEARCH blok.\n`;
    }

    if (validationErrors.length > 0) {
      message += `\n⚠️ ${validationErrors.length} změn nebylo aplikováno (viz výše)`;
    }

    return { success: true, message };
  }

  /**
   * Fuzzy search with whitespace normalization
   */
  /**
   * Semi-strict search: Normalize leading whitespace on each line, but keep everything else exact
   * This allows AI to use any indentation, but the rest of the code must match exactly
   */
  semiStrictSearch(code, search) {
    try {
      // Normalize line endings in both code and search to \n
      const normalizedCode = code.replace(/\r\n/g, '\n');
      const normalizedSearch = search.replace(/\r\n/g, '\n');

      const searchLines = normalizedSearch.split('\n');

      // Build a regex pattern that matches the search content but allows any leading whitespace
      // Escape special regex characters except for leading whitespace
      const patternLines = searchLines.map(line => {
        const trimmed = line.trimStart();
        if (trimmed.length === 0) {
          // Empty or whitespace-only line - match any whitespace
          return '[ \\t]*';
        }
        // Match any amount of leading whitespace, then the exact content
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return '[ \\t]*' + escaped;
      });

      // Join with exact newline (not flexible whitespace around it)
      const pattern = patternLines.join('\\r?\\n');
      const regex = new RegExp(pattern);

      console.log('[CodeEditor] Semi-strict search:', {
        searchLines: searchLines.length,
        patternPreview: pattern.substring(0, 150),
        searchPreview: normalizedSearch.substring(0, 100).replace(/\n/g, '↵')
      });

      const match = regex.exec(code); // Use original code, not normalized!

      if (match) {
        console.log('[CodeEditor] ✅ Semi-strict match found at index:', match.index, 'length:', match[0].length);
        // Return the actual matched length from the original code!
        return { found: true, index: match.index, matchedLength: match[0].length, matchedText: match[0] };
      }

      console.log('[CodeEditor] ❌ Semi-strict: No match found');
      return { found: false, index: -1 };
    } catch (error) {
      console.error('[CodeEditor] Semi-strict search error:', error);
      return { found: false, index: -1 };
    }
  }

  /**
   * Remove line numbers from code (handles multiple formats)
   * Examples: "50| code", "  50 | code", "123. code", "  123:  code"
   */
  removeLineNumbers(code) {
    // Pattern 1: "50| code" or "  50 | code"
    let result = code.replace(/^\s*\d+\s*\|\s*/gm, '');

    // Pattern 2: "123. code" (line number with dot)
    result = result.replace(/^\s*\d+\.\s+/gm, '');

    // Pattern 3: "123: code" (line number with colon)
    result = result.replace(/^\s*\d+:\s+/gm, '');

    // Pattern 4: "  1234   " at start (just numbers with space)
    // Only if line starts with spaces, numbers, and more spaces
    result = result.replace(/^\s+\d+\s{2,}/gm, '');

    return result;
  }

  fuzzySearchCode(code, search) {
    try {
      // Normalize whitespace
      const normalizeWhitespace = (str) => str.replace(/\s+/g, ' ').trim();

      const codeNormalized = normalizeWhitespace(code);
      const searchNormalized = normalizeWhitespace(search);

      // Build regex from search pattern (escape special chars)
      const searchPattern = searchNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(searchPattern, 'i');

      const match = regex.exec(codeNormalized);

      if (match) {
        // Find original start position by counting non-whitespace characters
        let originalStartIndex = 0;
        let normalizedIndex = 0;

        while (normalizedIndex < match.index && originalStartIndex < code.length) {
          if (!/\s/.test(code[originalStartIndex]) || (normalizedIndex > 0 && code[originalStartIndex] === ' ')) {
            normalizedIndex++;
          }
          originalStartIndex++;
        }

        // Find original end position
        let originalEndIndex = originalStartIndex;
        let matchedNonWhitespace = 0;
        const searchNonWhitespaceLength = searchNormalized.replace(/\s/g, '').length;

        while (matchedNonWhitespace < searchNonWhitespaceLength && originalEndIndex < code.length) {
          if (!/\s/.test(code[originalEndIndex])) {
            matchedNonWhitespace++;
          }
          originalEndIndex++;
        }

        const matchedLength = originalEndIndex - originalStartIndex;
        const matchedText = code.substring(originalStartIndex, originalEndIndex);

        console.log('[CodeEditor] Fuzzy match:', {
          startIndex: originalStartIndex,
          endIndex: originalEndIndex,
          matchedLength,
          matchedPreview: matchedText.substring(0, 50).replace(/\n/g, '↵')
        });

        return { found: true, index: originalStartIndex, matchedLength, matchedText };
      }

      return { found: false, index: -1 };
    } catch (error) {
      console.error('[CodeEditor] Fuzzy search error:', error);
      return { found: false, index: -1 };
    }
  }

  /**
   * Find similar code for suggestions
   */
  findSimilarCode(code, search, maxSuggestions = 1) {
    const lines = code.split('\n');
    const searchLines = search.split('\n');
    const searchFirstLine = searchLines[0].trim();

    // Find lines that contain part of the search
    const candidates = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes(searchFirstLine) || searchFirstLine.includes(line)) {
        // Extract context (3 lines before and after)
        const start = Math.max(0, i - 3);
        const end = Math.min(lines.length, i + 4);
        const contextLines = lines.slice(start, end);
        candidates.push(contextLines.join('\n'));
      }
    }

    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * Count occurrences of search string in code
   */
  countOccurrences(code, search) {
    let count = 0;
    let pos = 0;
    while ((pos = code.indexOf(search, pos)) !== -1) {
      count++;
      pos += search.length;
    }
    return count;
  }

  /**
   * Detect overlapping edits (conflicts)
   */
  detectEditConflicts(edits) {
    const conflicts = [];

    for (let i = 0; i < edits.length; i++) {
      for (let j = i + 1; j < edits.length; j++) {
        const edit1 = edits[i];
        const edit2 = edits[j];

        const end1 = edit1.index + edit1.searchCode.length;
        const end2 = edit2.index + edit2.searchCode.length;

        // Check if ranges overlap
        if (
          (edit1.index <= edit2.index && end1 > edit2.index) ||
          (edit2.index <= edit1.index && end2 > edit1.index)
        ) {
          conflicts.push({
            edit1: i + 1,
            edit2: j + 1,
            range1: [edit1.index, end1],
            range2: [edit2.index, end2]
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Show validation errors with suggestions
   */
  showValidationErrors(errors) {
    let message = `⚠️ Některé změny nelze aplikovat (${errors.length}):\n\n`;

    errors.forEach(err => {
      message += `❌ Edit #${err.index}: ${err.reason}\n`;
      if (err.suggestion) {
        message += `💡 Možná jste mysleli:\n\`\`\`\n${err.suggestion.substring(0, 100)}...\n\`\`\`\n`;
      }
      message += '\n';
    });

    message += `💡 Tip: Zkuste "zobraz aktuální kód" a zkuste znovu.`;

    this.panel.addChatMessage('system', message);
  }

  /**
   * Add line numbers to code
   * Handles both normal and truncated code
   */
  addLineNumbers(code, metadata = null) {
    if (!code) return '';
    const lines = code.split('\n');

    if (!metadata || !metadata.isTruncated) {
      // Normal numbering
      return lines.map((line, i) => `${String(i + 1).padStart(4, ' ')}| ${line}`).join('\n');
    }

    // Truncated code - preserve original line numbers
    const result = [];
    let currentLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this is the truncation marker
      if (line.includes('🔽 ZKRÁCENO')) {
        result.push(`     | ${line}`);
        // Add warning about missing lines
        const missingStart = metadata.topLinesCount + 1;
        const missingEnd = metadata.bottomStartLine - 1;
        result.push(`     | ⚠️ ŘÁDKY ${missingStart}-${missingEnd} NEJSOU VIDITELNÉ! ⚠️`);
        result.push(`     | ⚠️ PRO EDITACI TĚCHTO ŘÁDKŮ POŽÁDEJ O ZOBRAZENÍ CELÉHO SOUBORU! ⚠️`);
        // Jump to bottom section line numbers
        currentLine = metadata.bottomStartLine;
      } else {
        result.push(`${String(currentLine).padStart(4, ' ')}| ${line}`);
        currentLine++;
      }
    }

    return result.join('\n');
  }

  /**
   * Truncate code intelligently - show beginning, end, and indicate middle is truncated
   * Returns object with code and metadata about line numbers
   */
  truncateCodeIntelligently(code, maxChars = 3000) {
    if (!code || code.length <= maxChars) {
      return { code, isTruncated: false, topLinesCount: 0, bottomStartLine: 0 };
    }

    const lines = code.split('\n');
    const totalLines = lines.length;

    // Calculate how many chars we can allocate to top and bottom
    const charsPerSection = Math.floor(maxChars / 2) - 100; // Reserve space for truncation marker

    // Collect top lines
    let topLines = [];
    let topChars = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (topChars + lineLength > charsPerSection) break;
      topLines.push(lines[i]);
      topChars += lineLength;
    }

    // Collect bottom lines
    let bottomLines = [];
    let bottomChars = 0;
    for (let i = lines.length - 1; i >= topLines.length; i--) {
      const lineLength = lines[i].length + 1;
      if (bottomChars + lineLength > charsPerSection) break;
      bottomLines.unshift(lines[i]);
      bottomChars += lineLength;
    }

    // Determine line number where bottom section starts
    const bottomStartLine = totalLines - bottomLines.length + 1;

    // Build truncated code
    const topSection = topLines.join('\n');
    const truncationMarker = `\n\n🔽 ZKRÁCENO ${totalLines - topLines.length - bottomLines.length} ŘÁDKŮ (${topLines.length + 1}-${bottomStartLine - 1}) 🔽\n\n`;
    const bottomSection = bottomLines.join('\n');

    const truncatedCode = topSection + truncationMarker + bottomSection;

    return {
      code: truncatedCode,
      isTruncated: true,
      topLinesCount: topLines.length,
      bottomStartLine: bottomStartLine,
      totalLines: totalLines
    };
  }

  /**
   * Insert code to editor with validation
   * Handles duplicate detection, work mode (continue/new-project), and confirmations
   */
  async insertCodeToEditor(code, fullResponse) {
    console.log('[CodeEditor] Inserting code to editor...');

    // 🛡️ VALIDACE - kontrola že kód není příliš krátký nebo podezřelý
    if (!code || code.trim().length < 20) {
      console.warn('[CodeEditor] ⚠️ Kód je příliš krátký, nevkládám:', code?.length, 'znaků');
      return 'Kód je příliš krátký pro vložení.';
    }

    // Get current editor content (PŘED změnami - pro možnost vrácení zpět)
    const originalCode = SafeOps.safe(
      () => state.get('editor.code') || '',
      'Chyba při získávání kódu z editoru'
    );

    // Režim práce: pokračovat nebo nový projekt
    const workMode = this.panel.workMode || 'continue';
    console.log('[CodeEditor] Režim práce:', workMode);

    // Pokud je režim "nový projekt" a editor má obsah - zobrazit potvrzení
    if (workMode === 'new-project' && originalCode && originalCode.trim().length > 50) {
      console.log('[CodeEditor] Režim "Nový projekt" - zobrazuji potvrzení');
      const confirmed = await this.showNewProjectConfirmation();
      if (!confirmed) {
        console.log('[CodeEditor] Uživatel zrušil smazání projektu');
        return 'Vytvoření nového projektu zrušeno.';
      }
    }

    // Detect duplicate variables
    const duplicates = this.detectDuplicateVariables(code);

    if (duplicates.length > 0) {
      console.warn('[CodeEditor] Duplicate variables detected:', duplicates);
      this.panel.addChatMessage('system',
        `⚠️ Varování: Zjištěny duplicitní proměnné:\n${duplicates.join(', ')}\n\n` +
        `To může způsobit problémy. Chcete pokračovat?\n\n` +
        `Tip: Použijte "oprav duplicity" nebo "zkontroluj kód"`
      );
    }

    // Save current code to history before change (only in continue mode and if has content)
    if (workMode === 'continue' && originalCode && originalCode.length > 0) {
      SafeOps.safe(
        () => {
          const history = state.get('editor.history') || [];
          history.push({ code: originalCode, timestamp: Date.now() });
          if (history.length > 20) history.shift(); // Keep last 20 versions
          state.set('editor.history', history);
        },
        'Chyba při ukládání historie editoru'
      );
    }

    // Insert code ROVNOU do editoru
    SafeOps.safe(
      () => eventBus.emit('editor:setCode', { code }),
      'Chyba při nastavování hodnoty editoru'
    );

    // Switch to editor view on mobile
    if (window.innerWidth < 768) {
      eventBus.emit('view:change', { view: 'editor' });
    }

    // Po vytvoření nového projektu přepnout zpět na "pokračovat"
    if (workMode === 'new-project') {
      this.panel.workMode = 'continue';
      // Aktualizovat UI toggle button
      const modeToggleBtn = document.querySelector('#aiModeToggle');
      if (modeToggleBtn) {
        modeToggleBtn.querySelector('.mode-icon').textContent = '📝';
        modeToggleBtn.querySelector('.mode-text').textContent = 'Pokračovat';
        modeToggleBtn.classList.remove('new-project-mode');
        modeToggleBtn.title = 'Přidávat kód k existujícímu projektu';
      }
      console.log('[CodeEditor] Režim přepnut zpět na "Pokračovat"');
    }

    const message = workMode === 'new-project'
      ? '✅ Nový projekt vytvořen v editoru'
      : '✅ Kód byl vložen do editoru';

    console.log('[CodeEditor] Code inserted successfully');

    // 🆕 Po aplikaci kódu schovat AI panel a přepnout na náhled
    this.hideAndShowPreview();

    return message;
  }

  /**
   * Hide AI panel and switch to preview view
   */
  hideAndShowPreview() {
    // Zpoždění pro uživatelský feedback
    setTimeout(() => {
      // Schovat AI panel
      eventBus.emit('ai:hide');

      // Přepnout na náhled stránky
      eventBus.emit('view:change', { view: 'preview' });

      // Zobrazit toast s informací
      eventBus.emit('toast:show', {
        message: '✅ Kód aplikován - zobrazuji náhled',
        type: 'success',
        duration: 2000
      });

      console.log('[CodeEditor] AI panel hidden, switched to preview');
    }, 500);
  }

  /**
   * Show Undo/Redo buttons in AI message (VS Code style)
   */
  showUndoRedoButtons(originalCode, newCode) {
    // Najít poslední AI zprávu v chatu
    const messagesContainer = document.querySelector('#aiChatMessages');
    if (!messagesContainer) return;

    const aiMessages = messagesContainer.querySelectorAll('.ai-message.assistant');
    if (aiMessages.length === 0) return;

    const lastAiMessage = aiMessages[aiMessages.length - 1];

    // Odstranit existující action bar (pokud je)
    const existingActionBar = lastAiMessage.querySelector('.code-action-bar');
    if (existingActionBar) {
      existingActionBar.remove();
    }

    // Vytvořit action bar s tlačítky
    const actionBar = document.createElement('div');
    actionBar.className = 'code-action-bar';
    actionBar.innerHTML = `
      <div class="action-bar-content">
        <span class="action-bar-label">Změny aplikovány</span>
        <div class="action-bar-buttons">
          <button class="action-btn undo-btn" data-action="undo">
            <span class="btn-icon">↶</span>
            <span class="btn-text">Vrátit zpět</span>
          </button>
          <button class="action-btn keep-btn" data-action="keep">
            <span class="btn-icon">✓</span>
            <span class="btn-text">Zachovat</span>
          </button>
        </div>
      </div>
    `;

    // Přidat action bar na konec AI zprávy
    lastAiMessage.appendChild(actionBar);

    // Event listenery pro tlačítka
    const undoBtn = actionBar.querySelector('.undo-btn');
    const keepBtn = actionBar.querySelector('.keep-btn');

    undoBtn.onclick = () => {
      // Vrátit původní kód
      SafeOps.safe(
        () => eventBus.emit('editor:setCode', { code: originalCode }),
        'Chyba při vracení kódu'
      );
      actionBar.innerHTML = '<div class="action-bar-result undo">↶ Změny vráceny zpět</div>';
      toast.show('↶ Změny vráceny zpět', 'info');
      // NEMAZAT automaticky - ať uživatel vidí výsledek
    };

    keepBtn.onclick = () => {
      actionBar.innerHTML = '<div class="action-bar-result keep">✓ Změny zachovány</div>';
      toast.show('✓ Změny zachovány', 'success');
      // NEMAZAT automaticky - ať uživatel vidí výsledek
    };
  }

  /**
   * Detect duplicate variable declarations
   */
  detectDuplicateVariables(code) {
    const duplicates = [];
    const variableNames = new Map();

    // Find all let/const/var declarations
    const declarationRegex = /(?:let|const|var)\s+([a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ_$][a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ0-9_$]*)/g;
    let match;

    while ((match = declarationRegex.exec(code)) !== null) {
      const varName = match[1];
      if (variableNames.has(varName)) {
        variableNames.set(varName, variableNames.get(varName) + 1);
      } else {
        variableNames.set(varName, 1);
      }
    }

    // Find duplicates
    variableNames.forEach((count, name) => {
      if (count > 1) {
        duplicates.push(`${name} (${count}x)`);
      }
    });

    return duplicates;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
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
   * Show confirmation before deleting current project
   * Returns Promise<boolean> - true if confirmed, false if cancelled
   */
  async showNewProjectConfirmation() {
    return new Promise((resolve) => {
      const chatMessages = document.getElementById('aiChatMessages');
      if (!chatMessages) {
        resolve(false);
        return;
      }

      // Create confirmation modal
      const modal = document.createElement('div');
      modal.className = 'code-insert-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>⚠️ Potvrdit smazání projektu?</h3>
          <p style="margin: 15px 0; color: #e0e0e0;">
            Současný kód v editoru bude <strong>trvale smazán</strong>.<br>
            AI vytvoří úplně nový projekt od začátku.
          </p>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-danger" data-action="confirm">
              <span class="btn-icon">🗑️</span>
              <div class="btn-text">
                <strong>Ano, smazat</strong>
                <small>Začít nový projekt</small>
              </div>
            </button>
            <button class="modal-btn modal-btn-secondary" data-action="cancel">
              <span class="btn-icon">❌</span>
              <div class="btn-text">
                <strong>Ne, zrušit</strong>
                <small>Zachovat současný kód</small>
              </div>
            </button>
          </div>
        </div>
      `;

      // Add to chat
      chatMessages.appendChild(modal);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Handle button clicks
      const confirmBtn = modal.querySelector('[data-action="confirm"]');
      const cancelBtn = modal.querySelector('[data-action="cancel"]');

      const cleanup = () => {
        modal.remove();
      };

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
    });
  }

  /**
   * Show confirmation dialog for code insertion
   * Offers: Add to existing, Create new project, Cancel
   */
  async showCodeInsertConfirmation(newCode, currentCode) {
    console.log('[CodeEditor] Showing code insert confirmation dialog');

    return new Promise((resolve) => {
      const messagesContainer = this.panel.modal.element.querySelector('#aiChatMessages');

      // Remove any existing confirmation dialogs
      const existingConfirmations = messagesContainer.querySelectorAll('.code-insert-confirmation');
      existingConfirmations.forEach(el => el.remove());

      // Create confirmation UI
      const confirmationEl = document.createElement('div');
      confirmationEl.className = 'ai-message assistant code-insert-confirmation';

      const currentLength = currentCode.trim().length;
      const newLength = newCode.trim().length;

      confirmationEl.innerHTML = `
        <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; margin: 10px 0;">
          <h3 style="margin: 0 0 15px 0; color: white; font-size: 1.3em;">
            🎯 Jak chcete vložit kód?
          </h3>

          <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white;">
            <div style="margin-bottom: 10px;">
              <strong>📝 Aktuální editor:</strong> ${currentLength.toLocaleString()} znaků
            </div>
            <div>
              <strong>✨ Nový kód:</strong> ${newLength.toLocaleString()} znaků
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button class="add-to-existing-btn" style="padding: 16px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: 600; display: flex; align-items: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              <span style="font-size: 1.5em;">➕</span>
              <div style="text-align: left;">
                <div>Přidat na stávající stránku</div>
                <div style="font-size: 0.85em; opacity: 0.9; font-weight: 400;">Zachovat současný kód a přidat nový</div>
              </div>
            </button>

            <button class="create-new-btn" style="padding: 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: 600; display: flex; align-items: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              <span style="font-size: 1.5em;">🆕</span>
              <div style="text-align: left;">
                <div>Vytvořit nový projekt</div>
                <div style="font-size: 0.85em; opacity: 0.9; font-weight: 400;">Nahradit celý editor novým kódem</div>
              </div>
            </button>

            <button class="cancel-insert-btn" style="padding: 16px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: 600; display: flex; align-items: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              <span style="font-size: 1.5em;">❌</span>
              <div style="text-align: left;">
                <div>Zrušit</div>
                <div style="font-size: 0.85em; opacity: 0.9; font-weight: 400;">Nechat kód v chatu, nevkládat</div>
              </div>
            </button>
          </div>
        </div>
      `;

      messagesContainer.appendChild(confirmationEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Add event listeners
      const addToExistingBtn = confirmationEl.querySelector('.add-to-existing-btn');
      const createNewBtn = confirmationEl.querySelector('.create-new-btn');
      const cancelBtn = confirmationEl.querySelector('.cancel-insert-btn');

      const cleanup = () => {
        confirmationEl.remove();
      };

      addToExistingBtn.onclick = () => {
        console.log('[CodeEditor] User chose: Add to existing');
        cleanup();

        // Append new code to existing
        const combinedCode = currentCode + '\n\n' + newCode;
        eventBus.emit('editor:setCode', { code: combinedCode });

        this.panel.addChatMessage('system', '✅ Kód byl přidán na konec stávajícího kódu');

        // Switch to editor view on mobile
        if (window.innerWidth < 768) {
          eventBus.emit('view:change', { view: 'editor' });
        }

        resolve('added');
      };

      createNewBtn.onclick = () => {
        console.log('[CodeEditor] User chose: Create new project');
        cleanup();

        // Replace entire editor content
        eventBus.emit('editor:setCode', { code: newCode });

        this.panel.addChatMessage('system', '🆕 Vytvořen nový projekt - editor byl nahrazen novým kódem');

        // Switch to editor view on mobile
        if (window.innerWidth < 768) {
          eventBus.emit('view:change', { view: 'editor' });
        }

        resolve('replaced');
      };

      cancelBtn.onclick = () => {
        console.log('[CodeEditor] User cancelled code insertion');
        cleanup();
        this.panel.addChatMessage('system', '❌ Vložení kódu zrušeno - kód zůstává dostupný v chatu výše');
        resolve('cancelled');
      };
    });
  }

  /**
   * Validate JavaScript syntax in HTML code
   * Returns error message if invalid, null if valid
   */
  validateCodeSyntax(code) {
    // Extract all script content from HTML
    const scriptMatches = code.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    const scripts = [...scriptMatches].map(m => m[1]);

    // If no scripts found, just do basic bracket matching
    if (scripts.length === 0) {
      return this.validateBrackets(code);
    }

    // Validate each script block
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i].trim();
      if (!script) continue;

      // Skip module scripts (they import from external files)
      if (script.includes('import ') && script.includes(' from ')) {
        continue;
      }

      // Try to parse JavaScript
      try {
        // Use Function constructor to check syntax (doesn't execute)
        new Function(script);
      } catch (e) {
        // Extract line number from error if available
        const lineMatch = e.message.match(/line (\d+)/i);
        const line = lineMatch ? ` (řádek ${lineMatch[1]})` : '';
        return `Script #${i + 1}${line}: ${e.message}`;
      }
    }

    // Also check bracket balance
    const bracketError = this.validateBrackets(code);
    if (bracketError) {
      return bracketError;
    }

    return null; // Valid
  }

  /**
   * Validate that brackets are balanced
   */
  validateBrackets(code) {
    const stack = [];
    const pairs = { '{': '}', '[': ']', '(': ')' };
    const opening = new Set(['{', '[', '(']);
    const closing = new Set(['}', ']', ')']);

    // Remove strings and comments to avoid false positives
    let cleaned = code
      .replace(/\/\/.*$/gm, '')           // Single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')   // Multi-line comments
      .replace(/'(?:[^'\\]|\\.)*'/g, '""')  // Single-quoted strings -> empty
      .replace(/"(?:[^"\\]|\\.)*"/g, '""'); // Double-quoted strings -> empty

    // Handle template literals more carefully (can have nested ${})
    // Replace template literals character by character
    let inTemplate = false;
    let braceDepth = 0;
    let result = '';

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const prevChar = i > 0 ? cleaned[i - 1] : '';

      if (char === '`' && prevChar !== '\\') {
        inTemplate = !inTemplate;
        result += ' '; // Replace backtick with space
        continue;
      }

      if (inTemplate) {
        if (char === '$' && cleaned[i + 1] === '{') {
          braceDepth++;
          result += '  '; // Skip ${
          i++;
          continue;
        }
        if (char === '{' && braceDepth > 0) {
          braceDepth++;
          result += char; // Keep nested braces for validation
          continue;
        }
        if (char === '}' && braceDepth > 0) {
          braceDepth--;
          if (braceDepth === 0) {
            result += ' '; // Closing } of ${} - skip it
            continue;
          }
          result += char; // Keep nested closing braces
          continue;
        }
        // Inside template but outside ${} - skip content
        if (braceDepth === 0) {
          result += ' ';
          continue;
        }
        // Inside ${} - keep for validation
        result += char;
      } else {
        result += char;
      }
    }

    cleaned = result;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (opening.has(char)) {
        stack.push(char);
      } else if (closing.has(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          return `Neuzavřená závorka '${char}' na pozici ${i}`;
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack.map(c => `'${c}'`).join(', ');
      return `Neuzavřené závorky: ${unclosed}`;
    }

    return null; // Valid
  }

}
