#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bezpečný refaktoring AIPanel.js s UTF-8
"""

def refactor_aipanel():
    file_path = r"c:\Users\stistko\CascadeProjects\test_base\programovani\src\modules\ai\AIPanel.js"

    # Přečti soubor s UTF-8
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 1. Přidej importy (po řádku 18 - ChatHistoryService)
    for i, line in enumerate(lines):
        if "import { ChatHistoryService } from './services/ChatHistoryService.js';" in line:
            # Přidej ChatService a PromptBuilder importy
            lines.insert(i+1, "import { ChatService } from './services/ChatService.js';\n")
            lines.insert(i+2, "import { PromptBuilder } from './services/PromptBuilder.js';\n")
            lines.insert(i+3, "import { MESSAGES, ICONS } from './constants/Messages.js';\n")
            break

    # 2. Uprav konstruktor
    for i, line in enumerate(lines):
        if "this.chatHistory = state.get('ai.chatHistory') || [];" in line:
            lines[i] = "    this.chatService = new ChatService();\n"
            lines.insert(i+1, "    this.promptBuilder = new PromptBuilder(this);\n")
            lines.insert(i+2, "    this.chatHistory = this.chatService.getHistory();\n")
            break

    # 3. Nahraď this.chatHistory.push na řádcích 1311-1318
    for i, line in enumerate(lines):
        if i >= 1310 and i <= 1320 and "this.chatHistory.push({" in line:
            # Nahraď blok push + state.set
            lines[i] = "    this.chatService.addToHistory('user', message);\n"
            lines[i+1] = "    this.chatHistory = this.chatService.getHistory();\n"
            # Smaž další řádky (role, content, state.set)
            for j in range(6):
                if i+2 < len(lines):
                    del lines[i+2]
            break

    # 4. Nahraď druhý push (assistant response)
    for i, line in enumerate(lines):
        if i >= 1690 and i <= 1710 and "this.chatHistory.push({" in line:
            lines[i] = "      this.chatService.addToHistory('assistant', response);\n"
            lines[i+1] = "      this.chatHistory = this.chatService.getHistory();\n"
            # Smaž další řádky
            for j in range(6):
                if i+2 < len(lines):
                    del lines[i+2]
            break

    # Zapiš zpět s UTF-8
    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)

    print(f"✅ Refaktoring dokončen!")
    print(f"📝 Celkem řádků: {len(lines)}")

if __name__ == "__main__":
    refactor_aipanel()
