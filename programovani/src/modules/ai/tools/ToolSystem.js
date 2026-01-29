/**
 * Tool System - VS Code Copilot style tool calling system
 * Allows AI to use tools like read_file, search, run_terminal, etc.
 */

export class ToolSystem {
  constructor() {
    this.tools = new Map();
    this.toolCallHistory = [];
    this.maxToolCalls = 10; // Prevence nekonečných smyček
    this.isEnabled = false;
  }

  /**
   * Registruje nástroj do systému
   */
  registerTool(name, schema, handler) {
    this.tools.set(name, {
      name,
      schema,
      handler,
    });
  }

  /**
   * Vrátí všechny dostupné tools jako OpenAI function definitions
   */
  getToolDefinitions() {
    const definitions = [];
    for (const [name, tool] of this.tools) {
      definitions.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.schema.description,
          parameters: tool.schema.parameters,
        },
      });
    }
    return definitions;
  }

  /**
   * Vrátí system prompt s tool instrukcemi
   */
  getToolSystemPrompt() {
    if (!this.isEnabled) return '';

    return `
# Tool System Instructions

You have access to tools that allow you to interact with the codebase. Use them to:
- Read file contents
- Search for code patterns
- List directory contents
- Check for errors
- Run terminal commands (with caution)

When you need information, use tools BEFORE responding. Think step by step:
1. What information do I need?
2. Which tool can provide it?
3. Call the tool
4. Analyze the result
5. Respond to the user

Tool calling format:
\`\`\`tool-call
{
  "tool": "read_file",
  "parameters": {
    "filePath": "src/app.js",
    "startLine": 1,
    "endLine": 50
  }
}
\`\`\`

IMPORTANT: When displaying tool results to user:
- If result has "formattedList" field, use it directly (already formatted)
- If result has "formattedOutput" field, use it directly
- For file lists, show each file on a new line
- Preserve markdown formatting in tool results

Available tools: ${Array.from(this.tools.keys()).join(', ')}
`;
  }

  /**
   * Parsuje tool calls z AI odpovědi
   */
  parseToolCalls(content) {
    const toolCalls = [];
    const regex = /```tool-call\s*([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      try {
        const toolCall = JSON.parse(match[1].trim());
        toolCalls.push(toolCall);
      } catch (e) {
        console.warn('Failed to parse tool call:', match[1], e);
      }
    }

    return toolCalls;
  }

  /**
   * Vykoná tool call a vrátí výsledek
   */
  async executeTool(toolName, parameters) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    try {
      const result = await tool.handler(parameters);
      this.toolCallHistory.push({
        tool: toolName,
        parameters,
        result,
        timestamp: Date.now(),
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Zpracuje AI odpověď s tool calls
   * Vrací { hasToolCalls, toolResults, cleanedContent }
   */
  async processResponse(aiResponse) {
    if (!this.isEnabled) {
      return {
        hasToolCalls: false,
        toolResults: [],
        cleanedContent: aiResponse,
      };
    }

    const toolCalls = this.parseToolCalls(aiResponse);

    if (toolCalls.length === 0) {
      return {
        hasToolCalls: false,
        toolResults: [],
        cleanedContent: aiResponse,
      };
    }

    // Prevent infinite loops
    if (this.toolCallHistory.length >= this.maxToolCalls) {
      return {
        hasToolCalls: false,
        toolResults: [],
        cleanedContent: aiResponse.replace(/```tool-call[\s\S]*?```/g, '') + '\n\n⚠️ Maximum tool calls reached',
      };
    }

    // Execute all tool calls
    const toolResults = [];
    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall.tool, toolCall.parameters);
      toolResults.push({
        tool: toolCall.tool,
        parameters: toolCall.parameters,
        result,
      });
    }

    // Remove tool call blocks from content
    const cleanedContent = aiResponse.replace(/```tool-call[\s\S]*?```/g, '').trim();

    return {
      hasToolCalls: true,
      toolResults,
      cleanedContent,
    };
  }

  /**
   * Formátuje tool results pro další AI request
   */
  formatToolResults(toolResults) {
    let formatted = '\n\n## Tool Results\n\n';
    for (const { tool, parameters, result } of toolResults) {
      formatted += `### ${tool}\n`;
      formatted += `**Parameters:** ${JSON.stringify(parameters, null, 2)}\n\n`;
      formatted += `**Result:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n`;
    }
    return formatted;
  }

  /**
   * Zapne/vypne tool system
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.toolCallHistory = [];
    }
  }

  /**
   * Reset tool call history
   */
  resetHistory() {
    this.toolCallHistory = [];
  }

  /**
   * Získá historii tool calls
   */
  getHistory() {
    return [...this.toolCallHistory];
  }

  /**
   * Statistiky
   */
  getStats() {
    const toolUsage = new Map();
    for (const call of this.toolCallHistory) {
      toolUsage.set(call.tool, (toolUsage.get(call.tool) || 0) + 1);
    }
    return {
      totalCalls: this.toolCallHistory.length,
      toolUsage: Object.fromEntries(toolUsage),
      enabled: this.isEnabled,
    };
  }
}

// Singleton instance
export const toolSystem = new ToolSystem();
