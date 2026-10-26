-- Additive server-only refresh intents. No original content or publication is rewritten.
CREATE TABLE cms_catalog_refreshes (
  catalog_id TEXT PRIMARY KEY REFERENCES cms_artifact_catalogs(id),
  revision INTEGER NOT NULL REFERENCES cms_revisions(version),
  previous_catalog_id TEXT NOT NULL REFERENCES cms_artifact_catalogs(id),
  expected_version INTEGER NOT NULL,
  draft_revision INTEGER NOT NULL REFERENCES cms_revisions(version),
  document_bytes INTEGER NOT NULL CHECK(document_bytes BETWEEN 1 AND 2000000),
  policy TEXT NOT NULL, renderer TEXT NOT NULL, assets TEXT NOT NULL, origin TEXT NOT NULL,
  shell TEXT NOT NULL CHECK(length(shell)=64 AND shell NOT GLOB '*[^0-9a-f]*')
);
CREATE INDEX cms_refresh_release ON cms_catalog_refreshes(revision,previous_catalog_id,policy,renderer,assets,origin);
CREATE TRIGGER cms_refresh_insert_guard BEFORE INSERT ON cms_catalog_refreshes BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs c
    JOIN cms_documents d ON d.id=1 AND d.version=NEW.expected_version AND d.draft_revision=NEW.draft_revision AND d.published_revision=NEW.revision
    JOIN cms_publications p ON p.revision=d.published_revision AND p.catalog_id=NEW.previous_catalog_id
    JOIN cms_revision_admissions a ON a.revision=NEW.revision AND a.policy=NEW.policy
    JOIN cms_revisions r ON r.version=a.revision AND length(CAST(r.document AS BLOB))=a.document_bytes
    WHERE c.id=NEW.catalog_id AND c.state='building' AND c.mode='publish' AND c.source_revision=NEW.revision
      AND c.expected_version=NEW.expected_version AND c.target_revision=c.expected_version+1
      AND c.source_digest=a.digest AND a.document_bytes=NEW.document_bytes
      AND c.policy=NEW.policy AND c.renderer=NEW.renderer AND c.assets=NEW.assets AND c.origin=NEW.origin
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps b WHERE b.catalog_id=c.id))
    THEN RAISE(ABORT,'cms_catalog_refresh_mismatch') END;
END;
CREATE TRIGGER cms_refresh_immutable_update BEFORE UPDATE ON cms_catalog_refreshes BEGIN SELECT RAISE(ABORT,'cms_catalog_refresh_immutable'); END;
CREATE TRIGGER cms_refresh_immutable_delete BEFORE DELETE ON cms_catalog_refreshes BEGIN SELECT RAISE(ABORT,'cms_catalog_refresh_immutable'); END;
CREATE TRIGGER cms_refresh_publication_exclusion BEFORE INSERT ON cms_publications
WHEN EXISTS(SELECT 1 FROM cms_catalog_refreshes WHERE catalog_id=NEW.catalog_id) BEGIN SELECT RAISE(ABORT,'cms_publication_mismatch'); END;
CREATE TRIGGER cms_refresh_bootstrap_exclusion BEFORE INSERT ON cms_catalog_bootstraps
WHEN EXISTS(SELECT 1 FROM cms_catalog_refreshes WHERE catalog_id=NEW.catalog_id) BEGIN SELECT RAISE(ABORT,'cms_catalog_refresh_mismatch'); END;
CREATE TRIGGER cms_refresh_catalog_identity BEFORE UPDATE ON cms_artifact_catalogs
WHEN EXISTS(SELECT 1 FROM cms_catalog_refreshes WHERE catalog_id=OLD.id) BEGIN
  SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.actor IS NOT OLD.actor OR NEW.mode IS NOT OLD.mode
    OR NEW.expected_version IS NOT OLD.expected_version OR NEW.target_revision IS NOT OLD.target_revision
    OR NEW.source_revision IS NOT OLD.source_revision OR NEW.source_digest IS NOT OLD.source_digest
    OR NEW.policy IS NOT OLD.policy OR NEW.renderer IS NOT OLD.renderer OR NEW.assets IS NOT OLD.assets
    OR NEW.origin IS NOT OLD.origin OR NEW.context_digest IS NOT OLD.context_digest
    OR NEW.expected_entries IS NOT OLD.expected_entries OR NEW.plan_json IS NOT OLD.plan_json
    THEN RAISE(ABORT,'cms_catalog_refresh_identity') END;
END;
CREATE TRIGGER cms_refresh_activation_guard BEFORE UPDATE OF state ON cms_artifact_catalogs
WHEN NEW.state='published' AND EXISTS(SELECT 1 FROM cms_catalog_refreshes WHERE catalog_id=NEW.id) BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_catalog_refreshes f
    JOIN cms_documents d ON d.id=1 AND d.version=f.expected_version AND d.draft_revision=f.draft_revision AND d.published_revision=f.revision
    JOIN cms_publications p ON p.revision=f.revision AND p.catalog_id=f.previous_catalog_id
    JOIN cms_revision_admissions a ON a.revision=f.revision AND a.policy=f.policy AND a.digest=NEW.source_digest AND a.document_bytes=f.document_bytes
    JOIN cms_revisions r ON r.version=a.revision AND length(CAST(r.document AS BLOB))=f.document_bytes
    WHERE f.catalog_id=NEW.id AND OLD.state='ready' AND NEW.source_revision=f.revision
      AND NEW.expected_version=f.expected_version AND NEW.policy=f.policy AND NEW.renderer=f.renderer AND NEW.assets=f.assets AND NEW.origin=f.origin
      AND NEW.expires_at>CAST(strftime('%s','now') AS INTEGER)
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_refreshes other JOIN cms_artifact_catalogs c ON c.id=other.catalog_id AND c.state='published'
        WHERE other.revision=f.revision AND other.previous_catalog_id=f.previous_catalog_id AND other.policy=f.policy
          AND other.renderer=f.renderer AND other.assets=f.assets AND other.origin=f.origin AND other.catalog_id<>f.catalog_id))
    THEN RAISE(ABORT,'cms_catalog_refresh_conflict') END;
END;
