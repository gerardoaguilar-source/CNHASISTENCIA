-- =====================================================================
--  ASISTENCIA CNH — Grupos del ciclo escolar
--  Ejecutar después de 01_schema.sql
-- =====================================================================

insert into grupos (nivel, clave, nombre, orden, activo) values
  -- SECUNDARIA
  ('secundaria', '1A', '1° A', 11, true),
  ('secundaria', '1B', '1° B', 12, true),
  ('secundaria', '1C', '1° C', 13, true),
  ('secundaria', '2A', '2° A', 21, true),
  ('secundaria', '2B', '2° B', 22, true),
  ('secundaria', '2C', '2° C', 23, true),
  ('secundaria', '3A', '3° A', 31, true),
  ('secundaria', '3B', '3° B', 32, true),
  ('secundaria', '3C', '3° C', 33, true),

  -- PREPARATORIA — semestres nones (agosto–enero)
  ('preparatoria', '1SEM', '1er Semestre', 10, true),
  ('preparatoria', '3SEM', '3er Semestre', 30, true),
  ('preparatoria', '5SEM', '5to Semestre', 50, true),

  -- PREPARATORIA — semestres pares (febrero–junio). Inactivos hasta que
  -- empiece el semestre; se activan desde Administración → Grupos.
  ('preparatoria', '2SEM', '2do Semestre', 20, false),
  ('preparatoria', '4SEM', '4to Semestre', 40, false),
  ('preparatoria', '6SEM', '6to Semestre', 60, false)
on conflict (nivel, clave) do update
  set nombre = excluded.nombre,
      orden  = excluded.orden;
