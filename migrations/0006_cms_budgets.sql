-- Phase 1 rebuild (2026-11-09). Supersedes 0003_cms_release_safeguards.sql.
-- Apply before the matching Worker. Existing history is counted, never rewritten/deleted.
DROP TABLE IF EXISTS cms_revision_budget;
DROP TABLE IF EXISTS cms_request_budgets;

CREATE TABLE cms_revision_budget (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision_count INTEGER NOT NULL CHECK (revision_count >= 0),
  document_bytes INTEGER NOT NULL CHECK (document_bytes >= 0)
);
INSERT INTO cms_revision_budget
  SELECT 1, COUNT(*), COALESCE(SUM(length(CAST(document AS BLOB))), 0) FROM cms_revisions;

-- 24 MiB of document JSON plus <=1000 revision envelopes fits the existing backup path.
-- An already-over-budget database remains readable; further appends fail closed.
CREATE TRIGGER cms_revisions_budget_check BEFORE INSERT ON cms_revisions
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM cms_revision_budget WHERE id = 1
    AND revision_count < 1000 AND document_bytes + length(CAST(NEW.document AS BLOB)) <= 25165824)
    THEN RAISE(ABORT, 'cms_revision_storage_budget') END;
END;
CREATE TRIGGER cms_revisions_budget_charge AFTER INSERT ON cms_revisions
BEGIN
  UPDATE cms_revision_budget SET revision_count = revision_count + 1,
    document_bytes = document_bytes + length(CAST(NEW.document AS BLOB)) WHERE id = 1;
END;

-- Only current windows are retained. Empty actor is the site-wide aggregate.
CREATE TABLE cms_request_budgets (
  actor TEXT NOT NULL CHECK (length(actor) <= 256),
  bucket TEXT NOT NULL CHECK (bucket IN ('read', 'write', 'recovery')),
  reset_at INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY (actor, bucket)
);
INSERT INTO cms_request_budgets VALUES ('', 'read', 0, 0), ('', 'write', 0, 0), ('', 'recovery', 0, 0);
