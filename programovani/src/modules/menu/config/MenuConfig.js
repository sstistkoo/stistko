/**
 * Menu Configuration
 * Centralized menu structure definition
 */

export const MENU_SECTIONS = [
  {
    id: 'settings',
    title: '⚙️ Nastavení',
    items: [
      { icon: '🤖', label: 'Nastavení AI', action: 'aiSettings' },
      { icon: '⚙️', label: 'Pokročilé AI nastavení', action: 'aiSettingsAdvanced' },
      { icon: '🎨', label: 'Přepnout téma', action: 'theme' }
    ]
  },
  {
    id: 'tools',
    title: '🛠️ Nástroje',
    items: [
      { icon: '📄', label: 'Vytvořit .gitignore', action: 'gitignore' },
      { icon: '🔄', label: 'Nahradit v kódu', action: 'replace', shortcut: 'Ctrl+H' }
    ]
  },
  {
    id: 'content',
    title: '📋 Obsah',
    items: [
      { icon: '🤖', label: 'AI Generátor komponent', action: 'ai-component' },
      { icon: '🧩', label: 'Komponenty', action: 'components' },
      { icon: '📋', label: 'Šablony', action: 'templates' },
      { icon: '🖼️', label: 'Obrázky', action: 'images' }
    ]
  },
  {
    id: 'github',
    title: '🐙 GitHub',
    items: [
      { icon: '🔍', label: 'Hledat na GitHubu', action: 'github-search' },
      { icon: '🌐', label: 'Načíst z URL', action: 'load-from-url' }
    ]
  },
  {
    id: 'devtools',
    title: '🔧 Vývojářské nástroje',
    items: [
      { icon: '📊', label: 'Audit projektu', action: 'audit' },
      { icon: '📋', label: 'Error Log', action: 'error-log' },
      { icon: '🐞', label: 'Otevřít DevTools', action: 'devtools' }
    ]
  },
  {
    id: 'ai-studios',
    title: '🎨 AI Studia',
    items: [
      { icon: '🌐', label: 'AI Studia pro HTML', action: 'ai-studios' }
    ]
  }
];

export const MENU_FOOTER_TEXT = '💡 Pro základní akce použijte <strong>logo ⚡</strong> nebo <strong>Ctrl+K</strong>';
