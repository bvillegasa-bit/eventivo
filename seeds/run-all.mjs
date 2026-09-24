#!/usr/bin/env node
/**
 * EVENTIVO — runner de seeds de todos los servicios (T-S1.10).
 *
 * Ejecuta `npm run seed` en cada servicio con base de datos disponible,
 * en orden. Cero dependencias: usa child_process (node:child_process).
 *
 * Uso:
 *   node seeds/run-all.mjs                 # todos los servicios con seed
 *   node seeds/run-all.mjs auth            # solo auth
 *
 * Requiere las variables de entorno de BD del servicio correspondiente
 * (ver .env.example de cada servicio).
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const servicios = process.argv.slice(2);
const disponibles = servicios.length > 0 ? servicios : ['auth'];

let salioBien = true;
for (const servicio of disponibles) {
  const directorio = path.join(raiz, 'services', servicio);
  console.log(`\n[seed] ${servicio} — ejecutando npm run seed ...`);
  try {
    execFileSync('npm', ['run', 'seed'], { cwd: directorio, stdio: 'inherit' });
    console.log(`[seed] ${servicio} — OK`);
  } catch (error) {
    console.error(`[seed] ${servicio} — FALLÓ: ${error.message}`);
    salioBien = false;
  }
}

if (!salioBien) {
  process.exitCode = 1;
} else {
  console.log('\n[seed] Todos los seeds ejecutados correctamente.');
}