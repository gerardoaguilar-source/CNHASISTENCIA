-- =====================================================================
--  ASISTENCIA CNH — Esquema de base de datos
--  Colegio Niños Héroes · Tijuana, B.C.
--  Ejecutar en Supabase → SQL Editor (una sola vez)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type nivel_escolar as enum ('secundaria', 'preparatoria');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estatus_asistencia as enum ('presente', 'ausente', 'justificado', 'retardo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rol_usuario as enum ('admin', 'coordinador');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estatus_envio as enum ('pendiente', 'enviado', 'error');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- PERFILES  (staff que usa la app; se liga a auth.users de Supabase)
-- ---------------------------------------------------------------------
create table if not exists perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  rol         rol_usuario not null default 'coordinador',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando se da de alta un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'coordinador')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- GRUPOS
-- ---------------------------------------------------------------------
create table if not exists grupos (
  id            uuid primary key default gen_random_uuid(),
  nivel         nivel_escolar not null,
  clave         text not null,          -- '1A', '1SEM'
  nombre        text not null,          -- '1° A', '1er Semestre'
  orden         int  not null default 0,
  activo        boolean not null default true,
  unique (nivel, clave)
);


-- ---------------------------------------------------------------------
-- ALUMNOS
-- ---------------------------------------------------------------------
create table if not exists alumnos (
  id                uuid primary key default gen_random_uuid(),
  grupo_id          uuid not null references grupos(id) on delete restrict,
  matricula         text,
  nombre            text not null,
  apellido_paterno  text not null default '',
  apellido_materno  text not null default '',
  activo            boolean not null default true,
  creado_en         timestamptz not null default now()
);

create index if not exists idx_alumnos_grupo on alumnos(grupo_id) where activo;

-- Nombre completo ordenado a la mexicana: APELLIDOS, Nombre
create or replace function nombre_completo(a alumnos)
returns text language sql immutable as $$
  select trim(both ' ' from
    trim(a.apellido_paterno || ' ' || a.apellido_materno) || ' ' || a.nombre)
$$;


-- ---------------------------------------------------------------------
-- TUTORES  (padre / madre / tutor — varios correos por alumno)
-- ---------------------------------------------------------------------
create table if not exists tutores (
  id          uuid primary key default gen_random_uuid(),
  alumno_id   uuid not null references alumnos(id) on delete cascade,
  nombre      text not null default '',
  email       text not null,
  telefono    text,
  parentesco  text,                     -- 'Madre', 'Padre', 'Tutor'
  notificar   boolean not null default true,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_tutores_alumno on tutores(alumno_id);
create unique index if not exists idx_tutores_alumno_email
  on tutores(alumno_id, lower(email));


-- ---------------------------------------------------------------------
-- JUSTIFICACIONES  (permisos por rango de fechas)
-- ---------------------------------------------------------------------
create table if not exists justificaciones (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references alumnos(id) on delete cascade,
  fecha_inicio   date not null,
  fecha_fin      date not null,
  motivo         text not null default '',
  registrado_por uuid references perfiles(id),
  cancelada      boolean not null default false,
  creado_en      timestamptz not null default now(),
  constraint rango_valido check (fecha_fin >= fecha_inicio)
);

create index if not exists idx_justif_alumno_rango
  on justificaciones(alumno_id, fecha_inicio, fecha_fin) where not cancelada;

-- ¿El alumno tiene permiso vigente en esta fecha?
create or replace function esta_justificado(p_alumno uuid, p_fecha date)
returns boolean language sql stable as $$
  select exists (
    select 1 from justificaciones j
    where j.alumno_id = p_alumno
      and not j.cancelada
      and p_fecha between j.fecha_inicio and j.fecha_fin
  )
$$;


-- ---------------------------------------------------------------------
-- ASISTENCIA  (un registro por alumno por día)
-- ---------------------------------------------------------------------
create table if not exists asistencia (
  id              uuid primary key default gen_random_uuid(),
  alumno_id       uuid not null references alumnos(id) on delete cascade,
  grupo_id        uuid not null references grupos(id) on delete restrict,
  fecha           date not null,
  estatus         estatus_asistencia not null,
  justificacion_id uuid references justificaciones(id) on delete set null,
  nota            text,
  registrado_por  uuid references perfiles(id),
  registrado_en   timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (alumno_id, fecha)
);

create index if not exists idx_asistencia_fecha_grupo on asistencia(fecha, grupo_id);
create index if not exists idx_asistencia_ausentes
  on asistencia(fecha) where estatus = 'ausente';

create or replace function touch_asistencia()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

drop trigger if exists trg_touch_asistencia on asistencia;
create trigger trg_touch_asistencia before update on asistencia
  for each row execute function touch_asistencia();


-- ---------------------------------------------------------------------
-- NOTIFICACIONES  (bitácora de correos enviados a padres)
-- ---------------------------------------------------------------------
create table if not exists notificaciones (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references alumnos(id) on delete cascade,
  asistencia_id  uuid references asistencia(id) on delete set null,
  fecha          date not null,
  destinatarios  text[] not null default '{}',
  remitente      text not null,
  asunto         text not null,
  estatus        estatus_envio not null default 'pendiente',
  proveedor_id   text,
  error          text,
  enviado_por    uuid references perfiles(id),
  creado_en      timestamptz not null default now()
);

create index if not exists idx_notif_alumno_fecha on notificaciones(alumno_id, fecha);
-- Evita mandar dos veces el mismo aviso el mismo día
create unique index if not exists idx_notif_unica
  on notificaciones(alumno_id, fecha) where estatus = 'enviado';


-- =====================================================================
--  VISTA: lista de pase de lista de un grupo en una fecha
-- =====================================================================
create or replace view v_lista_grupo as
select
  a.id              as alumno_id,
  a.grupo_id,
  g.nivel,
  g.clave           as grupo_clave,
  g.nombre          as grupo_nombre,
  a.matricula,
  a.nombre,
  a.apellido_paterno,
  a.apellido_materno,
  nombre_completo(a) as nombre_completo,
  (select count(*) from tutores t where t.alumno_id = a.id and t.notificar) as tutores_con_correo
from alumnos a
join grupos g on g.id = a.grupo_id
where a.activo and g.activo;


-- =====================================================================
--  RLS — Seguridad a nivel de fila
--  Todo el staff autenticado y activo puede leer y registrar asistencia.
--  Solo admin puede modificar catálogos (alumnos, tutores, grupos).
-- =====================================================================
alter table perfiles        enable row level security;
alter table grupos          enable row level security;
alter table alumnos         enable row level security;
alter table tutores         enable row level security;
alter table justificaciones enable row level security;
alter table asistencia      enable row level security;
alter table notificaciones  enable row level security;

create or replace function es_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles p where p.id = auth.uid() and p.activo)
$$;

create or replace function es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles p where p.id = auth.uid() and p.activo and p.rol = 'admin')
$$;

-- PERFILES
drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles for select using (es_staff());
drop policy if exists perfiles_admin on perfiles;
create policy perfiles_admin on perfiles for all using (es_admin()) with check (es_admin());

-- CATÁLOGOS: lectura para staff, escritura para admin
do $$
declare t text;
begin
  foreach t in array array['grupos','alumnos','tutores'] loop
    execute format('drop policy if exists %1$s_select on %1$s', t);
    execute format('create policy %1$s_select on %1$s for select using (es_staff())', t);
    execute format('drop policy if exists %1$s_write on %1$s', t);
    execute format('create policy %1$s_write on %1$s for all using (es_admin()) with check (es_admin())', t);
  end loop;
end $$;

-- JUSTIFICACIONES / ASISTENCIA / NOTIFICACIONES: todo el staff
do $$
declare t text;
begin
  foreach t in array array['justificaciones','asistencia','notificaciones'] loop
    execute format('drop policy if exists %1$s_all on %1$s', t);
    execute format('create policy %1$s_all on %1$s for all using (es_staff()) with check (es_staff())', t);
  end loop;
end $$;
