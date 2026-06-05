DELETE older
FROM volunteer_elder_scope older
JOIN volunteer_elder_scope newer
  ON older.elder_id = newer.elder_id
 AND (
   older.created_at < newer.created_at
   OR (older.created_at = newer.created_at AND older.id < newer.id)
 );

ALTER TABLE volunteer_elder_scope
  ADD UNIQUE KEY uk_vol_scope_elder (elder_id);
