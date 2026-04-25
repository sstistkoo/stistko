export function createExportApi({ state, t, showToast }) {
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
      return [
        `${e.key} | ${e.greek}`,
        `Gramatika: ${e.tvaroslovi || '—'}`,
        `Český význam: ${tr.vyznam || '—'}`,
        `Definice (EN): ${e.definice || e.def || '—'}`,
        `Česká definice: ${tr.definice || '—'}`,
        `KJV překlady (CZ): ${tr.kjv || e.kjv || '—'}`,
        `Biblické užití: ${tr.pouziti || e.vyskyt || '—'}`,
        `Původ: ${tr.puvod || '—'}`,
        `Specialista: ${tr.specialista || '—'}`,
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
      return [
        `${e.key} | ${e.greek}`,
        `Český význam: ${tr.vyznam || '—'}`,
        `Definice: ${tr.definice || '—'}`,
        `Biblické užití: ${tr.pouziti || '—'}`,
        `Původ: ${tr.puvod || '—'}`,
        ''
      ].join('\n');
    });

    download(`strong_gr_cz_G${from}-G${to}.txt`, lines.join('\n'), 'text/plain');
    showToast(t('toast.exported.range', { count: done.length, from: `G${from}`, to: `G${to}` }));
  }

  return { download, exportTXT, exportJSON, exportRange };
}
