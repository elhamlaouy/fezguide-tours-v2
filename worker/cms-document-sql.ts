// Only fixed schema field names enter these queries. Manifest values are bound data.
// SQLite does JSON assembly; the Worker does not parse/stringify the whole document.
const arrays=['navigation','pages','products','editorialEntries','blogPosts','teamMembers','faqs','media','reviews'] as const;
const legacyArrays=['tours','customPages','blogPosts','teamMembers','faqs'] as const;
const list=(kind:string)=>`json(COALESCE((SELECT json_group_array(json(value)) FROM (SELECT value FROM parts WHERE kind='${kind}' ORDER BY position)),'[]'))`;
const single=(kind:string)=>`json((SELECT value FROM parts WHERE kind='${kind}' AND position=0))`;

function assemble(parts:string) {
  const fields=[
    `'schemaVersion',${single('schemaVersion')}`,
    `'siteSettings',${single('siteSettings')}`,
    `'theme',${single('theme')}`,
    `'navigation',${list('navigation')}`,
    `'footer',${single('footer')}`,
    `'uiCopy',json(COALESCE((SELECT json_group_object(field_key,json(value)) FROM (SELECT * FROM parts WHERE kind='uiCopy' ORDER BY position)),'{}'))`,
    ...arrays.filter(kind=>kind!=='navigation').map(kind=>`'${kind}',${list(kind)}`),
    `'legacy',json_object(${legacyArrays.map(kind=>`'${kind}',${list(`legacy.${kind}`)}`).join(',')},'siteSettings',${single('legacy.siteSettings')})`,
  ];
  return `WITH parts AS MATERIALIZED (${parts}), assembled AS (SELECT json_object(${fields.join(',')}) AS document)
    SELECT document,length(CAST(document AS BLOB)) AS document_bytes,
      (SELECT COUNT(*) FROM parts) AS part_count FROM assembled`;
}

export function documentAssemblySql() {
  return assemble(`SELECT json_extract(m.value,'$.kind') AS kind,
    json_extract(m.value,'$.index') AS position,json_extract(m.value,'$.key') AS field_key,p.document_json AS value
    FROM cms_save_jobs j CROSS JOIN json_each(j.manifest) m
    CROSS JOIN cms_validation_parts p ON p.policy=j.policy
      AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest')
    WHERE j.id=?`);
}

/** Caller separately proves ALL source parts projected; visible count is not completeness. */
export function projectedDocumentSql() {
  return assemble(`WITH admitted AS MATERIALIZED (
    SELECT json_extract(m.value,'$.kind') AS kind,json_extract(m.value,'$.index') AS position,
      json_extract(m.value,'$.key') AS field_key,p.public_json AS value,p.original_refs,p.public_refs
    FROM cms_artifact_catalogs c
    JOIN cms_revision_admissions a ON a.revision=c.source_revision AND a.policy=c.policy AND a.digest=c.source_digest
    CROSS JOIN json_each(a.manifest) m
    CROSS JOIN cms_projection_cache p ON p.policy=c.policy AND p.context_digest=c.context_digest
      AND p.kind=json_extract(m.value,'$.kind') AND p.digest=json_extract(m.value,'$.digest')
      AND p.part_key=COALESCE(json_extract(m.value,'$.key'),'')
    WHERE c.id=?
  ), original_ids AS (SELECT DISTINCT j.value AS id FROM admitted p,json_each(p.original_refs) j),
     public_ids AS (SELECT DISTINCT j.value AS id FROM admitted p,json_each(p.public_refs) j)
  SELECT kind,position,field_key,value FROM admitted p WHERE value IS NOT NULL AND
    (kind<>'media' OR NOT EXISTS(SELECT 1 FROM original_ids WHERE id=json_extract(p.value,'$.id'))
      OR EXISTS(SELECT 1 FROM public_ids WHERE id=json_extract(p.value,'$.id')))`);
}
