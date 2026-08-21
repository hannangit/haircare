/**
 * AFRICAN HAIR CARE — read-only Sheets endpoint
 *
 * Publishes a whitelisted subset of the spreadsheet as JSON for the website.
 *
 * Design notes:
 *  - READ ONLY. There is no doPost, so nothing can be written through this.
 *  - TAKES NO PARAMETERS. doGet ignores the query string completely, so the
 *    endpoint can never be talked into reading a different tab, range or file.
 *  - Tabs AND columns are whitelisted. Anything not listed is never published,
 *    which lets the owner keep private working columns (cost, supplier, notes)
 *    in the same sheet without them reaching the page source.
 *  - Rows with active = FALSE are dropped here, so drafts never leave the sheet.
 *  - ALWAYS returns valid JSON, including on failure. Apps Script's own error
 *    pages are HTML, which would make the site's JSON.parse throw.
 */

/* ── What is allowed out ─────────────────────────────────────────────────
   Add a column here before it can appear on the website. Order is irrelevant;
   matching is by header name, lower-cased and trimmed.                     */
var PUBLISHED = {
  services:   ['id', 'name', 'category', 'price', 'duration_mins', 'hair',
               'patch_test', 'kids', 'description', 'feats', 'sort_order'],
  categories: ['name', 'slug', 'blurb', 'sort_order'],
  contact:    ['key', 'value'],
  hours:      ['day', 'hours', 'sort_order'],
  promos:     ['message', 'link_url', 'start_date', 'end_date', 'sort_order'],
  team:       ['name', 'role', 'specialism', 'quote', 'phone', 'email',
               'is_lead', 'sort_order'],
  settings:   ['key', 'value']
};

var CACHE_SECONDS = 300;        // 5 minutes server-side
var CACHE_PREFIX  = 'ahc_payload_';
var CHUNK_BYTES   = 90000;      // a single cache entry caps at 100KB

/* ── Endpoint ───────────────────────────────────────────────────────────*/
function doGet() {                 // note: no parameter, deliberately
  try {
    var cached = readChunkedCache();
    if (cached) return json(cached);

    var payload = buildPayload();
    var body = JSON.stringify(payload);
    writeChunkedCache(body);
    return json(body);
  } catch (err) {
    // Still valid JSON, so the site logs a clean message instead of a parse error.
    return json(JSON.stringify({
      ok: false,
      error: String(err && err.message ? err.message : err),
      tabs: {}
    }));
  }
}

function json(body) {
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── Reading the sheet ──────────────────────────────────────────────────*/
function buildPayload() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = {};
  var warnings = [];

  Object.keys(PUBLISHED).forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) { warnings.push('missing tab: ' + tabName); return; }
    tabs[tabName] = readSheet(sheet, PUBLISHED[tabName], warnings, tabName);
  });

  return {
    ok: true,
    version: '1',
    generated: new Date().toISOString(),
    warnings: warnings,
    tabs: tabs
  };
}

function readSheet(sheet, allowedCols, warnings, tabName) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var activeIdx = headers.indexOf('active');

  // Map allowed column name -> its index, ignoring anything not whitelisted.
  var cols = {};
  allowedCols.forEach(function (name) {
    var i = headers.indexOf(name);
    if (i !== -1) cols[name] = i;
    else warnings.push(tabName + ': no column "' + name + '"');
  });

  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];

    // active = FALSE is dropped server-side so drafts never reach the page.
    if (activeIdx !== -1 && !truthy(row[activeIdx])) continue;

    var obj = {}, hasAny = false;
    Object.keys(cols).forEach(function (name) {
      var v = row[cols[name]];
      if (v instanceof Date) v = Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd');
      else if (typeof v === 'string') v = v.trim();
      obj[name] = v === '' ? null : v;
      if (obj[name] !== null) hasAny = true;
    });

    if (!hasAny) continue;                       // entirely blank row
    obj = dropUnsafeUrls(obj);
    out.push(obj);
  }

  // Sorted here as well as in the browser; the site sorts again because cached
  // and fixture payloads do not pass through this function.
  if (cols.hasOwnProperty('sort_order')) {
    out.sort(function (a, b) {
      var x = a.sort_order === null ? 9999 : Number(a.sort_order);
      var y = b.sort_order === null ? 9999 : Number(b.sort_order);
      if (isNaN(x)) x = 9999;
      if (isNaN(y)) y = 9999;
      return x - y;
    });
  }
  return out;
}

/* A javascript: or data: value typed into a cell must never reach an href.
   Checked here and again in the browser. */
function dropUnsafeUrls(obj) {
  Object.keys(obj).forEach(function (k) {
    if (!/(^|_)url$/.test(k)) return;
    var v = obj[k];
    if (v === null) return;
    if (!/^https?:\/\//i.test(String(v))) obj[k] = null;
  });
  return obj;
}

function truthy(v) {
  if (v === true) return true;
  if (v === false || v === '' || v === null || v === undefined) return false;
  var s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1';
}

/* ── Chunked cache ──────────────────────────────────────────────────────
   A single CacheService entry caps at 100KB, and the full payload is larger
   than that once the menu grows, so it is split across numbered keys.       */
function writeChunkedCache(body) {
  try {
    var cache = CacheService.getScriptCache();
    var chunks = [];
    for (var i = 0; i < body.length; i += CHUNK_BYTES) {
      chunks.push(body.substring(i, i + CHUNK_BYTES));
    }
    var map = {};
    chunks.forEach(function (c, i) { map[CACHE_PREFIX + i] = c; });
    map[CACHE_PREFIX + 'count'] = String(chunks.length);
    cache.putAll(map, CACHE_SECONDS);
  } catch (e) { /* caching is an optimisation, never a requirement */ }
}

function readChunkedCache() {
  try {
    var cache = CacheService.getScriptCache();
    var count = cache.get(CACHE_PREFIX + 'count');
    if (!count) return null;
    var n = parseInt(count, 10);
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(CACHE_PREFIX + i);
    var got = cache.getAll(keys);
    var body = '';
    for (var j = 0; j < n; j++) {
      if (!got[CACHE_PREFIX + j]) return null;   // a chunk expired: rebuild
      body += got[CACHE_PREFIX + j];
    }
    return body;
  } catch (e) { return null; }
}

function clearCache() {
  var cache = CacheService.getScriptCache();
  var count = cache.get(CACHE_PREFIX + 'count');
  var keys = [CACHE_PREFIX + 'count'];
  if (count) for (var i = 0; i < parseInt(count, 10); i++) keys.push(CACHE_PREFIX + i);
  cache.removeAll(keys);
  Logger.log('Cache cleared.');
}

/* ═══════════════════════════════════════════════════════════════════════
   TEST FUNCTIONS — run these from the editor BEFORE deploying.
   Select the function in the toolbar, press Run, then View > Logs.
   ═══════════════════════════════════════════════════════════════════════ */

/** Row counts per tab, plus the exact JSON size. */
function testPayload() {
  var p = buildPayload();
  Logger.log('ok: %s   generated: %s', p.ok, p.generated);
  Object.keys(p.tabs).forEach(function (t) {
    Logger.log('  %s: %s published rows', t, p.tabs[t].length);
  });
  if (p.warnings.length) {
    Logger.log('WARNINGS:');
    p.warnings.forEach(function (w) { Logger.log('  - ' + w); });
  }
  var size = JSON.stringify(p).length;
  Logger.log('payload size: %s bytes (%s cache chunks)', size, Math.ceil(size / CHUNK_BYTES));
}

/** Hunts for the data-entry mistakes that actually happen. */
function testDataQuality() {
  var p = buildPayload();
  var problems = [];

  var svc = p.tabs.services || [];
  var seen = {};
  svc.forEach(function (s, i) {
    var where = 'services row ' + (i + 2);
    if (!s.id)   problems.push(where + ': no id — row will be skipped');
    if (!s.name) problems.push(where + ': no name — row will be skipped');
    if (s.id && !/^[a-z0-9-]+$/i.test(String(s.id))) {
      problems.push(where + ': id "' + s.id + '" must be letters, numbers and hyphens only');
    }
    if (s.id && seen[s.id]) problems.push(where + ': duplicate id "' + s.id + '"');
    if (s.id) seen[s.id] = true;
    if (s.price !== null && isNaN(Number(String(s.price).replace(/[^0-9.\-]/g, '')))) {
      problems.push(where + ': price "' + s.price + '" is not a number');
    }
    if (s.duration_mins !== null && isNaN(Number(s.duration_mins))) {
      problems.push(where + ': duration_mins "' + s.duration_mins + '" is not a number');
    }
    if (s.hair !== null && ['included', 'client'].indexOf(String(s.hair).toLowerCase()) === -1) {
      problems.push(where + ': hair "' + s.hair + '" should be included, client, or blank');
    }
  });

  // Every service category should exist in the categories tab, or it will not
  // appear in the filter dropdown.
  var catNames = (p.tabs.categories || []).map(function (c) { return String(c.name); });
  svc.forEach(function (s, i) {
    if (s.category && catNames.indexOf(String(s.category)) === -1) {
      problems.push('services row ' + (i + 2) + ': category "' + s.category +
                    '" is not in the categories tab');
    }
  });

  var contact = {};
  (p.tabs.contact || []).forEach(function (r) { if (r.key) contact[r.key] = r.value; });
  ['phone', 'email_general', 'address'].forEach(function (k) {
    if (!contact[k]) problems.push('contact: "' + k + '" is empty — the site will keep its built-in value');
  });
  if (contact.phone && !/^[\d+()\s-]+$/.test(String(contact.phone))) {
    problems.push('contact: phone "' + contact.phone + '" has unexpected characters');
  }

  (p.tabs.promos || []).forEach(function (r, i) {
    ['start_date', 'end_date'].forEach(function (k) {
      if (r[k] && isNaN(new Date(r[k]).getTime())) {
        problems.push('promos row ' + (i + 2) + ': ' + k + ' "' + r[k] + '" is not a date');
      }
    });
  });

  if ((p.tabs.hours || []).length && (p.tabs.hours || []).length !== 7) {
    problems.push('hours: ' + p.tabs.hours.length + ' rows — expected 7, one per day');
  }

  if (!problems.length) Logger.log('No problems found.');
  else {
    Logger.log('%s problem(s):', problems.length);
    problems.forEach(function (x) { Logger.log('  - ' + x); });
  }
}

/** Prints the first rows of each tab exactly as the website will receive them. */
function testPreview() {
  var p = buildPayload();
  Object.keys(p.tabs).forEach(function (t) {
    Logger.log('--- %s ---', t);
    Logger.log(JSON.stringify(p.tabs[t].slice(0, 3), null, 2));
  });
}
