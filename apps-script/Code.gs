/**
 * 10 Minute School — Affiliate Verification API (v2)
 *
 * Single-field lookup: the visitor enters ONE mobile number, which is matched
 * against both the Bkash Number and Phone Number columns.
 *
 * The v1 request { code, phone } (both required to match) is still accepted,
 * so the old page keeps working until it is replaced.
 *
 * Deploy: Extensions → Apps Script (from the data sheet) → paste this file →
 * Deploy → Manage deployments → Edit → New version (keeps the same /exec URL).
 * Execute as: Me · Who has access: Anyone.
 */

const SHEET_NAME   = 'Affiliates';        // tab name in the data sheet
const SECRET_TOKEN = 'Speed&Scale';       // must match the front end
const RATE_LIMIT   = 1500;                // max lookups (all visitors) per 10 minutes

// Header names in row 1 → keys used by the API. Matching is case/space-insensitive.
const COLS = {
  name:     'Name',
  code:     'Affiliate Code',
  phone:    'Phone Number',
  level:    'Level',
  facebook: 'Facebook Profile',
  picture:  'Affiliate Picture',
  bkash:    'Bkash Number',
  status:   'Status',                     // optional column: "Inactive"/"Suspended" hides an affiliate
};
// NID Number is deliberately never read or returned.

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (_) {}
  return json_(handle_(body));
}

function doGet(e) {
  return json_(handle_(e.parameter || {}));
}

function handle_(req) {
  if (req.token !== SECRET_TOKEN) return { ok: false, error: 'unauthorized' };

  const v1 = !req.query && req.code && req.phone;
  const raw = String(v1 ? req.phone : req.query || '').trim();
  if (!raw) return { ok: false, error: 'empty' };
  if (raw.length > 40) return { ok: false, error: 'invalid' };

  const number = normPhone_(raw);
  if (!/^01[3-9]\d{8}$/.test(number)) return { ok: true, found: false };

  if (!allow_()) return { ok: false, error: 'rate_limited' };

  const rows = readRows_();

  for (const r of rows) {
    if (isInactive_(r.status)) continue;

    let matchedBy = null;
    if (v1) {
      if (normPhone_(r.phone) === number && normCode_(r.code) === normCode_(req.code)) matchedBy = 'phone';
    } else if (normPhone_(r.bkash) === number) matchedBy = 'bkash';
    else if (normPhone_(r.phone) === number) matchedBy = 'phone';

    if (matchedBy) {
      return {
        ok: true,
        found: true,
        matchedBy: matchedBy,
        affiliate: {
          name:          r.name,
          affiliateCode: r.code,
          phone:         r.phone,
          level:         r.level,
          facebook:      r.facebook,
          picture:       r.picture,
          bkash:         r.bkash,
        },
      };
    }
  }
  return { ok: true, found: false };
}

// ── parsing / normalising ──────────────────────────────────────────────

// Bangla digits ০-৯ → 0-9
function bnDigits_(s) {
  return String(s).replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
}

// "+880 1821-767921", "8801821767921", "1821767921" → "01821767921"
function normPhone_(v) {
  let d = bnDigits_(v == null ? '' : v).replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  else if (d.startsWith('88')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = '0' + d;   // sheet stripped the leading zero
  return d;
}

function normCode_(v) {
  return String(v == null ? '' : v).replace(/[\s-]/g, '').toUpperCase();
}

function isInactive_(status) {
  return /inactive|suspend|terminat|block|remove/i.test(String(status || ''));
}

// ── data ───────────────────────────────────────────────────────────────

function readRows_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('rows_v2');
  if (hit) return JSON.parse(hit);

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME) || SpreadsheetApp.getActive().getSheets()[0];
  const values = sh.getDataRange().getDisplayValues();
  const head = values.shift().map(h => String(h).trim().toLowerCase().replace(/\s+/g, ' '));
  const idx = {};
  Object.keys(COLS).forEach(k => { idx[k] = head.indexOf(COLS[k].toLowerCase()); });

  const rows = values
    .filter(v => v.some(c => String(c).trim()))
    .map(v => {
      const o = {};
      Object.keys(idx).forEach(k => { o[k] = idx[k] >= 0 ? String(v[idx[k]]).trim() : ''; });
      return o;
    });

  try { cache.put('rows_v2', JSON.stringify(rows), 120); } catch (_) {} // 2-minute cache
  return rows;
}

// Call from the sheet (or a time trigger / onEdit) to make edits show up instantly.
function clearCache() {
  CacheService.getScriptCache().remove('rows_v2');
}

// Apps Script can't see the caller's IP, so this is a coarse global throttle that
// stops someone scripting thousands of lookups to scrape the sheet.
function allow_() {
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + Math.floor(Date.now() / 600000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 660);
  return n <= RATE_LIMIT;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
