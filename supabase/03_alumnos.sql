-- =====================================================================
--  ASISTENCIA CNH — carga de alumnos y correos de tutores
--  Generado desde: 015a2ec9-prueba.xlsx
--  60 alumnos · 12 hojas
--  Ejecutar DESPUÉS de 01_schema.sql y 02_seed_grupos.sql
--  Se puede volver a ejecutar sin duplicar: compara grupo + nombre.
-- =====================================================================

begin;

create temp table _carga (
  nivel text, clave text, pat text, mat text, nom text, correo text
) on commit drop;

insert into _carga (nivel, clave, pat, mat, nom, correo) values
  ('secundaria', '1A', 'Aguirre', 'Martorell', 'Gustavo', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '1A', 'Arteaga', 'Suarez', 'Janeth Isabella', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '1A', 'Avila', 'Contreras', 'Irlanda Montserrat', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '1A', 'Bretado', 'Valles', 'Valentina', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '1A', 'Contreras', 'Franco', 'Charleene', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '1B', 'Apodaca', 'Gutierrez', 'Ana Sofia', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '1B', 'Aramburo', 'Prado', 'Carlos Enrique', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '1B', 'Barragan', 'Camacho', 'Luana Simeone', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '1B', 'Beltran', 'Cervantes', 'Mateo Daniel', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '1B', 'Briceño', 'Guerrero', 'Gabriel Fernando', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '1C', 'Aguirre', 'Muñoz', 'Katherine Alexa', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '1C', 'Barrios', 'Valdez', 'Aura Dariadna', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '1C', 'Camberos', 'Cedillo', 'Andrea Melissa', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '1C', 'Carrillo', 'Vega', 'Emma Lisette', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '1C', 'Castillo', 'Macias', 'Carmen Lizeth', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '2A', 'Alcudia', 'Castañeda', 'Carlos Mario', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '2A', 'Alfaro', 'Guadarrama', 'Dylan Alexander', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '2A', 'Ambriz', 'Huerta', 'Logan Ivan', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '2A', 'Apac', 'Vizcaino', 'Emma Sofia', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '2A', 'Bazaldua', 'Mendivil', 'Lucas', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '2B', 'Avalos', 'Perez', 'Victor Ivan', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '2B', 'Ayala', 'Garcia', 'Isabella', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '2B', 'Beltran', 'Rodriguez', 'Alejandra Yamileth', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '2B', 'Calixto', 'Ortega', 'Yatziry Jacqueline', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '2B', 'Centeno', 'Arenas', 'Carlos Emilio', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '2C', 'Alcaraz', 'Rivera', 'Juan Pablo', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '2C', 'Alcibia', '', 'Erick', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '2C', 'Alvarez', 'Zavala', 'Jennifer Nahomy', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '2C', 'Ayon', 'Elias', 'Sebastian', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '2C', 'Bazaldua', 'Mendivil', 'Mateo', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '3A', 'Alcala', 'Quiñonez', 'Said Isaias', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '3A', 'Alfaro', 'Temix', 'Juan Luis', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '3A', 'Amaya', 'Martinez', 'Ambar Elena', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '3A', 'Avila', 'Perez', 'Maria Paula', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '3A', 'Cañez', 'Guzman', 'Shantal', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '3B', 'Alcaraz', 'Lupercio', 'Sara Karime', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '3B', 'Armer', 'Ortiz', 'Luz D''Lisse', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '3B', 'Barron', 'Peraza', 'Fernanda', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '3B', 'Beltran', 'Aguilar', 'Sergio', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '3B', 'Betancourt', 'Carrillo', 'Mitchell Humberto', 'cobranza.cuspide@gmail.com'),
  ('secundaria', '3C', 'Acosta', 'Duran', 'Guillermo Andre', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '3C', 'Aramburo', 'Prado', 'Eric Humberto', 'gerardoaguilar2002@gmail.com'),
  ('secundaria', '3C', 'Bernal', 'Madrid', 'Samantha', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('secundaria', '3C', 'Ceballos', 'Tapia', 'Danna Marlene', 'gaguilarlopez1776@gmail.com'),
  ('secundaria', '3C', 'Cervantes', 'Garcia', 'Jesus Gael', 'cobranza.cuspide@gmail.com'),
  ('preparatoria', '1SEM', 'Avalos', 'Escoboza', 'Xavier Alonso', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('preparatoria', '1SEM', 'Bueno', 'Oliva', 'Ashley Michelle', 'gerardoaguilar2002@gmail.com'),
  ('preparatoria', '1SEM', 'Carrillo', 'Miranda', 'Renata Susette', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('preparatoria', '1SEM', 'Chavez', 'Catu', 'Victoria', 'gaguilarlopez1776@gmail.com'),
  ('preparatoria', '1SEM', 'Diaz', 'Camacho', 'Jezer Jezoar', 'cobranza.cuspide@gmail.com'),
  ('preparatoria', '3SEM', 'Aguilar', 'Robles', 'Arleth Rubi', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('preparatoria', '3SEM', 'Arias', 'Marquez', 'Alexis Abed', 'gerardoaguilar2002@gmail.com'),
  ('preparatoria', '3SEM', 'Arteaga', 'Suarez', 'Javier Eduardo', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('preparatoria', '3SEM', 'Beltran', 'Malpica', 'Luis Omar', 'gaguilarlopez1776@gmail.com'),
  ('preparatoria', '3SEM', 'Cota', 'Prichardo', 'Etzhany', 'cobranza.cuspide@gmail.com'),
  ('preparatoria', '5SEM', 'Alcala', 'Quinonez', 'Karime', 'gerardo.aguilar@cnhtijuana.edu.mx'),
  ('preparatoria', '5SEM', 'Apac', 'Vizcaino', 'Luciana Tutuli', 'gerardoaguilar2002@gmail.com'),
  ('preparatoria', '5SEM', 'Betancourt', 'Quiñonez', 'Jennifer', 'ing.salvador.aguilar@cnhtijuana.edu.mx'),
  ('preparatoria', '5SEM', 'Calderon', 'Mandujano', 'Xavi Alonso', 'gaguilarlopez1776@gmail.com'),
  ('preparatoria', '5SEM', 'Castro', 'Cervantes', 'Alejandro', 'cobranza.cuspide@gmail.com');

-- Alta de alumnos que todavía no existen
insert into alumnos (grupo_id, nombre, apellido_paterno, apellido_materno, activo)
select distinct g.id, c.nom, c.pat, c.mat, true
from _carga c
join grupos g on g.clave = c.clave and g.nivel = c.nivel::nivel_escolar
where not exists (
  select 1 from alumnos a
  where a.grupo_id = g.id and a.nombre = c.nom
    and a.apellido_paterno = c.pat and a.apellido_materno = c.mat
);

-- Correos de los tutores
insert into tutores (alumno_id, email, notificar)
select a.id, lower(c.correo), true
from _carga c
join grupos g on g.clave = c.clave and g.nivel = c.nivel::nivel_escolar
join alumnos a on a.grupo_id = g.id and a.nombre = c.nom
  and a.apellido_paterno = c.pat and a.apellido_materno = c.mat
where c.correo is not null
on conflict do nothing;

commit;

-- Comprobación: cuántos alumnos quedaron en cada grupo
select g.nivel, g.nombre as grupo, count(a.id) as alumnos,
       count(distinct t.alumno_id) as con_correo
from grupos g
left join alumnos a on a.grupo_id = g.id and a.activo
left join tutores t on t.alumno_id = a.id
group by g.nivel, g.nombre, g.orden order by g.nivel, g.orden;
