import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { buildApp } from './api';
import { ALL_SECRETS } from './lib/secrets';

// Region UE — coincide con la planeada en el plan maestro (§3.2).
setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
  concurrency: 40,
});

/**
 * Cloud Function `askAi` — el proxy IA del proyecto (CLAUDE.md §Reglas §1).
 * Es la *unica* funcion HTTP a la que llega el frontend; Firebase Hosting
 * hace rewrite de /api/** aqui.
 *
 * Aunque el nombre refleja su proposito principal (IA segura, region UE),
 * el Express interno tambien sirve endpoints auxiliares triviales
 * (/api/health, /api/me). Si crecen, se extraeran a una funcion
 * independiente `api`.
 *
 * minInstances=1 evita cold starts en /api/ai/ask.
 * App Check NO se hace enforce a nivel onRequest (el frontend legacy
 * todavia no envia el header en todas las paginas); el middleware
 * lo verifica de forma "soft" hasta completar la migracion.
 */
export const askAi = onRequest(
  {
    secrets: ALL_SECRETS,
    minInstances: 1,
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: false, // gestionamos CORS manualmente en buildApp()
  },
  buildApp(),
);
