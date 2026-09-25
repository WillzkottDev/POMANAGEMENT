CREATE TABLE IF NOT EXISTS uploads (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 manifest TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'loading'
);
CREATE TABLE IF NOT EXISTS blocks (
 upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
 sheet INTEGER NOT NULL, part INTEGER NOT NULL, payload TEXT NOT NULL,
 PRIMARY KEY(upload_id,sheet,part)
);
