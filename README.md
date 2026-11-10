# Asistencia CNH

Pase de lista y aviso automático a padres de familia — Colegio Niños Héroes,
Secundaria y Preparatoria.

Funciona en cualquier dispositivo (Mac, Windows, iPhone, Android) porque es una
aplicación web. Se abre con una dirección de internet y se puede "instalar" en
la pantalla de inicio del celular con el escudo del colegio como icono.

---

## Cómo se usa

1. Entrar con correo y contraseña.
2. Elegir **Secundaria** o **Preparatoria**.
3. Elegir el grupo (1° A, 1° B… o 1er, 3er, 5to Semestre).
4. Tocar el nombre de cada alumno que **no asistió**. Se marca en rojo.
5. Botón **Notificar a padres** → muestra la lista y los correos → confirmar.

Los alumnos con permiso vigente aparecen **en gris, bloqueados**, con la leyenda
"Justificado". No se pueden marcar y no se les manda correo.

El correo sale de `secundaria@cnhtijuana.edu.mx` o de `prepa@cnhtijuana.edu.mx`
según el nivel.

---

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crear una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo
   (plan gratuito; región recomendada: *West US*).
2. Menú **SQL Editor** → pegar y ejecutar `supabase/01_schema.sql`.
3. Repetir con `supabase/02_seed_grupos.sql` (da de alta los 12 grupos).
4. Menú **Project Settings → API** y copiar tres valores:
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *anon public* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *service_role* → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **secreta, nunca se comparte**

### 2. Correo (Google Workspace)

Los avisos salen de las cuentas que ya tiene el colegio, cada nivel por la suya:

| Nivel | Cuenta |
|---|---|
| Secundaria | `secundaria@cnhtijuana.edu.mx` |
| Preparatoria | `prepa@cnhtijuana.edu.mx` |

No hay que tocar el DNS: el dominio ya está en Google Workspace.

Para cada cuenta hace falta una **contraseña de aplicación** de 16 caracteres
(no la contraseña normal):

1. Entrar a esa cuenta en Google.
2. Activar la **verificación en dos pasos** si no la tiene.
3. Ir a *Gestionar tu cuenta de Google → Seguridad → Contraseñas de aplicaciones*.
4. Generar una y copiarla a `CLAVE_SECUNDARIA` o `CLAVE_PREPARATORIA`.

En **Administración → Probar el correo** hay dos botones por cuenta:
*Probar acceso* solo revisa la contraseña sin enviar nada, y *Enviar prueba*
manda un aviso de ejemplo a la dirección que se indique.

Límite de Google: 2,000 correos al día por cuenta. Muy por encima de lo que
se manda en un día normal.

### 3. Publicar (Vercel)

1. Subir esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project** → importar el repositorio.
3. En **Environment Variables** cargar todo lo que está en `.env.example`.
   Las contraseñas de 16 caracteres van aquí, nunca en el código.
4. **Deploy**. Vercel entrega una dirección; se le puede poner un subdominio
   propio, por ejemplo `asistencia.cnhtijuana.edu.mx`.

### 4. Usuarios

Nadie puede registrarse por su cuenta. Las cuentas las crea un administrador
desde la app: **Administración → Usuarios del sistema → Dar de alta a alguien**
(nombre, correo, contraseña y tipo de acceso). Ahí mismo se puede suspender o
reactivar una cuenta, cambiarle la contraseña y cambiar su tipo de acceso.

| Acceso | Puede |
|---|---|
| Coordinador (prefecto) | Pasar lista, notificar, registrar permisos |
| Administrador | Todo lo anterior + cargar alumnos y dar de alta cuentas |

**Límite: 100 cuentas.** Al ocuparse el lugar 100 la app ya no deja crear más
(las suspendidas también cuentan). Para ampliarlo hay que cambiar el número en
dos lugares: `LIMITE_CUENTAS` en `src/lib/config.ts` (y volver a publicar) y
`limite_cuentas()` en `supabase/04_limite_cuentas.sql` (y volver a ejecutarlo).

Preparación, una sola vez:

1. Supabase → **SQL Editor** → pegar y ejecutar `supabase/04_limite_cuentas.sql`.
2. Supabase → **Authentication → Sign In / Providers** → apagar
   *Allow new users to sign up*. La app sigue pudiendo crear cuentas.
3. Vercel → **Environment Variables**: confirmar que está
   `SUPABASE_SERVICE_ROLE_KEY`. Sin ella la app no puede crear cuentas.

**La primera cuenta** (la de la dirección) se crea en Supabase →
**Authentication → Users → Add user**, marcando *Auto Confirm User*. Si es la
primera del sistema queda como administrador automáticamente; si ya había
otras, hay que ir a **Table Editor → perfiles** y poner `rol = admin` y
`activo = true`.

### 5. Cargar los alumnos

Dos caminos, el resultado es el mismo:

**a) Desde la app** — Administración → Alumnos y correos → subir el .xlsx.
Muestra una revisión hoja por hoja antes de guardar nada.

**b) Desde SQL** — generar el archivo y pegarlo en Supabase:

```bash
npx tsx tools/generar_sql.ts "Lista de alumnos.xlsx" > supabase/03_alumnos.sql
```

#### Formato del Excel

Funciona con el formato que ya usa el colegio: **una hoja por grupo**, el
nombre del alumno en una columna y el correo del tutor en otra, sin
encabezados. El grupo se deduce del nombre de la hoja:

| Nombre de hoja | Se interpreta como |
|---|---|
| `SEC 1A`, `Sec 1a`, `SECUNDARIA 1A`, `1° A` | 1° A |
| `PREPA 1RO`, `PREPA 1R0`, `PREPA 1`, `1SEM` | 1er Semestre |
| `PREPA 5TO`, `PREPA 50`, `5to Semestre` | 5to Semestre |

En preparatoria basta el primer dígito, así que las erratas comunes
(`1R0` con cero, `50` por `5TO`) se interpretan bien.

También acepta un solo listado con columnas *Grupo, Nombre completo,
Correo 1, Correo 2* — ver `/api/plantilla` para un ejemplo.

Los nombres en MAYÚSCULAS se convierten a Mayúscula Inicial para que la lista
se lea mejor, respetando apóstrofes (`D'LISSE` → `D'Lisse`) y partículas
(`DE LA TORRE` → `de la Torre`). El nombre completo se parte a la mexicana:
primera palabra = apellido paterno, segunda = materno, el resto = nombres.

---

## Modo demostración

Sin las variables de Supabase, la app arranca con alumnos de ejemplo y **no
envía ningún correo**. Sirve para enseñarla y practicar sin riesgo.

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## Instalarla en el iPhone

Abrir la dirección en Safari → botón *Compartir* → **Agregar a inicio**.
Queda con el escudo del colegio y se abre a pantalla completa, como una app.

En Android y en computadora: Chrome → menú → *Instalar aplicación*.

---

## Semestres pares de Preparatoria

En febrero, cuando empiecen 2°, 4° y 6° semestre: Supabase → **Table Editor →
grupos** → poner `activo = true` en `2SEM`, `4SEM` y `6SEM` (y `false` en los
nones si ya no se usan).

---

## Estructura

```
supabase/          SQL de la base de datos
src/app/           Pantallas y rutas de la aplicación
src/components/    Piezas de interfaz (lista, formularios)
src/lib/           Datos, fechas, correo, lectura de Excel
tools/             Scripts: generar SQL, probar la importación, iconos
public/            Escudo e iconos del colegio
```

## Qué guarda la base de datos

- `alumnos`, `tutores` — quién es quién y a qué correo se avisa
- `asistencia` — un registro por alumno por día
- `justificaciones` — permisos con rango de fechas
- `notificaciones` — bitácora de cada correo enviado, con destinatarios y hora

Todas las tablas tienen *Row Level Security*: solo entra quien tiene usuario
activo del colegio.
