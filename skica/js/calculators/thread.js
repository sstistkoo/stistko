import { showToast } from '../state.js';
import { safeEvalMath } from '../utils.js';
import { makeOverlay } from '../dialogFactory.js';

export function openThreadCalc() {
  // ── DATA ──────────────────────────────────────────────────
  // M hrubé – ISO 261, úhel 60°
  var mCoarse = [
    {D:1,P:0.25},{D:1.1,P:0.25},{D:1.2,P:0.25},{D:1.4,P:0.3},{D:1.6,P:0.35},
    {D:1.8,P:0.35},{D:2,P:0.4},{D:2.2,P:0.45},{D:2.5,P:0.45},{D:3,P:0.5},
    {D:3.5,P:0.6},{D:4,P:0.7},{D:4.5,P:0.75},{D:5,P:0.8},{D:6,P:1},
    {D:7,P:1},{D:8,P:1.25},{D:9,P:1.25},{D:10,P:1.5},{D:11,P:1.5},
    {D:12,P:1.75},{D:14,P:2},{D:16,P:2},{D:18,P:2.5},{D:20,P:2.5},
    {D:22,P:2.5},{D:24,P:3},{D:27,P:3},{D:30,P:3.5},{D:33,P:3.5},
    {D:36,P:4},{D:39,P:4},{D:42,P:4.5},{D:45,P:4.5},{D:48,P:5},
    {D:52,P:5},{D:56,P:5.5},{D:60,P:5.5},{D:64,P:6},{D:68,P:6},
  ];

  // M jemné – ISO 261, úhel 60°
  var mFine = [
    {D:8,P:1},{D:8,P:0.75},{D:10,P:1.25},{D:10,P:1},{D:10,P:0.75},
    {D:12,P:1.5},{D:12,P:1.25},{D:12,P:1},{D:14,P:1.5},{D:14,P:1.25},
    {D:14,P:1},{D:16,P:1.5},{D:16,P:1},{D:18,P:2},{D:18,P:1.5},
    {D:18,P:1},{D:20,P:2},{D:20,P:1.5},{D:20,P:1},{D:22,P:2},
    {D:22,P:1.5},{D:22,P:1},{D:24,P:2},{D:24,P:1.5},{D:24,P:1},
    {D:27,P:2},{D:27,P:1.5},{D:27,P:1},{D:30,P:2},{D:30,P:1.5},
    {D:30,P:1},{D:33,P:2},{D:33,P:1.5},{D:36,P:3},{D:36,P:2},
    {D:36,P:1.5},{D:39,P:3},{D:39,P:2},{D:39,P:1.5},{D:42,P:3},
    {D:42,P:2},{D:42,P:1.5},{D:45,P:3},{D:45,P:2},{D:45,P:1.5},
    {D:48,P:3},{D:48,P:2},{D:48,P:1.5},{D:52,P:3},{D:52,P:2},
    {D:52,P:1.5},{D:56,P:3},{D:56,P:2},{D:56,P:1.5},{D:60,P:3},
    {D:60,P:2},{D:60,P:1.5},{D:64,P:3},{D:64,P:2},{D:64,P:1.5},
    {D:68,P:3},{D:68,P:2},{D:68,P:1.5},
  ];

  // G (BSP) trubkový válcový – ISO 228, úhel 55°, stoupání v TPI
  var gThreads = [
    {n:"G 1/8",    D:9.728,  tpi:28},
    {n:"G 1/4",    D:13.157, tpi:19},
    {n:"G 3/8",    D:16.662, tpi:19},
    {n:"G 1/2",    D:20.955, tpi:14},
    {n:"G 5/8",    D:22.911, tpi:14},
    {n:"G 3/4",    D:26.441, tpi:14},
    {n:"G 7/8",    D:30.201, tpi:14},
    {n:"G 1",      D:33.249, tpi:11},
    {n:"G 1 1/8",  D:37.897, tpi:11},
    {n:"G 1 1/4",  D:41.910, tpi:11},
    {n:"G 1 3/8",  D:44.323, tpi:11},
    {n:"G 1 1/2",  D:47.803, tpi:11},
    {n:"G 1 3/4",  D:53.746, tpi:11},
    {n:"G 2",      D:59.614, tpi:11},
    {n:"G 2 1/4",  D:65.710, tpi:11},
    {n:"G 2 1/2",  D:75.184, tpi:11},
    {n:"G 2 3/4",  D:81.534, tpi:11},
    {n:"G 3",      D:87.884, tpi:11},
    {n:"G 3 1/2",  D:100.330,tpi:11},
    {n:"G 4",      D:113.030,tpi:11},
  ];

  // Tr trapézový – ISO 2904, úhel 30°
  var trThreads = [
    {D:8,P:1.5},{D:9,P:1.5},{D:9,P:2},{D:10,P:2},{D:10,P:3},
    {D:11,P:2},{D:11,P:3},{D:12,P:2},{D:12,P:3},{D:14,P:2},
    {D:14,P:3},{D:16,P:2},{D:16,P:4},{D:18,P:2},{D:18,P:4},
    {D:20,P:2},{D:20,P:4},{D:22,P:3},{D:22,P:5},{D:24,P:3},
    {D:24,P:5},{D:26,P:3},{D:26,P:5},{D:28,P:3},{D:28,P:5},
    {D:30,P:3},{D:30,P:6},{D:32,P:3},{D:32,P:6},{D:34,P:3},
    {D:34,P:6},{D:36,P:3},{D:36,P:6},{D:38,P:3},{D:38,P:7},
    {D:40,P:3},{D:40,P:7},{D:42,P:3},{D:42,P:7},{D:44,P:3},
    {D:44,P:7},{D:46,P:3},{D:46,P:8},{D:48,P:3},{D:48,P:8},
    {D:50,P:3},{D:50,P:8},{D:52,P:3},{D:52,P:8},{D:55,P:3},
    {D:55,P:9},{D:60,P:3},{D:60,P:9},{D:65,P:4},{D:65,P:10},
    {D:70,P:4},{D:70,P:10},{D:75,P:4},{D:75,P:10},{D:80,P:4},
    {D:80,P:10},{D:85,P:4},{D:85,P:12},{D:90,P:4},{D:90,P:12},
    {D:95,P:4},{D:95,P:12},{D:100,P:4},{D:100,P:12},
  ];

  // UNC – Unified National Coarse (ASME B1.1), úhel 60°
  var uncThreads = [
    {n:'#1',   D:1.854, tpi:64},  {n:'#2',   D:2.184, tpi:56},
    {n:'#3',   D:2.515, tpi:48},  {n:'#4',   D:2.845, tpi:40},
    {n:'#5',   D:3.175, tpi:40},  {n:'#6',   D:3.505, tpi:32},
    {n:'#8',   D:4.166, tpi:32},  {n:'#10',  D:4.826, tpi:24},
    {n:'#12',  D:5.486, tpi:24},
    {n:'1/4"',  D:6.350, tpi:20},  {n:'5/16"', D:7.938, tpi:18},
    {n:'3/8"',  D:9.525, tpi:16},  {n:'7/16"', D:11.112,tpi:14},
    {n:'1/2"',  D:12.700,tpi:13},  {n:'9/16"', D:14.288,tpi:12},
    {n:'5/8"',  D:15.875,tpi:11},  {n:'3/4"',  D:19.050,tpi:10},
    {n:'7/8"',  D:22.225,tpi:9},   {n:'1"',    D:25.400,tpi:8},
    {n:'1-1/8"',D:28.575,tpi:7},   {n:'1-1/4"',D:31.750,tpi:7},
    {n:'1-3/8"',D:34.925,tpi:6},   {n:'1-1/2"',D:38.100,tpi:6},
    {n:'1-3/4"',D:44.450,tpi:5},   {n:'2"',    D:50.800,tpi:4.5},
    {n:'2-1/4"',D:57.150,tpi:4.5}, {n:'2-1/2"',D:63.500,tpi:4},
    {n:'2-3/4"',D:69.850,tpi:4},   {n:'3"',    D:76.200,tpi:4},
    {n:'3-1/4"',D:82.550,tpi:4},   {n:'3-1/2"',D:88.900,tpi:4},
    {n:'3-3/4"',D:95.250,tpi:4},   {n:'4"',    D:101.600,tpi:4},
  ];

  // UNF – Unified National Fine (ASME B1.1), úhel 60°
  var unfThreads = [
    {n:'#0',   D:1.524, tpi:80},  {n:'#1',   D:1.854, tpi:72},
    {n:'#2',   D:2.184, tpi:64},  {n:'#3',   D:2.515, tpi:56},
    {n:'#4',   D:2.845, tpi:48},  {n:'#5',   D:3.175, tpi:44},
    {n:'#6',   D:3.505, tpi:40},  {n:'#8',   D:4.166, tpi:36},
    {n:'#10',  D:4.826, tpi:32},  {n:'#12',  D:5.486, tpi:28},
    {n:'1/4"',  D:6.350, tpi:28},  {n:'5/16"', D:7.938, tpi:24},
    {n:'3/8"',  D:9.525, tpi:24},  {n:'7/16"', D:11.112,tpi:20},
    {n:'1/2"',  D:12.700,tpi:20},  {n:'9/16"', D:14.288,tpi:18},
    {n:'5/8"',  D:15.875,tpi:18},  {n:'3/4"',  D:19.050,tpi:16},
    {n:'7/8"',  D:22.225,tpi:14},  {n:'1"',    D:25.400,tpi:12},
    {n:'1-1/8"',D:28.575,tpi:12},  {n:'1-1/4"',D:31.750,tpi:12},
    {n:'1-3/8"',D:34.925,tpi:12},  {n:'1-1/2"',D:38.100,tpi:12},
  ];

  // BSW – British Standard Whitworth (BS 84), úhel 55°
  var bswThreads = [
    {n:'1/8"',  D:3.175, tpi:40},   {n:'3/16"', D:4.762, tpi:24},
    {n:'1/4"',  D:6.350, tpi:20},   {n:'5/16"', D:7.938, tpi:18},
    {n:'3/8"',  D:9.525, tpi:16},   {n:'7/16"', D:11.112,tpi:14},
    {n:'1/2"',  D:12.700,tpi:12},   {n:'9/16"', D:14.288,tpi:12},
    {n:'5/8"',  D:15.875,tpi:11},   {n:'3/4"',  D:19.050,tpi:10},
    {n:'7/8"',  D:22.225,tpi:9},    {n:'1"',    D:25.400,tpi:8},
    {n:'1-1/8"',D:28.575,tpi:7},    {n:'1-1/4"',D:31.750,tpi:7},
    {n:'1-3/8"',D:34.925,tpi:6},    {n:'1-1/2"',D:38.100,tpi:6},
    {n:'1-5/8"',D:41.275,tpi:5},    {n:'1-3/4"',D:44.450,tpi:5},
    {n:'2"',    D:50.800,tpi:4.5},   {n:'2-1/4"',D:57.150,tpi:4},
    {n:'2-1/2"',D:63.500,tpi:4},     {n:'2-3/4"',D:69.850,tpi:3.5},
    {n:'3"',    D:76.200,tpi:3.5},
  ];

  // NPT – National Pipe Taper (ASME B1.20.1), úhel 60°, kuželovitost 1:16 (1°47'24")
  var nptThreads = [
    {n:'1/16"',  D:7.938,  tpi:27},
    {n:'1/8"',   D:10.287, tpi:27},
    {n:'1/4"',   D:13.716, tpi:18},
    {n:'3/8"',   D:17.145, tpi:18},
    {n:'1/2"',   D:21.336, tpi:14},
    {n:'3/4"',   D:26.670, tpi:14},
    {n:'1"',     D:33.401, tpi:11.5},
    {n:'1-1/4"', D:42.164, tpi:11.5},
    {n:'1-1/2"', D:48.260, tpi:11.5},
    {n:'2"',     D:60.325, tpi:11.5},
    {n:'2-1/2"', D:73.025, tpi:8},
    {n:'3"',     D:88.900, tpi:8},
    {n:'3-1/2"', D:101.600,tpi:8},
    {n:'4"',     D:114.300,tpi:8},
  ];

  // Acme – pilový/lichoběžníkový (ASME B1.5), úhel 29°
  var acmeThreads = [
    {n:'1/4"',  D:6.350,  tpi:16},  {n:'5/16"', D:7.938, tpi:14},
    {n:'3/8"',  D:9.525,  tpi:12},  {n:'7/16"', D:11.112,tpi:12},
    {n:'1/2"',  D:12.700, tpi:10},  {n:'5/8"',  D:15.875,tpi:8},
    {n:'3/4"',  D:19.050, tpi:6},   {n:'7/8"',  D:22.225,tpi:6},
    {n:'1"',    D:25.400, tpi:5},    {n:'1-1/4"',D:31.750,tpi:5},
    {n:'1-1/2"',D:38.100, tpi:4},   {n:'1-3/4"',D:44.450,tpi:4},
    {n:'2"',    D:50.800, tpi:4},    {n:'2-1/2"',D:63.500,tpi:3},
    {n:'3"',    D:76.200, tpi:2},    {n:'3-1/2"',D:88.900,tpi:2},
    {n:'4"',    D:101.600,tpi:2},    {n:'5"',    D:127.000,tpi:2},
  ];

  // ── BUILD ROWS ────────────────────────────────────────────
  function buildMetricRows(arr, prefix) {
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      var lbl = prefix + t.D + (prefix === 'M' && arr === mFine ? '\u00D7' + t.P : '');
      html += '<tr data-type="' + prefix + '" data-d="' + t.D + '" data-p="' + t.P + '">' +
        '<td>' + lbl + '</td><td>' + t.P + '</td><td>' + t.D + '</td></tr>';
    }
    return html;
  }

  function buildGRows() {
    var html = '';
    for (var i = 0; i < gThreads.length; i++) {
      var g = gThreads[i];
      var P = (25.4 / g.tpi);
      html += '<tr data-type="G" data-d="' + g.D + '" data-p="' + P.toFixed(4) + '" data-tpi="' + g.tpi + '" data-n="' + g.n + '">' +
        '<td>' + g.n + '</td><td>' + g.tpi + '</td><td>' + g.D.toFixed(3) + '</td></tr>';
    }
    return html;
  }

  function buildTrRows() {
    var html = '';
    for (var i = 0; i < trThreads.length; i++) {
      var t = trThreads[i];
      html += '<tr data-type="Tr" data-d="' + t.D + '" data-p="' + t.P + '">' +
        '<td>Tr' + t.D + '\u00D7' + t.P + '</td><td>' + t.P + '</td><td>' + t.D + '</td></tr>';
    }
    return html;
  }

  function buildImperialRows(arr, prefix) {
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      var P = (25.4 / t.tpi);
      html += '<tr data-type="' + prefix + '" data-d="' + t.D + '" data-p="' + P.toFixed(4) + '" data-tpi="' + t.tpi + '" data-n="' + t.n + '">' +
        '<td>' + prefix + ' ' + t.n + '</td><td>' + t.tpi + '</td><td>' + t.D.toFixed(3) + '</td></tr>';
    }
    return html;
  }

  // ── THREAD PASSES (průchody soustružení závitu) ─────────
  function threadPassesHTML(totalDepth, label) {
    if (totalDepth <= 0) return '';
    var nPasses;
    if (totalDepth <= 0.5) nPasses = 3;
    else if (totalDepth <= 1.0) nPasses = 5;
    else if (totalDepth <= 1.5) nPasses = 7;
    else if (totalDepth <= 2.0) nPasses = 9;
    else if (totalDepth <= 3.0) nPasses = 11;
    else nPasses = Math.ceil(totalDepth / 0.25);

    var html = '<tr class="thr-sep"><td colspan="2"></td></tr>' +
      '<tr><td colspan="2" style="color:#89b4fa;font-weight:600">\uD83D\uDD27 Pr\u016Fchody ' + label + ' (' + nPasses + '\u00D7)</td></tr>';

    var cumDepth = 0;
    for (var i = 1; i <= nPasses; i++) {
      var target = totalDepth * Math.sqrt(i / nPasses);
      var cut = target - cumDepth;
      if (i === nPasses) { target = totalDepth; cut = totalDepth - cumDepth; }
      html += '<tr><td style="color:#6c7086">' + i + '.</td>' +
        '<td>ap=' + cut.toFixed(3) + '  \u2211=' + target.toFixed(3) + ' mm</td></tr>';
      cumDepth = target;
    }
    html += '<tr><td style="color:#6c7086">' + (nPasses + 1) + '.</td>' +
      '<td style="color:#a6e3a1">jisk\u0159iv\u00FD (ap=0, spring pass)</td></tr>';
    return html;
  }

  // ── DETAIL FUNCTIONS ──────────────────────────────────────
  function fmtCopy(lbl, val) {
    while (lbl.length < 16) lbl += ' ';
    return '  ' + lbl + '= ' + val;
  }

  function detailMetric(D, P, label) {
    var H    = 0.866025 * P;
    var d2   = D - 0.6495 * P;
    var d3   = D - 1.2269 * P;
    var D1   = D - 1.0825 * P;
    var hExt = 0.6134 * P;
    var hInt = 0.5413 * P;
    var As   = (Math.PI / 4) * Math.pow((d2 + d3) / 2, 2);
    var drill = D - P;
    var html = '<div class="thr-detail-title">' + label + '</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>60\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 \u0161roub d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka vn\u011Bj\u0161\u00ED</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Hloubka vnit\u0159n\u00ED</td><td><strong>' + hInt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Ta\u017En\u00FD pr\u016F\u0159ez A\u209B</td><td><strong>' + As.toFixed(2) + '</strong> mm\u00B2</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (D\u2212P)</td><td><strong>' + drill.toFixed(2) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (D\u2081)</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159eds. \u00F8 (d\u2083)</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'vn\u011Bj\u0161\u00ED') +
        threadPassesHTML(hInt, 'vnit\u0159n\u00ED') +
      '</table>';
    var copyText = label + ' (ISO 261, 60\u00B0)\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 \u0161roub d\u2083', d3.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 matice D\u2081', D1.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka vn\u011Bj\u0161\u00ED', hExt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka vnit\u0159n\u00ED', hInt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Ta\u017En\u00FD pr\u016F\u0159ez A\u209B', As.toFixed(2) + ' mm\u00B2') + '\n' +
      fmtCopy('P\u0159edvrt\u00E1n\u00ED', drill.toFixed(1) + ' mm');
    return { html: html, copyText: copyText };
  }

  function detailG(D, P, tpi, name) {
    var H    = 0.960491 * P;
    var d2   = D - 0.6403 * P;
    var d1   = D - 1.2806 * P;
    var hExt = 0.6403 * P;
    var drill = d1;
    var html = '<div class="thr-detail-title">' + name + ' \u2013 ISO 228</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>55\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2081</td><td><strong>' + d1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED</td><td><strong>' + drill.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
    var copyText = name + ' (ISO 228, 55\u00B0)\n' +
      fmtCopy('TPI', tpi) + '\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P.toFixed(4) + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 d\u2081', d1.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka profilu', hExt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('P\u0159edvrt\u00E1n\u00ED', drill.toFixed(3) + ' mm');
    return { html: html, copyText: copyText };
  }

  function detailTr(D, P, label) {
    var H1   = 0.5 * P;
    var ac   = 0.25;
    var d2   = D - 0.5 * P;
    var d3   = D - P - 2 * ac;
    var D4   = D - 2 * ac;
    var D1   = D - P;
    var hExt = H1 + ac;
    var drill = D - P - 0.5;
    var html = '<div class="thr-detail-title">' + label + ' \u2013 ISO 2904</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>30\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka profilu H\u2081</td><td>' + H1.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 \u0161roub d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 matice D\u2084</td><td><strong>' + D4.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Vnit\u0159n\u00ED \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (\u0161roub)</td><td><strong>' + d3.toFixed(2) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (matice)</td><td><strong>' + D1.toFixed(2) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
    var copyText = label + ' (ISO 2904, 30\u00B0)\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 \u0161roub d\u2083', d3.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj. \u00D8 mat. D\u2084', D4.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Vnit\u0159. \u00D8 mat. D\u2081', D1.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka profilu', hExt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('P\u0159edvrt. \u0161roub', d3.toFixed(2) + ' mm') + '\n' +
      fmtCopy('P\u0159edvrt. matice', D1.toFixed(2) + ' mm');
    return { html: html, copyText: copyText };
  }

  // UNC/UNF – 60° profil, stejné vzorce jako metrický
  function detailUN(D, P, tpi, name, std) {
    var H    = 0.866025 * P;
    var d2   = D - 0.6495 * P;
    var d3   = D - 1.2269 * P;
    var D1   = D - 1.0825 * P;
    var hExt = 0.6134 * P;
    var hInt = 0.5413 * P;
    var As   = (Math.PI / 4) * Math.pow((d2 + d3) / 2, 2);
    var drill = D1;
    var html = '<div class="thr-detail-title">' + name + ' \u2013 ' + std + '</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>60\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 \u0161roub d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka vn\u011Bj\u0161\u00ED</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Hloubka vnit\u0159n\u00ED</td><td><strong>' + hInt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Ta\u017En\u00FD pr\u016F\u0159ez A\u209B</td><td><strong>' + As.toFixed(2) + '</strong> mm\u00B2</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED</td><td><strong>' + drill.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159eds. \u00F8</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'vn\u011Bj\u0161\u00ED') +
        threadPassesHTML(hInt, 'vnit\u0159n\u00ED') +
      '</table>';
    var copyText = name + ' (' + std + ', 60\u00B0)\n' +
      fmtCopy('TPI', tpi) + '\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P.toFixed(4) + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 \u0161roub d\u2083', d3.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 matice D\u2081', D1.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka vn\u011Bj\u0161\u00ED', hExt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka vnit\u0159n\u00ED', hInt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Ta\u017En\u00FD pr\u016F\u0159ez A\u209B', As.toFixed(2) + ' mm\u00B2') + '\n' +
      fmtCopy('P\u0159edvrt\u00E1n\u00ED', drill.toFixed(3) + ' mm');
    return { html: html, copyText: copyText };
  }

  // BSW – Whitworth 55° profil
  function detailBSW(D, P, tpi, name) {
    var H    = 0.960491 * P;
    var d2   = D - 0.6403 * P;
    var d1   = D - 1.2806 * P;
    var hExt = 0.6403 * P;
    var drill = d1;
    var html = '<div class="thr-detail-title">' + name + ' \u2013 BS 84 (Whitworth)</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>55\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2081</td><td><strong>' + d1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED</td><td><strong>' + drill.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
    var copyText = name + ' (BS 84 Whitworth, 55\u00B0)\n' +
      fmtCopy('TPI', tpi) + '\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P.toFixed(4) + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 d\u2081', d1.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka profilu', hExt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('P\u0159edvrt\u00E1n\u00ED', drill.toFixed(3) + ' mm');
    return { html: html, copyText: copyText };
  }

  // NPT – 60° profil, kuželový 1:16
  function detailNPT(D, P, tpi, name) {
    var H    = 0.866025 * P;
    var d2   = D - 0.6495 * P;
    var d3   = D - 1.2269 * P;
    var hExt = 0.6134 * P;
    var taperAngle = '1\u00B047\u203224"';
    var taperRate = '1:16 (6,25 %)';
    var html = '<div class="thr-detail-title">' + name + ' \u2013 ASME B1.20.1</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>60\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>\u26A0 Ku\u017Eelovitost</td><td><strong>' + taperRate + '</strong></td></tr>' +
        '<tr><td>\u00DAhel ku\u017Eele</td><td><strong>' + taperAngle + '</strong></td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
    var copyText = name + ' (ASME B1.20.1, 60\u00B0, ku\u017Eel 1:16)\n' +
      fmtCopy('TPI', tpi) + '\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P.toFixed(4) + ' mm') + '\n' +
      fmtCopy('Ku\u017Eelovitost', taperRate) + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 d\u2083', d3.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka profilu', hExt.toFixed(3) + ' mm');
    return { html: html, copyText: copyText };
  }

  // Acme – 29° profil
  function detailAcme(D, P, tpi, name) {
    var H1   = 0.5 * P;
    var ac   = 0.25;
    var d2   = D - 0.5 * P;
    var d3   = D - P - 2 * ac;
    var D1   = D - P;
    var hExt = H1 + ac;
    var html = '<div class="thr-detail-title">' + name + ' \u2013 ASME B1.5 (Acme)</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>29\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka profilu H\u2081</td><td>' + H1.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Vnit\u0159n\u00ED \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (\u0161roub)</td><td><strong>' + d3.toFixed(2) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (matice)</td><td><strong>' + D1.toFixed(2) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
    var copyText = name + ' (ASME B1.5 Acme, 29\u00B0)\n' +
      fmtCopy('TPI', tpi) + '\n' +
      fmtCopy('Stoup\u00E1n\u00ED P', P.toFixed(4) + ' mm') + '\n' +
      fmtCopy('Vn\u011Bj\u0161\u00ED \u00D8 D', D.toFixed(3) + ' mm') + '\n' +
      fmtCopy('St\u0159edn\u00ED \u00D8 d\u2082', d2.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Mal\u00FD \u00D8 d\u2083', d3.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Vnit\u0159. \u00D8 mat. D\u2081', D1.toFixed(3) + ' mm') + '\n' +
      fmtCopy('Hloubka profilu', hExt.toFixed(3) + ' mm') + '\n' +
      fmtCopy('P\u0159edvrt. \u0161roub', d3.toFixed(2) + ' mm') + '\n' +
      fmtCopy('P\u0159edvrt. matice', D1.toFixed(2) + ' mm');
    return { html: html, copyText: copyText };
  }

  // ── HEADERS per type ──
  var headerM   = '<tr><th>Z\u00E1vit</th><th>P <small>mm</small></th><th>D <small>mm</small></th></tr>';
  var headerTPI = '<tr><th>Z\u00E1vit</th><th>TPI</th><th>D <small>mm</small></th></tr>';
  var headerTr  = '<tr><th>Z\u00E1vit</th><th>P <small>mm</small></th><th>D <small>mm</small></th></tr>';

  // ── THREAD HELP ──
  var helpHTML =
    '<div class="thr-help-section">' +
      '<div class="thr-help-title">\uD83D\uDCD6 P\u0159ehled typ\u016F z\u00E1vit\u016F</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 METRICK\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>M hrub\u00E9</strong> \u2013 ISO 261 / DIN 13<br>' +
          '\u00DAhel profilu 60\u00B0. Nejroz\u0161\u00ED\u0159en\u011Bj\u0161\u00ED z\u00E1vit v Evrop\u011B. ' +
          'Ozna\u010Den\u00ED: M12 (pr\u016Fm\u011Br \u00D7 hrub\u00E9 stoup\u00E1n\u00ED). ' +
          'Pou\u017Eit\u00ED: \u0161rouby, matice, v\u0161eobecn\u00E9 stroj\u00EDrenstv\u00ED.</div>' +
        '<div class="thr-help-item"><strong>M jemn\u00E9</strong> \u2013 ISO 261 / DIN 13<br>' +
          '\u00DAhel 60\u00B0, men\u0161\u00ED stoup\u00E1n\u00ED ne\u017E hrub\u00E9. ' +
          'Ozna\u010Den\u00ED: M12\u00D71.25. ' +
          'V\u00FDhody: v\u011Bt\u0161\u00ED p\u0159edp\u011Bt\u00ED, lep\u0161\u00ED t\u011Bsnost, men\u0161\u00ED tendence k samovoln\u00E9mu povolen\u00ED. ' +
          'Pou\u017Eit\u00ED: automobilov\u00FD pr\u016Fmysl, p\u0159esn\u00E9 stav\u011B\u010D\u00ED \u0161rouby, tenkost\u011Bnn\u00E9 d\u00EDly.</div>' +
        '<div class="thr-help-item"><strong>Tr trap\u00E9zov\u00FD</strong> \u2013 ISO 2904 / DIN 103<br>' +
          '\u00DAhel 30\u00B0, lichob\u011B\u017En\u00EDkov\u00FD profil. Ozna\u010Den\u00ED: Tr20\u00D74. ' +
          'Ur\u010Den pro p\u0159enos pohybu a s\u00EDly. ' +
          'Pou\u017Eit\u00ED: vod\u00EDc\u00ED \u0161rouby soustruh\u016F, lisy, sv\u011Br\u00E1ky, stav\u011B\u010D\u00ED mechanismy.</div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 TRUBKOV\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>G (BSP) v\u00E1lcov\u00FD</strong> \u2013 ISO 228 / DIN 259<br>' +
          '\u00DAhel 55\u00B0 (Whitworthov profil). Vn\u011Bj\u0161\u00ED \u00F8 neodpov\u00EDd\u00E1 jmenovit\u00E9 velikosti\u00A0\u2013 ' +
          'nap\u0159. G 1/2 m\u00E1 D\u00A0=\u00A020,955\u00A0mm. ' +
          'Pou\u017Eit\u00ED: t\u011Bsn\u011Bn\u00E9 spoje s O-krou\u017Ekem, hydraulika, pneumatika. ' +
          'T\u011Bsn\u00ED: p\u0159\u00EDtla\u010Dn\u00FD povrch nebo O-krou\u017Eek (ne z\u00E1vitem).</div>' +
        '<div class="thr-help-item"><strong>NPT ku\u017Eelov\u00FD</strong> \u2013 ASME B1.20.1<br>' +
          '\u00DAhel 60\u00B0, ku\u017Eelovitost 1:16 (1\u00B047\u203224"). Am. standard. ' +
          'T\u011Bsn\u00ED se s\u00E1m z\u00E1vitem p\u0159i dota\u017Een\u00ED (+ teflon p\u00E1ska). ' +
          'Pou\u017Eit\u00ED: potrub\u00ED, plynov\u00E9 rozvody, hydraulika (USA). ' +
          '<em>Pozor: nepou\u017E\u00EDvat s G z\u00E1vitem \u2013 nejsou kompatibiln\u00ED!</em></div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 PALCOV\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>UNC (Unified Coarse)</strong> \u2013 ASME B1.1<br>' +
          '\u00DAhel 60\u00B0, hrub\u00E9 stoup\u00E1n\u00ED. Americk\u00FD/kanadsk\u00FD standard. ' +
          'Ozna\u010Den\u00ED: 1/4"-20 UNC (pr\u016Fm\u011Br-TPI). ' +
          'Ekvivalent ISO metrick\u00E9ho hrub\u00E9ho z\u00E1vitu. ' +
          'Pou\u017Eit\u00ED: v\u0161eobecn\u00E9 strojn\u00ED spoje v USA.</div>' +
        '<div class="thr-help-item"><strong>UNF (Unified Fine)</strong> \u2013 ASME B1.1<br>' +
          '\u00DAhel 60\u00B0, jemn\u00E9 stoup\u00E1n\u00ED. ' +
          'Ozna\u010Den\u00ED: 1/4"-28 UNF. ' +
          'V\u011Bt\u0161\u00ED tahov\u00E1 pevnost ne\u017E UNC p\u0159i stejn\u00E9m \u00F8. ' +
          'Pou\u017Eit\u00ED: leteck\u00FD pr\u016Fmysl, automobilov\u00FD pr\u016Fmysl, p\u0159esn\u00E9 spoje.</div>' +
        '<div class="thr-help-item"><strong>BSW (Whitworth)</strong> \u2013 BS 84<br>' +
          '\u00DAhel 55\u00B0, zaoblen\u00FD vrch i \u00FAdol\u00ED profilu. Britsk\u00FD standard (hist.). ' +
          'Ozna\u010Den\u00ED: 1/2" BSW (pr\u016Fm\u011Br). ' +
          'Dnes nahrazen UNC/ISO, ale st\u00E1le se vyskytuje na star\u0161\u00EDch stroj\u00EDch. ' +
          'Pou\u017Eit\u00ED: \u00FAdr\u017Eba star\u00FDch stroj\u016F, GB stroje, n\u011Bkter\u00E9 australsk\u00E9 normy.</div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 POHYBOV\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>Acme (pilov\u00FD)</strong> \u2013 ASME B1.5<br>' +
          '\u00DAhel 29\u00B0, lichob\u011B\u017En\u00EDkov\u00FD profil. Americk\u00FD ekvivalent Tr z\u00E1vitu. ' +
          'Ozna\u010Den\u00ED: 1"-5 Acme. ' +
          'Jednodu\u0161\u0161\u00ED v\u00FDroba ne\u017E \u010Dtvercov\u00FD z\u00E1vit, lep\u0161\u00ED \u00FA\u010Dinnost ne\u017E trojheln\u00EDkov\u00FD. ' +
          'Pou\u017Eit\u00ED: vod\u00EDc\u00ED \u0161rouby, sv\u011Br\u00E1ky, ventily, pohybov\u00E9 mechanismy.</div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 PRAKTICK\u00C9 TIPY \u2500\u2500</div>' +
        '<div class="thr-help-item">' +
          '\u2022 <strong>Identifikace:</strong> Zm\u011B\u0159te stoup\u00E1n\u00ED (m\u011B\u0159\u00EDtkem nebo z\u00E1vitov\u00FDmi \u0161ablonami) a vn\u011Bj\u0161\u00ED \u00F8 \u2013 ' +
          'z toho ur\u010D\u00EDte typ a velikost.<br>' +
          '\u2022 <strong>60\u00B0 vs 55\u00B0:</strong> Metrick\u00E9 (M) a americk\u00E9 (UN) maj\u00ED 60\u00B0. ' +
          'Whitworth (BSW, G) m\u00E1 55\u00B0. Nen\u00ED zam\u011Bniteln\u00E9!<br>' +
          '\u2022 <strong>TPI \u2192 P:</strong> Stoup\u00E1n\u00ED v mm = 25,4 / TPI.<br>' +
          '\u2022 <strong>P\u0159edvrtan\u00ED:</strong> Pro vnit\u0159n\u00ED z\u00E1vit = D \u2212 P (p\u0159ibli\u017En\u011B).<br>' +
          '\u2022 <strong>Mazivo:</strong> P\u0159i \u0159ez\u00E1n\u00ED z\u00E1vit\u016F pou\u017Eijte \u0159ezn\u00FD olej, ' +
          'u hlin\u00EDku petroleum, u litiny nasu\u010Dno.<br>' +
          '\u2022 <strong>Jisk\u0159iv\u00FD pr\u016Fchod:</strong> V\u017Edy dokon\u010Dete 1\u20132 pr\u016Fchody s ap=0 ' +
          'pro vyhlaze\u0159n\u00ED povrchu z\u00E1vitu.' +
        '</div>' +
      '</div>' +
    '</div>';

  var body =
    '<div class="thr-category-row">' +
      '<div class="thr-cat-label">Metrick\u00E9</div>' +
      '<div class="tol-toggle-row thr-type-row">' +
        '<button class="tol-toggle tol-active" data-thr="mc">M hrub\u00E9</button>' +
        '<button class="tol-toggle" data-thr="mf">M jemn\u00E9</button>' +
        '<button class="tol-toggle" data-thr="tr">Tr trap.</button>' +
      '</div>' +
      '<div class="thr-cat-label">Trubkov\u00E9</div>' +
      '<div class="tol-toggle-row thr-type-row">' +
        '<button class="tol-toggle" data-thr="g">G (BSP)</button>' +
        '<button class="tol-toggle" data-thr="npt">NPT ku\u017E.</button>' +
      '</div>' +
      '<div class="thr-cat-label">Palcov\u00E9 / pohybov\u00E9</div>' +
      '<div class="tol-toggle-row thr-type-row">' +
        '<button class="tol-toggle" data-thr="unc">UNC</button>' +
        '<button class="tol-toggle" data-thr="unf">UNF</button>' +
        '<button class="tol-toggle" data-thr="bsw">BSW</button>' +
        '<button class="tol-toggle" data-thr="acme">Acme</button>' +
      '</div>' +
    '</div>' +
    '<input type="text" class="cnc-filter" placeholder="Filtr..." id="threadFilter">' +
    '<div class="cnc-table-wrap cnc-table-tall">' +
      '<table class="cnc-table" id="threadTable">' +
        '<thead id="thrHead">' + headerM + '</thead>' +
        '<tbody id="thrBody">' + buildMetricRows(mCoarse, 'M') + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div class="thr-detail" id="thrDetail">' +
      '<div class="thr-detail-hint">Klikn\u011Bte na z\u00E1vit pro zobrazen\u00ED detailu\u2026</div>' +
    '</div>' +
    '<div class="cnc-table-label" style="margin-top:10px">Vlastn\u00ED z\u00E1vit</div>' +
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span>' +
        '<input type="number" data-id="tD" step="any" placeholder="Vn\u011Bj\u0161\u00ED \u00F8"></label>' +
      '<label class="cnc-field"><span>P <small>mm</small></span>' +
        '<input type="number" data-id="tP" step="any" placeholder="Stoup\u00E1n\u00ED"></label>' +
    '</div>' +
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-copy" id="thrCopy">\uD83D\uDCCB Kop\u00EDrovat</button>' +
      '<button class="cnc-btn cnc-btn-help" id="thrHelp">\u2753 N\u00E1pov\u011Bda</button>' +
    '</div>' +
    '<div class="thr-help-panel" id="thrHelpPanel" style="display:none">' + helpHTML + '</div>';

  var overlay = makeOverlay("thread", "\uD83D\uDD29 Z\u00E1vity", body);
  if (!overlay) return;

  var filter   = overlay.querySelector("#threadFilter");
  var thead    = overlay.querySelector("#thrHead");
  var tbody    = overlay.querySelector("#thrBody");
  var detail   = overlay.querySelector("#thrDetail");
  var inpD     = overlay.querySelector('[data-id="tD"]');
  var inpP     = overlay.querySelector('[data-id="tP"]');
  var typeBtns = overlay.querySelectorAll('[data-thr]');
  var helpPanel= overlay.querySelector("#thrHelpPanel");
  var lastActiveRow = null;
  var currentType = 'mc';

  function setDetail(result) {
    detail.innerHTML = result.html;
    detail.dataset.copyText = result.copyText;
  }

  // ── Toggle nápověda ──
  overlay.querySelector("#thrHelp").addEventListener("click", function() {
    var vis = helpPanel.style.display !== 'none';
    helpPanel.style.display = vis ? 'none' : 'block';
    this.textContent = vis ? '\u2753 N\u00E1pov\u011Bda' : '\u2716 Zav\u0159\u00EDt n\u00E1pov\u011Bdu';
  });

  // ── Switch thread type ──
  function switchType(type) {
    currentType = type;
    for (var i = 0; i < typeBtns.length; i++) {
      typeBtns[i].classList.toggle('tol-active', typeBtns[i].dataset.thr === type);
    }
    if (lastActiveRow) { lastActiveRow.classList.remove("thr-row-active"); lastActiveRow = null; }
    detail.innerHTML = '<div class="thr-detail-hint">Klikn\u011Bte na z\u00E1vit pro zobrazen\u00ED detailu\u2026</div>';
    delete detail.dataset.copyText;
    filter.value = '';

    if (type === 'mc') {
      thead.innerHTML = headerM;
      tbody.innerHTML = buildMetricRows(mCoarse, 'M');
    } else if (type === 'mf') {
      thead.innerHTML = headerM;
      tbody.innerHTML = buildMetricRows(mFine, 'M');
    } else if (type === 'g') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildGRows();
    } else if (type === 'tr') {
      thead.innerHTML = headerTr;
      tbody.innerHTML = buildTrRows();
    } else if (type === 'unc') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(uncThreads, 'UNC');
    } else if (type === 'unf') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(unfThreads, 'UNF');
    } else if (type === 'bsw') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(bswThreads, 'BSW');
    } else if (type === 'npt') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(nptThreads, 'NPT');
    } else if (type === 'acme') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(acmeThreads, 'Acme');
    }
  }

  for (var bi = 0; bi < typeBtns.length; bi++) {
    typeBtns[bi].addEventListener("click", function() { switchType(this.dataset.thr); });
  }

  // ── Filtr ──
  filter.addEventListener("input", function() {
    var q = filter.value.toLowerCase();
    var trs = tbody.querySelectorAll("tr");
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var txt = '';
      for (var c = 0; c < tr.children.length; c++) txt += tr.children[c].textContent.toLowerCase() + ' ';
      tr.style.display = txt.indexOf(q) >= 0 ? "" : "none";
    }
  });

  // ── Klik na řádek → detail ──
  tbody.addEventListener("click", function(e) {
    var tr = e.target.closest("tr");
    if (!tr) return;
    if (lastActiveRow) lastActiveRow.classList.remove("thr-row-active");
    tr.classList.add("thr-row-active");
    lastActiveRow = tr;

    var D = parseFloat(tr.dataset.d);
    var P = parseFloat(tr.dataset.p);
    var type = tr.dataset.type;

    if (type === 'M') {
      var isFine = (currentType === 'mf');
      var lbl = 'M' + D + (isFine ? '\u00D7' + P + ' jemn\u00E9' : ' hrub\u00E9');
      setDetail(detailMetric(D, P, lbl));
    } else if (type === 'G') {
      var tpi = parseInt(tr.dataset.tpi);
      setDetail(detailG(D, P, tpi, tr.dataset.n));
    } else if (type === 'Tr') {
      setDetail(detailTr(D, P, 'Tr' + D + '\u00D7' + P));
    } else if (type === 'UNC') {
      setDetail(detailUN(D, P, parseInt(tr.dataset.tpi), tr.dataset.n, 'UNC \u2013 ASME B1.1'));
    } else if (type === 'UNF') {
      setDetail(detailUN(D, P, parseInt(tr.dataset.tpi), tr.dataset.n, 'UNF \u2013 ASME B1.1'));
    } else if (type === 'BSW') {
      setDetail(detailBSW(D, P, parseInt(tr.dataset.tpi), tr.dataset.n));
    } else if (type === 'NPT') {
      setDetail(detailNPT(D, P, parseInt(tr.dataset.tpi), tr.dataset.n));
    } else if (type === 'Acme') {
      setDetail(detailAcme(D, P, parseInt(tr.dataset.tpi), tr.dataset.n));
    }
  });

  // ── Vlastní závit ──
  function calcCustom() {
    var D = inpD.value !== "" ? safeEvalMath(inpD.value) : null;
    var P = inpP.value !== "" ? safeEvalMath(inpP.value) : null;
    if (D !== null && P !== null && P > 0 && D > 0) {
      if (lastActiveRow) { lastActiveRow.classList.remove("thr-row-active"); lastActiveRow = null; }
      if (currentType === 'tr') {
        setDetail(detailTr(D, P, 'Tr' + D + '\u00D7' + P + ' (vlastn\u00ED)'));
      } else if (currentType === 'g') {
        var tpi = Math.round(25.4 / P);
        setDetail(detailG(D, P, tpi, 'G vlastn\u00ED'));
      } else if (currentType === 'unc' || currentType === 'unf') {
        var tpi = Math.round(25.4 / P);
        setDetail(detailUN(D, P, tpi, 'Vlastn\u00ED ' + currentType.toUpperCase(), currentType.toUpperCase()));
      } else if (currentType === 'bsw') {
        var tpi = Math.round(25.4 / P);
        setDetail(detailBSW(D, P, tpi, 'BSW vlastn\u00ED'));
      } else if (currentType === 'npt') {
        var tpi = Math.round(25.4 / P);
        setDetail(detailNPT(D, P, tpi, 'NPT vlastn\u00ED'));
      } else if (currentType === 'acme') {
        var tpi = Math.round(25.4 / P);
        setDetail(detailAcme(D, P, tpi, 'Acme vlastn\u00ED'));
      } else {
        setDetail(detailMetric(D, P, 'M' + D + '\u00D7' + P + ' (vlastn\u00ED)'));
      }
    }
  }
  inpD.addEventListener("input", calcCustom);
  inpP.addEventListener("input", calcCustom);

  // ── Kopírovat detail ──
  overlay.querySelector("#thrCopy").addEventListener("click", function() {
    var txt = detail.dataset.copyText;
    if (txt) {
      navigator.clipboard.writeText(txt).then(function() { showToast("Zkop\u00EDrov\u00E1no"); });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// ► Převodník
// ══════════════════════════════════════════════════════════════