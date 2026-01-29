/**
 * Tool System Registry - Registruje všechny tools
 */

import { toolSystem } from './ToolSystem.js';
import { fileTools } from './FileTools.js';
import { searchTools } from './SearchTools.js';
import { codeTools } from './CodeTools.js';
import { projectSourceTools } from './ProjectSourceTools.js';
import { multiFileTools } from './MultiFileTools.js';
import { advancedTools } from './AdvancedTools.js';

/**
 * Inicializuje všechny tools
 */
export function initializeTools() {
  // File Tools
  for (const [name, tool] of Object.entries(fileTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }

  // Search Tools
  for (const [name, tool] of Object.entries(searchTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }

  // Code Tools
  for (const [name, tool] of Object.entries(codeTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }

  // Project Source Tools (self-improvement)
  for (const [name, tool] of Object.entries(projectSourceTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }

  // Multi-File Tools (práce s více soubory)
  for (const [name, tool] of Object.entries(multiFileTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }

  // Advanced Tools (run_code, screenshot, fetch_url, etc.)
  for (const [name, tool] of Object.entries(advancedTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }

  console.log(`✅ Tool System initialized with ${toolSystem.tools.size} tools`);
}

/**
 * Získá seznam všech tools s popisky pro uživatele
 */
export function getToolsList() {
  const tools = [];

  for (const [name, tool] of toolSystem.tools) {
    // Kategorizace
    let category = 'General';
    if (name.includes('file') || name.includes('read') || name.includes('write') || name.includes('create') || name.includes('switch') || name.includes('edit') || name.includes('list')) {
      category = 'File Operations';
    } else if (name.includes('search') || name.includes('find') || name.includes('grep')) {
      category = 'Search';
    } else if (name.includes('error') || name.includes('validate') || name.includes('analyze') || name.includes('complexity')) {
      category = 'Code Analysis';
    } else if (name.includes('project') || name.includes('duplicate') || name.includes('vscode')) {
      category = 'Self-Improvement';
    }

    tools.push({
      name,
      description: tool.schema.description,
      category,
    });
  }

  // Seskup podle kategorie
  const grouped = {};
  for (const tool of tools) {
    if (!grouped[tool.category]) {
      grouped[tool.category] = [];
    }
    grouped[tool.category].push(tool);
  }

  return grouped;
}

// Export toolSystem pro globální přístup (debugging, testy)
if (typeof window !== 'undefined') {
  window.toolSystem = toolSystem;
}

export { toolSystem };
