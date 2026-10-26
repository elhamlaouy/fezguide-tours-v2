/** Exact-release selection shared by prepared artifacts and uploaded public media.
 * The first four bound parameters are policy, renderer, assets and origin. */
export const RELEASE_CTE = `WITH release(policy,renderer,assets,origin) AS (VALUES (?,?,?,?))`;
export const REFRESH_JOIN = `LEFT JOIN cms_catalog_refreshes refresh ON refresh.catalog_id=(
  SELECT f.catalog_id FROM cms_catalog_refreshes f JOIN cms_artifact_catalogs candidate ON candidate.id=f.catalog_id
    CROSS JOIN release identity
  WHERE f.revision=d.published_revision AND f.previous_catalog_id=p.catalog_id AND candidate.state='published'
    AND candidate.source_revision=f.revision AND candidate.expected_version=f.expected_version
    AND candidate.target_revision=f.expected_version+1 AND candidate.mode='publish'
    AND f.policy=candidate.policy AND f.renderer=candidate.renderer AND f.assets=candidate.assets AND f.origin=candidate.origin
    AND f.policy=identity.policy AND f.renderer=identity.renderer AND f.assets=identity.assets AND f.origin=identity.origin
    AND NOT EXISTS(SELECT 1 FROM cms_catalog_bootstraps boot WHERE boot.catalog_id=f.catalog_id)
    AND EXISTS(SELECT 1 FROM cms_revision_admissions admitted WHERE admitted.revision=f.revision AND admitted.policy=f.policy
      AND admitted.digest=candidate.source_digest AND admitted.document_bytes=f.document_bytes)
)`;
export const SELECTED_CATALOG = `c.id=COALESCE(refresh.catalog_id,p.catalog_id,b.catalog_id)
  AND ((refresh.catalog_id IS NOT NULL AND c.source_revision=d.published_revision)
    OR (refresh.catalog_id IS NULL AND ((p.catalog_id IS NOT NULL AND c.target_revision=d.published_revision)
      OR (p.catalog_id IS NULL AND b.catalog_id IS NOT NULL AND c.source_revision=d.published_revision AND c.expected_version=d.version))))`;
