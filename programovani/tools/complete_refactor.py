#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kompletní refaktoring AIPanel.js - všechny změny najednou
"""
import re

def refactor_complete():
    file_path = r"c:\Users\stistko\CascadeProjects\test_base\programovani\src\modules\ai\AIPanel.js"

    # Přečti soubor s UTF-8
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print("📝 Původní počet řádků:", content.count('\n'))

    # 1. Přidej importy po ChatHistoryService
    content = content.replace(
        "import { ChatHistoryService } from './services/ChatHistoryService.js';\n\nexport class AIPanel {",
        "import { ChatHistoryService } from './services/ChatHistoryService.js';\nimport { ChatService } from './services/ChatService.js';\nimport { PromptBuilder } from './services/PromptBuilder.js';\nimport { MESSAGES, ICONS } from './constants/Messages.js';\n\nexport class AIPanel {"
    )

    # 2. Uprav konstruktor
    content = content.replace(
        "  constructor() {\n    this.modal = null;\n    this.chatHistory = state.get('ai.chatHistory') || [];",
        "  constructor() {\n    this.modal = null;\n    this.chatService = new ChatService();\n    this.promptBuilder = new PromptBuilder(this);\n    this.chatHistory = this.chatService.getHistory();"
    )

    # 3. Nahraď všechny push operace (5x)
    # Pattern: this.chatHistory.push({ role: 'X', content: Y }); state.set(...)

    # Push 1-2: user a assistant v sendMessage
    content = re.sub(
        r"this\.chatHistory\.push\(\{\s*role:\s*'(user|assistant)',\s*content:\s*(\w+)\s*\}\);\s*(?://.*\n)?(?:\s*//.*\n)?(?:\s*state\.set\('ai\.chatHistory', this\.chatHistory\);\s*)?",
        r"this.chatService.addToHistory('\1', \2);\n    this.chatHistory = this.chatService.getHistory();",
        content
    )

    # 4. Smaž velký prompt blok (řádky mezi "const activeFile =" a "// Get provider and model")
    # Najdi začátek a konec
    lines = content.split('\n')
    new_lines = []
    skip_mode = False
    skip_count = 0

    for i, line in enumerate(lines):
        if "const activeFileId = state.get('files.active');" in line:
            new_lines.append(line)
            new_lines.append("")
            new_lines.append("      // Build system prompt using PromptBuilder")
            new_lines.append("      let systemPrompt = this.promptBuilder.buildSystemPrompt(")
            new_lines.append("        message,")
            new_lines.append("        currentCode,")
            new_lines.append("        openFiles,")
            new_lines.append("        activeFileId")
            new_lines.append("      );")
            new_lines.append("")
            skip_mode = True
            continue

        if skip_mode and "// Get provider and model from UI" in line:
            skip_mode = False
            new_lines.append(line)
            continue

        if skip_mode:
            skip_count += 1
            continue

        new_lines.append(line)

    content = '\n'.join(new_lines)

    # 5. Odstraň zbývající state.set v codeStatus metodách
    content = re.sub(
        r"delete lastMsg\.codeStatus\[`code-\$\{index\}`\];\s*state\.set\('ai\.chatHistory', this\.chatHistory\);",
        r"delete lastMsg.codeStatus[`code-${index}`];",
        content
    )

    content = re.sub(
        r"lastMsg\.codeStatus\[`code-\$\{codeIndex\}`\] = '(accepted|rejected)';\s*state\.set\('ai\.chatHistory', this\.chatHistory\);",
        r"lastMsg.codeStatus[`code-${codeIndex}`] = '\1';",
        content
    )

    # Zapiš zpět s UTF-8
    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

    final_lines = content.count('\n')
    print(f"✅ Refaktoring dokončen!")
    print(f"📝 Nový počet řádků: {final_lines}")
    print(f"📉 Úspora: {content.count(chr(10)) - final_lines + skip_count} řádků")
    print(f"🗑️  Smazáno z prompt bloku: {skip_count} řádků")

if __name__ == "__main__":
    refactor_complete()
