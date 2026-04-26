export function createExportApi({ state, t, showToast }) {
  function getUiTag() {
    const ui = String(localStorage.getItem('strong_ui_lang') || 'cs').toLowerCase();
    if (ui === 'en') return 'EN';
    if (ui === 'sk') return 'SK';
    if (ui === 'pl') return 'PL';
    return 'CZ';
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  function exportTXT() {
    const done = state.entries.filter(e => {
      const tr = state.translated[e.key];
      return tr && tr.vyznam && tr.vyznam !== '—' && !tr.skipped;
    });
    if (!done.length) {
      showToast(t('toast.noTranslatedEntry'));
      return;
    }

    const lines = done.map(e => {
      const tr = state.translated[e.key];
      const langTag = getUiTag();
      return [
        `${e.key} | ${e.greek}`,
        `${t('export.field.grammar')}: ${e.tvaroslovi || '—'}`,
        `${t('export.field.meaning', { lang: langTag })}: ${tr.vyznam || '—'}`,
        `${t('export.field.definitionEn')}: ${e.definice || e.def || '—'}`,
        `${t('export.field.definition', { lang: langTag })}: ${tr.definice || '—'}`,
        `${t('export.field.kjv', { lang: langTag })}: ${tr.kjv || e.kjv || '—'}`,
        `${t('export.field.usage')}: ${tr.pouziti || e.vyskyt || '—'}`,
        `${t('export.field.origin')}: ${tr.puvod || '—'}`,
        `${t('export.field.specialist')}: ${tr.specialista || '—'}`,
        ''
      ].join('\n');
    });

    download('strong_gr_cz_v2.txt', lines.join('\n'), 'text/plain');
    showToast(t('toast.exported.count', { count: done.length }));
  }

  function exportJSON() {
    const out = {};
    for (const e of state.entries) {
      if (!state.translated[e.key]) continue;
      out[e.key] = { greek: e.greek, ...state.translated[e.key] };
    }
    download('strong_gr_cz_v2.json', JSON.stringify(out, null, 2), 'application/json');
    showToast(t('toast.exported.count', { count: Object.keys(out).length }));
  }

  function exportRange() {
    const from = parseInt(prompt(t('prompt.range.from'), '1') || '1', 10);
    const to = parseInt(prompt(t('prompt.range.to'), '100') || '100', 10);
    if (Number.isNaN(from) || Number.isNaN(to)) return;

    const done = state.entries.filter(e => {
      const n = parseInt(e.key.slice(1), 10);
      const tr = state.translated[e.key];
      return n >= from && n <= to && tr && tr.vyznam && tr.vyznam !== '—' && !tr.skipped;
    });
    if (!done.length) {
      showToast(t('toast.noTranslatedInRange', { from: `G${from}`, to: `G${to}` }));
      return;
    }

    const lines = done.map(e => {
      const tr = state.translated[e.key];
      const langTag = getUiTag();
      return [
        `${e.key} | ${e.greek}`,
        `${t('export.field.meaning', { lang: langTag })}: ${tr.vyznam || '—'}`,
        `${t('export.field.definition', { lang: langTag })}: ${tr.definice || '—'}`,
        `${t('export.field.usage')}: ${tr.pouziti || '—'}`,
        `${t('export.field.origin')}: ${tr.puvod || '—'}`,
        ''
      ].join('\n');
    });

    download(`strong_gr_cz_G${from}-G${to}.txt`, lines.join('\n'), 'text/plain');
    showToast(t('toast.exported.range', { count: done.length, from: `G${from}`, to: `G${to}` }));
  }

  return { download, exportTXT, exportJSON, exportRange };
}
