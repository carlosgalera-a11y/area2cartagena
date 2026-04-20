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
 * Funcion HTTP unica que sirve todo el arbol /api/**.
 * Firebase Hosting hace rewrite de /api/** a esta funcion.
 *
 * minInstances=1 evita cold starts en el endpoint mas usado.
 * App Check NO se hace enforce a nivel onRequest (el frontend legacy
 * todavia no envia el header en todas las paginas); el middleware
 * lo verifica de forma "soft" hasta completar la migracion.
 */
export const api = onRequest(
  {
    secrets: ALL_SECRETS,
    minInstances: 1,
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: false, // gestionamos CORS manualmente en buildApp()
  },
  buildApp(),
);
