import { htmlAviso, textoAviso, asuntoAviso } from "../src/lib/correo/plantilla";
import { writeFileSync } from "fs";
const d = {
  alumno: "Fuentes Vega Pablo Andrés",
  grupo: "1° A",
  nivel: "secundaria" as const,
  fecha: "2026-11-09",
  urlEscudo: "http://localhost:3100/escudo-cnh.png",
};
writeFileSync("/tmp/correo.html", htmlAviso(d));
console.log("ASUNTO:", asuntoAviso(d));
console.log("---- TEXTO PLANO ----");
console.log(textoAviso(d));
