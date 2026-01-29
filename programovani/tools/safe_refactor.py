#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bezpečný line-based refaktoring AIPanel.js
Používá přesná čísla řádků, takže UTF-8 zůstane neporušené
"""

def safe_refactor():
    file_path = r"c:\Users\stistko\CascadeProjects\test_base\programovani\src\modules\ai\AIPanel.js"

    # Přečti soubor s UTF-8
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    original_count = len(lines)
    print(f"📝 Původní počet řádků: {original_count}")

    # 1. NAHRAĎ PUSH OPERACE (shora dolů, od nejvyšších řádků)
    # Push 5: řádek 5366 (system orchestrator prompt)
    # this.chatHistory.push({ role: 'system', content: orchestratorPrompt });
    if 5365 < len(lines) and "this.chatHistory.push({" in lines[5365]:
        lines[5365] = "    this.chatService.addToHistory('system', orchestratorPrompt);\n"
        lines[5366] = "    this.chatHistory = this.chatService.getHistory();\n"
        # Smaž řádky 5367-5369 (role, content, })
        del lines[5367:5370]
        print("✅ Push 5 nahrazen (řádek 5366)")

    # Push 4: řádek 4498 (orchestrator full response)
    if 4497 < len(lines) and "this.chatHistory.push({" in lines[4497]:
        lines[4497] = "        this.chatService.addToHistory('assistant', response);\n"
        lines[4498] = "        this.chatHistory = this.chatService.getHistory();\n"
        del lines[4499:4502]
        print("✅ Push 4 nahrazen (řádek 4498)")

    # Push 3: řádek 4479 (orchestrator description)
    if 4478 < len(lines) and "this.chatHistory.push({" in lines[4478]:
        lines[4478] = "        this.chatService.addToHistory('assistant', description);\n"
        lines[4479] = "        this.chatHistory = this.chatService.getHistory();\n"
        del lines[4480:4483]
        print("✅ Push 3 nahrazen (řádek 4479)")

    # Push 2: řádek 1702 (assistant response)
    if 1701 < len(lines) and "this.chatHistory.push({" in lines[1701]:
        lines[1701] = "      this.chatService.addToHistory('assistant', response);\n"
        lines[1702] = "      this.chatHistory = this.chatService.getHistory();\n"
        # Smaž řádky včetně state.set
        del lines[1703:1710]
        print("✅ Push 2 nahrazen (řádek 1702)")

    # Push 1: řádek 1311 (user message)
    if 1310 < len(lines) and "this.chatHistory.push({" in lines[1310]:
        lines[1310] = "    this.chatService.addToHistory('user', message);\n"
        lines[1311] = "    this.chatHistory = this.chatService.getHistory();\n"
        # Smaž řádky včetně state.set
        del lines[1312:1319]
        print("✅ Push 1 nahrazen (řádek 1311)")

    # 2. ODSTRAŇ REDUNDANTNÍ STATE.SET v codeStatus metodách
    for i in range(len(lines)):
        # Reset button
        if "state.set('ai.chatHistory', this.chatHistory);" in lines[i]:
            prev_line = lines[i-1] if i > 0 else ""
            if "delete lastMsg.codeStatus" in prev_line:
                lines[i] = ""  # Smaž tento řádek
                print(f"✅ Odstraněn state.set na řádku {i+1} (reset)")
            elif "lastMsg.codeStatus[`code-${codeIndex}`] = 'accepted';" in prev_line:
                lines[i] = ""
                print(f"✅ Odstraněn state.set na řádku {i+1} (accept)")
            elif "lastMsg.codeStatus[`code-${codeIndex}`] = 'rejected';" in prev_line:
                lines[i] = ""
                print(f"✅ Odstraněn state.set na řádku {i+1} (reject)")

    # 3. NAHRAĎ VELKÝ PROMPT BLOK
    # Najdi řádek "const activeFileId = state.get('files.active');"
    # a nahraď vše až do "// Get provider and model from UI"
    start_idx = None
    end_idx = None

    for i, line in enumerate(lines):
        if "const activeFileId = state.get('files.active');" in line:
            start_idx = i + 1  # Řádek ZA tímto
        if start_idx and "// Get provider and model from UI" in line:
            end_idx = i
            break

    if start_idx and end_idx and end_idx > start_idx:
        # Vlož nové řádky
        new_block = [
            "\n",
            "      // Build system prompt using PromptBuilder\n",
            "      let systemPrompt = this.promptBuilder.buildSystemPrompt(\n",
            "        message,\n",
            "        currentCode,\n",
            "        openFiles,\n",
            "        activeFileId\n",
            "      );\n",
            "\n"
        ]
        # Nahraď celý blok
        lines[start_idx:end_idx] = new_block
        deleted = end_idx - start_idx - len(new_block)
        print(f"✅ Prompt blok nahrazen ({deleted} řádků smazáno)")

    # Zapiš zpět s UTF-8 a LF line endings
    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)

    final_count = len(lines)
    saved = original_count - final_count
    print(f"\n📊 VÝSLEDEK:")
    print(f"   Nový počet řádků: {final_count}")
    print(f"   Úspora: {saved} řádků")
    print(f"   Změna: {original_count} → {final_count} (-{(saved/original_count*100):.1f}%)")

if __name__ == "__main__":
    safe_refactor()
