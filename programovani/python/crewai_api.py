from flask import Flask, request, jsonify
from flask_cors import CORS
from crewai import Agent, Task, Crew, Process
import os

app = Flask(__name__)
CORS(app)  # Povolení CORS pro volání z browseru

# Nastavení pro Ollama
os.environ["OPENAI_API_BASE"] = "http://localhost:11434/v1"
os.environ["OPENAI_MODEL_NAME"] = "qwen2.5-coder"
os.environ["OPENAI_API_KEY"] = "NA"

# Definice agentů

# Orchestrator - hlavní koordinátor
orchestrator = Agent(
    role='Project Manager & Orchestrator',
    goal='Analyzovat zadání, rozdělit úkoly mezi agenty a koordinovat jejich práci.',
    backstory='Jsi zkušený project manager a koordinátor AI týmu. Rozumíš schopnostem každého agenta a víš, jak rozdělit práci efektivně.',
    verbose=True,
    allow_delegation=True  # Může delegovat na ostatní
)

architekt = Agent(
    role='UX/UI Architekt',
    goal='Navrhnout logickou strukturu a moderní design webové stránky.',
    backstory='Jsi expert na UX a vizuální styl.',
    verbose=True,
    allow_delegation=False
)
koder = Agent(
    role='Frontend Vývojář',
    goal='Převést plán do HTML a CSS kódu.',
    backstory='Mistr čistého kódu.',
    verbose=True,
    allow_delegation=False
)
tester = Agent(
    role='QA Revizor',
    goal='Zkontrolovat kód na chyby.',
    backstory='Hledáš chyby a nedostatky.',
    verbose=True,
    allow_delegation=False
)
dokumentarista = Agent(
    role='Technický Dokumentarista',
    goal='Vysvětlit, jak kód funguje.',
    backstory='Vysvětluješ jednoduše.',
    verbose=True,
    allow_delegation=False
)

@app.route('/health', methods=['GET'])
def health_check():
    """Kontrola, zda server běží"""
    return jsonify({'status': 'ok', 'message': 'CrewAI API is running'})

@app.route('/agents', methods=['GET'])
def get_agents():
    """Vrátí seznam dostupných agentů"""
    return jsonify({
        'agents': [
            {
                'id': 'orchestrator',
                'name': 'Orchestrator',
                'role': orchestrator.role,
                'goal': orchestrator.goal
            },
            {
                'id': 'architect',
                'name': 'UX/UI Architekt',
                'role': architekt.role,
                'goal': architekt.goal
            },
            {
                'id': 'coder',
                'name': 'Frontend Vývojář',
                'role': koder.role,
                'goal': koder.goal
            },
            {
                'id': 'tester',
                'name': 'QA Revizor',
                'role': tester.role,
                'goal': tester.goal
            },
            {
                'id': 'documenter',
                'name': 'Technický Dokumentarista',
                'role': dokumentarista.role,
                'goal': dokumentarista.goal
            }
        ]
    })

@app.route('/crewai', methods=['POST'])
def crewai_chat():
    """Spustí CrewAI tým na zadaný úkol"""
    data = request.get_json()
    tema_webu = data.get('prompt', 'Moderní landing page pro kavárnu')
    selected_agents = data.get('agents', ['orchestrator', 'architect', 'coder', 'tester', 'documenter'])
    use_orchestrator = data.get('use_orchestrator', True)

    # Mapování agentů podle vybraných ID
    agent_map = {
        'orchestrator': orchestrator,
        'architect': architekt,
        'coder': koder,
        'tester': tester,
        'documenter': dokumentarista
    }

    # Vytvoření úkolů pro vybrané agenty
    tasks = []
    agents_list = []

    if use_orchestrator and 'orchestrator' in selected_agents:
        # Orchestrator mode - koordinuje ostatní agenty
        agents_list.append(orchestrator)
        tasks.append(Task(
            description=f'Analyzuj tento úkol a koordinuj práci týmu: {tema_webu}',
            agent=orchestrator,
            expected_output='Plán rozdělení úkolů a koordinace.'
        ))

    if 'architect' in selected_agents:
        agents_list.append(architekt)
        tasks.append(Task(
            description=f'Navrhni strukturu pro webovou stránku na téma: {tema_webu}',
            agent=architekt,
            expected_output='Seznam sekcí a popis designu.'
        ))

    if 'coder' in selected_agents:
        agents_list.append(koder)
        tasks.append(Task(
            description='Napiš HTML a CSS kód podle návrhu architekta.',
            agent=koder,
            expected_output='Kompletní blok kódu v HTML/CSS.'
        ))

    if 'tester' in selected_agents:
        agents_list.append(tester)
        tasks.append(Task(
            description='Zkontroluj kód od vývojáře a navrhni opravy, pokud jsou nutné.',
            agent=tester,
            expected_output='Seznam oprav nebo potvrzení, že je kód v pořádku.'
        ))

    if 'documenter' in selected_agents:
        agents_list.append(dokumentarista)
        tasks.append(Task(
            description='Vytvoř stručný návod, jak tento kód použít a co která část dělá.',
            agent=dokumentarista,
            expected_output='Stručný manuál v češtině.'
        ))

    # Sestavení týmu
    posadka = Crew(
        agents=agents_list,
        tasks=tasks,
        process=Process.sequential
    )

    try:
        # Spuštění
        vysledek = posadka.kickoff(inputs={'tema_webu': tema_webu})
        return jsonify({
            'success': True,
            'result': str(vysledek),
            'agents_used': selected_agents
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/agent/task', methods=['POST'])
def single_agent_task():
    """Spustí jeden konkrétní agent s vlastním úkolem"""
    data = request.get_json()
    agent_id = data.get('agent_id')
    task_description = data.get('task')

    agent_map = {
        'orchestrator': orchestrator,
        'architect': architekt,
        'coder': koder,
        'tester': tester,
        'documenter': dokumentarista
    }

    if agent_id not in agent_map:
        return jsonify({'success': False, 'error': 'Invalid agent ID'}), 400

    agent = agent_map[agent_id]

    try:
        task = Task(
            description=task_description,
            agent=agent,
            expected_output='Detailní odpověď.'
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential
        )

        result = crew.kickoff()

        return jsonify({
            'success': True,
            'result': str(result),
            'agent': agent_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 CrewAI API Server starting on http://localhost:5005")
    print("📝 Endpoints:")
    print("   GET  /health - Health check")
    print("   GET  /agents - List available agents")
    print("   POST /crewai - Run full crew")
    print("   POST /agent/task - Run single agent")
    app.run(port=5005, host='0.0.0.0', debug=True)
