-- =====================================================================
--  ASISTENCIA CNH — Límite de cuentas
--  Ejecutar en Supabase → SQL Editor (una sola vez; se puede repetir).
--
--  Las cuentas solo se crean desde la app (Administración → Usuarios).
--  Esto es el candado del lado de la base de datos:
--
--   1. Al llegar al límite, la base de datos rechaza cualquier cuenta
--      nueva, venga de donde venga.
--   2. Toda cuenta nueva nace SUSPENDIDA y como coordinador. Solo la app,
--      cuando un administrador la da de alta, la activa y le pone su tipo
--      de acceso. Así, una cuenta creada por cualquier otro camino no
--      puede ver nada.
--   3. Excepción: si todavía no existe ninguna cuenta, la primera nace
--      activa y como administrador (es la de la dirección).
--
--  PARA CAMBIAR EL LÍMITE: cambiar el número de abajo, volver a ejecutar
--  este archivo, y cambiar también LIMITE_CUENTAS en src/lib/config.ts.
-- =====================================================================

create or replace function public.limite_cuentas()
returns int language sql immutable as $$
  select 100
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  primera boolean;
begin
  -- Un solo alta a la vez, para que dos altas simultáneas no rebasen el límite
  perform pg_advisory_xact_lock(hashtext('asistencia_cnh_limite_cuentas'));

  if (select count(*) from public.perfiles) >= public.limite_cuentas() then
    raise exception 'Límite de cuentas alcanzado (%).', public.limite_cuentas();
  end if;

  primera := not exists (select 1 from public.perfiles);

  insert into public.perfiles (id, nombre, email, rol, activo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    case when primera then 'admin'::rol_usuario else 'coordinador'::rol_usuario end,
    primera
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
