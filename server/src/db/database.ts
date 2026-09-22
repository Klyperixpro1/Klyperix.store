import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../leads.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

export const run = (sql: string, params: any[] = []): Promise<{ id?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const all = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []) as T[]);
    });
  });
};

async function addColumnIfNotExists(table: string, columnDef: string, colName: string) {
  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`Added column ${colName} to ${table}`);
  } catch (err: any) {
    // Column likely already exists
  }
}

export async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      brand_track TEXT DEFAULT 'production',
      external_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      contact_email TEXT,
      phone TEXT,
      website TEXT,
      has_website INTEGER DEFAULT 0,
      instagram_handle TEXT,
      offered_service TEXT,
      in_campaign_queue INTEGER DEFAULT 0,
      address TEXT,
      country_code TEXT,
      high_ticket_score INTEGER DEFAULT 0,
      rating REAL,
      user_ratings_total INTEGER,
      subscriber_count INTEGER,
      video_count INTEGER,
      view_count INTEGER,
      channel_handle TEXT,
      description TEXT,
      status TEXT DEFAULT 'not_contacted',
      pitch TEXT,
      pitch_status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_contacted_at DATETIME
    )
  `);

  // Migrate existing tables & add lead intelligence fields
  await addColumnIfNotExists('leads', "brand_track TEXT DEFAULT 'production'", 'brand_track');
  await addColumnIfNotExists('leads', 'high_ticket_score INTEGER DEFAULT 0', 'high_ticket_score');
  await addColumnIfNotExists('leads', 'country_code TEXT', 'country_code');
  await addColumnIfNotExists('leads', 'has_website INTEGER DEFAULT 0', 'has_website');
  await addColumnIfNotExists('leads', 'instagram_handle TEXT', 'instagram_handle');
  await addColumnIfNotExists('leads', 'offered_service TEXT', 'offered_service');
  await addColumnIfNotExists('leads', 'in_campaign_queue INTEGER DEFAULT 0', 'in_campaign_queue');
  await addColumnIfNotExists('leads', "intent_level TEXT DEFAULT 'medium'", 'intent_level');
  await addColumnIfNotExists('leads', "budget_estimate TEXT DEFAULT '$1,000 - $3,000'", 'budget_estimate');
  await addColumnIfNotExists('leads', 'lead_quality_score INTEGER DEFAULT 85', 'lead_quality_score');
  await addColumnIfNotExists('leads', 'website_audit_json TEXT', 'website_audit_json');
  await addColumnIfNotExists('leads', 'social_audit_json TEXT', 'social_audit_json');
  await addColumnIfNotExists('leads', "pipeline_stage TEXT DEFAULT 'new'", 'pipeline_stage');
  await addColumnIfNotExists('leads', 'followup_step INTEGER DEFAULT 0', 'followup_step');
  await addColumnIfNotExists('leads', 'whatsapp_number TEXT', 'whatsapp_number');
  await addColumnIfNotExists('leads', "phone_type TEXT DEFAULT 'mobile'", 'phone_type');
  await addColumnIfNotExists('leads', 'linkedin_url TEXT', 'linkedin_url');
  await addColumnIfNotExists('leads', 'instagram_url TEXT', 'instagram_url');

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inbound_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      channel TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT,
      message_text TEXT NOT NULL,
      original_pitch TEXT,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    )
  `);

  await addColumnIfNotExists('inbound_replies', 'original_pitch TEXT', 'original_pitch');

  await run(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      media_type TEXT DEFAULT 'reel',
      media_url TEXT,
      captions_json TEXT NOT NULL,
      target_platforms TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      scheduled_at DATETIME,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      channel TEXT NOT NULL,
      message_text TEXT NOT NULL,
      scheduled_at DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      account_name TEXT,
      phone_number TEXT,
      status TEXT DEFAULT 'disconnected',
      last_active DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'disconnected',
      account_identifier TEXT,
      credential_value TEXT,
      last_synced_at DATETIME,
      compliance_mode TEXT DEFAULT 'human_in_the_loop',
      details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS outreach_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      message_text TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT
    )
  `);

  // ── Performance Indexes (safe: CREATE INDEX IF NOT EXISTS) ────────────────
  // These dramatically speed up lead loading, filtering, search, and phone lookups.
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source)',
    'CREATE INDEX IF NOT EXISTS idx_leads_brand_track ON leads(brand_track)',
    'CREATE INDEX IF NOT EXISTS idx_leads_external_id ON leads(external_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)',
    'CREATE INDEX IF NOT EXISTS idx_leads_has_website ON leads(has_website)',
    'CREATE INDEX IF NOT EXISTS idx_leads_in_campaign ON leads(in_campaign_queue)',
    'CREATE INDEX IF NOT EXISTS idx_leads_high_ticket ON leads(high_ticket_score)',
    'CREATE INDEX IF NOT EXISTS idx_leads_last_contacted ON leads(last_contacted_at)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_cache_expires ON api_cache(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_replies_lead_id ON inbound_replies(lead_id)',
    'CREATE INDEX IF NOT EXISTS idx_replies_is_read ON inbound_replies(is_read)',
    'CREATE INDEX IF NOT EXISTS idx_activity_lead_id ON activity_logs(lead_id)',
  ];
  for (const idx of indexes) {
    try { await run(idx); } catch (_) { /* already exists */ }
  }

  // Enable WAL mode for faster concurrent reads
  try { await run('PRAGMA journal_mode=WAL'); } catch (_) {}
  try { await run('PRAGMA synchronous=NORMAL'); } catch (_) {}
  try { await run('PRAGMA cache_size=10000'); } catch (_) {}

  // One-time cleanup: earlier versions of this app force-wrote a shared, broken
  // placeholder API key into settings on every boot. Remove it if still present so
  // real search (OpenStreetMap, honest empty states) takes over instead of a dead key.
  const KNOWN_BAD_KEYS: Record<string, string> = {
    googlePlacesApiKey: 'AIzaSyAomIolF2kHhtxhhFi6GoOLIULB6Oujjb0',
    geminiApiKey: 'AIzaSyAomIolF2kHhtxhhFi6GoOLIULB6Oujjb0',
    youtubeApiKey: 'AIzaSyBxAzqDHB5gQA7bzOFL7AoCUz5b4zcvhhg',
  };
  for (const [key, badValue] of Object.entries(KNOWN_BAD_KEYS)) {
    await run('DELETE FROM settings WHERE key = ? AND value = ?', [key, badValue]);
  }

  console.log('Database initialized: Klyperix Production schema — indexes active, WAL mode ON.');
}
