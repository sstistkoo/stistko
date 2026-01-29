/**
 * AI Module - Centrální export
 * Poskytuje jednotné rozhraní pro všechny AI služby a nástroje
 */

// Core AI service - využij globální window.AI (načtený přes script tag)
// AIModule.js je načítán jako běžný script tag, ne jako ES6 modul
export const aiService = typeof window !== 'undefined' ? window.AI : null;

// CrewAI service - využij globální window.CrewAI
export const crewAIService = typeof window !== 'undefined' ? window.CrewAI : null;

// Tools
export { toolSystem } from './tools/ToolSystem.js';
export { fileTools } from './tools/FileTools.js';
export { searchTools } from './tools/SearchTools.js';
export { codeTools } from './tools/CodeTools.js';
export { projectSourceTools } from './tools/ProjectSourceTools.js';
export { multiFileTools } from './tools/MultiFileTools.js';
export { initializeTools } from './tools/index.js';

// Services
export { PromptSelector } from './services/PromptSelector.js';
export { ChatService } from './services/ChatService.js';
export { CodeEditorService } from './services/CodeEditorService.js';

// Components
export { AIPanel } from './AIPanel.js';
export { AITester } from './AITester.js';

// Utils
export { StringUtils } from './utils/stringUtils.js';
