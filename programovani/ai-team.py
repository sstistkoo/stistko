import os
from crewai import Agent, Task, Crew, Process

# Nastavení spojení na tvou lokální AI (Ollama) - zadarmo
# Předpokládáme, že máš nainstalovanou Ollamu a stažený model: ollama run qwen2.5-coder
os.environ["OPENAI_API_BASE"] = "http://localhost:11434/v1"
os.environ["OPENAI_MODEL_NAME"] = "qwen2.5-coder" # nebo 'llama3'
os.environ["OPENAI_API_KEY"] = "NA" # Ollama klíč nepotřebuje

# 1. DEFINICE AGENTŮ
architekt = Agent(
    role='UX/UI Architekt',
    goal='Navrhnout logickou strukturu a moderní design webové stránky.',
    backstory='Jsi expert na uživatelskou zkušenost a vizuální styl. Tvým výstupem je strukturovaný plán.',
    verbose=True,
    allow_delegation=False
)

koder = Agent(
    role='Frontend Vývojář',
    goal='Převést plán od architekta do čistého HTML a CSS kódu.',
    backstory='Jsi mistr čistého kódu a responzivního designu. Používáš moderní CSS (např. Tailwind).',
    verbose=True,
    allow_delegation=False
)

tester = Agent(
    role='QA Revizor',
    goal='Zkontrolovat kód na chyby a zajistit, že odpovídá zadání.',
    backstory='Máš oko na detaily. Hledáš chybějící tagy, špatné zobrazení na mobilu a logické chyby.',
    verbose=True,
    allow_delegation=False
)

dokumentarista = Agent(
    role='Technický Dokumentarista',
    goal='Vysvětlit, jak kód funguje, a přidat užitečné komentáře.',
    backstory='Dokážeš i složitý kód vysvětlit jednoduše pro začátečníky.',
    verbose=True,
    allow_delegation=False
)

# 2. DEFINICE ÚKOLŮ
ukol_architekt = Task(description='Navrhni strukturu pro webovou stránku na téma: {tema_webu}', agent=architekt, expected_output='Seznam sekcí a popis designu.')
ukol_koder = Task(description='Napiš HTML a CSS kód podle návrhu architekta.', agent=koder, expected_output='Kompletní blok kódu v HTML/CSS.')
ukol_tester = Task(description='Zkontroluj kód od vývojáře a navrhni opravy, pokud jsou nutné.', agent=tester, expected_output='Seznam oprav nebo potvrzení, že je kód v pořádku.')
ukol_dokumentace = Task(description='Vytvoř stručný návod, jak tento kód použít a co která část dělá.', agent=dokumentarista, expected_output='Stručný manuál v češtině.')

# 3. SESTAVENÍ TÝMU (CREW)
posadka = Crew(
    agents=[architekt, koder, tester, dokumentarista],
    tasks=[ukol_architekt, ukol_koder, ukol_tester, ukol_dokumentace],
    process=Process.sequential # Agenti pracují jeden po druhém
)

# 4. SPUŠTĚNÍ
print("### AI tým začíná pracovat...")
vysledek = posadka.kickoff(inputs={'tema_webu': 'Moderní landing page pro kavárnu'})
print("\n\n########################\n### HOTOVO! VÝSLEDEK:\n########################\n")
print(vysledek)
