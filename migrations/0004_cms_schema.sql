-- Phase 1 rebuild (2026-11-09). Supersedes 0001_cms.sql: the v2 CMS core
-- schema, rewritten from the Phase 1 spec (PLAN.md section 2). The v2
-- databases hold no published content yet, so this file resets the CMS store
-- and recreates it. Never run against the original project's database.
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS cms_documents;
DROP TABLE IF EXISTS cms_revisions;

CREATE TABLE cms_revisions (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  document TEXT NOT NULL CHECK (json_valid(document) AND json_type(document) = 'object'),
  kind TEXT NOT NULL CHECK (kind IN ('draft', 'publish', 'rollback')),
  actor TEXT NOT NULL CHECK (length(actor) BETWEEN 1 AND 256),
  created_at TEXT NOT NULL,
  source_revision INTEGER REFERENCES cms_revisions(version)
);

CREATE TABLE cms_documents (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  draft_revision INTEGER REFERENCES cms_revisions(version),
  published_revision INTEGER REFERENCES cms_revisions(version)
);
INSERT INTO cms_documents (id, version) VALUES (1, 0);

-- Revisions are append-only; publication moves a pointer, never edits history.
CREATE TRIGGER cms_revisions_no_update BEFORE UPDATE ON cms_revisions
BEGIN SELECT RAISE(ABORT, 'CMS revisions are immutable'); END;
CREATE TRIGGER cms_revisions_no_delete BEFORE DELETE ON cms_revisions
BEGIN SELECT RAISE(ABORT, 'CMS revisions are immutable'); END;
