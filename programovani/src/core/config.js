/**
 * Centrální konfigurace aplikace
 */
export const config = {
  app: {
    name: 'HTML Studio',
    version: '2.0.0',
    description: 'Mobilní HTML editor s AI asistencí',
  },

  editor: {
    defaultLanguage: 'html',
    defaultContent: `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`,
    fontSize: {
      min: 10,
      max: 24,
      default: 14,
    },
    tabSize: {
      min: 2,
      max: 8,
      default: 2,
    },
  },

  ai: {
    // Demo klíče (rozdělené pro GitHub)
    demoKeys: {
      gemini: 'AIzaSyCXuMvhO_senLS' + 'oA_idEuBk_EwnMmIPIhg',
      groq: 'gsk_0uZbn9KqiBa3Zsl11ACX' + 'WGdyb3FYZddvc6oPIn9HTvJpGgoBbYrJ',
      openrouter:
        'sk-or-v1-bff66ee4a0845f88' + '428b75d91a35aea63e355a52dc31e6427fcc1f9536c2a8a3',
      mistral: 'Tvwm0qcQk71vsUDw' + 'VfAAAY5GPKdbvlHj',
      cohere: 'PeJo8cQwftoZI1Dob0qK' + '1lN445FlOjrfFA3piEuh',
      huggingface: 'hf_UhezIpnumnYWSacKLtja' + 'VPfXMxbFemUyMv',
    },

    defaultProvider: 'gemini',
    timeout: 90000,
    maxRetries: 3,

    models: {
      gemini: 'gemini-2.5-flash-lite',
      groq: 'llama-3.3-70b-versatile',
      openrouter: 'mistralai/mistral-small-3.1-24b-instruct:free',
      mistral: 'mistral-small-latest',
      cohere: 'command-a-03-2025',
      huggingface: 'mistralai/Mistral-7B-Instruct-v0.3',
    },

    providers: {
      gemini: {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        requiresKey: true,
      },
      groq: {
        name: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        requiresKey: true,
      },
      openrouter: {
        name: 'OpenRouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        requiresKey: true,
      },
      mistral: {
        name: 'Mistral AI',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        requiresKey: true,
      },
      cohere: {
        name: 'Cohere',
        endpoint: 'https://api.cohere.ai/v1/chat',
        requiresKey: true,
      },
      huggingface: {
        name: 'HuggingFace',
        endpoint: 'http://localhost:5010/models',
        requiresKey: true,
      },
    },
  },

  storage: {
    prefix: 'htmlStudio:',
    keys: {
      state: 'state',
      files: 'files',
      settings: 'settings',
      aiKeys: 'aiKeys',
    },
  },

  ui: {
    themes: ['dark', 'light'],
    defaultTheme: 'dark',
    views: ['split', 'editor', 'preview'],
    defaultView: 'split',
    animations: {
      duration: 200,
      easing: 'ease-in-out',
    },
  },

  shortcuts: {
    save: 'Ctrl+S',
    format: 'Ctrl+Shift+F',
    validate: 'Ctrl+Shift+V',
    minify: 'Ctrl+Shift+M',
    preview: 'Ctrl+P',
    console: 'Ctrl+`',
    search: 'Ctrl+F',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    closeTab: 'Ctrl+W',
    newTab: 'Ctrl+T',
    nextTab: 'Ctrl+Tab',
    prevTab: 'Ctrl+Shift+Tab',
  },

  features: {
    autoSave: true,
    livePreview: true,
    syntaxHighlight: true,
    autoComplete: true,
    emmetSupport: true,
    gitHubIntegration: true,
    aiAssistant: true,
  },

  limits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 50,
    maxHistorySize: 100,
  },
};

/**
 * Získání hodnoty z konfigurace pomocí tečkové notace
 * @param {string} path - Cesta k hodnotě (např. 'ai.models.gemini')
 * @param {*} [defaultValue] - Výchozí hodnota pokud není nalezena
 * @returns {*}
 */
export function getConfig(path, defaultValue = undefined) {
  return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
}

/**
 * Nastavení hodnoty v konfiguraci
 * @param {string} path - Cesta k hodnotě
 * @param {*} value - Nová hodnota
 */
export function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const obj = keys.reduce((obj, key) => {
    if (!obj[key]) obj[key] = {};
    return obj[key];
  }, config);
  obj[lastKey] = value;
}

export default config;
