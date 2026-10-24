// Fixed SQL fragments only. Owner JSON remains inside D1; rows contain metadata, never prose.
// Encoded source paths give stable postorder and numeric array order; JSON node IDs are opaque.
const flag=(name:string)=>`json(CASE json_type(j.value,'$.${name}') WHEN 'false' THEN 'false' WHEN 'true' THEN 'true' ELSE 'null' END)`;
export const LARGE_NODES_SQL=`WITH RECURSIVE nodes AS MATERIALIZED (
  SELECT j.id,j.parent,j.key,j.type,j.fullkey,
    CASE WHEN j.type='object' THEN json_object('id',json_extract(j.value,'$.id'),'pageId',json_extract(j.value,'$.pageId'),
      'productId',json_extract(j.value,'$.productId'),'enabled',${flag('enabled')},'published',${flag('published')}) END AS summary,
    CASE WHEN j.type='text' AND length(CAST(j.atom AS BLOB))<=320 THEN j.atom END AS short_value
  FROM cms_large_projection_work w JOIN cms_validation_parts v ON v.policy=w.policy AND v.kind=w.kind AND v.digest=w.digest,
    json_tree(v.document_json) j WHERE w.policy=? AND w.context_digest=? AND w.kind=? AND w.digest=? AND w.part_key=?
), positioned(id,sortkey,field) AS (
  SELECT id,'/',? FROM nodes WHERE parent IS NULL
  UNION ALL
  SELECT n.id,p.sortkey||CASE WHEN typeof(n.key)='integer' THEN 'i'||printf('%010d',n.key) ELSE 'k'||hex(CAST(n.key AS BLOB)) END||'/',
    CASE WHEN parent.type='array' THEN p.field ELSE CAST(n.key AS TEXT) END
  FROM positioned p JOIN nodes n ON n.parent=p.id JOIN nodes parent ON parent.id=p.id
), descriptors AS (
  SELECT n.fullkey,n.type,n.summary,p.sortkey,p.field,
    CASE WHEN typeof(n.key)='integer' AND p.field IN ('productIds','reviewIds') THEN n.short_value END AS value
  FROM nodes n JOIN positioned p ON p.id=n.id
  WHERE p.sortkey<? ORDER BY p.sortkey DESC
), bounded AS (
 SELECT *,ROW_NUMBER() OVER(ORDER BY sortkey DESC) AS ordinal,
   SUM(length(CAST(json_object('fullkey',fullkey,'type',type,'summary',summary,'sortkey',sortkey,'field',field,'value',value) AS BLOB))) OVER(ORDER BY sortkey DESC) AS running_bytes
 FROM descriptors
) SELECT fullkey,type,summary,sortkey,field,value FROM bounded WHERE ordinal<=12 AND running_bytes+ordinal+1<=32768 ORDER BY sortkey DESC`;

/** Exact reference traversal excludes every property named media and deduplicates like Set. */
export function largeRefsSql(raw:string):string {
 return `(WITH RECURSIVE nodes AS MATERIALIZED(SELECT id,parent,key,type,atom FROM json_tree(${raw})),
   excluded(id) AS (SELECT id FROM nodes WHERE key='media' UNION ALL SELECT n.id FROM nodes n JOIN excluded e ON n.parent=e.id)
   SELECT json_group_array(id) FROM (SELECT DISTINCT CASE WHEN n.key='mediaId' THEN n.atom ELSE json_extract(s.value,'$[1]') END AS id
     FROM nodes n LEFT JOIN json_each(c.plan_json,'$.context.mediaSources') s ON json_extract(s.value,'$[0]')=n.atom
     WHERE n.type='text' AND (n.key='mediaId' OR s.value IS NOT NULL) AND n.id NOT IN (SELECT id FROM excluded)))`;
}
