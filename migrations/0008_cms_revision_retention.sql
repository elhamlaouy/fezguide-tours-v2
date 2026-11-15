-- 2026-11-15. Automatic retention so revision storage can never fill up again.
-- Revisions stay immutable (no UPDATE). DELETE is allowed only for OLD history: never the current
-- draft/published revision, never one of the 100 most recent, never one a kept revision points to.
DROP TRIGGER IF EXISTS cms_revisions_no_delete;
CREATE TRIGGER cms_revisions_no_delete BEFORE DELETE ON cms_revisions
BEGIN
  SELECT CASE WHEN
    OLD.version > (SELECT version FROM cms_documents WHERE id = 1) - 100
    OR OLD.version IN (SELECT draft_revision FROM cms_documents WHERE id = 1 AND draft_revision IS NOT NULL)
    OR OLD.version IN (SELECT published_revision FROM cms_documents WHERE id = 1 AND published_revision IS NOT NULL)
    OR EXISTS (SELECT 1 FROM cms_revisions r WHERE r.source_revision = OLD.version)
  THEN RAISE(ABORT, 'CMS revisions are immutable') END;
END;
-- Keep the storage budget exact when old history is pruned.
DROP TRIGGER IF EXISTS cms_revisions_budget_refund;
CREATE TRIGGER cms_revisions_budget_refund AFTER DELETE ON cms_revisions
BEGIN
  UPDATE cms_revision_budget SET revision_count = revision_count - 1,
    document_bytes = document_bytes - length(CAST(OLD.document AS BLOB)) WHERE id = 1;
END;
