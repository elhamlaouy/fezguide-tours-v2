-- Private recovery journals only. No original content/history/media/pointer migration.
CREATE TABLE cms_restore_jobs (
 id TEXT PRIMARY KEY CHECK(length(id)=32 AND id NOT GLOB '*[^0-9a-f]*'),
 actor TEXT NOT NULL,policy TEXT NOT NULL,expected_version INTEGER NOT NULL CHECK(expected_version>=0),
 archive_digest TEXT NOT NULL CHECK(length(archive_digest)=64 AND archive_digest NOT GLOB '*[^0-9a-f]*'),
 revision_digest TEXT NOT NULL CHECK(length(revision_digest)=64 AND revision_digest NOT GLOB '*[^0-9a-f]*'),
 state TEXT NOT NULL CHECK(state IN ('open','expired','committed')),
 save_job_id TEXT REFERENCES cms_save_jobs(id),
 checked_parts INTEGER NOT NULL DEFAULT 0 CHECK(checked_parts>=0),
 checked_media INTEGER NOT NULL DEFAULT 0 CHECK(checked_media>=0),
 expires_at INTEGER NOT NULL,result_revision INTEGER REFERENCES cms_revisions(version)
);
CREATE UNIQUE INDEX cms_one_restore ON cms_restore_jobs((1)) WHERE state='open';
CREATE TABLE cms_restore_media (
 job_id TEXT NOT NULL REFERENCES cms_restore_jobs(id),original_key TEXT NOT NULL,
 input_digest TEXT NOT NULL CHECK(length(input_digest)=64 AND input_digest NOT GLOB '*[^0-9a-f]*'),
 target_src TEXT NOT NULL CHECK(target_src LIKE '/media/upload-%'),
 receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json) AND length(CAST(receipt_json AS BLOB))<=2048),
 PRIMARY KEY(job_id,original_key)
);
CREATE TRIGGER cms_restore_media_immutable_update BEFORE UPDATE ON cms_restore_media BEGIN SELECT RAISE(ABORT,'cms_restore_media_immutable'); END;
CREATE TRIGGER cms_restore_media_immutable_delete BEFORE DELETE ON cms_restore_media BEGIN SELECT RAISE(ABORT,'cms_restore_media_immutable'); END;
CREATE TRIGGER cms_restore_media_budget BEFORE INSERT ON cms_restore_media BEGIN
 SELECT CASE WHEN (SELECT COALESCE(SUM(length(CAST(receipt_json||target_src||original_key AS BLOB))),0) FROM cms_restore_media)+length(CAST(NEW.receipt_json||NEW.target_src||NEW.original_key AS BLOB))>16777216 THEN RAISE(ABORT,'cms_restore_budget') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM cms_restore_jobs WHERE id=NEW.job_id AND state='open' AND save_job_id IS NULL AND expires_at>unixepoch()) THEN RAISE(ABORT,'restore_conflict') END;
END;
