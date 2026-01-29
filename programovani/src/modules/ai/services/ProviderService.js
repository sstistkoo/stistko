/**
 * ProviderService.js
 * Service pro správu AI providerů, modelů a Auto AI
 * Extrahováno z AIPanel.js
 */

import { eventBus } from '../../../core/events.js';
import { toast } from '../../../ui/components/Toast.js';

export class ProviderService {
  constructor(panel) {
    this.panel = panel;
    this.favoriteModels = JSON.parse(localStorage.getItem('ai_favorite_models') || '{}');
    console.log('[ProviderService] Initialized');
  }

  /**
   * Generate HTML options for provider select
   */
  generateProviderOptions() {
    // Načti providery z AI modulu
    if (typeof window.AI === 'undefined' || !window.AI.getAllProvidersWithModels) {
      return `
        <option value="groq">Groq</option>
        <option value="gemini">Google Gemini</option>
        <option value="openrouter">OpenRouter</option>
        <option value="mistral">Mistral</option>
        <option value="cohere">Cohere</option>
        <option value="huggingface">HuggingFace</option>
      `;
    }

    const allProviders = window.AI.getAllProvidersWithModels();
    return Object.entries(allProviders)
      .map(([key, data]) => `<option value="${key}">${data.name}</option>`)
      .join('');
  }

  /**
   * Update models dropdown based on selected provider
   */
  async updateModels(provider) {
    const modelSelect = this.panel.modal?.element?.querySelector('#aiModel');
    if (!modelSelect) return;

    // Načti modely z AI modulu
    if (typeof window.AI === 'undefined' || !window.AI.getAllProvidersWithModels) {
      console.warn('AI module not loaded, using fallback models');
      modelSelect.innerHTML = '<option value="">AI modul není načten</option>';
      return;
    }

    const allProviders = window.AI.getAllProvidersWithModels();
    const providerData = allProviders[provider];
    const favoriteModels = JSON.parse(localStorage.getItem('favoriteModels') || '[]');

    if (providerData && Array.isArray(providerData.models)) {
      modelSelect.innerHTML = providerData.models
        .map(m => {
          const isFavorite = favoriteModels.includes(`${provider}:${m.value}`);
          const star = isFavorite ? '⭐ ' : '';
          const freeLabel = m.free ? '🟢 FREE' : '💰 Paid';
          const rpmLabel = `${m.rpm} RPM`;
          const contextLabel = m.context || '';
          const info = `${freeLabel} | ${rpmLabel} | ${contextLabel}`;
          return `<option value="${m.value}" title="${m.description || ''}" data-favorite="${isFavorite}" data-provider="${provider}">${star}${m.label} (${info})</option>`;
        })
        .join('');

      // Add double-click handler for favoriting
      modelSelect.addEventListener('dblclick', () => {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (selectedOption) {
          this.toggleModelFavorite(provider, selectedOption.value);
        }
      });

      modelSelect.disabled = false;
    } else {
      modelSelect.innerHTML = '<option value="">Žádné modely</option>';
    }
  }

  /**
   * Get available models for provider
   */
  async getModelsForProvider(provider) {
    const modelsByProvider = {
      gemini: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
      ],
      groq: [
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
        { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
        { value: 'gemma2-9b-it', label: 'Gemma 2 9B' }
      ],
      openrouter: [
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (Free)' },
        { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' }
      ],
      mistral: [
        { value: 'mistral-large-latest', label: 'Mistral Large' },
        { value: 'mistral-medium-latest', label: 'Mistral Medium' },
        { value: 'mistral-small-latest', label: 'Mistral Small' },
        { value: 'codestral-latest', label: 'Codestral' }
      ],
      huggingface: [
        { value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B' },
        { value: 'microsoft/Phi-3-mini-4k-instruct', label: 'Phi-3 Mini' },
        { value: 'bigcode/starcoder2-15b', label: 'StarCoder2 15B' }
      ]
    };

    return modelsByProvider[provider] || [];
  }

  /**
   * Toggle model as favorite
   */
  toggleModelFavorite(provider, modelValue) {
    const favoriteModels = JSON.parse(localStorage.getItem('favoriteModels') || '[]');
    const modelKey = `${provider}:${modelValue}`;

    const index = favoriteModels.indexOf(modelKey);
    if (index > -1) {
      favoriteModels.splice(index, 1);
      toast.success('Model odebrán z oblíbených', 1500);
    } else {
      favoriteModels.push(modelKey);
      toast.success('⭐ Model přidán do oblíbených', 1500);
    }

    localStorage.setItem('favoriteModels', JSON.stringify(favoriteModels));

    // Refresh model list
    const providerSelect = this.panel.modal?.element?.querySelector('#aiProvider');
    if (providerSelect) {
      this.updateModels(providerSelect.value);
    }
  }

  /**
   * Update Auto AI state
   */
  updateAutoAIState() {
    const autoAICheckbox = this.panel.modal?.element?.querySelector('#autoAI');
    const providerSelect = this.panel.modal?.element?.querySelector('#aiProvider');
    const modelSelect = this.panel.modal?.element?.querySelector('#aiModel');

    if (!autoAICheckbox) return;

    const isAutoMode = autoAICheckbox.checked;
    localStorage.setItem('ai_autoAI', isAutoMode);

    // Disable provider/model selects when Auto AI is enabled
    if (providerSelect) {
      providerSelect.disabled = isAutoMode;
      providerSelect.style.opacity = isAutoMode ? '0.6' : '1';
      providerSelect.style.cursor = isAutoMode ? 'not-allowed' : 'pointer';
    }

    if (modelSelect) {
      modelSelect.disabled = isAutoMode;
      modelSelect.style.opacity = isAutoMode ? '0.6' : '1';
      modelSelect.style.cursor = isAutoMode ? 'not-allowed' : 'pointer';
    }

    // Update visual feedback
    if (isAutoMode) {
      providerSelect?.setAttribute('title', '🤖 Auto AI aktivní - provider se vybírá automaticky');
      modelSelect?.setAttribute('title', '🤖 Auto AI aktivní - model se vybírá automaticky');
      console.log('[ProviderService] Auto AI enabled - model will be selected automatically');
    } else {
      providerSelect?.setAttribute('title', 'Vyberte AI providera');
      modelSelect?.setAttribute('title', 'Vyberte AI model');
      console.log('[ProviderService] Auto AI disabled - manual model selection');
    }
  }

  /**
   * Get current provider setting
   */
  getCurrentProvider() {
    const select = this.panel.modal?.element?.querySelector('#aiProvider');
    return select?.value || 'gemini';
  }

  /**
   * Get current model setting
   */
  getCurrentModel() {
    const select = this.panel.modal?.element?.querySelector('#aiModel');
    return select?.value || '';
  }

  /**
   * Check if Auto AI is enabled
   */
  isAutoAIEnabled() {
    const checkbox = this.panel.modal?.element?.querySelector('#autoAI');
    return checkbox?.checked ?? true;
  }

  /**
   * Initialize provider/model state from localStorage
   */
  initializeFromStorage() {
    const savedAutoAI = localStorage.getItem('ai_autoAI');
    const autoAICheckbox = this.panel.modal?.element?.querySelector('#autoAI');

    if (autoAICheckbox && savedAutoAI !== null) {
      autoAICheckbox.checked = savedAutoAI === 'true';
    }

    this.updateAutoAIState();
  }
}
