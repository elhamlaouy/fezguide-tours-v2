-- Additive only: no original document, history row, media reservation or pointer is rewritten.
CREATE TABLE cms_validation_parts (
  policy TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(length(kind) BETWEEN 1 AND 64),
  digest TEXT NOT NULL CHECK(length(digest)=64 AND digest NOT GLOB '*[^0-9a-f]*'),
  document_json TEXT NOT NULL CHECK(json_valid(document_json)),
  summary_json TEXT NOT NULL CHECK(json_valid(summary_json)),
  document_bytes INTEGER NOT NULL CHECK(document_bytes BETWEEN 1 AND 2000000),
  PRIMARY KEY(policy,kind,digest)
);
CREATE TRIGGER cms_validation_parts_immutable_update BEFORE UPDATE ON cms_validation_parts BEGIN SELECT RAISE(ABORT,'cms_part_immutable'); END;
CREATE TRIGGER cms_validation_parts_immutable_delete BEFORE DELETE ON cms_validation_parts BEGIN SELECT RAISE(ABORT,'cms_part_immutable'); END;

CREATE TABLE cms_save_jobs (
  id TEXT PRIMARY KEY CHECK(length(id)=32 AND id NOT GLOB '*[^0-9a-f]*'),
  actor TEXT NOT NULL CHECK(length(actor) BETWEEN 1 AND 256),
  expected_version INTEGER NOT NULL CHECK(expected_version>=0),
  policy TEXT NOT NULL,
  manifest TEXT NOT NULL CHECK(json_valid(manifest) AND json_type(manifest)='array'),
  state TEXT NOT NULL CHECK(state IN ('open','committed','expired')),
  expires_at INTEGER NOT NULL,
  result_revision INTEGER REFERENCES cms_revisions(version)
);
CREATE UNIQUE INDEX cms_one_open_save_job ON cms_save_jobs(state) WHERE state='open';

CREATE TABLE cms_revision_admissions (
  revision INTEGER NOT NULL REFERENCES cms_revisions(version),
  policy TEXT NOT NULL,
  digest TEXT NOT NULL CHECK(length(digest)=64 AND digest NOT GLOB '*[^0-9a-f]*'),
  document_bytes INTEGER NOT NULL CHECK(document_bytes BETWEEN 1 AND 2000000),
  manifest TEXT NOT NULL CHECK(json_valid(manifest) AND json_type(manifest)='array'),
  PRIMARY KEY(revision,policy)
);
CREATE TRIGGER cms_admission_immutable_update BEFORE UPDATE ON cms_revision_admissions BEGIN SELECT RAISE(ABORT,'cms_admission_immutable'); END;
CREATE TRIGGER cms_admission_immutable_delete BEFORE DELETE ON cms_revision_admissions BEGIN SELECT RAISE(ABORT,'cms_admission_immutable'); END;

CREATE TABLE cms_artifact_catalogs (
  id TEXT PRIMARY KEY CHECK(length(id)=32 AND id NOT GLOB '*[^0-9a-f]*'),
  actor TEXT NOT NULL CHECK(length(actor) BETWEEN 1 AND 256),
  mode TEXT NOT NULL DEFAULT 'publish' CHECK(mode IN ('publish','rollback')),
  expected_version INTEGER NOT NULL CHECK(expected_version>=0),
  target_revision INTEGER NOT NULL CHECK(target_revision=expected_version+1),
  source_revision INTEGER NOT NULL REFERENCES cms_revisions(version) CHECK(source_revision<=expected_version),
  source_digest TEXT NOT NULL CHECK(length(source_digest)=64 AND source_digest NOT GLOB '*[^0-9a-f]*'),
  policy TEXT NOT NULL,
  renderer TEXT NOT NULL,
  assets TEXT NOT NULL,
  origin TEXT NOT NULL CHECK(origin LIKE 'https://%'),
  context_digest TEXT CHECK(context_digest IS NULL OR (length(context_digest)=64 AND context_digest NOT GLOB '*[^0-9a-f]*')),
  state TEXT NOT NULL CHECK(state IN ('building','ready','published','retired','expired')),
  expected_entries INTEGER NOT NULL CHECK(expected_entries BETWEEN 1 AND 1000),
  plan_json TEXT CHECK(plan_json IS NULL OR json_valid(plan_json)),
  public_json TEXT CHECK(public_json IS NULL OR (json_valid(public_json) AND length(CAST(public_json AS BLOB))<=2000000)),
  expires_at INTEGER NOT NULL,
  UNIQUE(id,target_revision)
);
CREATE INDEX cms_catalog_source ON cms_artifact_catalogs(source_revision,policy,source_digest);
CREATE UNIQUE INDEX cms_one_active_preparation ON cms_artifact_catalogs((1)) WHERE state IN ('building','ready');
CREATE TRIGGER cms_catalog_identity_immutable BEFORE UPDATE ON cms_artifact_catalogs WHEN OLD.state<>'building' BEGIN
  SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.actor IS NOT OLD.actor OR NEW.mode IS NOT OLD.mode
    OR NEW.expected_version IS NOT OLD.expected_version OR NEW.target_revision IS NOT OLD.target_revision
    OR NEW.source_revision IS NOT OLD.source_revision OR NEW.source_digest IS NOT OLD.source_digest
    OR NEW.policy IS NOT OLD.policy OR NEW.renderer IS NOT OLD.renderer OR NEW.assets IS NOT OLD.assets
    OR NEW.origin IS NOT OLD.origin OR NEW.context_digest IS NOT OLD.context_digest OR NEW.expected_entries IS NOT OLD.expected_entries
    OR NEW.plan_json IS NOT OLD.plan_json OR NEW.public_json IS NOT OLD.public_json OR NEW.expires_at IS NOT OLD.expires_at
    OR NOT((OLD.state='ready' AND NEW.state IN ('published','expired')) OR (OLD.state='published' AND NEW.state='retired'))
    THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;

CREATE TABLE cms_artifact_entries (
  catalog_id TEXT NOT NULL REFERENCES cms_artifact_catalogs(id),
  path TEXT NOT NULL CHECK(length(path) BETWEEN 1 AND 256),
  object_key TEXT NOT NULL CHECK(object_key LIKE 'prepared/v1/' || catalog_id || '/%' AND length(object_key)<=200),
  etag TEXT NOT NULL CHECK(length(etag) BETWEEN 1 AND 128),
  object_version TEXT NOT NULL CHECK(length(object_version) BETWEEN 1 AND 128),
  digest TEXT NOT NULL CHECK(length(digest)=64 AND digest NOT GLOB '*[^0-9a-f]*'),
  bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 4000000),
  content_type TEXT NOT NULL CHECK(content_type IN ('text/html; charset=utf-8','application/json; charset=utf-8','application/xml; charset=utf-8','text/plain; charset=utf-8')),
  status INTEGER NOT NULL CHECK(status IN (200,404)),
  PRIMARY KEY(catalog_id,path)
);
CREATE TRIGGER cms_artifact_entry_insert_guard BEFORE INSERT ON cms_artifact_entries BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=NEW.catalog_id AND state='building') THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
CREATE TRIGGER cms_artifact_entry_update_guard BEFORE UPDATE ON cms_artifact_entries BEGIN SELECT RAISE(ABORT,'cms_artifact_immutable'); END;
CREATE TRIGGER cms_artifact_entry_delete_guard BEFORE DELETE ON cms_artifact_entries BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=OLD.catalog_id AND state NOT IN ('retired','expired')) THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
CREATE TRIGGER cms_catalog_ready_guard BEFORE UPDATE OF state ON cms_artifact_catalogs WHEN NEW.state='ready' BEGIN
  SELECT CASE WHEN OLD.state<>'building' OR
    (SELECT COUNT(*) FROM cms_artifact_entries WHERE catalog_id=NEW.id)<>NEW.expected_entries OR
    NOT EXISTS(SELECT 1 FROM cms_revision_admissions a WHERE a.revision=NEW.source_revision AND a.policy=NEW.policy AND a.digest=NEW.source_digest)
    THEN RAISE(ABORT,'cms_catalog_incomplete') END;
END;

CREATE TABLE cms_publications (
  revision INTEGER PRIMARY KEY REFERENCES cms_revisions(version),
  catalog_id TEXT NOT NULL UNIQUE REFERENCES cms_artifact_catalogs(id)
);
CREATE TRIGGER cms_publication_binding_guard BEFORE INSERT ON cms_publications BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM cms_artifact_catalogs c
    JOIN cms_revisions r ON r.version=NEW.revision
    JOIN cms_revisions s ON s.version=c.source_revision
    JOIN cms_revision_admissions a ON a.revision=s.version AND a.policy=c.policy AND a.digest=c.source_digest
    WHERE c.id=NEW.catalog_id AND c.state='ready' AND c.target_revision=NEW.revision
      AND r.kind IN ('publish','rollback') AND r.source_revision=s.version AND r.document=s.document
      AND length(CAST(s.document AS BLOB))=a.document_bytes
  ) THEN RAISE(ABORT,'cms_publication_mismatch') END;
END;
CREATE TRIGGER cms_publication_immutable_update BEFORE UPDATE ON cms_publications BEGIN SELECT RAISE(ABORT,'cms_publication_immutable'); END;
CREATE TRIGGER cms_publication_immutable_delete BEFORE DELETE ON cms_publications BEGIN SELECT RAISE(ABORT,'cms_publication_immutable'); END;

CREATE TABLE cms_catalog_routes (
  catalog_id TEXT NOT NULL REFERENCES cms_artifact_catalogs(id),
  route_key TEXT NOT NULL CHECK(length(route_key) BETWEEN 1 AND 200),
  canonical_path TEXT NOT NULL CHECK(canonical_path LIKE '/%' AND canonical_path NOT LIKE '//%'),
  PRIMARY KEY(catalog_id,route_key)
);
CREATE TABLE cms_catalog_media (
  catalog_id TEXT NOT NULL REFERENCES cms_artifact_catalogs(id),
  media_key TEXT NOT NULL CHECK(media_key LIKE 'upload-%' AND length(media_key)<100),
  PRIMARY KEY(catalog_id,media_key)
);
CREATE TRIGGER cms_catalog_routes_insert_guard BEFORE INSERT ON cms_catalog_routes BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=NEW.catalog_id AND state='building') THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
CREATE TRIGGER cms_catalog_routes_update_guard BEFORE UPDATE ON cms_catalog_routes BEGIN SELECT RAISE(ABORT,'cms_catalog_sealed'); END;
CREATE TRIGGER cms_catalog_routes_delete_guard BEFORE DELETE ON cms_catalog_routes BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=OLD.catalog_id AND state NOT IN ('retired','expired')) THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
CREATE TRIGGER cms_catalog_media_insert_guard BEFORE INSERT ON cms_catalog_media BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=NEW.catalog_id AND state='building') THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
CREATE TRIGGER cms_catalog_media_update_guard BEFORE UPDATE ON cms_catalog_media BEGIN SELECT RAISE(ABORT,'cms_catalog_sealed'); END;
CREATE TRIGGER cms_catalog_media_delete_guard BEFORE DELETE ON cms_catalog_media BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_catalogs WHERE id=OLD.catalog_id AND state NOT IN ('retired','expired')) THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
-- Bounded per-source upload checks. No upload object or original row is rewritten.
CREATE TABLE cms_catalog_upload_checks (
  catalog_id TEXT NOT NULL REFERENCES cms_artifact_catalogs(id),
  position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 999),
  media_key TEXT NOT NULL CHECK(length(media_key) BETWEEN 1 AND 2000),
  state TEXT NOT NULL CHECK(state IN ('unused','verified')),
  receipt_json TEXT CHECK(receipt_json IS NULL OR (json_valid(receipt_json) AND length(CAST(receipt_json AS BLOB))<=2048)),
  CHECK((state='unused' AND receipt_json IS NULL) OR (state='verified' AND receipt_json IS NOT NULL)),
  PRIMARY KEY(catalog_id,position)
);
CREATE INDEX cms_upload_check_key ON cms_catalog_upload_checks(catalog_id,media_key,state);
CREATE TRIGGER cms_upload_check_insert_guard BEFORE INSERT ON cms_catalog_upload_checks BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_catalogs c,json_each(c.plan_json,'$.uploads') u
    WHERE c.id=NEW.catalog_id AND c.state='building' AND CAST(u.key AS INTEGER)=NEW.position
      AND json_extract(u.value,'$.key')=NEW.media_key)
    THEN RAISE(ABORT,'cms_catalog_sealed') END;
END;
CREATE TRIGGER cms_upload_check_immutable_update BEFORE UPDATE ON cms_catalog_upload_checks BEGIN SELECT RAISE(ABORT,'cms_upload_check_immutable'); END;
CREATE TRIGGER cms_upload_check_immutable_delete BEFORE DELETE ON cms_catalog_upload_checks BEGIN SELECT RAISE(ABORT,'cms_upload_check_immutable'); END;
CREATE TRIGGER cms_catalog_uploads_ready_guard BEFORE UPDATE OF state ON cms_artifact_catalogs WHEN NEW.state='ready' BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM cms_catalog_upload_checks WHERE catalog_id=NEW.id)<>COALESCE(json_array_length(NEW.plan_json,'$.uploads'),0)
    OR EXISTS(SELECT 1 FROM cms_catalog_media m WHERE m.catalog_id=NEW.id AND NOT EXISTS(
      SELECT 1 FROM cms_catalog_upload_checks u WHERE u.catalog_id=NEW.id AND u.media_key=m.media_key AND u.state='verified'))
    OR EXISTS(SELECT 1 FROM cms_catalog_upload_checks u WHERE u.catalog_id=NEW.id AND u.state='verified' AND NOT EXISTS(
      SELECT 1 FROM cms_catalog_media m WHERE m.catalog_id=NEW.id AND m.media_key=u.media_key))
    THEN RAISE(ABORT,'cms_catalog_uploads_incomplete') END;
END;

CREATE TABLE cms_artifact_reservations (
  catalog_id TEXT NOT NULL REFERENCES cms_artifact_catalogs(id),
  path TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 4000000),
  state TEXT NOT NULL CHECK(state IN ('pending','stored','released')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK(attempts BETWEEN 1 AND 3),
  PRIMARY KEY(catalog_id,path)
);

CREATE TABLE cms_large_projection_work (
  policy TEXT NOT NULL, context_digest TEXT NOT NULL, kind TEXT NOT NULL, digest TEXT NOT NULL, part_key TEXT NOT NULL,
  public_json TEXT CHECK(public_json IS NULL OR json_valid(public_json)),
  cursor TEXT NOT NULL DEFAULT '~', processed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL CHECK(total BETWEEN 1 AND 4000000),
  CHECK(processed BETWEEN 0 AND total),
  PRIMARY KEY(policy,context_digest,kind,digest,part_key)
);
CREATE TRIGGER cms_large_projection_budget BEFORE INSERT ON cms_large_projection_work
WHEN NOT EXISTS(SELECT 1 FROM cms_large_projection_work WHERE policy=NEW.policy AND context_digest=NEW.context_digest AND kind=NEW.kind AND digest=NEW.digest AND part_key=NEW.part_key) BEGIN
  SELECT CASE WHEN (SELECT COALESCE(SUM(length(CAST(public_json AS BLOB))),0) FROM cms_large_projection_work)+length(CAST(NEW.public_json AS BLOB))>67108864
    THEN RAISE(ABORT,'cms_projection_cache_budget') END;
END;

CREATE TABLE cms_projection_cache (
  policy TEXT NOT NULL,
  context_digest TEXT NOT NULL CHECK(length(context_digest)=64 AND context_digest NOT GLOB '*[^0-9a-f]*'),
  kind TEXT NOT NULL,
  digest TEXT NOT NULL CHECK(length(digest)=64 AND digest NOT GLOB '*[^0-9a-f]*'),
  part_key TEXT NOT NULL DEFAULT '',
  public_json TEXT CHECK(public_json IS NULL OR json_valid(public_json)),
  original_refs TEXT NOT NULL CHECK(json_valid(original_refs) AND json_type(original_refs)='array'),
  public_refs TEXT NOT NULL CHECK(json_valid(public_refs) AND json_type(public_refs)='array'),
  work_units INTEGER NOT NULL DEFAULT 0 CHECK(work_units BETWEEN 0 AND 4000000),
  stored_bytes INTEGER GENERATED ALWAYS AS (length(CAST(COALESCE(public_json,'') || original_refs || public_refs AS BLOB))) STORED,
  PRIMARY KEY(policy,context_digest,kind,digest,part_key)
);
CREATE TRIGGER cms_projection_managed_refs BEFORE INSERT ON cms_projection_cache
WHEN NEW.kind NOT IN ('media','manifest') BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM cms_artifact_catalogs c,json_tree(NEW.public_json) j
    WHERE c.policy=NEW.policy AND c.context_digest=NEW.context_digest AND c.state='building' AND j.type='text'
      AND (substr(j.atom,1,14)='/media/upload-' OR substr(j.atom,1,length(c.origin)+14)=c.origin||'/media/upload-')
      AND NOT EXISTS(SELECT 1 FROM json_each(c.plan_json,'$.context.mediaSources') s WHERE json_extract(s.value,'$[0]')=j.atom))
    THEN RAISE(ABORT,'cms_unknown_upload') END;
END;
CREATE TRIGGER cms_projection_cache_budget BEFORE INSERT ON cms_projection_cache
WHEN NOT EXISTS(SELECT 1 FROM cms_projection_cache WHERE policy=NEW.policy AND context_digest=NEW.context_digest AND kind=NEW.kind AND digest=NEW.digest AND part_key=NEW.part_key)
BEGIN
  SELECT CASE WHEN (SELECT COALESCE(SUM(stored_bytes),0) FROM cms_projection_cache)+NEW.stored_bytes>67108864 THEN RAISE(ABORT,'cms_projection_cache_budget') END;
END;
CREATE TRIGGER cms_projection_immutable_update BEFORE UPDATE ON cms_projection_cache BEGIN SELECT RAISE(ABORT,'cms_projection_immutable'); END;
CREATE TRIGGER cms_projection_immutable_delete BEFORE DELETE ON cms_projection_cache BEGIN SELECT RAISE(ABORT,'cms_projection_immutable'); END;
CREATE TRIGGER cms_artifact_reservation_budget BEFORE INSERT ON cms_artifact_reservations
WHEN NOT EXISTS(SELECT 1 FROM cms_artifact_reservations WHERE catalog_id=NEW.catalog_id AND path=NEW.path)
BEGIN
  SELECT CASE WHEN (SELECT COALESCE(SUM(bytes),0) FROM cms_artifact_reservations WHERE state IN ('pending','stored'))+NEW.bytes>536870912 THEN RAISE(ABORT,'cms_artifact_storage_budget') END;
END;
CREATE TRIGGER cms_artifact_reservation_identity BEFORE UPDATE ON cms_artifact_reservations BEGIN
  SELECT CASE WHEN NEW.catalog_id IS NOT OLD.catalog_id OR NEW.path IS NOT OLD.path OR NEW.bytes IS NOT OLD.bytes OR NEW.attempts<OLD.attempts OR NEW.attempts>OLD.attempts+1
    OR (OLD.state='released' AND NEW.state<>'released') OR (OLD.state='stored' AND NEW.state='pending')
    THEN RAISE(ABORT,'cms_reservation_immutable') END;
END;
