-- 2026-11-15. The 24 MiB cap allowed only ~37 saves of the ~650 KB site document and blocked
-- the editor with "cms_revision_storage_budget". D1 Free allows 500 MB per database; raise the
-- cap to 300 MiB (~450 more revisions). Revision count limit (1000) unchanged. No data is touched.
DROP TRIGGER IF EXISTS cms_revisions_budget_check;
CREATE TRIGGER cms_revisions_budget_check BEFORE INSERT ON cms_revisions
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM cms_revision_budget WHERE id = 1
    AND revision_count < 1000 AND document_bytes + length(CAST(NEW.document AS BLOB)) <= 314572800)
    THEN RAISE(ABORT, 'cms_revision_storage_budget') END;
END;
