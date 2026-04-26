/**
 * Detail hesla — renderDetail, editace polí, refillSingleField.
 * Deps: state, t, escHtml,
 *       TOPIC_LABELS, refreshTopicLabels,
 *       saveProgress, renderList, updateStats, showToast, log,
 *       buildTopicPrompt, openTopicPromptModal,
 *       callAIWithRetry, extractTopicValueFromAI, translateSingle,
 *       resolveProviderForInteractiveAction, getPipelineModelForProvider,
 *       getCurrentApiKey, getSystemMessage
 */
import { hasMeaningfulValue, isTranslationComplete } from '../translation/utils.js';
export function createDetailApi({
  state, t, escHtml,
  TOPIC_LABELS, refreshTopicLabels,
  saveProgress, renderList, updateStats, showToast, log,
  buildTopicPrompt, openTopicPromptModal,
  callAIWithRetry, extractTopicValueFromAI, translateSingle,
  resolveProviderForInteractiveAction, getPipelineModelForProvider,
  getCurrentApiKey, getSystemMessage
}) {

  function renderTranslation(key, tr) {
    refreshTopicLabels();
    const e = state.entryMap.get(key) || {};
    const sourceCzDef = String(e.czDef || '').trim();
    const translatedDef = String(tr?.definice || '').trim();
    const looksEnglish = /(\bin general\b|\bused of\b|\bin itself\b|\bthat which\b|\bopposite to\b|\bwhere it is contrasted\b|\bsee word\b|\bSYN\.:|\bchiefly for\b)/i.test(translatedDef);
    const hasDetailedTranslatedDef = translatedDef.length >= 80 && /(\b1\.\b|\b2\.\b|[a-z]\)|\(|\[)/i.test(translatedDef);
    const shouldPreferSourceDef = hasMeaningfulValue(sourceCzDef) && (looksEnglish || !hasDetailedTranslatedDef);
    const definitionDisplay = shouldPreferSourceDef ? sourceCzDef : translatedDef;

    const sections = [
      { id: 'definice',    label: TOPIC_LABELS.definice,    field: definitionDisplay },
      { id: 'vyznam',      label: TOPIC_LABELS.vyznam,      field: tr?.vyznam },
      { id: 'kjv',         label: TOPIC_LABELS.kjv,         field: tr?.kjv },
      { id: 'pouziti',     label: TOPIC_LABELS.pouziti,     field: tr?.pouziti },
      { id: 'puvod',       label: TOPIC_LABELS.puvod,       field: tr?.puvod },
      { id: 'specialista', label: TOPIC_LABELS.specialista, field: tr?.specialista }
    ];

    return sections.map(s => `
      <div class="translation-box" role="group" aria-label="${s.label}">
        <div class="tbox-head">
          <div class="tbox-label">${s.label}</div>
          <div class="tbox-actions">
            <button class="tbox-btn" onclick="openTopicPromptModal('${key}','${s.id}')" aria-label="${escHtml(t('detail.promptButton.aria', { label: s.label }))}">${t('detail.promptButton')}</button>
            ${!hasMeaningfulValue(s.field) ? `<button class="tbox-btn" onclick="refillSingleField('${key}','${s.id}')" aria-label="${escHtml(t('detail.refillButton.aria', { label: s.label }))}">${t('detail.refillButton')}</button>` : ''}
            <button class="tbox-btn" onclick="toggleEditSection('${key}','${s.id}')" aria-label="${escHtml(t('detail.editButton.aria', { label: s.label }))}">${t('detail.editButton')}</button>
          </div>
        </div>
        <div class="tbox-body" id="tval-${key}-${s.id}">${escHtml(s.field || '—')}</div>
        <div class="tbox-edit" id="tedit-${key}-${s.id}">
          <textarea id="tinput-${key}-${s.id}" aria-label="${s.label}">${escHtml(s.field || '')}</textarea>
          <button class="tbox-save" onclick="saveSection('${key}','${s.id}')" aria-label="${escHtml(t('detail.saveButton.aria', { label: s.label }))}">${t('detail.saveButton')}</button>
        </div>
      </div>
    `).join('');
  }

  function renderDetail() {
    if (!state.activeKey) return;
    const e = state.entryMap.get(state.activeKey);
    if (!e) return;
    const tr = state.translated[state.activeKey];
    const hasTranslation = isTranslationComplete(tr);
    const pane = document.getElementById('detailPane');
    const detailLabel = {
      studyLinks:      t('detail.label.studyLinks'),
      transliteration: t('detail.label.transliteration'),
      grammar:         t('detail.label.grammar'),
      definitionEn:    t('detail.label.definitionEn'),
      englishSource:   t('detail.label.englishSource'),
      kjv:             t('detail.label.kjv'),
      usageKjv:        t('detail.label.usageKjv'),
      vocalization:    t('detail.label.vocalization'),
      pronunciation:   t('detail.label.pronunciation'),
      etymology:       t('detail.label.etymology'),
      occurrence:      t('detail.label.occurrence'),
      twot:            t('detail.label.twot'),
      notes:           t('detail.label.notes'),
      greekRefs:       t('detail.label.greekRefs'),
      category:        t('detail.label.category'),
      meaningCz:       t('detail.label.meaningCz')
    };

    const num = parseInt(state.activeKey.slice(1));
    const isGreek  = state.activeKey.startsWith('G');
    const isHebrew = state.activeKey.startsWith('H') && num < 9000;
    const isGrammar = state.activeKey.startsWith('H') && num >= 9000;
    const definitionEn = (e.definice || e.def || '').trim();
    const englishSourceRaw = (e.en || e.enDef || '').trim();
    const englishSource = (englishSourceRaw && englishSourceRaw !== definitionEn) ? englishSourceRaw : '';
    const strongNum = state.activeKey.slice(1);
    const bibleHubPath = state.activeKey.startsWith('H') ? 'hebrew' : 'greek';
    const studyLinks = `
      <div class="orig-section">
        <div class="label">${detailLabel.studyLinks}</div>
        <div class="value">
          <a href="https://biblehub.com/${bibleHubPath}/${strongNum}.htm" target="_blank" rel="noopener noreferrer">BibleHub</a> ·
          <a href="https://www.blueletterbible.org/lexicon/${state.activeKey}/kjv/tr/0-1/" target="_blank" rel="noopener noreferrer">Blue Letter Bible</a> ·
          <a href="https://www.stepbible.org/?q=strong=${state.activeKey}" target="_blank" rel="noopener noreferrer">STEP Bible</a>
        </div>
      </div>`;
    const editableSourceSection = (label, field, value) => `
      <div class="orig-section">
        <div class="label">${label}</div>
        <div style="display:flex;gap:6px;align-items:center;justify-content:space-between;flex-wrap:wrap">
          <div class="value" id="srcval-${state.activeKey}-${field}" style="margin:0;flex:1 1 auto">${escHtml(value || '—')}</div>
          <button class="tbox-btn" type="button" onclick="toggleSourceEntryEdit('${state.activeKey}','${field}')">${t('detail.source.edit')}</button>
        </div>
        <div class="tbox-edit" id="srcedit-${state.activeKey}-${field}">
          <textarea id="srcinput-${state.activeKey}-${field}" aria-label="${label}">${escHtml(value || '')}</textarea>
          <button class="tbox-save" type="button" onclick="saveSourceEntryField('${state.activeKey}','${field}')">${t('detail.saveButton')}</button>
        </div>
      </div>`;

    let sections = '';
    if (isGreek) {
      sections = `
        ${editableSourceSection('Beta Code', 'beta', e.beta)}
        ${editableSourceSection(detailLabel.transliteration, 'prepis', e.prepis)}
        ${editableSourceSection(detailLabel.grammar, 'tvaroslovi', e.tvaroslovi)}
        ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
        ${englishSource ? `<div class="orig-section"><div class="label">${detailLabel.englishSource}</div><div class="value">${escHtml(englishSource)}</div></div>` : ''}
        ${editableSourceSection(detailLabel.kjv, 'kjv', e.kjv)}
        ${editableSourceSection(detailLabel.usageKjv, 'vyskyt', e.vyskyt)}
        ${studyLinks}`;
    } else if (isHebrew) {
      sections = `
        <div class="orig-section"><div class="label">${detailLabel.vocalization}</div><div class="value">${escHtml(e.vokalizace || '—')}</div></div>
        <div class="orig-section"><div class="label">${detailLabel.pronunciation}</div><div class="value">${escHtml(e.prepis || '—')}</div></div>
        ${editableSourceSection(detailLabel.etymology, 'puvod', e.puvod)}
        ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
        ${englishSource ? `<div class="orig-section"><div class="label">${detailLabel.englishSource}</div><div class="value">${escHtml(englishSource)}</div></div>` : ''}
        ${editableSourceSection(detailLabel.kjv, 'kjv', e.kjv)}
        ${editableSourceSection(detailLabel.usageKjv, 'vyskyt', e.vyskyt)}
        ${e.twot ? `<div class="orig-section"><div class="label">${detailLabel.twot}</div><div class="value">${escHtml(e.twot)}</div></div>` : ''}
        ${studyLinks}`;
    } else {
      sections = `
        ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
        ${studyLinks}`;
    }

    const translateBtn = !hasTranslation
      ? `<button class="translate-btn" onclick="translateSingle('${state.activeKey}')">${t('translate.single.button')}</button>`
      : '';

    pane.innerHTML = `
      <div class="detail-header">
        <span class="detail-key">${state.activeKey}</span>
        <span class="detail-greek">${escHtml(e.greek || '')}</span>
        ${translateBtn}
      </div>
      <div class="detail-sections">${sections}</div>
      ${hasTranslation || tr ? `<div class="translation-section">${renderTranslation(state.activeKey, tr)}</div>` : ''}
    `;
  }

  function toggleEditSection(key, id) {
    const el = document.getElementById(`tedit-${key}-${id}`);
    el.classList.toggle('show');
    if (el.classList.contains('show')) {
      document.getElementById(`tinput-${key}-${id}`).focus();
    }
  }

  function saveSection(key, id) {
    const val = document.getElementById(`tinput-${key}-${id}`).value;
    if (!state.translated[key]) state.translated[key] = {};
    state.translated[key][id] = val;
    saveProgress();
    document.getElementById(`tval-${key}-${id}`).textContent = val || '—';
    document.getElementById(`tedit-${key}-${id}`).classList.remove('show');
  }

  function toggleSourceEntryEdit(key, field) {
    const el = document.getElementById(`srcedit-${key}-${field}`);
    if (!el) return;
    el.classList.toggle('show');
    if (el.classList.contains('show')) {
      const input = document.getElementById(`srcinput-${key}-${field}`);
      if (input) input.focus();
    }
  }

  function saveSourceEntryField(key, field) {
    const entry = state.entryMap.get(key);
    if (!entry) return;
    const input = document.getElementById(`srcinput-${key}-${field}`);
    if (!input) return;
    const next = String(input.value || '').trim();
    entry[field] = next;
    if (field === 'definice') entry.def = next;
    state.sourceEntryEdits[key] = state.sourceEntryEdits[key] || {};
    state.sourceEntryEdits[key][field] = next;
    saveProgress();
    updateStats();
    renderList();
    renderDetail();
    showToast(t('toast.detail.fieldSaved'));
  }

  async function refillSingleField(key, topicId) {
    const prov  = resolveProviderForInteractiveAction(document.getElementById('provider').value);
    const model = prov === (document.getElementById('provider').value || '')
      ? document.getElementById('model').value
      : getPipelineModelForProvider(prov);
    const apiKey = getCurrentApiKey(prov);
    if (!apiKey) {
      showToast(t('toast.apiKey.enter'));
      return;
    }
    const prompt = buildTopicPrompt(key, topicId);
    try {
      const messages = [
        { role: 'system', content: getSystemMessage() },
        { role: 'user', content: prompt }
      ];
      const raw = await callAIWithRetry(prov, apiKey, model, messages);
      const val = extractTopicValueFromAI(raw?.content || '', topicId, 'strict');
      if (!state.translated[key]) state.translated[key] = {};
      state.translated[key][topicId] = val || '—';
      saveProgress();
      renderDetail();
      renderList();
      updateStats();
      showToast(t('toast.field.filled', { topic: TOPIC_LABELS[topicId] || topicId }));
    } catch (e) {
      showToast(t('toast.error.withMessage', { message: e.message }));
    }
  }

  refreshTopicLabels();

  return {
    renderDetail,
    renderTranslation,
    toggleEditSection,
    saveSection,
    toggleSourceEntryEdit,
    saveSourceEntryField,
    refillSingleField
  };
}
