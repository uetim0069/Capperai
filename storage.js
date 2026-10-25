const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DBF = path.join(DATA_DIR, 'db.json');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const DEFAULT_DB = { users: {}, sessions: {}, challenges: [], matches: {}, ledger: [], tx: [] };

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLocalDb() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DBF, 'utf8');
    return { ...DEFAULT_DB, ...JSON.parse(raw) };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

async function loadStateFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/app_state?id=eq.main&select=state`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase load failed: ${text}`);
  }

  const rows = await res.json();
  return rows[0]?.state || null;
}

async function saveStateToSupabase(db) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
    method: 'upsert',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id: 'main', state: db })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase save failed: ${text}`);
  }
}

function persistLocalDb(db) {
  ensureDataDir();
  fs.writeFileSync(DBF + '.tmp', JSON.stringify(db));
  fs.renameSync(DBF + '.tmp', DBF);
}

module.exports = {
  DEFAULT_DB,
  SUPABASE_URL,
  SUPABASE_KEY,
  loadLocalDb,
  loadStateFromSupabase,
  saveStateToSupabase,
  persistLocalDb
};
