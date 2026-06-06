CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  nick TEXT NOT NULL,
  mail TEXT DEFAULT '',
  link TEXT DEFAULT '',
  content TEXT NOT NULL,
  pid INTEGER DEFAULT 0,
  rid INTEGER DEFAULT 0,
  ip TEXT DEFAULT '',
  is_admin INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_comments_url ON comments(url);
CREATE INDEX IF NOT EXISTS idx_comments_ip ON comments(ip);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  country TEXT DEFAULT '??',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pv_url ON page_views(url);
CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_pv_dedupe ON page_views(ip_hash, url, created_at);
