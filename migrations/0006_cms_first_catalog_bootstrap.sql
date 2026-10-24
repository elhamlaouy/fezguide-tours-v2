-- Additive no-outage first-catalog mapping. The catalog remains sealed against
-- the next revision shape required by 0004; this table binds its public artifacts
-- to the already-published revision without appending history or moving pointers.
CREATE TABLE cms_catalog_bootstraps (
  catalog_id TEXT PRIMARY KEY REFERENCES cms_artifact_catalogs(id),
  revision INTEGER NOT NULL REFERENCES cms_revisions(version),
  expected_version INTEGER NOT NULL CHECK(expected_version>=0)
);
CREATE INDEX cms_catalog_bootstrap_revision ON cms_catalog_bootstraps(revision,expected_version);

CREATE TRIGGER cms_catalog_bootstrap_insert_guard BEFORE INSERT ON cms_catalog_bootstraps BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM cms_artifact_catalogs c
    JOIN cms_documents d ON d.id=1
    JOIN cms_revisions r ON r.version=NEW.revision
    JOIN cms_revision_admissions a ON a.revision=r.version AND a.policy=c.policy AND a.digest=c.source_digest
    WHERE c.id=NEW.catalog_id AND c.mode='publish' AND c.state='building'
      AND c.expected_version=NEW.expected_version AND c.target_revision=c.expected_version+1
      AND c.source_revision=NEW.revision AND d.version=NEW.expected_version
      AND d.published_revision=NEW.revision AND r.version<=d.version
      AND length(CAST(r.document AS BLOB))=a.document_bytes
      AND NOT EXISTS(SELECT 1 FROM cms_publications p WHERE p.revision=NEW.revision)
      AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps b
        JOIN cms_artifact_catalogs existing ON existing.id=b.catalog_id
        WHERE b.revision=NEW.revision AND existing.state IN ('ready','published'))
  ) THEN RAISE(ABORT,'cms_bootstrap_mismatch') END;
END;
CREATE TRIGGER cms_catalog_bootstrap_immutable_update BEFORE UPDATE ON cms_catalog_bootstraps BEGIN
  SELECT RAISE(ABORT,'cms_bootstrap_immutable');
END;
CREATE TRIGGER cms_catalog_bootstrap_immutable_delete BEFORE DELETE ON cms_catalog_bootstraps BEGIN
  SELECT RAISE(ABORT,'cms_bootstrap_immutable');
END;
CREATE TRIGGER cms_catalog_bootstrap_publish_guard BEFORE UPDATE OF state ON cms_artifact_catalogs
WHEN NEW.state='published' AND EXISTS(SELECT 1 FROM cms_catalog_bootstraps WHERE catalog_id=NEW.id) BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM cms_catalog_bootstraps b
    JOIN cms_documents d ON d.id=1 AND d.version=b.expected_version AND d.published_revision=b.revision
    JOIN cms_revisions r ON r.version=b.revision
    JOIN cms_revision_admissions a ON a.revision=r.version AND a.policy=NEW.policy AND a.digest=NEW.source_digest
    WHERE b.catalog_id=NEW.id AND b.expected_version=NEW.expected_version
      AND b.revision=NEW.source_revision AND NEW.target_revision=NEW.expected_version+1
      AND NOT EXISTS(SELECT 1 FROM cms_publications p WHERE p.revision=b.revision)
  ) THEN RAISE(ABORT,'cms_bootstrap_pointer_changed') END;
END;
